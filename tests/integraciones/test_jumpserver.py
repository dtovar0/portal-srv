"""Sincronización con JumpServer en un solo punto (FNC-190).

Cada cambio de contraseña en LDAP (`EscritorDirectorio.change_password` o el
alta con contraseña) avisa a los oyentes; el de JumpServer llama a su API una
sola vez con el identificador de LDAP. Sin red: `requests.post` es un doble.
"""
import logging

import pytest
from flask import g

from app import db
from app.authz import ROLE_ADMIN, ROLE_USER
from app.modules.alta import rotacion
from app.modules.alta.resumen import ROTADO
from app.modules.audit.models import AuditLog
from app.modules.auth.autoservicio import cambiar_contrasena
from app.modules.directory.writer import EscritorDirectorio
from app.modules.integraciones import jumpserver
from app.modules.users import entrega_credenciales as entrega_mod
from app.modules.users import rotar_contrasena
from app.modules.users.models import EntregaCredenciales
from tests import fabricas
from tests.directorio_falso import dn_persona, instalar_directorio
from tests.users.conftest import entrega  # noqa: F401 (fixture)

URL = 'https://jumpserver.pruebas.invalid'
CORREO = 'ana@pruebas.local'
ANTERIOR = 'Clave-Anterior-2026!x'  # ficticia
NUEVA = 'Nueva-Clave-De-Prueba-26!x'  # ficticia; cumple la política
ACCION = 'JUMPSERVER: SINCRONIZACIÓN FALLIDA'


class Respuesta:
    def __init__(self, estado=200):
        self.status_code = estado


class JumpServerFalso:
    def __init__(self):
        self.llamadas = []
        self.estado = 200
        self.error = None

    def post(self, url, json=None, headers=None, timeout=None,
             allow_redirects=True):
        self.llamadas.append({'url': url, 'json': json, 'headers': headers,
                              'timeout': timeout,
                              'redirecciones': allow_redirects})
        if self.error:
            raise self.error
        return Respuesta(self.estado)

    @property
    def usuarios(self):
        return [c['json']['username'] for c in self.llamadas]


@pytest.fixture
def js(monkeypatch):
    falso = JumpServerFalso()
    monkeypatch.setenv('JUMPSERVER_API_URL', URL)
    monkeypatch.setenv('JUMPSERVER_API_TOKEN', 'token-ficticio')
    monkeypatch.setattr(jumpserver.requests, 'post', falso.post)
    return falso


@pytest.fixture
def directorio(monkeypatch, app):
    d = instalar_directorio(monkeypatch)
    d.agregar('ana', ANTERIOR, correo=CORREO)
    return d


@pytest.fixture
def cliente_como(app, cliente_como):
    def _como(usuario):
        g.pop('_login_user', None)
        return cliente_como(usuario)
    return _como


def _cuenta_sso():
    cuenta = fabricas.crear_usuario(ROLE_USER, email=CORREO)
    cuenta.auth_source = 'sso'
    db.session.commit()
    return cuenta


def _fallos():
    db.session.expire_all()
    return AuditLog.query.filter_by(action=ACCION).all()


# --------------------------------------------------------------------------- #
# Un solo punto: cada camino sincroniza exactamente una vez
# --------------------------------------------------------------------------- #

def test_change_password_hecho_sincroniza_una_vez_con_el_uid(js, directorio):
    resultado = EscritorDirectorio().change_password(dn_persona('ana'), NUEVA)

    assert resultado.exito
    assert js.usuarios == ['ana']
    llamada = js.llamadas[0]
    assert llamada['url'] == f'{URL}/api/v1/users/credentials/sync/'
    assert llamada['json'] == {'username': 'ana', 'password': NUEVA}
    assert llamada['headers'] == {'Authorization': 'Bearer token-ficticio'}


def test_con_el_uid_a_secas_tambien(js, directorio):
    EscritorDirectorio().change_password('ana', NUEVA)
    assert js.usuarios == ['ana']


def test_un_resultado_no_hecho_no_sincroniza(js, directorio):
    escritor = EscritorDirectorio()
    assert not escritor.change_password('nadie', NUEVA).exito
    assert not escritor.change_password('ana', '').exito
    assert js.llamadas == []


def test_autoservicio_cambiar_contrasena_sincroniza_una_vez(
        app, js, directorio, monkeypatch):
    _cuenta_sso()
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'false')
    from app.modules.auth import autoservicio
    monkeypatch.setattr(autoservicio, 'enviar_correo_confirmacion_cambio',
                        lambda *a, **k: True)
    with app.test_request_context():
        cambiar_contrasena('ana', ANTERIOR, NUEVA)
    assert js.usuarios == ['ana']


def test_editar_usuario_sincroniza_una_vez(app, js, directorio, cliente_como):
    cuenta = _cuenta_sso()
    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).put(
        f'/api/v1/users/{cuenta.id}', json={'password': NUEVA})
    assert r.status_code == 200, r.get_data(as_text=True)
    assert js.usuarios == ['ana']
    assert js.llamadas[0]['json']['password'] == NUEVA


