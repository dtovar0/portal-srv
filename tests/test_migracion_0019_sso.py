"""Migración 0019 (FNC-168): cuentas del directorio como `sso` y sin hash."""
from alembic import command
from sqlalchemy import text

from tests.test_migraciones import migrar, motor_vacio  # noqa: F401 (fixture)

HASH_FICTICIO = 'hash-ficticio-de-prueba'


def _cuenta(conexion, correo, origen, con_hash):
    conexion.execute(text(
        "INSERT INTO users (email, role, auth_source, is_active, password_hash) "
        "VALUES (:correo, 'usuario', :origen, 1, :hash)"),
        {'correo': correo, 'origen': origen,
         'hash': HASH_FICTICIO if con_hash else None})


def test_upgrade_convierte_ldap_y_limpia_hash_solo_del_directorio(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0018')
    with motor_vacio.begin() as conexion:
        _cuenta(conexion, 'ldap@pruebas.local', 'ldap', False)
        _cuenta(conexion, 'sso@pruebas.local', 'sso', True)
        _cuenta(conexion, 'local@pruebas.local', 'local', True)

    migrar(motor_vacio, command.upgrade, '0019')

    with motor_vacio.connect() as conexion:
        filas = dict(
            (correo, (origen, hash_))
            for correo, origen, hash_ in conexion.execute(text(
                'SELECT email, auth_source, password_hash FROM users')))
    assert filas['ldap@pruebas.local'] == ('sso', None)
    assert filas['sso@pruebas.local'] == ('sso', None)
    assert filas['local@pruebas.local'] == ('local', HASH_FICTICIO)
