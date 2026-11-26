"""Conectores independientes (FNC-213, contrato `conectores-y-ejecuciones.md` 1.6).

- `platform_connectors.platform_id` admite NULL y su FK pasa de `ON DELETE
  CASCADE` a `ON DELETE SET NULL`: un conector se crea sin plataforma y al
  borrar la plataforma queda sin asociar. El único `uq_platform_connectors_
  platform_id` se conserva (varios NULL caben en MySQL, PostgreSQL y SQLite).
- Agrega `name` (100) y `name_norm` (300), ambos NOT NULL. `name` se rellena con
  el nombre de la plataforma; si dos nombres chocan sin distinguir mayúsculas,
  el posterior (por id) queda `"<plataforma> (<id de la plataforma>)"`, recortado
  al largo máximo.
- Decisión de unicidad sin distinguir mayúsculas: `name_norm` guarda
  `name.casefold()` y lleva el único `uq_platform_connectors_name_norm`. MySQL
  distingue por colación pero PostgreSQL y SQLite no, y un índice sobre
  `lower(name)` o una colación `NOCASE` no es portable a los tres; una columna
  normalizada con un único corriente sí. La app la mantiene con `validates('name')`
  y esta migración la calcula igual (Python), no con `LOWER()` de cada motor.
  En MySQL la columna usa `utf8mb4_bin`: con la colación por omisión el único
  ignoraría acentos y no coincidiría con `casefold()`.
- Usa `batch_alter_table` (SQLite recrea la tabla; MySQL y PostgreSQL alteran).
- `downgrade()` borra los conectores sin plataforma (no caben en el esquema
  anterior, donde `platform_id` es obligatorio), quita `name` y `name_norm` y
  restaura `NOT NULL` y `ON DELETE CASCADE`.

Revision ID: 0024
Revises: 0023
Create Date: 2026-11-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


revision: str = '0024'
down_revision: Union[str, Sequence[str], None] = '0023'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Valores fijos de esta revisión (no se importan del código, que puede cambiar).
TABLA = 'platform_connectors'
FK = 'fk_platform_connectors_platform_id'
UNICO_CLAVE = 'uq_platform_connectors_name_norm'
LARGO_NOMBRE = 100
LARGO_CLAVE_NOMBRE = LARGO_NOMBRE * 3
# MySQL: colación binaria para que el único compare exacto, como PostgreSQL y
# SQLite (la colación por omisión ignora acentos: «Café» = «Cafe»).
COLACION_EXACTA_MYSQL = 'utf8mb4_bin'
TIPO_CLAVE_NOMBRE = sa.String(LARGO_CLAVE_NOMBRE).with_variant(
    mysql.VARCHAR(LARGO_CLAVE_NOMBRE, collation=COLACION_EXACTA_MYSQL), 'mysql')
AL_BORRAR_ANTES = 'CASCADE'
AL_BORRAR_AHORA = 'SET NULL'


def _conectores():
    return sa.table(
        TABLA,
        sa.column('id', sa.Integer),
        sa.column('platform_id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('name_norm', sa.String),
    )


def _nombre_unico(base, plataforma_id, usados):
    """Nombre sin chocar (sin distinguir mayúsculas) con los `usados`."""
    candidato = base
    intento = 1
    while candidato.casefold() in usados:
        sufijo = f' ({plataforma_id})' if intento == 1 else (
            f' ({plataforma_id}-{intento})')
        candidato = base[:LARGO_NOMBRE - len(sufijo)] + sufijo
        intento += 1
    return candidato


def _rellenar_nombres(conexion):
    tabla = _conectores()
    plataformas = sa.table('platforms', sa.column('id', sa.Integer),
                           sa.column('name', sa.String))
    filas = conexion.execute(
        sa.select(tabla.c.id, tabla.c.platform_id, plataformas.c.name)
        .select_from(tabla.outerjoin(
            plataformas, tabla.c.platform_id == plataformas.c.id))
        .order_by(tabla.c.id)).all()
    usados = set()
    for conector_id, plataforma_id, nombre_plataforma in filas:
        base = (nombre_plataforma or f'Conector {conector_id}')[:LARGO_NOMBRE]
        nombre = _nombre_unico(base, plataforma_id or conector_id, usados)
        usados.add(nombre.casefold())
        conexion.execute(tabla.update().where(tabla.c.id == conector_id)
                         .values(name=nombre, name_norm=nombre.casefold()))


def upgrade() -> None:
    with op.batch_alter_table(TABLA) as lote:
        lote.add_column(sa.Column('name', sa.String(LARGO_NOMBRE),
                                  nullable=True))
        lote.add_column(sa.Column('name_norm', TIPO_CLAVE_NOMBRE,
                                  nullable=True))
    _rellenar_nombres(op.get_bind())
    with op.batch_alter_table(TABLA) as lote:
        lote.alter_column('name', existing_type=sa.String(LARGO_NOMBRE),
                          nullable=False)
        lote.alter_column('name_norm',
                          existing_type=TIPO_CLAVE_NOMBRE,
                          nullable=False)
        lote.create_unique_constraint(UNICO_CLAVE, ['name_norm'])
        lote.drop_constraint(FK, type_='foreignkey')
        lote.alter_column('platform_id', existing_type=sa.Integer(),
                          nullable=True)
        lote.create_foreign_key(FK, 'platforms', ['platform_id'], ['id'],
                                ondelete=AL_BORRAR_AHORA)


def downgrade() -> None:
    tabla = _conectores()
    op.get_bind().execute(tabla.delete().where(tabla.c.platform_id.is_(None)))
    with op.batch_alter_table(TABLA) as lote:
        lote.drop_constraint(FK, type_='foreignkey')
        lote.alter_column('platform_id', existing_type=sa.Integer(),
                          nullable=False)
        lote.create_foreign_key(FK, 'platforms', ['platform_id'], ['id'],
                                ondelete=AL_BORRAR_ANTES)
        lote.drop_constraint(UNICO_CLAVE, type_='unique')
        lote.drop_column('name_norm')
        lote.drop_column('name')
