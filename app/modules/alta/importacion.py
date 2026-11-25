"""Altas desde CSV por CLI: áreas, plataformas y usuarios (FNC-182).

Las validaciones y la creación son las de `bulk_import.services` (las mismas
del API de importación masiva); aquí solo se arma el resumen por fila y, para
los usuarios, la parte opcional de LDAP.
"""
import logging
from dataclasses import replace

import click

from app import db
from app.authz import ROLE_ADMIN, ROLE_USER
from app.modules.alta import grupo_portal, rotacion
from app.modules.alta.grupos_ldap import identificadores_de_superadmin
from app.modules.alta.resumen import (ACTOR_CLI, CONFLICTO, CREADO, ERROR,
                                      OMITIDO, ROTADO, Resumen)
from app.modules.audit.services import add_audit_log
from app.modules.auth.models import User
from app.modules.auth.services import ORIGEN_SSO
from app.modules.bulk_import.services import (MAX_REGISTROS_POR_LOTE,
                                              MENSAJE_ERROR_INTERNO,
                                              ejecutar_importacion_masiva,
                                              procesar_usuarios)
from app.modules.core.models import Area
from app.modules.directory.configuracion import (ErrorConfiguracionDirectorio,
                                                 directorio_activo)
from app.modules.directory.ldap_client import (ClienteDirectorio,
                                               ErrorDirectorio, PersonaAmbigua)
from app.modules.users.areas_administradas import CAMPO_AREAS as CAMPO_AREAS_API
from app.modules.users.directory_accounts import (
    CAMPO_APELLIDO as CAMPO_APELLIDO_API, CAMPO_CONTRASENA as CAMPO_CONTRASENA_API,
    CAMPO_CORREO as CAMPO_CORREO_API, CAMPO_NOMBRE as CAMPO_NOMBRE_API,
    CAMPO_UID as CAMPO_UID_API, crear_cuenta_directorio, validar_alta)
from app.modules.users.entrega_credenciales import SLUG_ONBOARDING
from app.modules.users.politica_contrasena import generar

logger = logging.getLogger(__name__)

ENTIDAD_AREAS = 'areas'
ENTIDAD_PLATAFORMAS = 'plataformas'
ENTIDAD_USUARIOS = 'usuarios'
ESTADO_FILA_VALIDA = 'valid'
CAMPO_UID = 'uid'
CAMPO_APELLIDO = 'apellido'
HTTP_CONFLICTO = 409

MENSAJE_SIN_LDAP = 'LDAP no está configurado; no se puede usar --crear-en-ldap.'
MENSAJE_FLAGS = ('--omitir-si-existe-en-ldap y --rotar-contrasena requieren '
                 '--crear-en-ldap.')
MENSAJE_SIN_ENTREGA = ('No se puede entregar contraseñas: {motivo}. No se '
                       'escribió nada.')
MENSAJE_ENTREGA_VERIFICADA = ('Vaultwarden acepta las credenciales '
                              'configuradas (verificado; no se creó ningún '
                              'Send).')
DETALLE_SUPERADMIN = 'omitido: superadmin'
DETALLE_PORTAL = 'cuenta del portal'
DETALLE_VINCULADO = 'ya estaba en LDAP: cuenta del portal vinculada (sso)'
DETALLE_LDAP_Y_PORTAL = 'creada en LDAP y en el portal; contraseña entregada por Send'
DETALLE_EXISTE_EN_LDAP = ('ya existe en LDAP; usa --omitir-si-existe-en-ldap '
                          'para solo vincularla')
DETALLE_AMBIGUA = 'el correo corresponde a más de una persona en LDAP'
DETALLE_DIRECTORIO = 'no se pudo consultar el directorio'


def auditar_corrida(entidad, resumen, dry_run):
    """Una entrada de auditoría por corrida real, con actor «sistema/CLI»."""
    if dry_run:
        return
    add_audit_log(f'ALTA POR CLI: {entidad}', module='Ajustes',
                  status='warning' if resumen.hay_fallos else 'success',
                  detail=f'{resumen.totales()}.', user_override=ACTOR_CLI)


def _nombre_de_item(item):
    return item.get('email') or item.get('name') or f'fila {item.get("row")}'


