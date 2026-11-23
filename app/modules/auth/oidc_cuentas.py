"""Cuenta del portal que corresponde a una identidad de Authelia (FNC-141, ADR-009 3B).

- Enlace por `sub` del token (`users.oidc_sub`).
- Primera vez (sin `sub` vinculado): se busca por correo y se vincula, con la
  regla `motivo_de_bloqueo`: una cuenta local, con contraseña local o
  desactivada no se toma ni se modifica y el acceso se rechaza (auditado).
- Un correo ya vinculado a otro `sub` se rechaza: otra identidad no hereda la cuenta.
- Cuenta nueva: rol `usuario`, `auth_source='sso'` (ADR-009 5A), sin contraseña.
- El rol nunca sale del token (SEG-10, SEC-AUTH-07): una cuenta existente
  conserva el suyo y la nueva entra como `usuario`.
"""
from dataclasses import dataclass
from datetime import datetime

from app import db
from app.authz import ROLE_USER
from app.modules.auth.models import User
from app.modules.auth.oidc import ERROR_CUENTA, ErrorOidc, Identidad
from app.modules.auth.services import avisar_bloqueo, motivo_de_bloqueo

ORIGEN_OIDC = 'sso'
MOTIVO_OTRO_SUB = 'correo_vinculado_a_otra_identidad'


@dataclass(frozen=True)
class CuentaOidc:
    cuenta: User
    es_nueva: bool


def _rechazar(cuenta, motivo):
    avisar_bloqueo(cuenta, 'OIDC', motivo)
    raise ErrorOidc(ERROR_CUENTA, f'OIDC: {motivo}')


def cuenta_de_la_identidad(identidad: Identidad) -> CuentaOidc:
    """Vincula o crea la cuenta de `identidad`; lanza `ErrorOidc` si no puede entrar."""
    cuenta = User.query.filter_by(oidc_sub=identidad.sub).first()
    if cuenta is not None:
        motivo = motivo_de_bloqueo(cuenta)
        if motivo:
            _rechazar(cuenta, motivo)
        cuenta.nombre = identidad.nombre
        cuenta.last_login_at = datetime.now()
        db.session.commit()
        return CuentaOidc(cuenta, False)

    cuenta = User.query.filter(db.func.lower(User.email) == identidad.correo).first()
    if cuenta is not None:
        motivo = motivo_de_bloqueo(cuenta)
        if motivo:
            _rechazar(cuenta, motivo)
        if cuenta.oidc_sub:
            _rechazar(cuenta, MOTIVO_OTRO_SUB)
        # Se conservan el rol y el origen de la cuenta; solo se guarda el `sub`.
        cuenta.oidc_sub = identidad.sub
        cuenta.nombre = identidad.nombre
        cuenta.last_login_at = datetime.now()
        db.session.commit()
        return CuentaOidc(cuenta, False)

    cuenta = User(email=identidad.correo, nombre=identidad.nombre,
                  role=ROLE_USER, auth_source=ORIGEN_OIDC, is_active=True,
                  oidc_sub=identidad.sub, last_login_at=datetime.now())
    db.session.add(cuenta)
    db.session.commit()
    return CuentaOidc(cuenta, True)
