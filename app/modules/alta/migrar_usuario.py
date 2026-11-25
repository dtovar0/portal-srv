"""`flask alta migrar-usuario UID`: migra a UNA persona de LDAP y la deja lista (FNC-202).

En una corrida y en este orden:
1. Cuenta `sso` y grupo del portal: reutiliza `migracion.migrar(solo=[uid])`.
   Si la cuenta ya existe se continúa (no es error). Con `--admin-area` se
   fuerza el rol `admin_area` (cambio de rol y de grupo de Authelia, igual que
   `migrar-ldap --rol admin_area --actualizar-rol`).
2. Áreas (`--area`, al menos una, deben existir y estar activas).
3. Administración de áreas (`--admin-area`, FNC-207): el servicio del portal
   `areas_administradas.asignar_areas_administradas` con la unión de las que
   ya administraba; genera los accesos automáticos `admin_de_area` (FNC-055).
   Va antes de la responsiva para que la firma active esos accesos.
4. Carta responsiva registrada como firmada (`--responsiva-firmada`).
5. Accesos (`--plataforma` en `--nivel`, `--plataforma-admin` en `admin`):
   origen `migracion`, otorgados por el sistema; la plataforma debe ser de una
   de las áreas de la persona (P1).
6. Rotación de contraseña (`--rotar-contrasena`), solo si no hubo `ERROR`.

Todo lo que se puede validar sin escribir se valida antes: un área o una
plataforma inválida detiene la corrida sin tocar nada. Los superadmins se
omiten siempre.
"""
from sqlalchemy.exc import IntegrityError

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, normalized_role
from app.modules.access import errores, rules, services
from app.modules.access.consultas import vigentes_de
from app.modules.access.errores import ErrorDeAcceso
from app.modules.access.responsiva import firmar_accesos, registrar_firma
from app.modules.access.configuracion import responsiva_por_plataforma
from app.modules.access.tipos import ORIGEN_MIGRACION
from app.modules.access_requests import catalogo
from app.modules.alta import migracion, rotacion
from app.modules.alta.grupos_ldap import identificadores_de_superadmin
from app.modules.alta.importacion import cliente_o_error, exigir_entrega
from app.modules.alta.resumen import (ACTOR_CLI, ACTUALIZADO, ERROR, OMITIDO,
                                      ROTADO, Resumen)
from app.modules.auth.models import User
from app.modules.auth.services import normalizar_correo
from app.modules.core.models import Area, Platform
from app.modules.directory.ldap_client import ErrorDirectorio
from app.modules.notifications import access_notifications as avisos
from app.modules.users.areas_administradas import asignar_areas_administradas
from app.modules.users.entrega_credenciales import SLUG_ONBOARDING

ESTADO_ACTIVO = 'Activo'
DETALLE_SIN_AREAS = 'falta --area: indica al menos un área'
DETALLE_AREA_INEXISTENTE = 'área «{nombre}» inexistente'
DETALLE_AREA_INACTIVA = 'área «{nombre}» inactiva'
DETALLE_PLATAFORMA_INEXISTENTE = 'plataforma «{nombre}» inexistente'
DETALLE_PLATAFORMA_INACTIVA = ('plataforma «{nombre}» inactiva (o de un área '
                               'inactiva) o sin el nivel {nivel}')
DETALLE_PLATAFORMA_OTRA_AREA = ('la plataforma «{nombre}» no es de ninguna de '
                                'las áreas de la persona')
DETALLE_SIN_CORREO = 'la persona no tiene mail en LDAP'
DETALLE_NO_ENCONTRADA = migracion.DETALLE_NO_ENCONTRADA
DETALLE_DIRECTORIO = migracion.DETALLE_DIRECTORIO
DETALLE_SIN_CUENTA = 'no quedó cuenta en el portal; se detiene la corrida'
DETALLE_AREA = 'área «{nombre}»: {texto}'
DETALLE_RESPONSIVA = 'responsiva registrada como firmada ({total} accesos pendientes activados)'
DETALLE_RESPONSIVA_SIMULADA = 'se registraría la responsiva como firmada'
DETALLE_ACCESO = '«{plataforma}» nivel {nivel}: {texto}'
DETALLE_ACCESO_YA_VIGENTE = 'ya tiene un acceso vigente de ese nivel o superior'
DETALLE_ACCESO_RECHAZADO = 'no se pudo otorgar ({codigo})'
DETALLE_AVISO = 'aviso de aprobado a «{plataforma}»: {texto}'
TEXTO_AVISO_ENVIADO = 'enviado'
TEXTO_AVISO_NO_ENVIADO = ('no enviado (notificaciones apagadas, sin '
                          'destinatario o preferencia de la persona)')
