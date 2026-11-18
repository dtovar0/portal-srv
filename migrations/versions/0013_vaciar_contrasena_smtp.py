"""Contraseña SMTP fuera de la BD (FNC-010, SEG-17). Solo datos.

- Vacía `smtp_config.password`: la contraseña SMTP es `SMTP_PASSWORD` del
  entorno (`.env`). La columna se conserva, marcada obsoleta en el modelo,
  que rechaza escribirla (mismo patrón que 0004 con `auth_config.ldap_pass`).
- `downgrade()` no restaura el valor (irreversible en datos, a propósito).

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Identificadores de la revisión (Alembic).
revision: str = '0013'
down_revision: Union[str, Sequence[str], None] = '0012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLA = 'smtp_config'
COLUMNA = 'password'


def upgrade() -> None:
    """Pone en NULL la contraseña SMTP guardada."""
    tabla = sa.table(TABLA, sa.column(COLUMNA, sa.String))
    op.execute(tabla.update().where(tabla.c[COLUMNA].isnot(None))
               .values({COLUMNA: None}))


def downgrade() -> None:
    """Sin cambios: el valor borrado no se puede recuperar."""
