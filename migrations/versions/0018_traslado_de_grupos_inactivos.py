"""Traslado de los grupos LDAP de plataformas inactivas (FNC-163).

- Crea `platform_group_moves`: una fila por plataforma (`platform_id` único,
  `ON DELETE CASCADE`) con la ubicación actual de cada grupo (`activos` o
  `inactivos`), el estado del traslado, los intentos, el siguiente intento, la
  reserva del worker y un código corto del último error. No guarda DN: el DN
  original sigue en `platforms.ldap_group_*_dn`.
- Sin datos que migrar: las plataformas existentes no tienen fila (= grupos en
  su ubicación original).
- `downgrade()` borra la tabla; si hubiera grupos en la OU de inactivos, el
  administrador del directorio debe regresarlos a mano.

Revision ID: 0018
Revises: 0017
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0018'
down_revision: Union[str, Sequence[str], None] = '0017'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Valores fijos de esta revisión (no se importan del código, que puede cambiar).
TABLA = 'platform_group_moves'
AL_BORRAR_PLATAFORMA = 'CASCADE'
UBICACION_ACTIVOS = 'activos'
LARGO_UBICACION = 20
LARGO_ESTADO = 20
LARGO_RESERVADO_POR = 100
LARGO_ERROR = 100


def upgrade() -> None:
    op.create_table(
        TABLA,
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('platform_id', sa.Integer(),
                  sa.ForeignKey('platforms.id',
                                name='fk_platform_group_moves_platform_id',
                                ondelete=AL_BORRAR_PLATAFORMA),
                  nullable=False),
        sa.Column('user_location', sa.String(LARGO_UBICACION), nullable=False,
                  server_default=UBICACION_ACTIVOS),
        sa.Column('admin_location', sa.String(LARGO_UBICACION), nullable=False,
                  server_default=UBICACION_ACTIVOS),
        sa.Column('status', sa.String(LARGO_ESTADO), nullable=False),
        sa.Column('attempts_count', sa.Integer(), nullable=False),
        sa.Column('max_attempts', sa.Integer(), nullable=False),
        sa.Column('next_attempt_at', sa.DateTime(), nullable=True),
        sa.Column('locked_at', sa.DateTime(), nullable=True),
        sa.Column('locked_by', sa.String(LARGO_RESERVADO_POR), nullable=True),
        sa.Column('last_error', sa.String(LARGO_ERROR), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('platform_id',
                            name='uq_platform_group_moves_platform_id'),
    )
    op.create_index('ix_platform_group_moves_status_next', TABLA,
                    ['status', 'next_attempt_at'])


def downgrade() -> None:
    op.drop_index('ix_platform_group_moves_status_next', table_name=TABLA)
    op.drop_table(TABLA)
