"""`sin_permiso_en_directorio` al cambiar contraseña o rol (FNC-206)."""
import ldap3
import pytest
from ldap3.core import exceptions as exc_ldap

from app.authz import ROLE_AREA_ADMIN, ROLE_USER
from tests.users.test_contrasena_local_o_ldap import (  # noqa: F401
    NUEVA, _error, _put, directorio, escena, como)
from tests.users import test_rol_estricto_con_ldap as rol

CODIGO = 'sin_permiso_en_directorio'


def _denegar(monkeypatch, operaciones=('add', 'modify')):
    def falla(self, *args, **kwargs):
        raise exc_ldap.LDAPInsufficientAccessRightsResult()
    for operacion_ in operaciones:
        monkeypatch.setattr(ldap3.Connection, operacion_, falla)


def test_restablecer_contrasena_sin_permiso_da_503_con_su_codigo(
        escena, como, directorio, monkeypatch):
    _denegar(monkeypatch)

    r = _put(como(escena['super']), escena['ldap'], password=NUEVA)

    datos = _error(r, 503, CODIGO)
    assert 'no tiene permiso' in datos['message']
    assert NUEVA not in r.get_data(as_text=True)
    assert 'dc=' not in r.get_data(as_text=True)


def test_restablecer_contrasena_con_directorio_caido_sigue_igual(
        escena, como, directorio):
    directorio.error = RuntimeError('ldap caído')
    r = _put(como(escena['super']), escena['ldap'], password=NUEVA)
    _error(r, 503, 'directorio_no_disponible')


def test_cambio_de_rol_sin_permiso_no_cambia_el_rol(
        rol_escena, rol_como, monkeypatch):
    directorio = rol.instalar_directorio(monkeypatch)
    directorio.agregar('ana', 'Inicial-1', correo=rol.CORREO)
    _denegar(monkeypatch)

    r = rol_como(rol_escena['super']).put(
        f"{rol.A}/users/{rol_escena['cuenta']}", json={'role': ROLE_AREA_ADMIN})

    assert r.status_code == 503
    assert r.get_json()['code'] == CODIGO
    assert rol._rol(rol_escena['cuenta']) == ROLE_USER


rol_escena = rol.escena
rol_como = rol.como
