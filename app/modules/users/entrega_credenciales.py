"""Entrega de la contraseña inicial por un Send de Vaultwarden (FNC-138, ADR-008).

Flujo de un intento (alta, reenvío o reintento del worker):
1. la contraseña está fijada en OpenLDAP (Password Modify, `writer.py`);
2. se crea un Send de texto (usuario, contraseña y URL del portal) con
   `secretos/sends.py`, protegido con un código de 6 dígitos nuevo (FNC-190), y
   se manda por correo **solo el enlace y el código, en un bloque aparte**
   (plantilla `credenciales_iniciales` u `onboarding_aduana`, la de
   `credential_deliveries.plantilla`; SEC-MAIL-05);
3. éxito → `enviadas`; cualquier falla → `pendientes` con un código corto
   (`CODIGO_*`) y el reintento del worker (mismo worker y cola RQ de los
   accesos; `tipos_de_trabajo`, ADR-008 3B).

Reglas:
- La contraseña nunca se guarda, ni su enlace ni su código, ni aparece en auditoría, logs,
  errores o `repr`: vive solo en variables locales del intento.
- Cada reintento genera una contraseña nueva (servidor, `secrets`), la fija en
  LDAP y crea un Send nuevo con un código nuevo (decisión 4): la escrita por el administrador solo
  sirve en el primer intento síncrono.
- Sin notificaciones activas o sin `BASE_URL` no se crea ningún Send (no queda
  un Send huérfano): la entrega queda `pendientes`.
- Si el correo falla, el Send recién creado se borra (mejor esfuerzo); si
  tiene éxito, se borra el Send anterior.
- Reintentos: `PROVISIONING_MAX_ATTEMPTS` y el *backoff* de los accesos
  (`segundos_de_espera`). Agotados, el estado sigue `pendientes`, no hay más
  barrido y se avisa a los superadmins (el administrador fija la contraseña
  desde «Editar usuario», FNC-161).
"""
import logging
import os
from datetime import timedelta

from sqlalchemy import and_, or_, update

from app import db
from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log
from app.modules.auth.models import User
from app.modules.directory.configuracion import (ErrorConfiguracionDirectorio,
                                                 directorio_activo)
from app.modules.directory.errors import MOTIVO_SIN_PERMISO, Resultado
from app.modules.directory.writer import (MOTIVO_CONTRASENA_RECHAZADA,
                                          EscritorDirectorio)
from app.modules.notifications import services
from app.modules.notifications.models import NotificationTemplate
from app.modules.notifications.access_notifications import (correos,
                                                            superadmins)
from app.modules.provisioning.configuracion import cargar_configuracion
from app.modules.provisioning.ejecucion import identificador_worker
from app.modules.provisioning.reintentos import segundos_de_espera
from app.modules.provisioning.reloj import ahora
from app.modules.provisioning.tipos_de_trabajo import \
    registrar_tipo_de_trabajo
from app.modules.secretos.sends import (MOTIVO_SEND_DESHABILITADO,
                                        SendRechazado, borrar_send,
                                        codigo_de_acceso, crear_send_texto)
from app.modules.secretos.vaultwarden import ErrorDeGestor, GestorCaido
from app.modules.users.models import (ESTADO_ENVIADAS, ESTADO_PENDIENTES,
                                      LARGO_RESERVADO_POR,
                                      PLANTILLA_POR_OMISION,
                                      EntregaCredenciales)
from app.modules.users.politica_contrasena import generar
from app.modules.users.roles import MODULO_AUDITORIA

logger = logging.getLogger(__name__)

# Nombre del trabajo que el worker acepta (por nombre: el mensaje no lleva código).
FUNCION_ENTREGA = 'app.modules.users.entrega_credenciales.ejecutar_entrega'
SLUG_INICIALES = PLANTILLA_POR_OMISION
SLUG_ONBOARDING = 'onboarding_aduana'
SLUG_NO_ENTREGADAS = 'credenciales_no_entregadas'
# Plantillas que llevan el enlace y el código del Send (se eligen por entrega).
PLANTILLAS_DE_ENTREGA = (SLUG_INICIALES, SLUG_ONBOARDING)
# Lista blanca de variables de cada plantilla (SEC-MAIL-02).
CLAVES_POR_PLANTILLA = {
    SLUG_INICIALES: ('nombre', 'usuario', 'enlace', 'codigo', 'url'),
    SLUG_ONBOARDING: ('nombre', 'usuario', 'enlace', 'codigo', 'url'),
    SLUG_NO_ENTREGADAS: ('usuario', 'correo_usuario', 'url'),
}
ACCION_REDIRIGIDA = 'CREDENCIALES REDIRIGIDAS'
NOMBRE_DEL_SEND = 'Credenciales del portal'
VAR_BASE_URL = 'BASE_URL'