def resumen_de_items(resultado, detalle_ok, resumen=None):
    """Pasa los `items` de `bulk_import` a líneas del resumen."""
    resumen = resumen or Resumen()
    for item in resultado.get('items', []):
        if item.get('status') == ESTADO_FILA_VALIDA:
            resumen.agregar(_nombre_de_item(item), CREADO, detalle_ok)
        else:
            resumen.agregar(_nombre_de_item(item), ERROR,
                            item.get('error') or '')
    return resumen


def importar_catalogo(entidad, registros, dry_run):
    """Áreas o plataformas con las reglas del API de importación masiva."""
    resultado, http = ejecutar_importacion_masiva(entidad, registros,
                                                  dry_run=dry_run)
    resumen = Resumen()
    if http != 200:
        resumen.agregar(entidad, ERROR, resultado.get('message', ''))
        return resumen
    resumen_de_items(resultado, entidad, resumen)
    return resumen


def actor_cli():
    """Actor de las reglas de rol: la CLI actúa como superadmin (no se guarda)."""
    return User(email=ACTOR_CLI, role=ROLE_ADMIN, is_active=True)


def crear_usuarios_en_portal(registros, dry_run, auth_source=None):
    """`procesar_usuarios` con rollback ante un fallo; `(resultado, error)`."""
    if not registros:
        return {'items': []}, None
    try:
        return procesar_usuarios(registros, dry_run=dry_run,
                                 auth_source=auth_source,
                                 actor=actor_cli()), None
    except Exception:
        db.session.rollback()
        logger.exception('Alta por CLI: falló la creación de usuarios')
        return None, MENSAJE_ERROR_INTERNO


def cliente_o_error():
    if not directorio_activo():
        raise click.ClickException(MENSAJE_SIN_LDAP)
    try:
        return ClienteDirectorio()
    except ErrorConfiguracionDirectorio:
        raise click.ClickException(MENSAJE_SIN_LDAP) from None


def exigir_entrega(dry_run=False):
    """Termina el comando si no se puede entregar (incluye el login real a
    Vaultwarden, FNC-205: una sola vez por corrida, antes de cualquier
    escritura). En `--dry-run` también verifica (solo lectura) e informa."""
    motivo = rotacion.motivo_sin_entrega()
    if motivo:
        raise click.ClickException(MENSAJE_SIN_ENTREGA.format(motivo=motivo))
    if dry_run:
        click.echo(MENSAJE_ENTREGA_VERIFICADA)


def _separar_nombre(reg):
    """(nombre, apellido) para LDAP: columna `apellido` o la última palabra."""
    completo = (reg.get('nombre') or reg.get('name') or '').strip()
    apellido = (reg.get(CAMPO_APELLIDO) or '').strip()
    if apellido:
        return completo, apellido
    partes = completo.split()
    if len(partes) > 1:
        return ' '.join(partes[:-1]), partes[-1]
    return completo, completo


def _uid_de(reg, correo):
    return (reg.get(CAMPO_UID) or correo.split('@')[0]).strip().lower()


def _crear_en_ldap(reg, item, correo, resumen):
    """Crea la cuenta con las mismas validaciones del API (`validar_alta`)."""
    nombre, apellido = _separar_nombre(reg)
    areas = (Area.query.filter(Area.name.in_(item.get('areas', []))).all()
             if item.get('areas') else [])
    alta, _, campos = validar_alta({
        CAMPO_UID_API: _uid_de(reg, correo), CAMPO_CORREO_API: correo,
        CAMPO_NOMBRE_API: nombre, CAMPO_APELLIDO_API: apellido,
        CAMPO_AREAS_API: [a.id for a in areas], CAMPO_CONTRASENA_API: generar()})
    if alta is None:
        resumen.agregar(correo, ERROR, '; '.join(
            f'{c}: {m}' for c, m in (campos or {}).items()
            if c != CAMPO_CONTRASENA_API))
        return
    alta = replace(alta, role=item.get('role') or ROLE_USER)
    cuenta, error = crear_cuenta_directorio(alta)
    del alta
    if cuenta is not None:
        resumen.agregar(correo, CREADO, DETALLE_LDAP_Y_PORTAL)
    else:
        estado = CONFLICTO if error[1] == HTTP_CONFLICTO else ERROR
        resumen.agregar(correo, estado, error[0])


