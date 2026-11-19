"""Variables `OIDC_*`: validación y arranque (FNC-141, ADR-009)."""

import flask
import pytest

from app import create_app, db
from app.modules.auth.oidc_configuracion import (ErrorConfiguracionOidc,
                                                 leer_configuracion)
from tests.oidc_simulado import (CLIENT_SECRET, ISSUER, REDIRECT_URI,
                                 VARIABLES)

BD_MYSQL = {'DB_ENGINE': 'mysql', 'DB_USER': 'usuario', 'DB_PASS': 'clave',
            'DB_HOST': 'bd.pruebas.invalid', 'DB_PORT': '3306',
            'DB_NAME': 'nexus_pruebas'}


LOGOUT_URL = 'https://auth.pruebas.invalid/logout'


def _entorno(entorno='production', **cambios):
    # Fuera de desarrollo OIDC_LOGOUT_URL es obligatoria (revisión de seguridad).
    datos = {'APP_ENV': entorno, **VARIABLES, 'OIDC_LOGOUT_URL': LOGOUT_URL}
    datos.update(cambios)
    return {k: v for k, v in datos.items() if v is not None}


def test_en_desarrollo_sin_variables_el_oidc_esta_apagado():
    assert leer_configuracion({'APP_ENV': 'development'}) is None


@pytest.mark.parametrize('entorno', ['production', 'staging', ''])
def test_fuera_de_desarrollo_sin_variables_es_un_error(entorno):
    with pytest.raises(ErrorConfiguracionOidc):
        leer_configuracion({'APP_ENV': entorno})


def test_configuracion_completa():
    config = leer_configuracion(_entorno(
        OIDC_LOGOUT_URL='https://auth.pruebas.invalid/logout'))

    assert config.issuer == ISSUER
    assert config.client_id == 'portal'
    assert config.redirect_uri == REDIRECT_URI
    assert config.scopes == 'openid profile email'
    assert config.logout_url == 'https://auth.pruebas.invalid/logout'


def test_el_emisor_pierde_la_barra_final():
    assert leer_configuracion(_entorno(OIDC_ISSUER_URL=ISSUER + '/')).issuer == ISSUER


@pytest.mark.parametrize('faltante', ['OIDC_ISSUER_URL', 'OIDC_CLIENT_SECRET',
                                      'OIDC_REDIRECT_URI'])
def test_falta_una_obligatoria(faltante):
    with pytest.raises(ErrorConfiguracionOidc, match=faltante):
        leer_configuracion(_entorno(**{faltante: None}))


@pytest.mark.parametrize('variable', ['OIDC_ISSUER_URL', 'OIDC_REDIRECT_URI',
                                      'OIDC_LOGOUT_URL'])
@pytest.mark.parametrize('valor', ['http://auth.pruebas.invalid',
                                   'https://2130706433/x',
                                   'https://[2001:db8::1]/x',
                                   'https://usuario:clave@auth.pruebas.invalid',
                                   'auth.pruebas.invalid'])
def test_url_insegura_o_con_ip_se_rechaza(variable, valor):
    with pytest.raises(ErrorConfiguracionOidc, match=variable):
        leer_configuracion(_entorno(**{variable: valor}))


def test_http_solo_se_admite_en_desarrollo():
    config = leer_configuracion(_entorno(
        'development',
        OIDC_REDIRECT_URI='http://localhost:3000/api/v1/auth/oidc/callback'))

    assert config.redirect_uri.startswith('http://localhost')


def test_en_desarrollo_con_alguna_variable_se_exigen_todas():
    with pytest.raises(ErrorConfiguracionOidc):
        leer_configuracion({'APP_ENV': 'development', 'OIDC_ISSUER_URL': ISSUER})


def test_los_scopes_deben_incluir_openid():
    with pytest.raises(ErrorConfiguracionOidc, match='openid'):
        leer_configuracion(_entorno(OIDC_SCOPES='profile email'))