# Catálogo de `last_error` (nunca texto de excepciones ni de servidores).
CODIGO_SIN_NOTIFICACIONES = 'notificaciones_desactivadas'
CODIGO_SIN_BASE_URL = 'base_url_no_configurada'
CODIGO_GESTOR_CAIDO = 'gestor_no_disponible'
CODIGO_GESTOR_MAL_CONFIGURADO = 'gestor_mal_configurado'
CODIGO_SEND_DESHABILITADO = 'send_deshabilitado'
CODIGO_CORREO = 'correo_no_enviado'
CODIGO_DIRECTORIO = 'directorio_no_disponible'
CODIGO_CONTRASENA_RECHAZADA = 'contrasena_rechazada'
# La cuenta de servicio no puede escribir en el directorio (FNC-206).
CODIGO_SIN_PERMISO = MOTIVO_SIN_PERMISO
# Errores que reintentar no arregla: la entrega se agota de inmediato.
CODIGOS_SIN_REINTENTO = frozenset({CODIGO_SIN_PERMISO})
CODIGO_PLANTILLA_SIN_CODIGO = 'plantilla_sin_codigo'
CODIGO_INESPERADO = 'error_inesperado'
CODIGO_AGOTADOS = 'intentos_agotados'

def url_del_portal():
    """URL del portal para el Send y el correo: solo de `BASE_URL`."""
    return (os.getenv(VAR_BASE_URL) or '').strip().rstrip('/')


# --------------------------------------------------------------------------- #
# Un intento: contraseña en LDAP → Send → correo
# --------------------------------------------------------------------------- #

def fijar_contrasena_en_directorio(uid, contrasena):
    """Password Modify de la cuenta `uid`; `None` si quedó o el código."""
    try:
        if not directorio_activo():
            return CODIGO_DIRECTORIO
        resultado = EscritorDirectorio().change_password(uid, contrasena)
    except ErrorConfiguracionDirectorio:
        logger.error('Credenciales: configuración inválida del directorio.')
        return CODIGO_DIRECTORIO
    except Exception as exc:  # solo el tipo: el texto puede nombrar a la persona
        logger.error('Credenciales: fallo inesperado del directorio (%s).',
                     type(exc).__name__)
        return CODIGO_DIRECTORIO
    if resultado.resultado is Resultado.HECHO:
        return None
    if resultado.motivo == MOTIVO_CONTRASENA_RECHAZADA:
        return CODIGO_CONTRASENA_RECHAZADA
    if resultado.motivo == MOTIVO_SIN_PERMISO:
        return CODIGO_SIN_PERMISO
    return CODIGO_DIRECTORIO


def _texto_del_send(uid, contrasena, url):
    return f'Usuario: {uid}\nContraseña: {contrasena}\nPortal: {url}'


def _codigo_de_gestor(exc):
    if isinstance(exc, SendRechazado) \
            and exc.motivo == MOTIVO_SEND_DESHABILITADO:
        return CODIGO_SEND_DESHABILITADO
    if isinstance(exc, GestorCaido):
        return CODIGO_GESTOR_CAIDO
    return CODIGO_GESTOR_MAL_CONFIGURADO


def _plantilla_sin_codigo(slug):
    """`True` si la plantilla (editada en Ajustes) ya no trae `{codigo}`: sin él
    la persona no podría abrir el Send. Una plantilla ausente no se juzga aquí."""
    plantilla = NotificationTemplate.query.filter_by(slug=slug).first()
    return plantilla is not None and '{codigo}' not in (plantilla.body or '')


def _borrar_sin_fallar(send_id):
    """Borra un Send; un fallo se registra sin detalle y nunca se propaga."""
    if not send_id:
        return
    try:
        borrar_send(send_id)
    except Exception as exc:
        logger.warning('Credenciales: no se borró un Send (%s); caduca solo.',
                       type(exc).__name__)


