"""Entrega de credenciales iniciales por Send (FNC-138, ADR-008).

- Crea `credential_deliveries`: una fila por cuenta dada de alta desde el
  portal (`user_id` único, `ON DELETE CASCADE`), estado, intentos, siguiente
  intento, reserva del worker, id del último Send y código del último error.
  Ninguna columna guarda la contraseña, el enlace del Send ni su llave.
- Inserta las plantillas `credenciales_iniciales` (solo el enlace del Send,
  nunca la contraseña) y `credenciales_no_entregadas` (aviso a superadmins) en
  `notification_templates`; si el `slug` ya existe no lo toca.
- `downgrade()` borra la tabla y solo las plantillas que siguen idénticas a las
  insertadas (una editada desde Ajustes → Plantillas se conserva).

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-18
"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0015'
down_revision: Union[str, Sequence[str], None] = '0014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Valores fijos de esta revisión (no se importan del código, que puede cambiar).
TABLA = 'credential_deliveries'
TABLA_PLANTILLAS = 'notification_templates'
AL_BORRAR_CUENTA = 'CASCADE'
LARGO_UID = 64
LARGO_ESTADO = 20
LARGO_RESERVADO_POR = 100
LARGO_SEND_ID = 64
LARGO_ERROR = 100

PLANTILLAS = (
    {
        'slug': 'credenciales_iniciales',
        'name': 'Alta de cuenta: credenciales iniciales',
        'subject': 'Tus credenciales de acceso al portal',
        'body': (
            '<p>Hola {nombre}:</p>\n'
            '<p>Se creó tu cuenta <strong>{usuario}</strong> en el portal.</p>\n'
            '<p>Tu contraseña inicial está en un enlace de un solo uso y con '
            'caducidad; ábrelo y cópiala: {enlace}</p>\n'
            '<p>Después entra al portal: {url}</p>\n'
        ),
    },
    {
        'slug': 'credenciales_no_entregadas',
        'name': 'Alta de cuenta: credenciales no entregadas',
        'subject': 'No se pudieron entregar las credenciales de {usuario}',
        'body': (
            '<p>Hola:</p>\n'
            '<p>No se pudieron entregar las credenciales iniciales de '
            '<strong>{usuario}</strong> ({correo_usuario}): se agotaron los '
            'reintentos.</p>\n'
            '<p>Un superadmin puede usar «Reenviar credenciales» desde el '
            'portal: {url}</p>\n'
        ),
    },
)


def _plantillas():
    return sa.table(
        TABLA_PLANTILLAS,
        sa.column('slug', sa.String),
        sa.column('name', sa.String),
        sa.column('subject', sa.String),
        sa.column('body', sa.Text),
        sa.column('is_html', sa.Boolean),
        sa.column('updated_at', sa.DateTime),
    )


def upgrade() -> None:
    op.create_table(
        TABLA,
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(),
                  sa.ForeignKey('users.id',
                                name='fk_credential_deliveries_user_id',
                                ondelete=AL_BORRAR_CUENTA),
                  nullable=False),
        sa.Column('uid', sa.String(LARGO_UID), nullable=False),
        sa.Column('status', sa.String(LARGO_ESTADO), nullable=False),
        sa.Column('attempts_count', sa.Integer(), nullable=False),
        sa.Column('max_attempts', sa.Integer(), nullable=False),
        sa.Column('next_attempt_at', sa.DateTime(), nullable=True),
        sa.Column('locked_at', sa.DateTime(), nullable=True),
        sa.Column('locked_by', sa.String(LARGO_RESERVADO_POR), nullable=True),
        sa.Column('send_id', sa.String(LARGO_SEND_ID), nullable=True),
        sa.Column('last_sent_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.String(LARGO_ERROR), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', name='uq_credential_deliveries_user_id'),
    )
    op.create_index('ix_credential_deliveries_status_next', TABLA,
                    ['status', 'next_attempt_at'])

    tabla = _plantillas()
    existentes = set(op.get_bind().execute(sa.select(tabla.c.slug)).scalars())
    ahora = datetime.now()
    nuevas = [dict(p, is_html=True, updated_at=ahora)
              for p in PLANTILLAS if p['slug'] not in existentes]
    if nuevas:
        op.bulk_insert(tabla, nuevas)


def downgrade() -> None:
    tabla = _plantillas()
    sin_cambios = [sa.and_(*(tabla.c[campo] == p[campo]
                             for campo in ('slug', 'name', 'subject', 'body')))
                   for p in PLANTILLAS]
    op.execute(tabla.delete().where(sa.or_(*sin_cambios)))
    op.drop_index('ix_credential_deliveries_status_next', table_name=TABLA)
    op.drop_table(TABLA)