TEXTO_AVISO_FALLO = 'falló el envío; el acceso quedó otorgado'
TEXTO_SE_NOTIFICARIA = 'se notificaría a {correo}'
TEXTO_AGREGADA = 'agregada'
TEXTO_SE_AGREGARIA = 'se agregaría'
TEXTO_YA_ESTABA = 'ya estaba'
TEXTO_OTORGADO_FIRMADO = 'otorgado; aprovisionamiento encolado'
TEXTO_OTORGADO_ESPERA = 'otorgado; espera la firma de la responsiva'
TEXTO_SE_OTORGARIA = 'se otorgaría'
NIVEL_ADMIN = 'admin'
DETALLE_ADMIN_AREA = 'administra el área «{nombre}»: {texto}'
TEXTO_ADMIN_AREA_NUEVA = 'asignada'
TEXTO_ADMIN_AREA_YA = 'ya la administraba'
TEXTO_SE_HARIA_ADMIN = 'se haría administradora de «{nombre}»'
DETALLE_ROL_SIN_CAMBIO = ('no quedó como admin de área; no se asignan áreas '
                          'administradas')


def _linea(resumen, sujeto, estado, detalle):
    resumen.agregar(sujeto, estado, detalle)
    return resumen


def _resolver_area(nombre, errores_):
    area = Area.query.filter(db.func.lower(Area.name) == nombre.lower()
                             ).first()
    if area is None:
        errores_.append(DETALLE_AREA_INEXISTENTE.format(nombre=nombre))
    elif area.status != ESTADO_ACTIVO:
        errores_.append(DETALLE_AREA_INACTIVA.format(nombre=nombre))
    else:
        return area
    return None


def _resolver_plataformas(nombres, nivel, ids_de_la_persona, errores_):
    plataformas = []
    for nombre in nombres:
        candidatas = Platform.query.filter(
            db.func.lower(Platform.name) == nombre.lower()).all()
        plataforma = next((p for p in candidatas
                           if p.area_id in ids_de_la_persona),
                          candidatas[0] if candidatas else None)
        if plataforma is None:
            errores_.append(DETALLE_PLATAFORMA_INEXISTENTE.format(nombre=nombre))
        elif nivel not in catalogo.niveles_integrados(plataforma):
            errores_.append(DETALLE_PLATAFORMA_INACTIVA.format(
                nombre=nombre, nivel=nivel))
        elif plataforma.area_id not in ids_de_la_persona:
            errores_.append(DETALLE_PLATAFORMA_OTRA_AREA.format(nombre=nombre))
        elif (plataforma, nivel) not in plataformas:
            plataformas.append((plataforma, nivel))
    return plataformas


def validar_catalogo(nombres_areas, nombres_plataformas, nivel, cuenta,
                     nombres_plataformas_admin=(), nombres_areas_admin=()):
    """`(areas, accesos, areas_admin, errores)` sin escribir: lo que se pidió
    existe, está activo y cuadra (la plataforma es de un área de la persona).
    `accesos` son pares `(plataforma, nivel)`: `--plataforma` en `nivel` y
    `--plataforma-admin` en `admin`. Las áreas de `--admin-area` no cuentan
    como áreas de la persona (el portal tampoco las agrega a `user.areas`)."""
    errores_ = []
    if not nombres_areas:
        errores_.append(DETALLE_SIN_AREAS)
    areas = []
    for nombre in nombres_areas:
        area = _resolver_area(nombre, errores_)
        if area is not None and area not in areas:
            areas.append(area)
    areas_admin = []
    for nombre in nombres_areas_admin:
        area = _resolver_area(nombre, errores_)
        if area is not None and area not in areas_admin:
            areas_admin.append(area)
    ids_de_la_persona = {a.id for a in areas}
    if cuenta is not None:
        ids_de_la_persona |= {a.id for a in cuenta.areas or []}
    accesos = _resolver_plataformas(nombres_plataformas, nivel,
                                    ids_de_la_persona, errores_)
    for par in _resolver_plataformas(nombres_plataformas_admin, NIVEL_ADMIN,
                                     ids_de_la_persona, errores_):
        if par not in accesos:
            accesos.append(par)
    return areas, accesos, areas_admin, errores_


def _agregar_areas(resumen, cuenta, areas):
    for area in areas:
        if area in cuenta.areas:
            resumen.agregar(cuenta.email, OMITIDO, DETALLE_AREA.format(
                nombre=area.name, texto=TEXTO_YA_ESTABA))
        else:
            cuenta.areas.append(area)
            resumen.agregar(cuenta.email, ACTUALIZADO, DETALLE_AREA.format(
                nombre=area.name, texto=TEXTO_AGREGADA))
    db.session.commit()


