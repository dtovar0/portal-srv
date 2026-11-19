"""Identificador estable de Authelia (`sub`) en la cuenta (FNC-141, ADR-009 3B).

- Agrega `users.oidc_sub` (texto, nulo, único): la cuenta se enlaza por el
  `sub` del token; la primera vez se vincula por correo y se guarda el `sub`.
- Las cuentas existentes quedan con `oidc_sub` nulo y se vinculan al primer
  inicio de sesión por Authelia.
- `downgrade()` quita la columna: se pierden los vínculos y se vuelven a hacer
  por correo al volver a subir.

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0015'
down_revision: Union[str, Sequence[str], None] = '0014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Valores fijos de esta revisión (no se importan del código, que puede cambiar).
TABLA = 'users'
COLUMNA = 'oidc_sub'
RESTRICCION = 'uq_users_oidc_sub'


def upgrade() -> None:
    with op.batch_alter_table(TABLA) as lote:
        lote.add_column(sa.Column(COLUMNA, sa.String(length=255), nullable=True))
        lote.create_unique_constraint(RESTRICCION, [COLUMNA])


def downgrade() -> None:
    with op.batch_alter_table(TABLA) as lote:
        lote.drop_constraint(RESTRICCION, type_='unique')
        lote.drop_column(COLUMNA)