def test_alta_del_portal_sincroniza_una_vez(app, js, directorio, entrega,  # noqa: F811
                                            cliente_como):
    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).post(
        '/api/v1/users/directory',
        json={'uid': 'nuevo.uno', 'email': 'nuevo@pruebas.local',
              'given_name': 'Nuevo', 'surname': 'Uno', 'area_ids': [],
              'password': NUEVA})
    assert r.status_code == 201, r.get_data(as_text=True)
    assert js.usuarios == ['nuevo.uno']
    assert js.llamadas[0]['json']['password'] == NUEVA


def test_el_worker_sincroniza_una_vez_por_reintento(app, js, directorio,
                                                    entrega):  # noqa: F811
    cuenta = _cuenta_sso()
    fila = EntregaCredenciales(cuenta=cuenta, uid='ana', status='pendientes',
                               attempts_count=1, max_attempts=5)
    db.session.add(fila)
    db.session.commit()
    assert entrega_mod.ejecutar_entrega(fila.id) == 'enviadas'
    assert js.usuarios == ['ana']
    assert js.llamadas[0]['json']['password'] == entrega.contrasenas[0]


def test_rotacion_del_cli_sincroniza_una_vez(app, js, directorio, entrega,  # noqa: F811
                                             monkeypatch):
    cuenta = _cuenta_sso()
    linea = rotacion.rotar(cuenta, 'ana')
    assert linea.estado == ROTADO
    assert js.usuarios == ['ana']


def test_el_endpoint_de_rotar_sincroniza_una_vez(app, js, directorio, entrega,  # noqa: F811
                                                 cliente_como, monkeypatch):
    monkeypatch.setattr(rotar_contrasena, 'servicio_de_sends', lambda: object())
    cuenta = _cuenta_sso()
    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).post(
        f'/api/v1/users/{cuenta.id}/rotar-contrasena')
    assert r.status_code == 200, r.get_data(as_text=True)
    assert js.usuarios == ['ana']
    assert js.llamadas[0]['json']['password'] == entrega.contrasenas[0]


# --------------------------------------------------------------------------- #
# Fallos y configuración
# --------------------------------------------------------------------------- #

def test_sin_url_no_hay_llamada(monkeypatch, directorio):
    falso = JumpServerFalso()
    monkeypatch.delenv('JUMPSERVER_API_URL', raising=False)
    monkeypatch.delenv('JUMPSERVER_URL', raising=False)
    monkeypatch.setattr(jumpserver.requests, 'post', falso.post)
    assert EscritorDirectorio().change_password('ana', NUEVA).exito
    assert falso.llamadas == []
    assert _fallos() == []


@pytest.mark.parametrize('url', ['http://jumpserver.pruebas.invalid',
                                 'jumpserver', 'ftp://jumpserver.pruebas.invalid',
                                 # IP literal: RFC 3849 y formas abreviadas
                                 # de IPv4 (como tests/directory/test_config.py)
                                 'https://[2001:db8::1]', 'https://127.1',
                                 'https://2130706433', 'https://10.1.2'])
def test_url_sin_https_o_con_ip_no_se_llama_y_queda_auditada(
        js, directorio, monkeypatch, url):
    monkeypatch.setenv('JUMPSERVER_API_URL', url)
    assert EscritorDirectorio().change_password('ana', NUEVA).exito
    assert js.llamadas == []
    assert len(_fallos()) == 1


@pytest.mark.parametrize('falla', ['excepcion', 'http500', 'redireccion'])
def test_un_fallo_de_jumpserver_no_revierte_ldap_y_queda_auditado(
        js, directorio, caplog, falla):
    caplog.set_level(logging.DEBUG)
    if falla == 'excepcion':
        js.error = ConnectionError(f'no conecta con {URL} para {NUEVA}')
    else:
        js.estado = 500 if falla == 'http500' else 307

    resultado = EscritorDirectorio().change_password('ana', NUEVA)

    assert resultado.exito           # LDAP no se revierte ni el flujo se rompe
    assert js.llamadas[0]['redirecciones'] is False
    [fallo] = _fallos()
    assert fallo.target == 'ana' and fallo.status == 'error'
    assert NUEVA not in caplog.text
    assert NUEVA not in repr((fallo.detail, fallo.target, fallo.after_state))
    assert URL not in repr(fallo.detail)


def test_un_oyente_que_falla_no_rompe_el_cambio(directorio, monkeypatch):
    from app.modules.directory import writer

    def roto(uid, contrasena):
        raise RuntimeError(contrasena)

    monkeypatch.setattr(writer, '_oyentes_cambio_contrasena', [roto])
    assert EscritorDirectorio().change_password('ana', NUEVA).exito


def test_registrar_no_duplica_el_oyente():
    from app.modules.directory import writer
    jumpserver.registrar()
    jumpserver.registrar()
    assert writer._oyentes_cambio_contrasena.count(
        jumpserver.sincronizar_contrasena) == 1


def test_cuenta_local_llama_directamente_una_vez(app, js, monkeypatch):
    from app.modules.auth import autoservicio
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'false')
    monkeypatch.setattr(autoservicio, 'directorio_activo', lambda: False)
    monkeypatch.setattr(autoservicio, 'enviar_correo_confirmacion_cambio',
                        lambda *a, **k: True)
    cuenta = fabricas.crear_usuario(ROLE_USER, email='local@pruebas.local',
                                    contrasena=ANTERIOR)
    with app.test_request_context():
        cambiar_contrasena(cuenta.email, ANTERIOR, NUEVA)
    assert js.usuarios == ['local@pruebas.local']
