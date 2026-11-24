"""Rotación de la contraseña de LDAP de una persona (FNC-182).

Reutiliza el flujo de credenciales de FNC-138 (`entrega_credenciales`):
contraseña generada con la política → Password Modify → Send de Vaultwarden →
correo con el enlace y el código de acceso del Send (FNC-190; la plantilla
se elige con `--plantilla`, por omisión `onboarding_aduana`). La contraseña vive solo en variables locales: no se
imprime, no se registra ni se guarda.

- `motivo_sin_entrega()` se consulta ANTES de tocar LDAP: sin Vaultwarden o
  correo nadie conocería la contraseña nueva.
- Si el LDAP cambió y la entrega falla, la fila de `credential_deliveries`
  queda `pendientes`: el worker rota otra vez con una contraseña nueva.
"""
import logging

from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.modules.alta.resumen import ERROR, ROTADO, Linea
from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log
from app.modules.directory.configuracion import directorio_activo
from app.modules.notifications import services
from app.modules.provisioning.configuracion import cargar_configuracion
from app.modules.provisioning.reloj import ahora
from app.modules.secretos.sends import servicio_de_sends
from app.modules.secretos.vaultwarden import ErrorDeGestor
from app.modules.users.entrega_credenciales import (
    SLUG_ONBOARDING, enviar_credenciales, fijar_contrasena_en_directorio,
    marcar_enviada, marcar_pendiente, url_del_portal)
from app.modules.users.models import EntregaCredenciales, ESTADO_PENDIENTES
from app.modules.users.politica_contrasena import generar
from app.modules.users.roles import MODULO_AUDITORIA

logger = logging.getLogger(__name__)

MOTIVO_SIN_DIRECTORIO = 'LDAP no está configurado'
MOTIVO_SIN_NOTIFICACIONES = 'las notificaciones están desactivadas (ENABLE_NOTIFICATIONS)'
MOTIVO_SIN_BASE_URL = 'BASE_URL no está configurada'
MOTIVO_SIN_VAULTWARDEN = 'Vaultwarden está deshabilitado o mal configurado'
DETALLE_DRY_RUN = 'se rotaría la contraseña de LDAP'
DETALLE_DRY_RUN_A = ('se rotaría la contraseña de LDAP y se enviaría a {correo} '
                     '(no al correo de la persona)')
DETALLE_ROTADO = 'contraseña nueva entregada por Send y correo'
DETALLE_SIN_CAMBIO = 'directorio: {codigo}; la contraseña no cambió'
DETALLE_PENDIENTE = ('la contraseña cambió en LDAP pero no se entregó ({codigo}); '
                     'queda pendiente para el worker')
DETALLE_SIN_REGISTRO = 'no se pudo registrar la entrega en la BD'


def detalle_dry_run(destinatario=None):
    """Texto de `--dry-run` para una rotación."""
    return (DETALLE_DRY_RUN_A.format(correo=destinatario) if destinatario
            else DETALLE_DRY_RUN)


def motivo_sin_entrega():
    """Por qué no se puede rotar con entrega, o `None` si todo está listo."""
    if not directorio_activo():
        return MOTIVO_SIN_DIRECTORIO
    if not services.notifications_enabled():
        return MOTIVO_SIN_NOTIFICACIONES
    if not url_del_portal():
        return MOTIVO_SIN_BASE_URL
    try:
        servicio_de_sends()
    except ErrorDeGestor:
        return MOTIVO_SIN_VAULTWARDEN
    return None


def _entrega_de(cuenta, uid, cfg, plantilla, destinatario):
    entrega = cuenta.credential_delivery
    if entrega is None:
        entrega = EntregaCredenciales(
            cuenta=cuenta, uid=uid, status=ESTADO_PENDIENTES,
            attempts_count=0, max_attempts=cfg.max_intentos)
        db.session.add(entrega)
    entrega.uid = uid
    entrega.plantilla = plantilla  # los reintentos del worker la repiten
    entrega.destinatario = destinatario
    return entrega


def rotar(cuenta, uid, plantilla=SLUG_ONBOARDING, destinatario=None):
    """Rota la contraseña de `uid` y la entrega a `cuenta` con el correo
    `plantilla`; devuelve `Linea`. Con `destinatario` (solo CLI, `--enviar-a`)
    el correo va a ese buzón y no al de la cuenta; la entrega lo guarda para
    los reintentos del worker."""
    sujeto = cuenta.email
    cfg = cargar_configuracion()
    correo, nombre = destinatario or cuenta.email, cuenta.nombre
    entrega = cuenta.credential_delivery
    send_anterior = entrega.send_id if entrega is not None else None

    contrasena = generar()
    codigo = fijar_contrasena_en_directorio(uid, contrasena)
    if codigo is not None:
        del contrasena
        return Linea(sujeto, ERROR, DETALLE_SIN_CAMBIO.format(codigo=codigo))
    codigo, send_id = enviar_credenciales(correo, nombre, uid, contrasena,
                                          send_anterior, plantilla)
    del contrasena

    try:
        entrega = _entrega_de(cuenta, uid, cfg, plantilla, destinatario)
        momento = ahora()
        if codigo is None:
            marcar_enviada(entrega, send_id, momento,
                           Evento.CREDENCIALES_REENVIADAS, True)
        else:
            entrega.attempts_count = 1
            marcar_pendiente(entrega, codigo, momento, cfg)
            add_audit_log(Evento.CREDENCIALES_PENDIENTES, status='warning',
                          detail=f'Credenciales pendientes: {codigo}.',
                          module=MODULO_AUDITORIA, target=cuenta.email,
                          target_user_id=cuenta.id,
                          after={'credentials_status': entrega.status},
                          as_system=True, commit=False)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        logger.error('Alta CLI: no se registró la entrega de una rotación.')
        return Linea(sujeto, ERROR, DETALLE_SIN_REGISTRO)
    if codigo is not None:
        return Linea(sujeto, ERROR, DETALLE_PENDIENTE.format(codigo=codigo))
    return Linea(sujeto, ROTADO, DETALLE_ROTADO)
