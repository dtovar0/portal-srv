"""Límite de intentos de inicio de sesión (FNC-014, SEG-11).

- Cuenta los `ACCESO FALLIDO` de la auditoría en la ventana: por cuenta
  (`target`) y por IP del cliente. Sin tabla nueva y compartido entre los
  procesos de Gunicorn (todos escriben la misma auditoría).
- Al llegar al máximo, `POST /auth/login` responde `429` sin intentar la
  autenticación (ni LDAP ni contraseña local) hasta que salgan de la ventana.
- La **cuenta de emergencia** (FNC-154) no se bloquea por fallos de cuenta:
  quien conozca su nombre podría bloquearla a propósito justo cuando
  Authelia está caído. Para ella cuenta solo el límite por IP.
- Variables (`docs/configuracion/VARIABLES.md`): `LOGIN_MAX_INTENTOS_CUENTA`,
  `LOGIN_MAX_INTENTOS_IP` y `LOGIN_VENTANA_MINUTOS`.
"""
import os
from datetime import datetime, timedelta

from sqlalchemy import func

from app.modules.audit.ip_cliente import ip_cliente
from app.modules.audit.models import AuditLog

ACCION_FALLIDA = 'ACCESO FALLIDO'
MAX_INTENTOS_CUENTA = 10
MAX_INTENTOS_IP = 30
VENTANA_MINUTOS = 15
MENSAJE_BLOQUEO = ('Demasiados intentos fallidos. Espera unos minutos antes de '
                   'volver a intentarlo.')


def _entero(nombre, por_defecto):
    valor = (os.getenv(nombre) or '').strip()
    return int(valor) if valor.isdigit() and int(valor) > 0 else por_defecto


def _fallidos_desde(desde, *condiciones):
    return (AuditLog.query
            .filter(AuditLog.action == ACCION_FALLIDA,
                    AuditLog.timestamp >= desde, *condiciones)
            .count())


def bloqueado(correo, omitir_limite_de_cuenta=False):
    """`True` si la cuenta o la IP superan los intentos fallidos de la ventana.

    `omitir_limite_de_cuenta` (cuenta de emergencia, FNC-154): solo aplica el de IP.
    """
    ventana = timedelta(minutes=_entero('LOGIN_VENTANA_MINUTOS', VENTANA_MINUTOS))
    desde = datetime.now() - ventana
    cuenta = (correo or '').strip().lower()
    if (cuenta and not omitir_limite_de_cuenta
            and _fallidos_desde(desde, func.lower(AuditLog.target) == cuenta) >= \
            _entero('LOGIN_MAX_INTENTOS_CUENTA', MAX_INTENTOS_CUENTA)):
        return True
    ip = ip_cliente()
    return bool(ip) and _fallidos_desde(desde, AuditLog.ip_address == ip) >= \
        _entero('LOGIN_MAX_INTENTOS_IP', MAX_INTENTOS_IP)
