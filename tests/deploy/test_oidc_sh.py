"""`deploy/oidc.sh` y su uso en preflight e install, con `.env` SINTÉTICOS (FNC-143).

El secreto de prueba es una marca: nunca debe aparecer en la salida.
"""
import subprocess
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]
SCRIPT = RAIZ / 'deploy' / 'oidc.sh'
MARCA = 'Secreto-Ficticio-Que-No-Se-Imprime'
BASE = {
    'APP_ENV': 'production',
    'OIDC_ISSUER_URL': 'https://auth.ejemplo.test',
    'OIDC_CLIENT_SECRET': MARCA,
    'OIDC_REDIRECT_URI': 'https://portal.ejemplo.test/api/v1/auth/oidc/callback',
    'OIDC_LOGOUT_URL': 'https://auth.ejemplo.test/logout',
}


def _revisar(tmp_path, cambios=None, quitar=()):
    variables = {**BASE, **(cambios or {})}
    for nombre in quitar:
        variables.pop(nombre, None)
    env = tmp_path / '.env'
    env.write_text(''.join(f'{k}={v}\n' for k, v in variables.items()))
    r = subprocess.run(
        ['bash', '-c', f'. "{SCRIPT}"; revisar_oidc "$1"', '_', str(env)],
        capture_output=True, text=True, timeout=10)
    assert MARCA not in r.stdout + r.stderr
    return r.returncode, r.stdout


def test_completo_pasa(tmp_path):
    codigo, salida = _revisar(tmp_path)
    assert codigo == 0, salida
    assert 'FALTA' not in salida
    assert 'OIDC_CLIENT_SECRET definida' in salida


@pytest.mark.parametrize('variable', ['OIDC_ISSUER_URL', 'OIDC_CLIENT_SECRET',
                                      'OIDC_REDIRECT_URI'])
@pytest.mark.parametrize('entorno', ['production', 'staging', ''])
def test_sin_obligatoria_fuera_de_dev_es_falta(tmp_path, variable, entorno):
    codigo, salida = _revisar(tmp_path, {'APP_ENV': entorno}, quitar=(variable,))
    assert codigo == 1
    assert f'FALTA {variable}' in salida


@pytest.mark.parametrize('vacio', ['', '""', "''"])
def test_secreto_vacio_es_falta(tmp_path, vacio):
    codigo, salida = _revisar(tmp_path, {'OIDC_CLIENT_SECRET': vacio})
    assert codigo == 1
    assert 'FALTA OIDC_CLIENT_SECRET' in salida


@pytest.mark.parametrize('cambio, texto', [
    ({'OIDC_ISSUER_URL': 'http://auth.ejemplo.test'}, 'FALTA OIDC_ISSUER_URL debe usar https'),
    ({'OIDC_REDIRECT_URI': 'http://portal.ejemplo.test/cb'}, 'FALTA OIDC_REDIRECT_URI debe usar https'),
    ({'OIDC_ISSUER_URL': 'https://user:pw@auth.ejemplo.test'}, 'FALTA OIDC_ISSUER_URL no admite usuario'),
    ({'OIDC_LOGOUT_URL': 'http://auth.ejemplo.test/logout'}, 'FALTA OIDC_LOGOUT_URL debe usar https'),
    ({'OIDC_SCOPES': 'profile email'}, 'FALTA OIDC_SCOPES debe incluir openid'),
])
def test_valores_invalidos(tmp_path, cambio, texto):
    codigo, salida = _revisar(tmp_path, cambio)
    assert codigo == 1
    assert texto in salida


def test_desarrollo_sin_oidc_pasa(tmp_path):
    codigo, salida = _revisar(
        tmp_path, {'APP_ENV': 'development'},
        quitar=('OIDC_ISSUER_URL', 'OIDC_CLIENT_SECRET', 'OIDC_REDIRECT_URI',
                'OIDC_LOGOUT_URL'))
    assert codigo == 0
    assert 'acceso-emergencia' in salida


def test_desarrollo_con_oidc_a_medias_es_falta(tmp_path):
    codigo, salida = _revisar(tmp_path, {'APP_ENV': 'development'},
                              quitar=('OIDC_ISSUER_URL',))
    assert codigo == 1
    assert 'FALTA OIDC_ISSUER_URL' in salida


@pytest.mark.parametrize('script', ['preflight.sh', 'install.sh'])
def test_preflight_e_install_cargan_y_llaman_la_revision(script):
    texto = (RAIZ / 'deploy' / script).read_text()
    assert 'oidc.sh' in texto
    assert 'revisar_oidc' in texto


def test_sintaxis_de_los_scripts():
    for nombre in ('oidc.sh', 'preflight.sh', 'install.sh'):
        r = subprocess.run(['bash', '-n', str(RAIZ / 'deploy' / nombre)],
                           capture_output=True, text=True)
        assert r.returncode == 0, r.stderr


def test_nginx_sin_auth_request_y_con_borrado_de_remote():
    texto = (RAIZ / 'deploy' / 'nginx.conf.tmpl').read_text()
    activas = [l for l in texto.splitlines() if not l.lstrip().startswith('#')]
    assert not any('auth_request' in l for l in activas)
    assert 'proxy_set_header Remote-Email' in texto


def test_fuera_de_desarrollo_sin_logout_url_es_falta(tmp_path):
    codigo, salida = _revisar(tmp_path, quitar=('OIDC_LOGOUT_URL',))
    assert codigo == 1
    assert 'FALTA OIDC_LOGOUT_URL sin definir' in salida


# FNC-157: instalar sin Authelia.
def test_oidc_habilitado_false_es_aviso_y_pasa(tmp_path):
    codigo, salida = _revisar(tmp_path, {'OIDC_HABILITADO': 'false'},
                              quitar=('OIDC_ISSUER_URL', 'OIDC_CLIENT_SECRET',
                                      'OIDC_REDIRECT_URI', 'OIDC_LOGOUT_URL'))
    assert codigo == 0, salida
    assert 'FALTA' not in salida
    assert 'AVISO OIDC_HABILITADO=false' in salida


def test_oidc_habilitado_invalido_es_falta(tmp_path):
    codigo, salida = _revisar(tmp_path, {'OIDC_HABILITADO': 'flase'})
    assert codigo == 1
    assert 'FALTA OIDC_HABILITADO' in salida
