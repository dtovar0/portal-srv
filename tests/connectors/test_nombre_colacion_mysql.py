"""FNC-213: `name_norm` es exacto también en MySQL.

La app ya normaliza (`casefold`). Con la colación por omisión de MySQL
(`utf8mb4_0900_ai_ci`) el único ignoraría además los acentos («Café» = «Cafe») y
la migración 0024 o `nombre_en_uso` se comportarían distinto que en PostgreSQL y
SQLite. La columna fija `utf8mb4_bin` solo en MySQL.
"""
import importlib.util
from pathlib import Path

from sqlalchemy.dialects import mysql, postgresql, sqlite

from app.modules.connectors.models import PlatformConnector

COLACION = 'utf8mb4_bin'
MIGRACION = (Path(__file__).resolve().parents[2]
             / 'migrations/versions/0024_conectores_independientes.py')


def _ddl(tipo, dialecto):
    return tipo.compile(dialect=dialecto.dialect())


def test_modelo_name_norm_binario_solo_en_mysql():
    tipo = PlatformConnector.__table__.c.name_norm.type
    assert COLACION in _ddl(tipo, mysql)
    assert COLACION not in _ddl(tipo, postgresql)
    assert COLACION not in _ddl(tipo, sqlite)


def test_migracion_0024_usa_el_mismo_tipo():
    spec = importlib.util.spec_from_file_location('m0024', MIGRACION)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    assert COLACION in _ddl(modulo.TIPO_CLAVE_NOMBRE, mysql)
    assert COLACION not in _ddl(modulo.TIPO_CLAVE_NOMBRE, postgresql)