def enviar_credenciales(correo, nombre, uid, contrasena, send_anterior=None,
                        plantilla=SLUG_INICIALES):
    """Crea el Send con su código de acceso y manda el enlace y el código por
    correo con `plantilla`; `(None, send_id)` o `(codigo_de_error, None)`.

    El código de acceso es nuevo en cada llamada y no sale de esta función
    más que hacia el Send y el correo.
    """
    if plantilla not in PLANTILLAS_DE_ENTREGA:
        plantilla = SLUG_INICIALES
    if not services.notifications_enabled():
        return CODIGO_SIN_NOTIFICACIONES, None
    url = url_del_portal()
    if not url:
        return CODIGO_SIN_BASE_URL, None
    if _plantilla_sin_codigo(plantilla):
        logger.error('Credenciales: la plantilla %s no incluye {codigo}.',
                     plantilla)
        return CODIGO_PLANTILLA_SIN_CODIGO, None
    codigo_acceso = codigo_de_acceso()
    try:
        send = crear_send_texto(NOMBRE_DEL_SEND,
                                _texto_del_send(uid, contrasena, url),
                                codigo=codigo_acceso)
    except ErrorDeGestor as exc:
        logger.warning('Credenciales: no se creó el Send (%s).',
                       type(exc).__name__)
        return _codigo_de_gestor(exc), None
    except Exception as exc:
        logger.error('Credenciales: fallo inesperado al crear el Send (%s).',
                     type(exc).__name__)
        return CODIGO_INESPERADO, None
    try:
        respuesta = services.send_notification_by_slug(
            plantilla, correo,
            {'nombre': nombre or uid, 'usuario': uid,
             'enlace': send.enlace, 'codigo': codigo_acceso, 'url': url})
        enviado = respuesta.get('status') == 'success'
    except Exception as exc:
        logger.error('Credenciales: fallo inesperado del correo (%s).',
                     type(exc).__name__)
        enviado = False
    del codigo_acceso
    if not enviado:
        _borrar_sin_fallar(send.id)
        return CODIGO_CORREO, None
    if send_anterior and send_anterior != send.id:
        _borrar_sin_fallar(send_anterior)
    return None, send.id


# --------------------------------------------------------------------------- #
# Estado de la entrega
# --------------------------------------------------------------------------- #

def nueva_entrega(cuenta, uid, cfg=None, momento=None):
    """Fila `pendientes` con el primer intento síncrono ya contado.

    Se agrega a la sesión de la cuenta recién creada (misma transacción).
    `next_attempt_at` evita que el worker compita con ese primer intento.
    """
    cfg = cfg or cargar_configuracion()
    momento = momento or ahora()
    entrega = EntregaCredenciales(
        cuenta=cuenta, uid=uid, status=ESTADO_PENDIENTES, attempts_count=1,
        max_attempts=cfg.max_intentos,
        next_attempt_at=momento + timedelta(seconds=segundos_de_espera(
            1, cfg.backoff_base, cfg.backoff_max)))
    db.session.add(entrega)
    return entrega


def _auditar(evento, cuenta, status, detalle, entrega, como_sistema):
    """Sin contraseña, enlace ni id del Send (SEC-AUD-06: misma transacción)."""
    add_audit_log(evento, status=status, detail=detalle,
                  module=MODULO_AUDITORIA, target=cuenta.email,
                  target_user_id=cuenta.id,
                  after={'credentials_status': entrega.status,
                         'attempts': entrega.attempts_count},
                  as_system=como_sistema, commit=False)


def marcar_enviada(entrega, send_id, momento, evento, como_sistema):
    """Entrega exitosa (sin commit)."""
    entrega.status = ESTADO_ENVIADAS
    entrega.send_id = send_id
    entrega.last_sent_at = momento
    entrega.last_error = None
    entrega.next_attempt_at = None
    entrega.locked_at = entrega.locked_by = None
    _auditar(evento, entrega.cuenta, 'success',
             'Credenciales entregadas por Send.', entrega, como_sistema)
    if entrega.destinatario:  # solo CLI (`--enviar-a`); sin secretos
        add_audit_log(f'{ACCION_REDIRIGIDA}: {entrega.uid} → '
                      f'{entrega.destinatario}', status='warning',
                      detail='Credenciales enviadas a un destinatario '
                             'distinto del correo de la cuenta.',
                      module=MODULO_AUDITORIA, target=entrega.cuenta.email,
                      target_user_id=entrega.cuenta.id,
                      as_system=como_sistema, commit=False)


