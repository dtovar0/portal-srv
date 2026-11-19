"""Mover los grupos LDAP al desactivar o reactivar una plataforma o un área (FNC-163).

Pedido del dueño: al pasar a `Inactivo`, los grupos se **mueven** (ModifyDN con
`new_superior`, mismo RDN) a `LDAP_GROUPS_INACTIVE_BASE_DN`; al reactivar,
regresan a su ubicación original (la que guarda `Platform.ldap_group_*_dn`).
No se sacan usuarios uno por uno ni se renombra el `cn`.

Flujo (mismo worker y cola RQ de los accesos; ADR-008 3B):
1. la petición que cambia `status` llama a `conciliar` **dentro de su
   transacción**: compara el estado deseado (plataforma y área `Activo`) con la
   ubicación registrada y deja una fila `pendiente` en `platform_group_moves`;
2. tras el `commit` se despierta al worker (`despertar`; sin Redis espera al
   barrido);
3. `ejecutar_traslado` reserva la fila, **recalcula** el estado deseado (así,
   reactivar un área no regresa los grupos de una plataforma inactiva por sí
   misma), mueve cada grupo que no esté donde debe y cierra con auditoría.

Reglas:
- Función apagada (`LDAP_GROUPS_INACTIVE_BASE_DN` vacía o sin directorio): no se
  crea nada; desactivar sigue siendo solo del portal.
- Plataformas sin grupo LDAP (`conector`, manuales): no aplican, sin error.
- Idempotente: un grupo ya en su lugar no falla (`YA_ESTABA`).
- Errores del directorio: transitorios se reintentan con *backoff*
  (`PROVISIONING_*`); permanentes (grupo inexistente, OU destino inexistente,
  nombre ocupado en la OU de inactivos) quedan `fallido` con un código corto.
  Guardar de nuevo la plataforma o el área rearma el traslado.
- Auditoría: `grupos_movidos` o `grupos_traslado_fallido` (actor `sistema`),
  en la misma transacción que el estado.
"""
import logging
from datetime import timedelta

from sqlalchemy import and_, or_, update

from app import db
from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log
from app.modules.core.models import Platform
from app.modules.directory.configuracion import (ErrorConfiguracionDirectorio,
                                                 cargar_configuracion,
                                                 directorio_activo)
from app.modules.directory.errors import Resultado
from app.modules.directory.writer import EscritorDirectorio
from app.modules.platforms import ubicacion_grupos as ubicacion
from app.modules.platforms.tipos import NIVEL_USUARIO
from app.modules.platforms.models import (ESTADO_FALLIDO, ESTADO_HECHO,
                                          ESTADO_PENDIENTE,
                                          LARGO_RESERVADO_POR,
                                          UBICACION_INACTIVOS, TrasladoGrupos)
from app.modules.provisioning.configuracion import \
    cargar_configuracion as cargar_aprovisionamiento
from app.modules.provisioning.ejecucion import identificador_worker
from app.modules.provisioning.reintentos import segundos_de_espera
from app.modules.provisioning.reloj import ahora
from app.modules.provisioning.tipos_de_trabajo import \
    registrar_tipo_de_trabajo

logger = logging.getLogger(__name__)

# Nombre del trabajo que el worker acepta (por nombre: el mensaje no lleva código).
FUNCION_TRASLADO = 'app.modules.platforms.traslado_grupos.ejecutar_traslado'
MODULO_AUDITORIA = 'Plataformas'

# Catálogo de `last_error` (nunca texto de excepciones ni del servidor).
CODIGO_SIN_CONFIGURAR = 'directorio_no_configurado'
CODIGO_SIN_ORIGEN = 'ou_original_invalida'
CODIGO_DIRECTORIO = 'directorio'
CODIGO_INESPERADO = 'error_inesperado'


def configuracion_activa():
    """Configuración del directorio si el traslado está encendido; si no, `None`."""
    if not directorio_activo():
        return None
    try:
        cfg = cargar_configuracion()
    except ErrorConfiguracionDirectorio:
        return None
    return cfg if cfg.grupos_inactivos_base_dn else None


