"""Migración 0014 (FNC-141, ADR-009 3B): `users.oidc_sub`."""
import pytest
from alembic import command
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from tests.test_migraciones import columnas, migrar, motor_vacio  # noqa: F401 (fixture)

BASE = ("INSERT INTO users (email, role, auth_source, is_active, pref_theme, "
        "pref_notifications, pref_email_notifications, pref_refresh_interval, "
        "pref_tour_enabled{extra}) VALUES (:e, 'usuario', 'sso', 1, 'sistema', "
        "1, 1, 60, 1{valor})")


def _insertar(motor, correo, sub=None, con_sub=True):
    consulta = BASE.format(extra=', oidc_sub' if con_sub else '',
                           valor=', :s' if con_sub else '')
    with motor.begin() as conexion:
        conexion.execute(text(consulta), {'e': correo, 's': sub})


def test_upgrade_agrega_la_columna_nula_y_conserva_las_cuentas(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0013')
    _insertar(motor_vacio, 'a@pruebas.invalid', con_sub=False)

    migrar(motor_vacio, command.upgrade, '0014')

    assert 'oidc_sub' in columnas(inspect(motor_vacio), 'users')
    with motor_vacio.connect() as conexion:
        assert conexion.execute(text('SELECT oidc_sub FROM users')).scalars().all() == [None]


def test_el_sub_es_unico_pero_varios_nulos_caben(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0014')
    _insertar(motor_vacio, 'a@pruebas.invalid')
    _insertar(motor_vacio, 'b@pruebas.invalid')
    _insertar(motor_vacio, 'c@pruebas.invalid', 'sub-1')

    with pytest.raises(IntegrityError):
        _insertar(motor_vacio, 'd@pruebas.invalid', 'sub-1')


def test_downgrade_quita_la_columna_y_conserva_las_cuentas(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0014')
    _insertar(motor_vacio, 'a@pruebas.invalid', 'sub-1')

    migrar(motor_vacio, command.downgrade, '0013')

    assert 'oidc_sub' not in columnas(inspect(motor_vacio), 'users')
    with motor_vacio.connect() as conexion:
        assert conexion.execute(text('SELECT email FROM users')).scalars().all() == [
            'a@pruebas.invalid']
