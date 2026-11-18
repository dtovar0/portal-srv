"""Migración 0013 (FNC-010): vacía `smtp_config.password` (SEG-17)."""
from alembic import command
from sqlalchemy import inspect, text

from tests.test_migraciones import migrar, motor_vacio  # noqa: F401 (fixture)

CLAVE = 'clave-smtp-heredada-ficticia'


def _insertar_fila(motor):
    with motor.begin() as conexion:
        conexion.execute(text(
            "INSERT INTO smtp_config (server, password) "
            "VALUES ('smtp.pruebas.invalid', :clave)"), {'clave': CLAVE})


def _claves(motor):
    with motor.connect() as conexion:
        return conexion.execute(text('SELECT password FROM smtp_config')).scalars().all()


def test_upgrade_vacia_la_clave_y_conserva_la_columna(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0012')
    _insertar_fila(motor_vacio)

    migrar(motor_vacio, command.upgrade, '0013')

    assert _claves(motor_vacio) == [None]
    columnas = {c['name'] for c in inspect(motor_vacio).get_columns('smtp_config')}
    assert 'password' in columnas


def test_downgrade_no_restaura_la_clave(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0012')
    _insertar_fila(motor_vacio)
    migrar(motor_vacio, command.upgrade, '0013')

    migrar(motor_vacio, command.downgrade, '0012')

    assert _claves(motor_vacio) == [None]