# --------------------------------------------------------------------------- #
# Petición: dejar el traslado pendiente (misma transacción del cambio)
# --------------------------------------------------------------------------- #

def _niveles_con_grupo(plataforma):
    return [n for n in ubicacion.NIVELES if ubicacion.dn_original(plataforma, n)]


def _hay_que_mover(plataforma, deseada):
    traslado = plataforma.group_move
    if traslado is not None and traslado.status == ESTADO_FALLIDO:
        return True  # guardar de nuevo rearma el traslado
    return any(ubicacion.ubicacion_actual(plataforma, n) != deseada
               for n in _niveles_con_grupo(plataforma))


def _reserva_viva(traslado, cfg):
    """`True` si un worker lo tiene reservado y su reserva no venció.

    Pendiente sin reserva viva (p. ej. intentos agotados por una caída del
    worker al cerrar) se rearma al guardar de nuevo."""
    if traslado.locked_at is None:
        return False
    return traslado.locked_at >= ahora() - timedelta(
        seconds=cfg.vencimiento_reserva)


def conciliar(plataformas):
    """Deja `pendiente` el traslado de las plataformas cuyos grupos no están
    donde deben (sin `commit`); devuelve los ids a despertar tras el `commit`.

    Apagado o sin directorio: no hace nada. Se llama al cambiar `status` de una
    plataforma o de un área, y al guardar una plataforma (rearma un `fallido`).
    """
    if configuracion_activa() is None:
        return []
    cfg = cargar_aprovisionamiento()
    ids = []
    for plataforma in plataformas:
        if not ubicacion.aplica(plataforma):
            continue
        deseada = ubicacion.ubicacion_deseada(plataforma)
        if not _hay_que_mover(plataforma, deseada):
            continue
        traslado = plataforma.group_move
        if (traslado is not None and traslado.status == ESTADO_PENDIENTE
                and _reserva_viva(traslado, cfg)):
            continue  # un worker lo tiene; recalcula lo deseado al cerrar
        if traslado is None:
            traslado = TrasladoGrupos(plataforma=plataforma,
                                      max_attempts=cfg.max_intentos)
            db.session.add(traslado)
        traslado.status = ESTADO_PENDIENTE
        traslado.attempts_count = 0
        traslado.max_attempts = cfg.max_intentos
        traslado.next_attempt_at = None
        traslado.locked_at = traslado.locked_by = None
        traslado.last_error = None
        db.session.flush()
        ids.append(traslado.id)
    return ids


def despertar(ids):
    """Avisa al worker tras el `commit`; nunca lanza (sin Redis, el barrido)."""
    if not ids:
        return
    try:
        from app.modules.provisioning.queue import (
            TIEMPO_ESPERA_REDIS_WEB_SEGUNDOS, cola, enviar)
        cola_rq = cola(tiempo_espera=TIEMPO_ESPERA_REDIS_WEB_SEGUNDOS)
        for traslado_id in ids:
            enviar(cola_rq, traslado_id, FUNCION_TRASLADO)
    except Exception as exc:
        logger.warning('Traslado de grupos: sin aviso al worker (%s); '
                       'esperará al barrido.', type(exc).__name__)


# --------------------------------------------------------------------------- #
# Worker: reserva, traslado y cierre
# --------------------------------------------------------------------------- #

def _libre(momento, cfg):
    """Condición de un traslado que le toca a un worker."""
    vencida = momento - timedelta(seconds=cfg.vencimiento_reserva)
    return and_(
        TrasladoGrupos.status == ESTADO_PENDIENTE,
        TrasladoGrupos.attempts_count < TrasladoGrupos.max_attempts,
        or_(TrasladoGrupos.next_attempt_at.is_(None),
            TrasladoGrupos.next_attempt_at <= momento),
        or_(TrasladoGrupos.locked_at.is_(None),
            TrasladoGrupos.locked_at < vencida))


