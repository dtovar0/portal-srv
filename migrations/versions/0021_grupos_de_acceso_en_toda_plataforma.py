"""Grupos de acceso en toda plataforma (FNC-196).

Toda plataforma da acceso por su grupo de nivel `app-{plataforma}-{nivel}`,
tenga o no conector. Esta revisión **solo rellena datos**: a las plataformas
sin `ldap_group_user_dn` o `ldap_group_admin_dn` (las de tipo `conector` y las
`ldap` heredadas sin grupos) les guarda el DN derivado de la convención, para
que el administrador lo vea en el formulario.

- Convención: `LDAP_PLATFORM_GROUP_TEMPLATE` (por omisión
  `cn=app-{plataforma}-{nivel}`) debajo de `LDAP_GROUPS_BASE_DN`; con el prefijo
  `app-` (o `LDAP_GROUP_PLURAL`) el nivel va en plural (`users`/`admins`). Es la
  misma regla de `app/modules/platforms/grupos.py`, repetida aquí a propósito
  (las revisiones no importan el código, que puede cambiar).
- Sin `LDAP_GROUPS_BASE_DN` en el entorno no hace nada: al otorgar un acceso la
  aplicación deriva y guarda los DN que falten (`grupos.completar_dns`).
- No pisa un DN existente ni guarda uno que ya use otra plataforma (el grupo es
  de una sola plataforma); ese queda vacío y se deriva o se corrige a mano.
- Los grupos no se crean aquí: el aprovisionamiento crea el grupo faltante al
  otorgar (`LDAP_PROVISIONING_AUTO_CREATE_GROUPS`).
- `downgrade()` no hace nada: no puede distinguir un DN derivado de uno que el
  superadmin indicó, y dejarlos no estorba a la revisión anterior.

Revision ID: 0021
Revises: 0020
Create Date: 2026-11-24
"""
import os
import re
import unicodedata
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0021'
down_revision: Union[str, Sequence[str], None] = '0020'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Valores fijos de esta revisión (no se importan del código, que puede cambiar).
VAR_BASE = 'LDAP_GROUPS_BASE_DN'
VAR_PLANTILLA = 'LDAP_PLATFORM_GROUP_TEMPLATE'
VAR_PLURAL = 'LDAP_GROUP_PLURAL'
PLANTILLA_POR_OMISION = 'cn=app-{plataforma}-{nivel}'
PREFIJO_APP = 'app-'
VERDADEROS = ('true', '1', 'yes')
NIVEL_USUARIO = 'usuario'
NIVEL_ADMIN = 'admin'
PLURAL = {NIVEL_USUARIO: 'users', NIVEL_ADMIN: 'admins'}
COLUMNAS = {NIVEL_USUARIO: 'ldap_group_user_dn',
            NIVEL_ADMIN: 'ldap_group_admin_dn'}
_NO_IDENTIFICADOR = re.compile(r'[^a-z0-9]+')


def _identificador(texto):
    plano = unicodedata.normalize('NFKD', texto or '')
    plano = plano.encode('ascii', 'ignore').decode('ascii').lower()
    return _NO_IDENTIFICADOR.sub('-', plano).strip('-')


def _derivar(base, plantilla, nivel, plataforma, area):
    nombre = _identificador(plataforma)
    if not nombre:
        return None
    plural = (PREFIJO_APP in plantilla
              or (os.getenv(VAR_PLURAL) or '').strip().lower() in VERDADEROS)
    relativo = plantilla.format(plataforma=nombre, area=_identificador(area),
                                nivel=PLURAL[nivel] if plural else nivel)
    return f'{relativo},{base}'


def upgrade() -> None:
    base = (os.getenv(VAR_BASE) or '').strip()
    if not base:
        return
    plantilla = (os.getenv(VAR_PLANTILLA) or '').strip() or PLANTILLA_POR_OMISION
    conexion = op.get_bind()
    filas = conexion.execute(sa.text(
        'SELECT p.id, p.name, a.name AS area, p.ldap_group_user_dn, '
        'p.ldap_group_admin_dn FROM platforms p '
        'LEFT JOIN areas a ON a.id = p.area_id ORDER BY p.id')).fetchall()
    usados = {(dn or '').lower() for fila in filas for dn in fila[3:5] if dn}
    for fila in filas:
        for nivel, columna in COLUMNAS.items():
            if getattr(fila, columna):
                continue
            try:
                dn = _derivar(base, plantilla, nivel, fila.name, fila.area)
            except (KeyError, IndexError, ValueError):
                return  # plantilla que esta revisión no entiende: no se toca
            if not dn or dn.lower() in usados:
                continue
            usados.add(dn.lower())
            conexion.execute(
                sa.text(f'UPDATE platforms SET {columna} = :dn WHERE id = :id'),
                {'dn': dn, 'id': fila.id})


def downgrade() -> None:
    """Sin cambios: ver el docstring del módulo."""