def _otorgar(resumen, cuenta, plataforma, nivel, firmar_ya):
    """Un acceso por migración. `firmar_ya`: modo por plataforma con
    `--responsiva-firmada`, el acceso nuevo nace sin firma y se firma aquí."""
    sujeto = cuenta.email

    def linea(estado, texto):
        resumen.agregar(sujeto, estado, DETALLE_ACCESO.format(
            plataforma=plataforma.name, nivel=nivel, texto=texto))

    try:
        # Savepoint: un rechazo no deshace lo ya escrito en la corrida.
        with db.session.begin_nested():
            acceso = services.otorgar(
                cuenta, plataforma, nivel, ORIGEN_MIGRACION,
                manual=services.registro_manual(plataforma))
    except ErrorDeAcceso as error:
        if error.codigo == errores.nivel_vigente().codigo:
            linea(OMITIDO, DETALLE_ACCESO_YA_VIGENTE)
        else:
            linea(ERROR, DETALLE_ACCESO_RECHAZADO.format(codigo=error.codigo))
        return None
    except IntegrityError:
        linea(OMITIDO, DETALLE_ACCESO_YA_VIGENTE)
        return None
    if firmar_ya:
        firmar_accesos([acceso])
    linea(ACTUALIZADO, TEXTO_OTORGADO_FIRMADO if acceso.responsiva_firmada
          else TEXTO_OTORGADO_ESPERA)
    return acceso


def _simular_acceso(resumen, correo, cuenta, plataforma, nivel, firmada):
    """`--dry-run`: lo que haría `_otorgar`, con las mismas reglas de nivel
    pero sin escribir."""
    def linea(estado, texto):
        resumen.agregar(correo, estado, DETALLE_ACCESO.format(
            plataforma=plataforma.name, nivel=nivel, texto=texto))

    if cuenta is not None:
        try:
            rules.acceso_a_reemplazar(vigentes_de(cuenta.id, plataforma.id),
                                      nivel)
        except ErrorDeAcceso as error:
            if error.codigo == errores.nivel_vigente().codigo:
                return linea(OMITIDO, DETALLE_ACCESO_YA_VIGENTE)
            return linea(ERROR, DETALLE_ACCESO_RECHAZADO.format(
                codigo=error.codigo))
    return linea(ACTUALIZADO, TEXTO_SE_OTORGARIA + (
        '; aprovisionamiento encolado' if firmada
        else '; esperaría la firma de la responsiva'))


def migrar_usuario(uid, nombres_areas, nombres_plataformas, nivel,
                   responsiva_firmada, dry_run, rotar,
                   plantilla=SLUG_ONBOARDING, enviar_a=None, notificar=False,
                   nombres_plataformas_admin=(), nombres_areas_admin=()):
    cliente = cliente_o_error()
    if rotar:
        exigir_entrega(dry_run)
    resumen = Resumen()
    uid = uid.strip()

    try:
        persona = cliente.buscar_usuario(uid)
    except ErrorDirectorio:
        return _linea(resumen, uid, ERROR, DETALLE_DIRECTORIO)
    if persona is None:
        return _linea(resumen, uid, ERROR, DETALLE_NO_ENCONTRADA)
    correo = normalizar_correo(persona.correo)
    if uid.lower() in identificadores_de_superadmin(cliente):
        return _linea(resumen, correo or uid, OMITIDO,
                      migracion.DETALLE_SUPERADMIN)
    if not correo:
        return _linea(resumen, uid, ERROR, DETALLE_SIN_CORREO)

    cuenta = User.query.filter(db.func.lower(User.email) == correo).first()
    if cuenta is not None and normalized_role(cuenta) == ROLE_ADMIN:
        return _linea(resumen, correo, OMITIDO, migracion.DETALLE_ADMIN_PORTAL)
    areas, accesos, areas_admin, fallos = validar_catalogo(
        nombres_areas, nombres_plataformas, nivel, cuenta,
        nombres_plataformas_admin, nombres_areas_admin)
    for texto in fallos:
        resumen.agregar(correo, ERROR, texto)
    if fallos:
        return resumen

    # 1. Cuenta del portal y grupo del portal (sin duplicar `migrar-ldap`).
    rol = ROLE_AREA_ADMIN if areas_admin else None
    paso = migracion.migrar(dry_run, False, (), rol, bool(areas_admin), False,
                            solo=[uid])
    resumen.extender(paso)
    if paso.hay_fallos:
        return resumen
    db.session.expire_all()
    cuenta = User.query.filter(db.func.lower(User.email) == correo).first()
    if cuenta is None and not dry_run:
        return _linea(resumen, correo, ERROR, DETALLE_SIN_CUENTA)

    if dry_run:
        _simular(resumen, correo, cuenta, areas, areas_admin, accesos,
                 responsiva_firmada, rotar, enviar_a, notificar)
        return resumen

    # 2. Áreas.
    _agregar_areas(resumen, cuenta, areas)
    # 3. Áreas que administra (servicio del portal, sin actor humano).
    if areas_admin and not _asignar_areas_admin(resumen, cuenta, areas_admin):
        return resumen
    # 4. Responsiva registrada como firmada.
    if responsiva_firmada:
        total = registrar_firma(cuenta, por_migracion=True, actor=ACTOR_CLI)
        db.session.commit()
        resumen.agregar(correo, ACTUALIZADO,
                        DETALLE_RESPONSIVA.format(total=total))
    # 5. Accesos.
    firmar_ya = responsiva_firmada and responsiva_por_plataforma()
    otorgadas = [(p, n) for p, n in accesos
                 if _otorgar(resumen, cuenta, p, n, firmar_ya) is not None]
    db.session.commit()
    sin_fallos = not resumen.hay_fallos
    # Aviso de aprobado (opcional): ya confirmada la transacción; un fallo
    # del correo no deshace nada ni detiene la rotación.
    if notificar:
        _avisar(resumen, cuenta, otorgadas)
    # 6. Rotación: solo si nada falló.
    if rotar and sin_fallos:
        resumen.lineas.append(rotacion.rotar(cuenta, persona.identificador,
                                             plantilla, enviar_a))
    return resumen


