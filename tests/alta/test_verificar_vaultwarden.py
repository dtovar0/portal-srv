"""Las rotaciones por CLI verifican Vaultwarden ANTES de tocar LDAP (FNC-205)."""
import pytest

from app.modules.alta import rotacion
from app.modules.secretos.vaultwarden import (GestorCaido,
                                              GestorMalConfigurado)
from tests import fabricas
from tests.alta import conftest as alta_conftest
from tests.alta.conftest import CLAVE_INICIAL, volcado_de_la_bd
from tests.alta.test_alta_csv import USUARIOS, csv, _con_areas  # noqa: F401
from tests.alta.test_migrar_ldap import base, _volcado  # noqa: F401
from tests.directorio_falso import dn_persona

ARCHIVO_SECRETO = 'valor-ficticio-que-no-debe-salir'


class ServicioQueRechaza:
    """Login a Vaultwarden con el error indicado."""

    def __init__(self, error):
        self.error = error
        self.llamadas = 0

    def verificar_acceso(self):
        self.llamadas += 1
        raise self.error


def _rechazar(monkeypatch, error=None):
    servicio = ServicioQueRechaza(
        error or GestorMalConfigurado('Vaultwarden: el inicio de sesión '
                                      'respondió 400.'))
    monkeypatch.setattr(rotacion, 'servicio_de_sends', lambda: servicio)
    return servicio


@pytest.fixture
def sin_escrituras(monkeypatch):
    """Cualquier escritura a LDAP en la corrida es un fallo de la prueba."""
    from app.modules.directory.writer import EscritorDirectorio
    llamadas = []
    for nombre in ('change_password', 'create_user', 'add_member',
                   'create_group', 'delete_user'):
        assert hasattr(EscritorDirectorio, nombre), nombre
        monkeypatch.setattr(
            EscritorDirectorio, nombre,
            lambda *a, _n=nombre, **k: llamadas.append(_n))
    return llamadas


def _esperar_rechazo(r, antes_bd):
    assert r.exit_code != 0
    assert 'Vaultwarden no acepta las credenciales configuradas' in r.output
    assert 'No se escribió nada' in r.output
    assert 'respondió 400' in r.output
    assert _volcado() == antes_bd


def test_migrar_ldap_login_rechazado_no_escribe(
        base, correr, con_entrega, monkeypatch, sin_escrituras):
    servicio = _rechazar(monkeypatch)
    antes = _volcado()

    r = correr('migrar-ldap', '--rotar-contrasena')

    _esperar_rechazo(r, antes)
    assert servicio.llamadas == 1
    assert base.clave('ana') == CLAVE_INICIAL
    assert sin_escrituras == [] and con_entrega.sends == []


def test_migrar_usuario_login_rechazado_no_escribe(
        base, correr, con_entrega, monkeypatch, sin_escrituras):
    fabricas.crear_area('Aduana')
    servicio = _rechazar(monkeypatch)
    antes = _volcado()

    r = correr('migrar-usuario', 'eli', '--area', 'Aduana',
               '--rotar-contrasena')

    _esperar_rechazo(r, antes)
    assert servicio.llamadas == 1
    assert base.clave('eli') == CLAVE_INICIAL
    assert sin_escrituras == []


def test_usuarios_crear_en_ldap_login_rechazado_no_escribe(
        app, correr, csv, ldap, con_entrega, monkeypatch,  # noqa: F811
        sin_escrituras):
    _con_areas()
    servicio = _rechazar(monkeypatch)
    antes = _volcado()

    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap',
               '--rotar-contrasena')

    _esperar_rechazo(r, antes)
    assert servicio.llamadas == 1
    assert ldap.atributos(dn_persona('ana')) is None
    assert sin_escrituras == []


def test_vaultwarden_caido_tambien_detiene_antes_de_escribir(
        base, correr, con_entrega, monkeypatch, sin_escrituras):
    _rechazar(monkeypatch, GestorCaido('Vaultwarden no responde (URLError).'))
    antes = _volcado()

    r = correr('migrar-ldap', '--rotar-contrasena')

    assert r.exit_code != 0
    assert 'Vaultwarden no responde' in r.output
    assert _volcado() == antes and sin_escrituras == []


def test_login_correcto_sigue_y_verifica_una_sola_vez(
        base, correr, con_entrega):
    alta_conftest.ServicioDeSendsFalso.verificaciones = 0

    r = correr('migrar-ldap', '--rotar-contrasena', '--solo', 'ana')

    assert r.exit_code == 0, r.output
    assert alta_conftest.ServicioDeSendsFalso.verificaciones == 1
    assert base.clave('ana') != CLAVE_INICIAL  # sí rotó


def test_dry_run_verifica_informa_y_no_escribe(
        base, correr, con_entrega, sin_escrituras):
    alta_conftest.ServicioDeSendsFalso.verificaciones = 0
    antes = _volcado()

    r = correr('migrar-ldap', '--rotar-contrasena', '--dry-run')

    assert r.exit_code == 0, r.output
    assert alta_conftest.ServicioDeSendsFalso.verificaciones == 1
    assert 'Vaultwarden acepta las credenciales configuradas' in r.output
    assert _volcado() == antes and sin_escrituras == []
    assert base.clave('ana') == CLAVE_INICIAL


def test_dry_run_con_login_rechazado_falla_sin_escribir(
        base, correr, con_entrega, monkeypatch):
    _rechazar(monkeypatch)
    antes = _volcado()

    r = correr('migrar-ldap', '--rotar-contrasena', '--dry-run')

    _esperar_rechazo(r, antes)


def test_el_mensaje_no_lleva_secretos(
        base, correr, con_entrega, monkeypatch):
    _rechazar(monkeypatch)
    r = correr('migrar-ldap', '--rotar-contrasena')
    assert ARCHIVO_SECRETO not in r.output
    assert 'Bearer' not in r.output and 'client_secret' not in r.output


def test_sends_por_api_verifica_el_login_sin_crear_sends():
    from tests.secretos import vaultwarden_falso as vf
    from tests.secretos.test_sends import _servicio
    servidor = vf.VaultwardenFalso()
    _servicio(servidor).verificar_acceso()
    assert ('POST', '/identity/connect/token') in servidor.peticiones
    assert servidor.sends == {}
    assert not any(m == 'POST' and r.startswith('/api/sends')
                   for m, r in servidor.peticiones)


def test_sends_por_api_con_credenciales_malas_lanza_error_permanente():
    from tests.secretos import vaultwarden_falso as vf
    from tests.secretos.test_sends import _servicio
    servidor = vf.VaultwardenFalso()
    servidor.estado_forzado['/identity/connect/token'] = 400
    with pytest.raises(GestorMalConfigurado):
        _servicio(servidor).verificar_acceso()
