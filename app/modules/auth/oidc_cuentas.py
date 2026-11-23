"""Cuenta del portal que corresponde a una identidad de Authelia (FNC-141, ADR-009 3B, FNC-143).

- Enlace por `sub` del token (`users.oidc_sub`).
- Primera vez (sin `sub` vinculado): se busca por correo y se vincula, con la
  regla `motivo_de_bloqueo`: una cuenta local, con contraseña local o
  desactivada no se toma ni se modifica y el acceso se rechaza (auditado).
- Un correo ya vinculado a otro `sub` se rechaza: otra identidad no hereda la cuenta.
- Asignación de rol por mapeo de grupos OIDC (FNC-143):
  * 'infraestructuraVoIP' (o OIDC_GROUP_SUPERADMIN) -> 'administrador'
  * 'app-aduana-admins' (o OIDC_GROUP_AREA_ADMIN) -> 'admin_area'
  * 'app-aduana-users' (o OIDC_GROUP_USER) -> 'usuario'
  * Por omisión sin grupo mapeado -> 'usuario'
- Las cuentas de SSO actualizan su rol si sus grupos en Authelia cambian.
"""
import os
from dataclasses import dataclass
from datetime import datetime

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.auth.models import User
from app.modules.auth.oidc import ERROR_CUENTA, ERROR_DENEGADO, ErrorOidc, Identidad
from app.modules.auth.services import avisar_bloqueo, motivo_de_bloqueo
from app.modules.users.roles import cambiar_rol

ORIGEN_OIDC = 'sso'
MOTIVO_OTRO_SUB = 'correo_vinculado_a_otra_identidad'

VAR_GRUPO_SUPERADMIN = 'OIDC_GROUP_SUPERADMIN'
VAR_GRUPO_AREA_ADMIN = 'OIDC_GROUP_AREA_ADMIN'
VAR_GRUPO_USER = 'OIDC_GROUP_USER'

GRUPO_SUPERADMIN_POR_DEFECTO = 'infraestructuraVoIP'
GRUPO_AREA_ADMIN_POR_DEFECTO = 'app-aduana-admins'
GRUPO_USER_POR_DEFECTO = 'app-aduana-users'


@dataclass(frozen=True)
class CuentaOidc:
    cuenta: User
    es_nueva: bool


def _rechazar(cuenta, motivo):
    avisar_bloqueo(cuenta, 'OIDC', motivo)
    raise ErrorOidc(ERROR_CUENTA, f'OIDC: {motivo}')


def rol_desde_grupos(grupos: tuple[str, ...] | list[str]) -> str | None:
    """Determina el rol según la membresía en grupos de Authelia.

    Jerarquía:
    1. Superadmin (por omisión 'infraestructuraVoIP') -> 'administrador'
    2. Admin de área (por omisión 'app-aduana-admins') -> 'admin_area'
    3. Usuario (por omisión 'app-aduana-users') -> 'usuario'
    Si no tiene grupos mapeados o `grupos` está vacío, devuelve None.
    """
    if not grupos:
        return None

    cfg_superadmin = (os.getenv(VAR_GRUPO_SUPERADMIN) or GRUPO_SUPERADMIN_POR_DEFECTO).strip().lower()
    cfg_area_admin = (os.getenv(VAR_GRUPO_AREA_ADMIN) or GRUPO_AREA_ADMIN_POR_DEFECTO).strip().lower()
    cfg_user = (os.getenv(VAR_GRUPO_USER) or GRUPO_USER_POR_DEFECTO).strip().lower()

    conjunto_grupos = {g.strip().lower() for g in grupos if isinstance(g, str)}

    if cfg_superadmin in conjunto_grupos:
        return ROLE_ADMIN
    if cfg_area_admin in conjunto_grupos:
        return ROLE_AREA_ADMIN
    if cfg_user in conjunto_grupos:
        return ROLE_USER
    return None


def cuenta_de_la_identidad(identidad: Identidad) -> CuentaOidc:
    """Vincula o crea la cuenta de `identidad`; exige grupo autorizado y sincroniza rol."""
    rol_mapeado = rol_desde_grupos(identidad.grupos)
    if not rol_mapeado:
        raise ErrorOidc(
            ERROR_DENEGADO,
            'OIDC: la cuenta no pertenece a ningún grupo autorizado en Authelia '
            '(requiere app-aduana-users, app-aduana-admins o infraestructuraVoIP)'
        )

    cuenta = User.query.filter_by(oidc_sub=identidad.sub).first()
    if cuenta is not None:
        motivo = motivo_de_bloqueo(cuenta)
        if motivo:
            _rechazar(cuenta, motivo)
        cuenta.nombre = identidad.nombre
        cuenta.last_login_at = datetime.now()
        if cuenta.role != rol_mapeado:
            cambiar_rol(cuenta, rol_mapeado)
        db.session.commit()
        return CuentaOidc(cuenta, False)

    cuenta = User.query.filter(db.func.lower(User.email) == identidad.correo).first()
    if cuenta is not None:
        motivo = motivo_de_bloqueo(cuenta)
        if motivo:
            _rechazar(cuenta, motivo)
        if cuenta.oidc_sub:
            _rechazar(cuenta, MOTIVO_OTRO_SUB)
        cuenta.oidc_sub = identidad.sub
        cuenta.nombre = identidad.nombre
        cuenta.last_login_at = datetime.now()
        if cuenta.role != rol_mapeado:
            cambiar_rol(cuenta, rol_mapeado)
        db.session.commit()
        return CuentaOidc(cuenta, False)

    cuenta = User(email=identidad.correo, nombre=identidad.nombre,
                  role=rol_mapeado, auth_source=ORIGEN_OIDC, is_active=True,
                  oidc_sub=identidad.sub, last_login_at=datetime.now())
    db.session.add(cuenta)
    db.session.commit()
    return CuentaOidc(cuenta, True)
