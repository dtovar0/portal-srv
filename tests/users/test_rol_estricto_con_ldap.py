"""FNC-184: el rol de una cuenta del directorio solo cambia si su grupo de
Authelia en LDAP se pudo mover (si no, el siguiente login lo revertiría)."""
import pytest
from flask import g
from ldap3 import BASE

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.auth.models import User
from app.modules.auth.oidc_cuentas import (GRUPO_AREA_ADMIN_POR_DEFECTO,
                                           GRUPO_USER_POR_DEFECTO)
from app.modules.directory import ldap_client
from app.modules.users import grupos_de_rol
from tests import fabricas
from tests.directorio_falso import dn_grupo, dn_persona, instalar_directorio

A = '/api/v1'
CORREO = 'ana@pruebas.local'


@pytest.fixture
def como(app, cliente_como):
    def _como(user_id):
        g.pop('_login_user', None)
        db.session.expire_all()
        return cliente_como(db.session.get(User, user_id))
    return _como


@pytest.fixture
def escena(app, monkeypatch):
    for var in ('OIDC_GROUP_AREA_ADMIN', 'OIDC_GROUP_USER',
                'LDAP_APP_ADMINS', 'LDAP_APP_USERS'):
        monkeypatch.delenv(var, raising=False)
    super_ = fabricas.crear_usuario(ROLE_ADMIN)
    cuenta = fabricas.crear_usuario(ROLE_USER, email=CORREO)
    cuenta.auth_source = 'sso'
    db.session.commit()
    return {'super': super_.id, 'cuenta': cuenta.id}


def _miembros(nombre):
    with ldap_client.ClienteDirectorio().conexion_servicio() as conexion:
        conexion.search(dn_grupo(nombre), '(objectClass=*)', BASE,
                        attributes=['member'])
        if not conexion.entries:
            return []
        return [str(v) for v in conexion.entries[0]['member'].values]


def _grupo_de_usuarios_con(directorio, *uids):
    grupo = dn_grupo(GRUPO_USER_POR_DEFECTO)
    directorio.agregar(uids[0], 'Inicial-1', correo=CORREO, grupos=[grupo])
    for uid in uids[1:]:
        dn = directorio.agregar(uid, 'Inicial-1')
        with ldap_client.ClienteDirectorio().conexion_servicio(
                solo_lectura=False) as conexion:
            conexion.modify(grupo, {'member': [('MODIFY_ADD', [dn])]})


def _rol(user_id):
    db.session.expire_all()
    return db.session.get(User, user_id).role


def test_hacer_admin_mueve_el_grupo_y_cambia_el_rol(escena, como, monkeypatch):
    directorio = instalar_directorio(monkeypatch)
    _grupo_de_usuarios_con(directorio, 'ana', 'beto')

    respuesta = como(escena['super']).put(f"{A}/users/{escena['cuenta']}",
                                          json={'role': ROLE_AREA_ADMIN})

    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    assert _rol(escena['cuenta']) == ROLE_AREA_ADMIN
    assert dn_persona('ana') in _miembros(GRUPO_AREA_ADMIN_POR_DEFECTO)
    assert dn_persona('ana') not in _miembros(GRUPO_USER_POR_DEFECTO)


def test_ultimo_miembro_sin_relleno_no_cambia_de_rol(escena, como,
                                                    monkeypatch):
    """Sin `LDAP_GROUP_PLACEHOLDER_MEMBER`, LDAP no deja vacío el grupo de
    usuarios: no se le deja en ambos grupos ni se cambia el rol."""
    directorio = instalar_directorio(monkeypatch)
    _grupo_de_usuarios_con(directorio, 'ana')

    respuesta = como(escena['super']).put(f"{A}/users/{escena['cuenta']}",
                                          json={'role': ROLE_AREA_ADMIN})

    assert respuesta.status_code == 503
    assert _rol(escena['cuenta']) == ROLE_USER
    assert dn_persona('ana') in _miembros(GRUPO_USER_POR_DEFECTO)
    assert dn_persona('ana') not in _miembros(GRUPO_AREA_ADMIN_POR_DEFECTO)


def test_sin_directorio_el_rol_no_cambia(escena, como):
    respuesta = como(escena['super']).put(f"{A}/users/{escena['cuenta']}",
                                          json={'role': ROLE_AREA_ADMIN})

    assert respuesta.status_code == 503
    assert respuesta.get_json()['code'] == 'directorio_no_disponible'
    assert _rol(escena['cuenta']) == ROLE_USER


def test_cuenta_que_no_esta_en_ldap_no_cambia_de_rol(escena, como,
                                                    monkeypatch):
    instalar_directorio(monkeypatch)

    respuesta = como(escena['super']).put(f"{A}/users/{escena['cuenta']}",
                                          json={'role': ROLE_AREA_ADMIN})

    assert respuesta.status_code == 409
    assert respuesta.get_json()['code'] == 'cuenta_no_encontrada_en_directorio'
    assert _rol(escena['cuenta']) == ROLE_USER


def test_si_el_grupo_no_se_mueve_el_rol_no_cambia(escena, como, monkeypatch):
    directorio = instalar_directorio(monkeypatch)
    directorio.agregar('ana', 'Inicial-1', correo=CORREO)
    monkeypatch.setattr(grupos_de_rol, 'sincronizar_grupo_de_rol',
                        lambda *a, **k: False)
    from app.modules.users import rol_en_directorio
    monkeypatch.setattr(rol_en_directorio, 'sincronizar_grupo_de_rol',
                        lambda *a, **k: False)

    respuesta = como(escena['super']).put(f"{A}/users/{escena['cuenta']}",
                                          json={'role': ROLE_AREA_ADMIN})

    assert respuesta.status_code == 503
    assert respuesta.get_json()['code'] == 'grupo_no_actualizado'
    assert _rol(escena['cuenta']) == ROLE_USER


def test_cuenta_local_no_toca_ldap(escena, como):
    cuenta = db.session.get(User, escena['cuenta'])
    cuenta.auth_source = 'local'
    db.session.commit()

    respuesta = como(escena['super']).put(f"{A}/users/{escena['cuenta']}",
                                          json={'role': ROLE_AREA_ADMIN})

    assert respuesta.status_code == 200
    assert _rol(escena['cuenta']) == ROLE_AREA_ADMIN
