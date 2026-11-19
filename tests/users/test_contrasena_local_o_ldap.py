"""Cambio de contraseña en «Editar usuario» según el origen (FNC-161).

- `local`: hash en la BD, para cualquier cuenta local gestionable.
- `ldap`: Password Modify en el directorio (nunca hash en la BD), con la
  política `PASSWORD_POLICY_*`; solo el superadmin.
- `sso` / `oidc`: rechazado.
Sin LDAP real: `directorio_falso` (MOCK_SYNC).
"""
import logging

import pytest
from flask import g
from ldap3 import ALL_ATTRIBUTES, BASE
from ldap3.core.exceptions import LDAPConstraintViolationResult
from ldap3.extend import StandardExtendedOperations

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from app.modules.directory import ldap_client
from app.modules.users.models import EntregaCredenciales
from app.modules.users.politica_contrasena import MENSAJE_RECHAZO_DIRECTORIO
from tests import directorio_falso, fabricas
from tests.directorio_falso import dn_persona, instalar_directorio

A = '/api/v1'
NUEVA = 'Nueva-Clave-De-Prueba-26!x'  # ficticia; cumple la política
LOCAL_NUEVA = 'otra-clave-ficticia-de-prueba'
ANTERIOR = 'Clave-Anterior-De-Prueba-1!'


@pytest.fixture
def escena(app):
    area = fabricas.crear_area('Área A')
    super_ = fabricas.crear_usuario(ROLE_ADMIN, contrasena=ANTERIOR)
    admin = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[area],
                                   areas_administradas=[area])
    local = fabricas.crear_usuario(ROLE_USER, areas=[area],
                                   contrasena=ANTERIOR)
    ldap = fabricas.crear_usuario(ROLE_USER, areas=[area],
                                  email='ana@pruebas.local')
    ldap.auth_source = 'ldap'
    db.session.commit()
    return {'super': super_.id, 'admin': admin.id, 'local': local.id,
            'ldap': ldap.id}


@pytest.fixture
def como(app, cliente_como):
    def _como(user_id):
        g.pop('_login_user', None)
        db.session.expire_all()
        return cliente_como(db.session.get(User, user_id))
    return _como


@pytest.fixture
def directorio(monkeypatch, app):
    directorio = instalar_directorio(monkeypatch)
    directorio.agregar('ana.ruiz', 'Inicial-1', correo='ana@pruebas.local')
    return directorio


def _cuenta(user_id):
    db.session.expire_all()
    return db.session.get(User, user_id)


def _clave_ldap(uid='ana.ruiz'):
    with ldap_client.ClienteDirectorio().conexion_servicio() as conexion:
        conexion.search(dn_persona(uid), '(objectClass=*)', BASE,
                        attributes=ALL_ATTRIBUTES)
        return conexion.entries[0].entry_attributes_as_dict.get('userPassword')


def _put(cliente, user_id, **cuerpo):
    return cliente.put(f'{A}/users/{user_id}', json=cuerpo)


def _error(respuesta, http, code):
    assert respuesta.status_code == http, respuesta.get_data(as_text=True)
    datos = respuesta.get_json()
    assert datos['status'] == 'error' and datos['message']
    assert datos['code'] == code
    return datos


# --------------------------------------------------------------------------- #
# Local: hash en la BD
# --------------------------------------------------------------------------- #

def test_local_no_emergencia_guarda_hash_en_la_bd(escena, como, directorio):
    respuesta = _put(como(escena['super']), escena['local'],
                     password=LOCAL_NUEVA)

    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    cuenta = _cuenta(escena['local'])
    assert cuenta.check_password(LOCAL_NUEVA)
    assert cuenta.password_hash != LOCAL_NUEVA
    assert directorio.filtros == []  # no se consultó el directorio


# --------------------------------------------------------------------------- #
# LDAP: Password Modify, sin hash en la BD
# --------------------------------------------------------------------------- #

def test_ldap_por_correo_cambia_en_el_directorio_y_no_guarda_hash(
        escena, como, directorio):
    respuesta = _put(como(escena['super']), escena['ldap'], password=NUEVA,
                     name='Ana Ruiz')

    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    assert _clave_ldap() == [directorio_falso.cifrado_simulado(NUEVA)]
    cuenta = _cuenta(escena['ldap'])
    assert cuenta.password_hash is None
    assert cuenta.nombre == 'Ana Ruiz'
    assert NUEVA not in respuesta.get_data(as_text=True)


def test_ldap_usa_el_uid_de_la_entrega_si_existe(escena, como, directorio):
    directorio.agregar('otro.uid', 'Inicial-2', correo='otro@pruebas.local')
    db.session.add(EntregaCredenciales(
        user_id=escena['ldap'], uid='otro.uid', status='enviadas',
        attempts_count=1, max_attempts=3))
    db.session.commit()

    respuesta = _put(como(escena['super']), escena['ldap'], password=NUEVA)

    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    assert _clave_ldap('otro.uid') == [directorio_falso.cifrado_simulado(NUEVA)]
    assert _clave_ldap('ana.ruiz') == ['Inicial-1']


def test_ldap_no_deja_la_contrasena_en_bd_auditoria_ni_logs(
        escena, como, directorio, caplog):
    caplog.set_level(logging.DEBUG)

    _put(como(escena['super']), escena['ldap'], password=NUEVA)

    assert NUEVA not in caplog.text
    for fila in AuditLog.query.all():
        assert NUEVA not in repr((fila.action, fila.detail, fila.target))