def marcar_pendiente(entrega, codigo, momento, cfg):
    """Entrega fallida (sin commit). `True` si se agotaron los intentos.

    Un error de `CODIGOS_SIN_REINTENTO` (p. ej. el directorio rechaza por
    permisos) agota los intentos: el worker no lo reintenta en bucle."""
    entrega.status = ESTADO_PENDIENTES
    if codigo in CODIGOS_SIN_REINTENTO:
        entrega.attempts_count = max(entrega.attempts_count,
                                     entrega.max_attempts)
    entrega.last_error = codigo
    entrega.locked_at = entrega.locked_by = None
    agotada = entrega.attempts_count >= entrega.max_attempts
    if agotada:
        entrega.next_attempt_at = None
    else:
        entrega.next_attempt_at = momento + timedelta(
            seconds=segundos_de_espera(entrega.attempts_count,
                                       cfg.backoff_base, cfg.backoff_max))
    return agotada


def completar_alta(cuenta, contrasena):
    """Primer intento síncrono tras el alta; nunca lanza.

    Éxito → `enviadas` y `credenciales_enviadas`; falla → `pendientes` con el
    reintento del worker y `credenciales_pendientes`. Si ni siquiera se puede
    guardar, la fila creada con el alta ya deja el reintento programado.
    """
    try:
        cfg = cargar_configuracion()
        entrega = db.session.get(EntregaCredenciales, cuenta.credential_delivery.id)
        correo, nombre, uid = cuenta.email, cuenta.nombre, entrega.uid
        db.session.rollback()  # no mantener la transacción abierta en la red
        codigo, send_id = enviar_credenciales(correo, nombre, uid, contrasena)
        entrega = db.session.get(EntregaCredenciales, entrega.id,
                                 populate_existing=True)
        momento = ahora()
        if codigo is None:
            marcar_enviada(entrega, send_id, momento,
                           Evento.CREDENCIALES_ENVIADAS, False)
        else:
            marcar_pendiente(entrega, codigo, momento, cfg)
            _auditar(Evento.CREDENCIALES_PENDIENTES, entrega.cuenta,
                     'warning', f'Credenciales pendientes: {codigo}.',
                     entrega, False)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error('Credenciales: no se registró el primer intento (%s); '
                     'queda el reintento del worker.', type(exc).__name__)


# --------------------------------------------------------------------------- #
# Worker: reserva, intento y cierre
# --------------------------------------------------------------------------- #

def _libre(momento, cfg):
    """Condición de una entrega que le toca a un worker."""
    vencida = momento - timedelta(seconds=cfg.vencimiento_reserva)
    return and_(
        EntregaCredenciales.status == ESTADO_PENDIENTES,
        EntregaCredenciales.attempts_count < EntregaCredenciales.max_attempts,
        or_(EntregaCredenciales.next_attempt_at.is_(None),
            EntregaCredenciales.next_attempt_at <= momento),
        or_(EntregaCredenciales.locked_at.is_(None),
            EntregaCredenciales.locked_at < vencida))


def vencidos(cfg, momento=None, limite=100):
    """Ids de entregas pendientes que ya toca reintentar (barrido del worker)."""
    momento = momento or ahora()
    consulta = (EntregaCredenciales.query
                .with_entities(EntregaCredenciales.id)
                .filter(_libre(momento, cfg))
                .order_by(EntregaCredenciales.next_attempt_at,
                          EntregaCredenciales.id)
                .limit(limite))
    return [fila.id for fila in consulta]


def reservar(entrega_id, worker, cfg, momento=None):
    """Reserva atómica y cuenta el intento; `True` si la ganó."""
    momento = momento or ahora()
    sentencia = (
        update(EntregaCredenciales)
        .where(EntregaCredenciales.id == entrega_id, _libre(momento, cfg))
        .values(locked_at=momento, locked_by=worker[:LARGO_RESERVADO_POR],
                attempts_count=EntregaCredenciales.attempts_count + 1,
                updated_at=momento)
        .execution_options(synchronize_session=False))
    ganada = db.session.execute(sentencia).rowcount == 1
    if not ganada:
        db.session.rollback()
    return ganada


