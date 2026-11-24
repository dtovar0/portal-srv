"""Reglas comunes de las cuentas que entran al portal.

El inicio de sesión de las personas es OIDC con Authelia (`oidc.py`,
`oidc_cuentas.py`, ADR-009); el login directo contra LDAP se retiró (FNC-141).
"""

# Respuesta única de login local fallido: no distingue usuario inexistente de
# contraseña incorrecta (SEG-12).
MENSAJE_CREDENCIALES = 'Credenciales incorrectas.'

# Cuenta del directorio: vive en OpenLDAP y entra por Authelia (que está
# entre el portal y LDAP). Decisión del dueño (2026-11-24, FNC-168): las altas
# del portal también son `sso`; `ldap` queda solo como origen heredado
# (la migración 0019 convierte las existentes).
ORIGEN_SSO = 'sso'
ORIGEN_LDAP_HEREDADO = 'ldap'
# Origen de las cuentas dadas de alta en el directorio desde el portal.
ORIGEN_DIRECTORIO = ORIGEN_SSO

# Orígenes de cuentas del directorio: su contraseña vive solo en LDAP. Una
# cuenta con otro origen o con contraseña local no se vincula sola
# (decisión del dueño 2026-10-15: bloquear y avisar).
ORIGENES_VINCULADOS = frozenset({ORIGEN_SSO, ORIGEN_LDAP_HEREDADO})
MOTIVO_CONFLICTO = 'cuenta_local_en_conflicto'
MOTIVO_DESACTIVADA = 'cuenta_desactivada'


def normalizar_correo(correo):
    """Correo sin espacios y en minúsculas, como en `crud` y `admin`."""
    return (correo or '').strip().lower()


def motivo_de_bloqueo(cuenta):
    """Por qué no se abre sesión con una cuenta existente, o `None`.

    - Cuenta local (o con contraseña local): conflicto; nunca se toma ni se
      convierte, sea cual sea su rol.
    - Cuenta desactivada: no entra ni se modifica.
    """
    if cuenta.auth_source not in ORIGENES_VINCULADOS or cuenta.password_hash:
        return MOTIVO_CONFLICTO
    if not cuenta.is_active:
        return MOTIVO_DESACTIVADA
    return None


def avisar_bloqueo(cuenta, via, motivo):
    """Audita (aviso) un acceso rechazado por el estado de la cuenta."""
    from app.modules.audit.services import add_audit_log
    add_audit_log('ACCESO BLOQUEADO', status='warning', target=cuenta.email,
                  target_user_id=cuenta.id,
                  detail=f'{via}: {motivo}; la cuenta no se modificó')