def vencidos(cfg, momento=None, limite=100):
    """Ids de traslados pendientes que ya toca intentar (barrido del worker)."""
    momento = momento or ahora()
    consulta = (TrasladoGrupos.query
                .with_entities(TrasladoGrupos.id)
                .filter(_libre(momento, cfg))
                .order_by(TrasladoGrupos.next_attempt_at, TrasladoGrupos.id)
                .limit(limite))
    return [fila.id for fila in consulta]


def reservar(traslado_id, worker, cfg, momento=None):
    """Reserva atómica y cuenta el intento; `True` si la ganó."""
    momento = momento or ahora()
    sentencia = (
        update(TrasladoGrupos)
        .where(TrasladoGrupos.id == traslado_id, _libre(momento, cfg))
        .values(locked_at=momento, locked_by=worker[:LARGO_RESERVADO_POR],
                attempts_count=TrasladoGrupos.attempts_count + 1,
                updated_at=momento)
        .execution_options(synchronize_session=False))
    ganada = db.session.execute(sentencia).rowcount == 1
    if not ganada:
        db.session.rollback()
    return ganada


def _confirmar_reserva(traslado_id, worker):
    sentencia = (
        update(TrasladoGrupos)
        .where(TrasladoGrupos.id == traslado_id,
               TrasladoGrupos.status == ESTADO_PENDIENTE,
               TrasladoGrupos.locked_by == worker[:LARGO_RESERVADO_POR])
        .values(updated_at=ahora())
        .execution_options(synchronize_session=False))
    return db.session.execute(sentencia).rowcount == 1


def _plan(plataforma, cfg_directorio):
    """Lista `(nivel, origen, padre_destino, ubicacion_destino)` por mover.

    Solo datos simples: se usa sin sesión abierta durante la red. Un nivel sin
    grupo o ya en su lugar no aparece.
    """
    deseada = ubicacion.ubicacion_deseada(plataforma)
    pasos = []
    for nivel in _niveles_con_grupo(plataforma):
        if ubicacion.ubicacion_actual(plataforma, nivel) == deseada:
            continue
        original = ubicacion.dn_original(plataforma, nivel)
        origen = ubicacion.dn_actual(plataforma, nivel, cfg_directorio)
        padre = (cfg_directorio.grupos_inactivos_base_dn
                 if deseada == UBICACION_INACTIVOS
                 else ubicacion.padre_original(original))
        pasos.append((nivel, origen, padre, deseada))
    return pasos


def _mover(pasos):
    """Mueve cada grupo; `{nivel: (exito, codigo, transitorio)}`."""
    resultados = {}
    try:
        escritor = EscritorDirectorio()
    except Exception as exc:
        logger.error('Traslado de grupos: sin cliente del directorio (%s).',
                     type(exc).__name__)
        return {nivel: (False, CODIGO_SIN_CONFIGURAR, False)
                for nivel, *_ in pasos}
    for nivel, origen, padre, _ in pasos:
        if not padre:
            resultados[nivel] = (False, CODIGO_SIN_ORIGEN, False)
            continue
        try:
            escritura = escritor.mover_grupo(origen, padre)
        except Exception as exc:  # solo el tipo: el texto puede nombrar datos
            logger.error('Traslado de grupos: fallo inesperado (%s).',
                         type(exc).__name__)
            resultados[nivel] = (False, CODIGO_INESPERADO, True)
            continue
        if escritura.exito:
            resultados[nivel] = (True, None, False)
        else:
            codigo = escritura.motivo or escritura.resultado.value
            resultados[nivel] = (False, codigo,
                                 escritura.resultado is Resultado.ERROR_TRANSITORIO)
    return resultados


def _auditar(evento, plataforma, status, detalle):
    ubic, estado = ubicacion.resumen(plataforma)
    add_audit_log(evento, status=status, detail=detalle,
                  module=MODULO_AUDITORIA, target=plataforma.name,
                  platform_id=plataforma.id, area_id=plataforma.area_id,
                  after={'groups_location': ubic, 'groups_move_status': estado},
                  as_system=True, commit=False)


