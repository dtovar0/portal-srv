"""Plantilla de correo `plataforma_desactivada` (FNC-210). Solo datos.

- Aviso a las personas con acceso vigente cuando se desactiva una plataforma o
  un área. Variables: `nombre`, `plataforma`, `area`, `url` (las de
  `CLAVES_POR_PLANTILLA`); los valores se escapan al enviar (SEC-MAIL-01).
- Si ya existe una plantilla con ese `slug` no la toca (puede venir editada).
- No se agrega a la resiembra de 0022: esa revisión ya está publicada y sus
  pruebas fijan las siete plantillas que cubre.
- `downgrade()` borra la fila solo si sigue idéntica a la insertada.

Revision ID: 0023
Revises: 0022
Create Date: 2026-11-25
"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0023'
down_revision: Union[str, Sequence[str], None] = '0022'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLA = 'notification_templates'

PLANTILLAS = (
    {
        'slug': 'plataforma_desactivada',
        'name': 'Gestor de accesos: plataforma desactivada',
        'subject': 'Plataforma desactivada: {plataforma}',
        'body': (
            '<p>Hola {nombre}:</p>\n'
            '<p>La plataforma <strong>{plataforma}</strong> del área '
            '<strong>{area}</strong> fue desactivada; tu acceso queda '
            'suspendido mientras esté inactiva.</p>\n'
            '<p>Portal: {url}</p>\n'
        ),
    },
)


def _tabla():
    return sa.table(
        TABLA,
        sa.column('slug', sa.String),
        sa.column('name', sa.String),
        sa.column('subject', sa.String),
        sa.column('body', sa.Text),
        sa.column('is_html', sa.Boolean),
        sa.column('updated_at', sa.DateTime),
    )


def upgrade() -> None:
    """Inserta la plantilla si falta."""
    tabla = _tabla()
    existentes = set(op.get_bind().execute(sa.select(tabla.c.slug)).scalars())
    ahora = datetime.now()
    nuevas = [dict(p, is_html=True, updated_at=ahora)
              for p in PLANTILLAS if p['slug'] not in existentes]
    if nuevas:
        op.bulk_insert(tabla, nuevas)


def downgrade() -> None:
    """Borra la plantilla de esta migración si no cambió."""
    tabla = _tabla()
    sin_cambios = [sa.and_(*(tabla.c[campo] == p[campo]
                             for campo in ('slug', 'name', 'subject', 'body')))
                   for p in PLANTILLAS]
    op.execute(tabla.delete().where(sa.or_(*sin_cambios)))
