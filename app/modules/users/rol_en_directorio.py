"""Cambio de rol alineado con el grupo de Authelia en LDAP (FNC-184).

Authelia decide el rol por el grupo (`oidc_cuentas.rol_desde_grupos`) y lo
recalcula en cada inicio de sesión. Si el portal cambiara el rol sin mover el
grupo, el siguiente login lo revertiría. Por eso, para cuentas del directorio
(`sso`/`ldap`), el grupo se mueve ANTES de cambiar el rol y, si no se puede,
el rol no cambia y se responde con error.

Las cuentas `local` no están en LDAP: no se toca el directorio.
Devuelven `None` si salió bien o `(mensaje, HTTP, code)`.
"""
import logging

from app.modules.auth.services import ORIGENES_VINCULADOS
from app.modules.directory.configuracion import directorio_activo
from app.modules.directory.writer import EscritorDirectorio
from app.modules.users.grupos_de_rol import sincronizar_grupo_de_rol

logger = logging.getLogger(__name__)

DIRECTORIO_NO_DISPONIBLE = ('No se pudo cambiar el rol: el directorio (LDAP) no '
                            'está disponible.', 503, 'directorio_no_disponible')
SIN_CUENTA_EN_DIRECTORIO = ('No se pudo cambiar el rol: la cuenta no está en el '
                            'directorio (LDAP).', 409,
                            'cuenta_no_encontrada_en_directorio')
GRUPO_NO_ACTUALIZADO = ('No se pudo actualizar el grupo en el directorio; el rol '
                        'no se cambió.', 503, 'grupo_no_actualizado')


def es_cuenta_del_directorio(cuenta):
    return (cuenta.auth_source or '') in ORIGENES_VINCULADOS


def _persona(cuenta):
    """`(escritor, persona, error)` de la cuenta en LDAP por su correo."""
    if not directorio_activo():
        return None, None, DIRECTORIO_NO_DISPONIBLE
    try:
        escritor = EscritorDirectorio()
        persona = escritor.cliente.buscar_por_correo(cuenta.email)
    except Exception as exc:  # solo el tipo: el texto puede nombrar a la persona
        logger.error('Rol: búsqueda en LDAP fallida (%s).', type(exc).__name__)
        return None, None, DIRECTORIO_NO_DISPONIBLE
    if persona is None:
        return None, None, SIN_CUENTA_EN_DIRECTORIO
    return escritor, persona, None


def mover_grupo_de_rol(cuenta, rol):
    """Deja a la cuenta solo en el grupo de `rol`. Llamar antes de
    `cambiar_rol`; si devuelve error, no cambiar el rol."""
    if not es_cuenta_del_directorio(cuenta):
        return None
    escritor, persona, error = _persona(cuenta)
    if error:
        return error
    if not sincronizar_grupo_de_rol(escritor, persona.dn, rol,
                                    quitar_del_otro=True):
        return GRUPO_NO_ACTUALIZADO
    return None


def revertir_grupo_de_rol(cuenta, rol_anterior):
    """Si otra parte de la misma petición falla, regresa el grupo al rol
    anterior (mejor esfuerzo; un fallo queda en el log)."""
    if mover_grupo_de_rol(cuenta, rol_anterior):
        logger.error('Rol: no se pudo regresar el grupo de LDAP al rol anterior.')
