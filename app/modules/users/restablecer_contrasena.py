"""Cambio de contraseña desde «Editar usuario» (`PUT /users/<id>`, FNC-161).

El destino depende del origen de la cuenta (`auth_source`):

- `local`: hash en la BD del portal (`set_password`), como hasta ahora, para
  cualquier cuenta local que quien edita pueda gestionar.
- `ldap` y `sso` (FNC-165: Authelia autentica contra el mismo OpenLDAP, así
  que la cuenta `sso` vive en `LDAP_USERS_BASE_DN`): Password Modify en el
  directorio (nunca hay hash en la BD); la contraseña debe cumplir la política
  `PASSWORD_POLICY_*` y solo la cambia el superadmin.
- cualquier otro origen: se rechaza como campo no permitido.

La contraseña nunca se registra, se audita ni se devuelve. Las funciones
devuelven `None` si salió bien o la tupla `(mensaje, HTTP, code)` del contrato.
"""
import logging

from flask_login import current_user

from app.authz import is_admin
from app.modules.auth.acceso_local import es_origen_local
from app.modules.auth.oidc_cuentas import ORIGEN_OIDC
from app.modules.auth.services import ORIGEN_DIRECTORIO
from app.modules.directory.configuracion import directorio_activo
from app.modules.directory.ldap_client import ClienteDirectorio, ErrorDirectorio
from app.modules.users.entrega_credenciales import (
    CODIGO_CONTRASENA_RECHAZADA, fijar_contrasena_en_directorio)
from app.modules.provisioning.reloj import ahora
from app.modules.users.models import ESTADO_ENVIADAS, ESTADO_PENDIENTES
from app.modules.users.politica_contrasena import (MENSAJE_RECHAZO_DIRECTORIO,
                                                   mensaje_de_incumplimiento)

logger = logging.getLogger(__name__)

NO_PERMITIDO = ('Hay campos que no se pueden enviar.', 400,
                'campo_no_permitido')
SOLO_SUPERADMIN = ('Solo el superadmin puede cambiar la contraseña de una '
                   'cuenta del directorio.', 403, 'solo_superadmin')
SIN_CUENTA_EN_DIRECTORIO = ('No se encontró la cuenta en el directorio.', 409,
                            'cuenta_no_encontrada_en_directorio')
DIRECTORIO_NO_DISPONIBLE = ('No se pudo actualizar la contraseña en el '
                            'directorio.', 503, 'directorio_no_disponible')
CONTRASENA_INVALIDA = 'La contraseña no es válida.'


# Orígenes cuya contraseña vive en el directorio: la cuenta creada por el
# portal (`ldap`) y la creada al primer login por Authelia (`sso`, FNC-165).
ORIGENES_EN_DIRECTORIO = frozenset({ORIGEN_DIRECTORIO, ORIGEN_OIDC})


def es_cuenta_del_directorio(cuenta):
    return (cuenta.auth_source or '') in ORIGENES_EN_DIRECTORIO


def _cuenta_en_directorio(cuenta):
    """Identificador de la cuenta en el directorio: el `uid` de su entrega de
    credenciales o, si no hay, el DN real de la entrada con el correo de la
    cuenta bajo `LDAP_USERS_BASE_DN` (FNC-165: el DN encontrado, no uno
    reconstruido con `LDAP_USER_ATTR`).

    Devuelve `(identificador, error)`: sin ambos la cuenta no está en el
    directorio; con `error`, el directorio no respondió o es ambiguo."""
    entrega = cuenta.credential_delivery
    if entrega is not None and entrega.uid:
        return entrega.uid, None
    try:
        persona = ClienteDirectorio().buscar_por_correo(cuenta.email)
    except ErrorDirectorio as exc:  # incluye PersonaAmbigua; sin el correo
        logger.error('Contraseña: búsqueda en el directorio fallida (%s).',
                     type(exc).__name__)
        return None, DIRECTORIO_NO_DISPONIBLE
    except Exception as exc:  # configuración inválida u otro: solo el tipo
        logger.error('Contraseña: fallo inesperado del directorio (%s).',
                     type(exc).__name__)
        return None, DIRECTORIO_NO_DISPONIBLE
    return (persona.dn if persona else None), None


def validar_cambio(cuenta, contrasena):
    """Rechazos que no necesitan el directorio (antes de tocar nada)."""
    if not isinstance(contrasena, str) or not contrasena:
        return (CONTRASENA_INVALIDA, 400, 'contrasena_invalida')
    if es_origen_local(cuenta):
        return None
    if not es_cuenta_del_directorio(cuenta):
        return NO_PERMITIDO
    if not is_admin(current_user):
        return SOLO_SUPERADMIN
    mensaje = mensaje_de_incumplimiento(contrasena)
    if mensaje:
        return (mensaje, 400, 'contrasena_invalida')
    return None


def aplicar_cambio(cuenta, contrasena):
    """Guarda la contraseña donde corresponde. Llamar tras `validar_cambio`.

    Local: deja el hash en la sesión (la petición hace el commit). LDAP:
    Password Modify inmediato; no toca la BD.
    """
    if es_origen_local(cuenta):
        cuenta.set_password(contrasena)
        return None
    if not directorio_activo():
        return DIRECTORIO_NO_DISPONIBLE
    identificador, error = _cuenta_en_directorio(cuenta)
    if error:
        return error
    if not identificador:
        return SIN_CUENTA_EN_DIRECTORIO
    codigo = fijar_contrasena_en_directorio(identificador, contrasena)
    if codigo == CODIGO_CONTRASENA_RECHAZADA:
        return (MENSAJE_RECHAZO_DIRECTORIO, 400, 'contrasena_rechazada')
    if codigo:
        return DIRECTORIO_NO_DISPONIBLE
    _cerrar_entrega_pendiente(cuenta)
    return None


def _cerrar_entrega_pendiente(cuenta):
    """La contraseña ya la fijó un superadmin: la entrega por Send pendiente se
    cierra para que el worker no la reintente y ponga otra contraseña encima.
    La petición hace el commit."""
    entrega = cuenta.credential_delivery
    if entrega is None or entrega.status != ESTADO_PENDIENTES:
        return
    entrega.status = ESTADO_ENVIADAS
    entrega.next_attempt_at = None
    entrega.last_error = None
    entrega.locked_at = None
    entrega.locked_by = None
    entrega.updated_at = ahora()