def test_el_secreto_no_aparece_en_la_representacion_ni_en_los_errores():
    config = leer_configuracion(_entorno())
    assert CLIENT_SECRET not in repr(config)
    with pytest.raises(ErrorConfiguracionOidc) as error:
        leer_configuracion(_entorno(OIDC_ISSUER_URL='http://auth.pruebas.invalid'))
    assert CLIENT_SECRET not in str(error.value)


# --------------------------------------------------------------------------- #
# Arranque de la app
# --------------------------------------------------------------------------- #

@pytest.fixture
def arranque(tmp_path, monkeypatch):
    monkeypatch.setattr(flask.Flask, 'auto_find_instance_path',
                        lambda self: str(tmp_path))
    monkeypatch.setattr(db, 'create_all', lambda *a, **k: None)
    for clave, valor in BD_MYSQL.items():
        monkeypatch.setenv(clave, valor)
    monkeypatch.setenv('APP_ENV', 'production')


def test_fuera_de_desarrollo_la_app_no_arranca_sin_oidc(arranque):
    with pytest.raises(ErrorConfiguracionOidc) as error:
        create_app()

    assert CLIENT_SECRET not in str(error.value)


def test_fuera_de_desarrollo_la_app_no_arranca_con_issuer_http(arranque,
                                                               monkeypatch):
    for clave, valor in VARIABLES.items():
        monkeypatch.setenv(clave, valor)
    monkeypatch.setenv('OIDC_ISSUER_URL', 'http://auth.pruebas.invalid')

    with pytest.raises(ErrorConfiguracionOidc, match='https'):
        create_app()


def test_fuera_de_desarrollo_la_app_arranca_con_oidc_completo(arranque,
                                                              monkeypatch):
    for clave, valor in {**VARIABLES, 'OIDC_LOGOUT_URL': LOGOUT_URL}.items():
        monkeypatch.setenv(clave, valor)

    aplicacion = create_app()

    assert aplicacion.test_client().get(
        '/api/v1/auth/context').get_json()['oidc_enabled'] is True


@pytest.mark.parametrize('entorno', ['production', 'staging', ''])
def test_fuera_de_desarrollo_sin_logout_url_es_un_error(entorno):
    """Sin OIDC_LOGOUT_URL, «Cerrar sesión» no cierra Authelia: en un equipo
    compartido el siguiente entraría como el anterior."""
    with pytest.raises(ErrorConfiguracionOidc, match='OIDC_LOGOUT_URL'):
        leer_configuracion(_entorno(entorno, OIDC_LOGOUT_URL=None))


def test_en_desarrollo_la_logout_url_sigue_siendo_opcional():
    assert leer_configuracion(_entorno('development', OIDC_LOGOUT_URL=None)) is not None


# FNC-157: instalar sin Authelia (decisión del dueño 2026-11-19).
@pytest.mark.parametrize('valor', ['false', 'FALSE', '0', 'no'])
def test_oidc_habilitado_false_permite_arrancar_sin_variables(valor):
    assert leer_configuracion({'APP_ENV': 'production',
                               'OIDC_HABILITADO': valor}) is None


def test_oidc_habilitado_false_ignora_las_demas_variables():
    assert leer_configuracion(_entorno(OIDC_HABILITADO='false')) is None


@pytest.mark.parametrize('valor', ['', 'true', '1', 'si'])
def test_oidc_habilitado_vacio_o_verdadero_sigue_exigiendo(valor):
    with pytest.raises(ErrorConfiguracionOidc):
        leer_configuracion({'APP_ENV': 'production', 'OIDC_HABILITADO': valor})


def test_oidc_habilitado_invalido_es_error():
    with pytest.raises(ErrorConfiguracionOidc, match='OIDC_HABILITADO'):
        leer_configuracion({'APP_ENV': 'production', 'OIDC_HABILITADO': 'flase'})
