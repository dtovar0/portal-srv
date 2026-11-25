"""Rotar y enviar la contraseña de una cuenta del directorio (FNC-190).

`POST /api/v1/users/<id>/rotar-contrasena` (solo superadmin): genera una
contraseña con la política, la fija en LDAP (Password Modify) y la entrega por
Send de Vaultwarden con código de acceso y correo (`credenciales_iniciales`),
con el mismo flujo y reintentos del worker que el alta (`entrega_credenciales`).

- Solo cuentas `sso`/`ldap`; una cuenta local no tiene contraseña en LDAP.
- Todo lo que pueda impedir la entrega se verifica ANTES de tocar LDAP
  (`codigo_sin_entrega`): nadie se queda con una contraseña que nadie conoce.
- La contraseña, el enlace y el código viven solo en variables locales: no se
  devuelven, ni se registran, ni se auditan.
- Si LDAP cambió y la entrega falla, la fila queda `pendientes` y el worker
  rota otra vez con una contraseña nueva (decisión 4 de FNC-138).

Las funciones devuelven `None` o la tupla `(mensaje, HTTP, code)` del contrato.
"""
import logging

from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log
from app.modules.directory.configuracion import directorio_activo
from app.modules.directory.errors import MENSAJE_SIN_PERMISO
from app.modules.directory.ldap_client import ClienteDirectorio
from app.modules.notifications import services
from app.modules.provisioning.configuracion import cargar_configuracion
from app.modules.provisioning.reloj import ahora
from app.modules.secretos.sends import servicio_de_sends
from app.modules.secretos.vaultwarden import ErrorDeGestor
from app.modules.users.entrega_credenciales import (
    CODIGO_DIRECTORIO, CODIGO_GESTOR_MAL_CONFIGURADO, CODIGO_SIN_PERMISO,
    CODIGO_SIN_BASE_URL, CODIGO_SIN_NOTIFICACIONES, SLUG_INICIALES,
    enviar_credenciales, fijar_contrasena_en_directorio, marcar_enviada,
    marcar_pendiente, url_del_portal)
from app.modules.users.models import EntregaCredenciales, ESTADO_PENDIENTES
from app.modules.users.politica_contrasena import generar
from app.modules.users.roles import MODULO_AUDITORIA

logger = logging.getLogger(__name__)

ACCION_AUDITORIA = 'ADMIN: ROTAR CONTRASEÑA'
NO_ES_DEL_DIRECTORIO = ('Solo se puede rotar la contraseña de una cuenta del '
                        'directorio.', 400, 'cuenta_no_es_del_directorio')
SIN_CUENTA_EN_DIRECTORIO = ('No se encontró la cuenta en el directorio.', 409,
                            'cuenta_no_encontrada_en_directorio')
NO_SE_REGISTRO = ('No se pudo registrar la entrega.', 500, 'error_interno')
# Código interno → (mensaje, HTTP 503, `code` del contrato).
_NO_LISTO = {
    CODIGO_DIRECTORIO: ('El directorio no está disponible.',
                        'directorio_no_disponible'),
    CODIGO_SIN_PERMISO: (MENSAJE_SIN_PERMISO, 'sin_permiso_en_directorio'),
    CODIGO_SIN_NOTIFICACIONES: ('Las notificaciones están desactivadas.',
                                'notificaciones_desactivadas'),
    CODIGO_SIN_BASE_URL: ('BASE_URL no está configurada.',
                          'base_url_no_configurada'),
    CODIGO_GESTOR_MAL_CONFIGURADO: ('Vaultwarden está deshabilitado o mal '
                                    'configurado.', 'gestor_no_disponible'),
}


def codigo_sin_entrega():
    """Código de lo que impide entregar la contraseña, o `None` si todo está
    listo (se consulta antes de cambiar nada en LDAP)."""
    if not directorio_activo():
        return CODIGO_DIRECTORIO
    if not services.notifications_enabled():
        return CODIGO_SIN_NOTIFICACIONES
    if not url_del_portal():
        return CODIGO_SIN_BASE_URL
    try:
        servicio_de_sends()
    except ErrorDeGestor:
        return CODIGO_GESTOR_MAL_CONFIGURADO
    return None