def _asignar_areas_admin(resumen, cuenta, areas):
    """`--admin-area`: suma `areas` a las que ya administra la cuenta con el
    mismo servicio que `PUT /users/<id>/managed-areas`. Sin petición, la
    auditoría la registra el actor «sistema». `False` si no es admin de área."""
    if normalized_role(cuenta) != ROLE_AREA_ADMIN:
        resumen.agregar(cuenta.email, ERROR, DETALLE_ROL_SIN_CAMBIO)
        return False
    ya = {a.id for a in cuenta.managed_areas or []}
    ids = sorted(ya | {a.id for a in areas})
    asignar_areas_administradas(cuenta, ids)
    db.session.commit()
    for area in areas:
        resumen.agregar(cuenta.email, OMITIDO if area.id in ya else ACTUALIZADO,
                        DETALLE_ADMIN_AREA.format(
                            nombre=area.name,
                            texto=TEXTO_ADMIN_AREA_YA if area.id in ya
                            else TEXTO_ADMIN_AREA_NUEVA))
    return True


def _avisar(resumen, cuenta, accesos):
    for plataforma, nivel in accesos:
        estado = avisos.notificar_solicitud_aprobada(
            cuenta, plataforma, nivel).get('status')
        if estado == avisos.ENVIADO:
            linea = (ACTUALIZADO, TEXTO_AVISO_ENVIADO)
        elif estado == avisos.OMITIDO:
            linea = (OMITIDO, TEXTO_AVISO_NO_ENVIADO)
        else:
            linea = (ERROR, TEXTO_AVISO_FALLO)
        resumen.agregar(cuenta.email, linea[0], DETALLE_AVISO.format(
            plataforma=plataforma.name, texto=linea[1]))


def _simular(resumen, correo, cuenta, areas, areas_admin, accesos, firmada,
             rotar, enviar_a, notificar):
    for area in areas:
        ya = cuenta is not None and area in cuenta.areas
        resumen.agregar(correo, OMITIDO if ya else ACTUALIZADO,
                        DETALLE_AREA.format(
                            nombre=area.name,
                            texto=TEXTO_YA_ESTABA if ya else TEXTO_SE_AGREGARIA))
    ya_admin = ({a.id for a in cuenta.managed_areas or []}
                if cuenta is not None else set())
    for area in areas_admin:
        ya = area.id in ya_admin
        resumen.agregar(correo, OMITIDO if ya else ACTUALIZADO,
                        DETALLE_ADMIN_AREA.format(
                            nombre=area.name,
                            texto=TEXTO_ADMIN_AREA_YA if ya else
                            TEXTO_SE_HARIA_ADMIN.format(nombre=area.name)))
    if firmada:
        resumen.agregar(correo, ACTUALIZADO, DETALLE_RESPONSIVA_SIMULADA)
    for plataforma, nivel in accesos:
        n = resumen.cuenta(ERROR)
        _simular_acceso(resumen, correo, cuenta, plataforma, nivel, firmada)
        if notificar and resumen.cuenta(ERROR) == n and \
                resumen.lineas[-1].estado == ACTUALIZADO:
            resumen.agregar(correo, ACTUALIZADO, DETALLE_AVISO.format(
                plataforma=plataforma.name,
                texto=TEXTO_SE_NOTIFICARIA.format(correo=correo)))
    if rotar and not resumen.hay_fallos:
        resumen.agregar(correo, ROTADO, rotacion.detalle_dry_run(enviar_a))
