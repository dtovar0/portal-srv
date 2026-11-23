"""`python run.py` solo en loopback y con depurador solo en desarrollo (FNC-009)."""
import runpy

import pytest


@pytest.mark.parametrize('entorno, depurador', [('development', True), ('production', False), ('', False)])
def test_servidor_local_en_loopback(monkeypatch, entorno, depurador):
    llamadas = []
    monkeypatch.setattr('flask.Flask.run', lambda self, **kw: llamadas.append(kw))
    monkeypatch.setenv('APP_ENV', entorno)
    if entorno != 'development':
        monkeypatch.setenv('DB_ENGINE', 'mysql')
        for clave in ('DB_USER', 'DB_PASS', 'DB_HOST', 'DB_NAME'):
            monkeypatch.setenv(clave, 'x')
        monkeypatch.setattr('app._crear_tablas', lambda app: None)
        from tests.oidc_simulado import fijar_oidc_de_produccion
        fijar_oidc_de_produccion(monkeypatch)  # fuera de dev el login es solo OIDC

    runpy.run_path('run.py', run_name='__main__')

    assert llamadas == [{'debug': depurador, 'port': 5001, 'host': '127.0.0.1'}]
