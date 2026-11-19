"""Responsiva de uso en accesos otorgados y aprobados.

- Agrega a `platform_access_grants`:
  - `responsiva_firmada`: booleano no nulo, por defecto False (True para registros existentes).
  - `responsiva_firmada_at`: fecha y hora de la firma de la responsiva (UTC).
- Permite detectar cuándo se aprueban nuevos accesos para solicitar la responsiva en el portal.

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# Identificadores de la revisión (Alembic).
revision: str = '0017'
down_revision: Union[str, Sequence[str], None] = '0016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLA = 'platform_access_grants'


def upgrade() -> None:
    with op.batch_alter_table(TABLA) as lote:
        lote.add_column(sa.Column('responsiva_firmada', sa.Boolean(), nullable=False,
                                  server_default=sa.text('1')))
        lote.add_column(sa.Column('responsiva_firmada_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table(TABLA) as lote:
        lote.drop_column('responsiva_firmada_at')
        lote.drop_column('responsiva_firmada')
