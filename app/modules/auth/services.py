"""Reglas comunes de las cuentas que entran al portal.

El inicio de sesión de las personas es OIDC con Authelia (`oidc.py`,
`oidc_cuentas.py`, ADR-009); el login directo contra LDAP se retiró (FNC-141).
"""

# Respuesta única de login local fallido: no distingue usuario inexistente de
# contraseña incorrecta (SEG-12).
MENSAJE_CREDENCIALES = 'Credenciales incorrectas.'

# Origen de las cuentas dadas de alta en el directorio desde el portal.
ORIGEN_DIRECTORIO = 'ldap'

# Orígenes de cuentas del directorio (altas del portal en LDAP o inicio por
# Authelia, que usa el mismo directorio). Una cuenta con otro origen o con contraseña local no se
# vincula sola (decisión del dueño 2026-10-15: bloquear y avisar).
ORIGENES_VINCULADOS = frozenset({'ldap', 'sso'})
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
