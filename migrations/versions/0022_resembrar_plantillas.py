"""Resembrar las plantillas de correo que falten (FNC-203). Solo datos.

- Problema: una BD puede estar en `alembic head` sin las plantillas que
  siembran 0003, 0016 y 0020 (p. ej. creada con `create_all` y marcada con
  `alembic stamp` sin correr esas revisiones). Sin ellas fallan los correos.
- Inserta SOLO las plantillas cuyo `slug` no existe; nunca toca una existente
  (puede venir editada desde Ajustes → Plantillas o de un respaldo).
- No duplica el texto: toma las definiciones de 0003 (`PLANTILLAS`), 0016
  (`PLANTILLAS`) y 0020 (`ONBOARDING`); `credenciales_iniciales` se siembra con
  el cuerpo vigente de 0020 (`CUERPO_INICIALES`), el que deja `upgrade head`.
- `downgrade()` no hace nada: no se borran plantillas que pudieron editarse.

Revision ID: 0022
Revises: 0021
Create Date: 2026-11-25
"""
import importlib.util
from datetime import datetime
from pathlib import Path
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Identificadores de la revisión (Alembic).
revision: str = '0022'
down_revision: Union[str, Sequence[str], None] = '0021'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLA = 'notification_templates'
SLUG_INICIALES = 'credenciales_iniciales'
ARCHIVO_0003 = '0003_plantillas_gestor_accesos.py'
ARCHIVO_0016 = '0016_entregas_de_credenciales.py'
ARCHIVO_0020 = '0020_send_con_codigo_y_onboarding.py'


def _cargar(archivo):
    """Carga una revisión hermana por ruta (su nombre no es importable)."""
    ruta = Path(__file__).resolve().parent / archivo
    especificacion = importlib.util.spec_from_file_location(
        f'_fnc203_{ruta.stem}', ruta)
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return modulo


def definiciones():
    """Todas las plantillas que siembran las migraciones, por `slug`."""
    m0003, m0016, m0020 = (_cargar(a) for a in
                           (ARCHIVO_0003, ARCHIVO_0016, ARCHIVO_0020))
    todas = {p['slug']: dict(p) for p in (*m0003.PLANTILLAS, *m0016.PLANTILLAS)}
    todas[SLUG_INICIALES]['body'] = m0020.CUERPO_INICIALES
    todas[m0020.ONBOARDING['slug']] = dict(m0020.ONBOARDING)
    return todas


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
    """Inserta las plantillas que falten; las existentes no se tocan."""
    tabla = _tabla()
    existentes = set(op.get_bind().execute(sa.select(tabla.c.slug)).scalars())
    ahora = datetime.now()
    nuevas = [dict(p, is_html=True, updated_at=ahora)
              for slug, p in definiciones().items() if slug not in existentes]
    if nuevas:
        op.bulk_insert(tabla, nuevas)


def downgrade() -> None:
    """No hace nada: una plantilla pudo editarse y no se borra."""