def importar_usuarios(registros, dry_run, crear_en_ldap, omitir_si_existe,
                      rotar, plantilla=SLUG_ONBOARDING, enviar_a=None):
    """Usuarios del CSV: portal siempre; LDAP solo con `crear_en_ldap`."""
    if (omitir_si_existe or rotar) and not crear_en_ldap:
        raise click.UsageError(MENSAJE_FLAGS)
    resumen = Resumen()
    cliente = None
    if crear_en_ldap:
        cliente = cliente_o_error()
        exigir_entrega(dry_run)

    if len(registros) > MAX_REGISTROS_POR_LOTE:
        resumen.agregar(ENTIDAD_USUARIOS, ERROR, 'lote demasiado grande')
        return resumen
    previo, error = crear_usuarios_en_portal(registros, dry_run=True)
    if error:
        resumen.agregar(ENTIDAD_USUARIOS, ERROR, error)
        return resumen
    validos = []
    for reg, item in zip(registros, previo['items']):
        if item.get('status') == ESTADO_FILA_VALIDA:
            validos.append((reg, item))
        else:
            resumen.agregar(_nombre_de_item(item), ERROR, item.get('error') or '')

    solo_portal, vinculados = [], []   # vinculados: (reg, item, persona)
    superadmins = (identificadores_de_superadmin(cliente) if cliente else set())
    for reg, item in validos:
        correo = item['email']
        if cliente is None:
            solo_portal.append(reg)
            continue
        try:
            persona = cliente.buscar_por_correo(correo)
        except PersonaAmbigua:
            resumen.agregar(correo, CONFLICTO, DETALLE_AMBIGUA)
            continue
        except ErrorDirectorio:
            resumen.agregar(correo, ERROR, DETALLE_DIRECTORIO)
            continue
        if persona is not None and persona.identificador.lower() in superadmins:
            resumen.agregar(correo, OMITIDO, DETALLE_SUPERADMIN)
        elif persona is None:
            if dry_run:
                resumen.agregar(correo, CREADO,
                                'se crearía en LDAP y en el portal')
            else:
                _crear_en_ldap(reg, item, correo, resumen)
        elif omitir_si_existe:
            vinculados.append((reg, item, persona))
        else:
            resumen.agregar(correo, CONFLICTO, DETALLE_EXISTE_EN_LDAP)

    resultado, error = crear_usuarios_en_portal(solo_portal, dry_run)
    if error:
        resumen.agregar(ENTIDAD_USUARIOS, ERROR, error)
    else:
        resumen_de_items(resultado, DETALLE_PORTAL, resumen)
    resultado, error = crear_usuarios_en_portal(
        [reg for reg, _, _ in vinculados], dry_run, auth_source=ORIGEN_SSO)
    if error:
        resumen.agregar(ENTIDAD_USUARIOS, ERROR, error)
        return resumen
    resumen_de_items(resultado, DETALLE_VINCULADO, resumen)
    _grupo_y_rotacion(cliente, resultado, vinculados, rotar, dry_run, resumen,
                       plantilla, enviar_a)
    return resumen


def _grupo_y_rotacion(cliente, resultado, vinculados, rotar, dry_run, resumen,
                      plantilla, enviar_a=None):
    """Para los vinculados creados: grupo del portal y, si se pide, rotación."""
    validos = {i.get('email') for i in resultado['items']
               if i.get('status') == ESTADO_FILA_VALIDA}
    for _, item, persona in vinculados:
        correo = item['email']
        if correo not in validos:
            continue
        resumen.lineas.append(grupo_portal.asegurar_grupo(
            cliente, persona, correo, item.get('role') or ROLE_USER, dry_run))
        if not rotar:
            continue
        if dry_run:
            resumen.agregar(correo, ROTADO, rotacion.detalle_dry_run(enviar_a))
            continue
        cuenta = User.query.filter_by(email=correo).first()
        resumen.lineas.append(rotacion.rotar(cuenta, persona.identificador,
                                             plantilla, enviar_a))