def _error_no_listo(codigo):
    mensaje, code = _NO_LISTO[codigo]
    return (mensaje, 503, code)


def _identificador(cuenta):
    """`uid` de la cuenta en el directorio: el de su entrega o el de la persona
    con su correo. `(uid, error)`; sin ambos, la cuenta no está en el directorio."""
    entrega = cuenta.credential_delivery
    if entrega is not None and entrega.uid:
        return entrega.uid, None
    try:
        persona = ClienteDirectorio().buscar_por_correo(cuenta.email)
    except Exception as exc:  # solo el tipo: el texto puede nombrar a la persona
        logger.error('Rotación: búsqueda en el directorio fallida (%s).',
                     type(exc).__name__)
        return None, _error_no_listo(CODIGO_DIRECTORIO)
    if persona is None:
        return None, SIN_CUENTA_EN_DIRECTORIO
    return persona.identificador, None


def _registrar(cuenta, uid, codigo, send_id, cfg):
    """Fila de la entrega y auditoría en una transacción; devuelve su estado."""
    entrega = cuenta.credential_delivery
    if entrega is None:
        entrega = EntregaCredenciales(
            cuenta=cuenta, uid=uid, status=ESTADO_PENDIENTES,
            attempts_count=0, max_attempts=cfg.max_intentos)
        db.session.add(entrega)
    entrega.uid = uid
    entrega.plantilla = SLUG_INICIALES
    entrega.destinatario = None  # el portal siempre entrega al correo de la cuenta
    momento = ahora()
    if codigo is None:
        marcar_enviada(entrega, send_id, momento,
                       Evento.CREDENCIALES_REENVIADAS, False)
    else:
        entrega.attempts_count = 1
        marcar_pendiente(entrega, codigo, momento, cfg)
        add_audit_log(Evento.CREDENCIALES_PENDIENTES, status='warning',
                      detail=f'Credenciales pendientes: {codigo}.',
                      module=MODULO_AUDITORIA, target=cuenta.email,
                      target_user_id=cuenta.id,
                      after={'credentials_status': entrega.status},
                      commit=False)
    add_audit_log(ACCION_AUDITORIA, module=MODULO_AUDITORIA,
                  target=cuenta.email, target_user_id=cuenta.id,
                  status='success' if codigo is None else 'warning',
                  detail='Contraseña rotada y entregada por Send.'
                  if codigo is None else
                  'Contraseña rotada; la entrega quedó pendiente.',
                  commit=False)
    db.session.commit()
    return entrega.status


def rotar_y_enviar(cuenta):
    """Rota y entrega. `(estado_de_la_entrega, None)` o `(None, error)`."""
    sin_entrega = codigo_sin_entrega()
    if sin_entrega:
        return None, _error_no_listo(sin_entrega)
    uid, error = _identificador(cuenta)
    if error:
        return None, error
    cfg = cargar_configuracion()
    correo, nombre = cuenta.email, cuenta.nombre
    send_anterior = (cuenta.credential_delivery.send_id
                     if cuenta.credential_delivery is not None else None)

    contrasena = generar()
    codigo = fijar_contrasena_en_directorio(uid, contrasena)
    if codigo is not None:
        del contrasena
        return None, _error_no_listo(
            CODIGO_SIN_PERMISO if codigo == CODIGO_SIN_PERMISO
            else CODIGO_DIRECTORIO)
    codigo, send_id = enviar_credenciales(correo, nombre, uid, contrasena,
                                          send_anterior, SLUG_INICIALES)
    del contrasena
    try:
        return _registrar(cuenta, uid, codigo, send_id, cfg), None
    except SQLAlchemyError:
        db.session.rollback()
        logger.error('Rotación: no se registró la entrega.')
        return None, NO_SE_REGISTRO