def _cerrar(traslado, plataforma, resultados, pasos, cfg):
    """Aplica los resultados al registro (sin commit); devuelve el estado."""
    destinos = {nivel: destino for nivel, _, _, destino in pasos}
    for nivel, (exito, _, _) in resultados.items():
        if exito:
            columna = 'admin_location' if nivel == 'admin' else 'user_location'
            setattr(traslado, columna, destinos[nivel])
    fallos = {n: r for n, r in resultados.items() if not r[0]}
    momento = ahora()
    traslado.locked_at = traslado.locked_by = None
    if not fallos:
        traslado.last_error = None
        # Si el estado deseado cambió mientras se movía, hay otra vuelta.
        if _hay_que_mover(plataforma, ubicacion.ubicacion_deseada(plataforma)):
            traslado.status = ESTADO_PENDIENTE
            traslado.attempts_count = 0
            traslado.next_attempt_at = None
            return traslado.status
        traslado.status = ESTADO_HECHO
        traslado.next_attempt_at = None
        ubic, _ = ubicacion.resumen(plataforma)
        _auditar(Evento.GRUPOS_MOVIDOS, plataforma, 'success',
                 f'Grupos de la plataforma: {ubic}.')
        return traslado.status
    codigo = sorted(r[1] for r in fallos.values())[0]
    traslado.last_error = codigo
    transitorio = all(r[2] for r in fallos.values())
    if transitorio and traslado.attempts_count < traslado.max_attempts:
        traslado.status = ESTADO_PENDIENTE
        traslado.next_attempt_at = momento + timedelta(
            seconds=segundos_de_espera(traslado.attempts_count,
                                       cfg.backoff_base, cfg.backoff_max))
        return traslado.status
    traslado.status = ESTADO_FALLIDO
    traslado.next_attempt_at = None
    _auditar(Evento.GRUPOS_TRASLADO_FALLIDO, plataforma, 'error',
             f'No se movieron los grupos de la plataforma: {codigo}.')
    return traslado.status


def ejecutar_traslado(traslado_id, worker=None):
    """Un intento de traslado si se puede reservar (función del worker).

    Devuelve el estado en que quedó o `None` si otro worker lo tiene, ya
    terminó o aún no le toca.
    """
    cfg = cargar_aprovisionamiento()
    worker = worker or identificador_worker()
    try:
        if not reservar(traslado_id, worker, cfg):
            return None
        db.session.commit()
        traslado = db.session.get(TrasladoGrupos, traslado_id,
                                  populate_existing=True)
        plataforma = db.session.get(Platform, traslado.platform_id)
        cfg_directorio = configuracion_activa()
        pasos = _plan(plataforma, cfg_directorio) if cfg_directorio else []
        db.session.rollback()  # sin transacción abierta durante la red

        if cfg_directorio is None:  # se apagó la función tras el pedido
            resultados = {NIVEL_USUARIO: (False, CODIGO_SIN_CONFIGURAR, False)}
        else:
            resultados = _mover(pasos)

        if not _confirmar_reserva(traslado_id, worker):
            db.session.rollback()
            logger.warning('Traslado de grupos: la reserva de %s ya no es de '
                           'este worker; no se cierra.', traslado_id)
            return None
        traslado = db.session.get(TrasladoGrupos, traslado_id,
                                  populate_existing=True)
        plataforma = db.session.get(Platform, traslado.platform_id,
                                    populate_existing=True)
        estado = _cerrar(traslado, plataforma, resultados, pasos, cfg)
        db.session.commit()
    except Exception as exc:
        # BD caída: se revierte; la reserva vence y el traslado se retoma.
        db.session.rollback()
        logger.error('Traslado de grupos: no se cerró %s (%s); se retomará al '
                     'vencer la reserva.', traslado_id, type(exc).__name__)
        return None
    logger.info('Traslado de grupos: %s → %s', traslado_id, estado)
    return estado


def registrar():
    """Admite el trabajo de traslado en el worker y su barrido (FNC-163)."""
    registrar_tipo_de_trabajo(FUNCION_TRASLADO, vencidos)
