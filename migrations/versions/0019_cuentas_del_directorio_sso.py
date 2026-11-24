"""Cuentas del directorio como `sso` y sin contraseña local (FNC-168).

Decisión del dueño (2026-11-24): las cuentas viven en OpenLDAP y entran por
Authelia, que está entre el portal y LDAP; las altas del portal son `sso`.

- `auth_source='ldap'` → `'sso'`.
- Las cuentas `sso` pierden el `password_hash` que el autoservicio les
  copiaba por error: con hash, `motivo_de_bloqueo` las rechazaba al entrar por
  Authelia. Su contraseña sigue en LDAP; nada se pierde.
- `downgrade()` no hace nada: no se puede saber qué cuentas eran `ldap` ni
  recuperar hashes que no debían existir.

Revision ID: 0019
Revises: 0018
Create Date: 2026-11-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0019'
down_revision: Union[str, Sequence[str], None] = '0018'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Valores fijos de esta revisión (no se importan del código, que puede cambiar).
TABLA = 'users'
ORIGEN_HEREDADO = 'ldap'
ORIGEN_SSO = 'sso'


def upgrade() -> None:
    usuarios = sa.table(TABLA, sa.column('auth_source', sa.String),
                        sa.column('password_hash', sa.String))
    op.execute(usuarios.update()
               .where(usuarios.c.auth_source == ORIGEN_HEREDADO)
               .values(auth_source=ORIGEN_SSO))
    op.execute(usuarios.update()
               .where(usuarios.c.auth_source == ORIGEN_SSO)
               .where(usuarios.c.password_hash.isnot(None))
               .values(password_hash=None))


def downgrade() -> None:
    """Sin vuelta atrás (ver el docstring del módulo)."""