@pytest.mark.parametrize('clave, mensaje', [
    ('Corta-1!', 'Entre 16 y 128 caracteres.'),
    ('sin-mayuscula-1234567!', 'Falta al menos una mayúscula.'),
    ('Con espacio-1234567!', None),
])
def test_ldap_con_politica_incumplida_da_400_sin_tocar_el_directorio(
        escena, como, directorio, clave, mensaje):
    respuesta = _put(como(escena['super']), escena['ldap'], password=clave)

    datos = _error(respuesta, 400, 'contrasena_invalida')
    if mensaje:
        assert datos['message'] == mensaje
    assert clave not in respuesta.get_data(as_text=True)
    assert _clave_ldap() == ['Inicial-1']


def test_ldap_rechazada_por_ppolicy_da_400_sin_detalle_del_servidor(
        escena, como, directorio, monkeypatch):
    def _rechaza(self, **_):
        raise LDAPConstraintViolationResult(
            'Password is in history del servidor ldap.interno')
    monkeypatch.setattr(StandardExtendedOperations, 'modify_password',
                        _rechaza)

    respuesta = _put(como(escena['super']), escena['ldap'], password=NUEVA,
                     name='No debe guardarse')

    datos = _error(respuesta, 400, 'contrasena_rechazada')
    assert datos['message'] == MENSAJE_RECHAZO_DIRECTORIO
    assert 'ldap.interno' not in respuesta.get_data(as_text=True)
    assert _cuenta(escena['ldap']).nombre != 'No debe guardarse'
    assert _cuenta(escena['ldap']).password_hash is None


def test_ldap_con_directorio_inactivo_da_503_claro(escena, como, monkeypatch):
    monkeypatch.delenv('LDAP_URL', raising=False)

    respuesta = _put(como(escena['super']), escena['ldap'], password=NUEVA)

    _error(respuesta, 503, 'directorio_no_disponible')
    assert _cuenta(escena['ldap']).password_hash is None


def test_ldap_con_directorio_caido_da_503_sin_detalle(
        escena, como, directorio):
    directorio.error = RuntimeError('ldap.interno rechazó la conexión')

    respuesta = _put(como(escena['super']), escena['ldap'], password=NUEVA)

    _error(respuesta, 503, 'directorio_no_disponible')
    assert 'ldap.interno' not in respuesta.get_data(as_text=True)


def test_ldap_sin_cuenta_en_el_directorio_da_409(escena, como, directorio):
    cuenta = _cuenta(escena['ldap'])
    cuenta.email = 'nadie@pruebas.local'
    db.session.commit()

    respuesta = _put(como(escena['super']), escena['ldap'], password=NUEVA)

    _error(respuesta, 409, 'cuenta_no_encontrada_en_directorio')


def test_admin_de_area_no_cambia_la_contrasena_en_ldap(
        escena, como, directorio):
    respuesta = _put(como(escena['admin']), escena['ldap'], password=NUEVA)

    _error(respuesta, 403, 'solo_superadmin')
    assert _clave_ldap() == ['Inicial-1']


def test_admin_de_area_si_cambia_la_contrasena_de_una_cuenta_local_suya(
        escena, como, directorio):
    respuesta = _put(como(escena['admin']), escena['local'],
                     password=LOCAL_NUEVA)

    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    assert _cuenta(escena['local']).check_password(LOCAL_NUEVA)


def test_admin_de_area_fuera_de_alcance_sigue_dando_404(
        escena, como, directorio):
    otra = fabricas.crear_usuario(ROLE_USER, areas=[fabricas.crear_area('B')])

    respuesta = _put(como(escena['admin']), otra.id, password=NUEVA)

    assert respuesta.status_code == 404


# --------------------------------------------------------------------------- #
# SSO y entradas inválidas
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize('origen', ('sso', 'oidc'))
def test_sso_se_rechaza(escena, como, directorio, origen):
    cuenta = _cuenta(escena['ldap'])
    cuenta.auth_source = origen
    db.session.commit()

    respuesta = _put(como(escena['super']), escena['ldap'], password=NUEVA)

    _error(respuesta, 400, 'campo_no_permitido')
    assert directorio.filtros == []


@pytest.mark.parametrize('valor', [12345678901234567, ['x'], {'a': 1}])
def test_contrasena_que_no_es_texto_da_400(escena, como, directorio, valor):
    for destino in ('local', 'ldap'):
        respuesta = _put(como(escena['super']), escena[destino],
                         password=valor)
        _error(respuesta, 400, 'contrasena_invalida')


def test_sin_password_no_se_toca_ni_el_hash_ni_el_directorio(
        escena, como, directorio):
    respuesta = _put(como(escena['super']), escena['ldap'], name='Ana')

    assert respuesta.status_code == 200
    assert directorio.filtros == []
    assert _clave_ldap() == ['Inicial-1']



def test_cambio_en_ldap_cierra_la_entrega_pendiente(escena, como, directorio):
    """Sin esto el worker reintentaba la entrega y fijaba OTRA contraseña al azar
    encima de la que el superadmin acaba de poner (riesgo del retiro de Reenviar)."""
    directorio.agregar('otro.uid', 'Inicial-2', correo='otro@pruebas.local')
    db.session.add(EntregaCredenciales(
        user_id=escena['ldap'], uid='otro.uid', status='pendientes',
        attempts_count=3, max_attempts=3, last_error='send'))
    db.session.commit()

    respuesta = _put(como(escena['super']), escena['ldap'], password=NUEVA)

    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    db.session.expire_all()
    entrega = EntregaCredenciales.query.filter_by(user_id=escena['ldap']).one()
    assert entrega.status != 'pendientes'
    assert entrega.next_attempt_at is None and entrega.last_error is None
