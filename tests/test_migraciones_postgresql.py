"""SQL de las migraciones para PostgreSQL (FNC-146, FNC-155).

PostgreSQL rechaza `BOOLEAN DEFAULT 1` («default expression is of type
integer»); MySQL lo acepta, por eso las pruebas con SQLite no lo detectan.
Se genera el SQL en modo offline (`alembic upgrade --sql`, sin servidor) de
los tramos que agregan columnas booleanas y se revisa el DEFAULT.
"""
import os
import pathlib
import re
import subprocess
import sys

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[1]
ALEMBIC = pathlib.Path(sys.executable).with_name('alembic')

# Tramos (desde:hasta) que se pueden generar offline y agregan booleanos.
TRAMOS = ['0013:0014', '0016:0017']

BOOLEANO_CON_DEFAULT_ENTERO = re.compile(r'BOOLEAN\s+DEFAULT\s+[01]\b', re.I)


def sql_postgresql(tramo):
    entorno = {k: v for k, v in os.environ.items() if k != 'DATABASE_URL'}
    entorno.update(DB_ENGINE='postgresql', DB_HOST='localhost', DB_USER='prueba',
                   DB_PASS='prueba', DB_NAME='prueba', DB_PORT='5432')
    salida = subprocess.run([str(ALEMBIC), 'upgrade', tramo, '--sql'], cwd=RAIZ,
                            env=entorno, capture_output=True, text=True, check=True)
    return salida.stdout


@pytest.mark.parametrize('tramo', TRAMOS)
def test_booleanos_sin_default_entero_en_postgresql(tramo):
    sql = sql_postgresql(tramo)
    assert 'ALTER TABLE' in sql
    assert not BOOLEANO_CON_DEFAULT_ENTERO.search(sql), sql
