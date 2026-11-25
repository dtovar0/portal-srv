"""Migración 0021 (FNC-196): DN de grupo derivados para toda plataforma."""
from alembic import command
from sqlalchemy import text

from tests.test_migraciones import migrar, motor_vacio  # noqa: F401 (fixture)

BASE = 'ou=grupos,dc=pruebas,dc=local'


def _area(conexion, nombre):
    conexion.execute(text(
        "INSERT INTO areas (name, status) VALUES (:n, 'Activo')"), {'n': nombre})
    return conexion.execute(text('SELECT id FROM areas WHERE name = :n'),
                            {'n': nombre}).scalar()


def _plataforma(conexion, area_id, nombre, tipo='ldap', usuario=None,
                admin=None):
    conexion.execute(text(
        'INSERT INTO platforms (name, description, area_id, status, '
        'integration_type, ldap_group_user_dn, ldap_group_admin_dn, '
        'groups_status) VALUES (:n, :n, :a, :s, :t, :u, :ad, :g)'),
        {'n': nombre, 'a': area_id, 's': 'Activo', 't': tipo, 'u': usuario,
         'ad': admin, 'g': 'sin_verificar'})


def _dns(motor):
    with motor.connect() as conexion:
        return {fila[0]: (fila[1], fila[2]) for fila in conexion.execute(text(
            'SELECT name, ldap_group_user_dn, ldap_group_admin_dn '
            'FROM platforms'))}


def _preparar(motor):
    migrar(motor, command.upgrade, '0020')
    with motor.begin() as conexion:
        area = _area(conexion, 'Redes')
        _plataforma(conexion, area, 'Tacacs')
        _plataforma(conexion, area, 'Zabbix', tipo='conector')
        _plataforma(conexion, area, 'Propia', usuario='cn=mio,' + BASE)


def test_deriva_los_dn_faltantes_y_no_pisa_los_existentes(
        motor_vacio, monkeypatch):  # noqa: F811
    monkeypatch.setenv('LDAP_GROUPS_BASE_DN', BASE)
    monkeypatch.delenv('LDAP_PLATFORM_GROUP_TEMPLATE', raising=False)
    _preparar(motor_vacio)

    migrar(motor_vacio, command.upgrade, '0021')

    dns = _dns(motor_vacio)
    assert dns['Tacacs'] == (f'cn=app-tacacs-users,{BASE}',
                             f'cn=app-tacacs-admins,{BASE}')
    assert dns['Zabbix'] == (f'cn=app-zabbix-users,{BASE}',
                             f'cn=app-zabbix-admins,{BASE}')
    assert dns['Propia'] == (f'cn=mio,{BASE}', f'cn=app-propia-admins,{BASE}')


def test_usa_la_plantilla_configurada(motor_vacio, monkeypatch):  # noqa: F811
    monkeypatch.setenv('LDAP_GROUPS_BASE_DN', BASE)
    monkeypatch.setenv('LDAP_PLATFORM_GROUP_TEMPLATE',
                       'cn={plataforma}-{nivel},ou={area}')
    _preparar(motor_vacio)

    migrar(motor_vacio, command.upgrade, '0021')

    assert _dns(motor_vacio)['Tacacs'][0] == f'cn=tacacs-usuario,ou=redes,{BASE}'


def test_no_guarda_un_dn_que_ya_usa_otra_plataforma(
        motor_vacio, monkeypatch):  # noqa: F811
    monkeypatch.setenv('LDAP_GROUPS_BASE_DN', BASE)
    monkeypatch.delenv('LDAP_PLATFORM_GROUP_TEMPLATE', raising=False)
    migrar(motor_vacio, command.upgrade, '0020')
    with motor_vacio.begin() as conexion:
        area = _area(conexion, 'Redes')
        _plataforma(conexion, area, 'Ocupada',
                    usuario=f'CN=app-tacacs-users,{BASE}')
        _plataforma(conexion, area, 'Tacacs')

    migrar(motor_vacio, command.upgrade, '0021')

    assert _dns(motor_vacio)['Tacacs'] == (None, f'cn=app-tacacs-admins,{BASE}')


def test_sin_base_no_cambia_nada(motor_vacio, monkeypatch):  # noqa: F811
    monkeypatch.delenv('LDAP_GROUPS_BASE_DN', raising=False)
    _preparar(motor_vacio)

    migrar(motor_vacio, command.upgrade, '0021')

    assert _dns(motor_vacio)['Tacacs'] == (None, None)


def test_downgrade_conserva_los_dn(motor_vacio, monkeypatch):  # noqa: F811
    monkeypatch.setenv('LDAP_GROUPS_BASE_DN', BASE)
    _preparar(motor_vacio)
    migrar(motor_vacio, command.upgrade, '0021')

    migrar(motor_vacio, command.downgrade, '0020')

    assert _dns(motor_vacio)['Tacacs'][0] == f'cn=app-tacacs-users,{BASE}'