def _confirmar_reserva(entrega_id, worker):
    sentencia = (
        update(EntregaCredenciales)
        .where(EntregaCredenciales.id == entrega_id,
               EntregaCredenciales.status == ESTADO_PENDIENTES,
               EntregaCredenciales.locked_by == worker[:LARGO_RESERVADO_POR])
        .values(updated_at=ahora())
        .execution_options(synchronize_session=False))
    return db.session.execute(sentencia).rowcount == 1


def avisar_agotada(entrega_id):
    """Correo a los superadmins cuando se agotan los intentos; nunca lanza."""
    try:
        entrega = db.session.get(EntregaCredenciales, entrega_id)
        cuenta = entrega.cuenta
        destinatarios = correos(superadmins())
        if not destinatarios or not services.notifications_enabled():
            logger.warning('Credenciales: intentos agotados sin a quién '
                           'avisar (entrega %s).', entrega_id)
            return
        services.send_notification_by_slug(
            SLUG_NO_ENTREGADAS, ', '.join(destinatarios),
            {'usuario': entrega.uid, 'correo_usuario': cuenta.email,
             'url': url_del_portal()})
    except Exception as exc:
        logger.error('Credenciales: no se avisó la entrega agotada %s (%s).',
                     entrega_id, type(exc).__name__)
        db.session.rollback()


def ejecutar_entrega(entrega_id, worker=None):
    """Un reintento de la entrega si se puede reservar (función del worker).

    Devuelve el estado en que quedó o `None` si otro worker la tiene, ya
    terminó o aún no le toca.
    """
    cfg = cargar_configuracion()
    worker = worker or identificador_worker()
    agotada = False
    try:
        if not reservar(entrega_id, worker, cfg):
            return None
        db.session.commit()
        entrega = db.session.get(EntregaCredenciales, entrega_id,
                                 populate_existing=True)
        uid, send_anterior = entrega.uid, entrega.send_id
        plantilla = entrega.plantilla or PLANTILLA_POR_OMISION
        # El destinatario sustituto (solo CLI) se respeta en cada reintento.
        correo = entrega.destinatario or entrega.cuenta.email
        nombre = entrega.cuenta.nombre
        db.session.rollback()

        contrasena = generar()
        codigo = fijar_contrasena_en_directorio(uid, contrasena)
        send_id = None
        if codigo is None:
            codigo, send_id = enviar_credenciales(
                correo, nombre, uid, contrasena, send_anterior, plantilla)
        del contrasena

        if not _confirmar_reserva(entrega_id, worker):
            db.session.rollback()
            logger.warning('Credenciales: la reserva de la entrega %s ya no '
                           'es de este worker; no se cierra.', entrega_id)
            return None
        entrega = db.session.get(EntregaCredenciales, entrega_id,
                                 populate_existing=True)
        momento = ahora()
        if codigo is None:
            marcar_enviada(entrega, send_id, momento,
                           Evento.CREDENCIALES_ENVIADAS, True)
        else:
            agotada = marcar_pendiente(entrega, codigo, momento, cfg)
            if agotada:
                _auditar(Evento.CREDENCIALES_PENDIENTES, entrega.cuenta,
                         'error', f'Credenciales pendientes: {CODIGO_AGOTADOS}'
                         f' ({codigo}).', entrega, True)
        estado = entrega.status
        db.session.commit()
    except Exception as exc:
        # BD caída: se revierte; la reserva vence y la entrega se retoma.
        db.session.rollback()
        logger.error('Credenciales: no se cerró la entrega %s (%s); se '
                     'retomará al vencer la reserva.', entrega_id,
                     type(exc).__name__)
        return None
    logger.info('Credenciales: entrega %s → %s', entrega_id, estado)
    if agotada:
        avisar_agotada(entrega_id)
    return estado


def registrar():
    """Admite el trabajo de entrega en el worker y su barrido (FNC-137)."""
    registrar_tipo_de_trabajo(FUNCION_ENTREGA, vencidos)
