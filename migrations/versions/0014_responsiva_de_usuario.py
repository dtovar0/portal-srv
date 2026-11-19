"""Carta responsiva de uso de plataformas y activos de TI.

- Agrega a `users`:
  - `responsiva_firmada`: booleano no nulo, por defecto False (True para existentes).
  - `responsiva_firmada_at`: fecha y hora de la firma (UTC).
  - `responsiva_version`: versión del documento firmado (por defecto '1.0').
- Los usuarios existentes quedan marcados como firmados para no interrumpir cuentas activas.
- Las cuentas nuevas creadas a partir de esta versión inician en False.

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# Identificadores de la revisión (Alembic).
revision: str = '0014'
down_revision: Union[str, Sequence[str], None] = '0013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLA = 'users'


def upgrade() -> None:
    with op.batch_alter_table(TABLA) as lote:
        lote.add_column(sa.Column('responsiva_firmada', sa.Boolean(), nullable=False,
                                  server_default=sa.text('1')))
        lote.add_column(sa.Column('responsiva_firmada_at', sa.DateTime(), nullable=True))
        lote.add_column(sa.Column('responsiva_version', sa.String(length=20), nullable=False,
                                  server_default='1.0'))


def downgrade() -> None:
    with op.batch_alter_table(TABLA) as lote:
        lote.drop_column('responsiva_version')
        lote.drop_column('responsiva_firmada_at')
        lote.drop_column('responsiva_firmada')

