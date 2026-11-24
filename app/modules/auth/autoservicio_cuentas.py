"""Cuenta del portal que corresponde a quien usa el autoservicio (FNC-168).

- La búsqueda es exacta (sin comodines de `LIKE`): `%` o `_` en lo que
  escribe la persona no encuentran cuentas ajenas.
- Solo las cuentas `local` guardan la contraseña en la BD. Las del
  directorio (`sso`, `ldap`) la tienen solo en OpenLDAP: un hash local las
  bloquearía al entrar por Authelia (`motivo_de_bloqueo`).
"""
from app import db
from app.modules.auth.acceso_local import es_origen_local
from app.modules.auth.models import User

SEPARADOR_CORREO = '@'
ESCAPE_LIKE = '\\'


def _escapar_like(texto):
    return (texto.replace(ESCAPE_LIKE, ESCAPE_LIKE * 2)
            .replace('%', f'{ESCAPE_LIKE}%').replace('_', f'{ESCAPE_LIKE}_'))


def cuenta_del_portal(identificador):
    """Cuenta con ese correo o, si es un usuario sin `@`, con correo
    `usuario@<dominio>`; `None` si no hay."""
    texto = (identificador or '').strip().lower()
    if not texto:
        return None
    correo = db.func.lower(User.email)
    cuenta = User.query.filter(correo == texto).first()
    if cuenta is not None or SEPARADOR_CORREO in texto:
        return cuenta
    patron = f'{_escapar_like(texto)}{SEPARADOR_CORREO}%'
    return User.query.filter(correo.like(patron, escape=ESCAPE_LIKE)).first()


def cuenta_local(identificador):
    """La cuenta del portal solo si es `local` (contraseña en la BD)."""
    cuenta = cuenta_del_portal(identificador)
    return cuenta if cuenta is not None and es_origen_local(cuenta) else None


def sincronizar_cuenta_local(identificador, nueva_contrasena):
    """Tras cambiar en LDAP, copia la contraseña solo a una cuenta `local`."""
    cuenta = cuenta_local(identificador)
    if cuenta is None:
        return
    cuenta.set_password(nueva_contrasena)
    db.session.commit()


def cuenta_dada_de_alta(*identificadores):
    """Cuenta ACTIVA del portal para el primer identificador que la tenga
    (correo de LDAP, correo o usuario escritos); `None` si no hay.

    Regla de negocio (dueño, 2026-11-24, FNC-181): solo quien está dado de
    alta en el portal usa el autoservicio; una persona que solo existe en LDAP
    no cambia ni recupera su contraseña por aquí.
    """
    for identificador in identificadores:
        if not identificador:
            continue
        cuenta = cuenta_del_portal(identificador)
        if cuenta is not None and cuenta.is_active:
            return cuenta
    return None
