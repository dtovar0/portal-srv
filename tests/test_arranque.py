"""Arranque: `create_app` con configuración válida, inválida y faltante (FNC-023).

`create_app` se llama sin `config_overrides`, como en producción. La carpeta
`instance/` de Flask se redirige a un directorio temporal para que el SQLite
por defecto no quede en el repo, y `db.create_all` se sustituye donde la BD
sería externa (MySQL) para no abrir conexiones.
"""

import flask
import pytest

from app import create_app, db
from tests.conftest import VARIABLES_PRUEBA

CLAVE_POR_DEFECTO = 'nexus-premium-secret-key'
HOST_BD_FICTICIO = 'bd.pruebas.invalid'
BD_MYSQL = {'DB_ENGINE': 'mysql', 'DB_USER': 'usuario', 'DB_PASS': 'clave',
            'DB_HOST': HOST_BD_FICTICIO, 'DB_PORT': '3306',
            'DB_NAME': 'nexus_pruebas'}


@pytest.fixture
def instancia(tmp_path, monkeypatch):
    """`instance/` en un directorio temporal; libera el motor al terminar."""
    monkeypatch.setattr(flask.Flask, 'auto_find_instance_path',
                        lambda self: str(tmp_path))
    creadas = []

    def _crear():
        aplicacion = create_app()
        creadas.append(aplicacion)
        return aplicacion

    yield _crear
    for aplicacion in creadas:
        with aplicacion.app_context():
            db.session.remove()
            db.engine.dispose()


@pytest.fixture
def sin_bd_externa(monkeypatch):
    """`db.create_all` falla antes de conectar: create_app captura el error."""
    def _sin_conexion(*args, **kwargs):
        raise RuntimeError('BD externa no disponible en pruebas')
    monkeypatch.setattr(db, 'create_all', _sin_conexion)


def test_configuracion_minima_arranca_con_sqlite(instancia, tmp_path):
    aplicacion = instancia()

    assert aplicacion.config['SECRET_KEY'] == VARIABLES_PRUEBA['SECRET_KEY']
    assert aplicacion.config['SQLALCHEMY_DATABASE_URI'] == 'sqlite:///nexus.db'
    assert (tmp_path / 'nexus.db').exists()
    respuesta = aplicacion.test_client().get('/api/v1/auth/context')
    assert respuesta.status_code == 200


def test_mysql_arma_la_url_desde_las_variables(instancia, sin_bd_externa,
                                               monkeypatch):
    for clave, valor in BD_MYSQL.items():
        monkeypatch.setenv(clave, valor)

    aplicacion = instancia()

    assert aplicacion.config['SQLALCHEMY_DATABASE_URI'] == (
        f'mysql+pymysql://usuario:clave@{HOST_BD_FICTICIO}:3306/nexus_pruebas')


def test_la_sesion_dura_siete_dias_y_tiene_nombre_propio(instancia):
    aplicacion = instancia()

    assert aplicacion.config['PERMANENT_SESSION_LIFETIME'].days == 7
    assert aplicacion.config['SESSION_COOKIE_NAME'] == 'nexus_session'


# --------------------------------------------------------------------------- #
# Configuración faltante o inválida: debe fallar con un mensaje claro
# --------------------------------------------------------------------------- #

def test_sin_secret_key_no_arranca(instancia, monkeypatch):
    monkeypatch.delenv('SECRET_KEY')

    with pytest.raises(Exception):
        instancia()


def test_secret_key_conocida_no_arranca(instancia, monkeypatch):
    monkeypatch.setenv('SECRET_KEY', CLAVE_POR_DEFECTO)

    with pytest.raises(Exception):
        instancia()


@pytest.mark.parametrize('motor', ['postgres', 'MySQL', 'otro'])
def test_db_engine_invalido_no_arranca(instancia, monkeypatch, motor):
    monkeypatch.setenv('DB_ENGINE', motor)

    with pytest.raises(Exception):
        instancia()


def test_sin_db_engine_no_arranca(instancia, monkeypatch):
    # FNC-134: fuera de desarrollo, sin DB_ENGINE=mysql no arranca.
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.delenv('DB_ENGINE')

    with pytest.raises(Exception):
        instancia()



# FNC-160: fuera de desarrollo el esquema lo crean SOLO las migraciones. Un
# `create_all` al arrancar con código nuevo antes de migrar creó una tabla que
# la migración luego no pudo crear (DuplicateTable en PostgreSQL).
def test_fuera_de_desarrollo_no_crea_tablas_al_arrancar(instancia, monkeypatch):
    llamadas = []
    monkeypatch.setattr(db, 'create_all', lambda *a, **k: llamadas.append(1))
    for clave, valor in {**BD_MYSQL, 'APP_ENV': 'production',
                         'OIDC_HABILITADO': 'false'}.items():
        monkeypatch.setenv(clave, valor)

    instancia()

    assert llamadas == []


def test_en_desarrollo_si_crea_tablas_al_arrancar(instancia, monkeypatch):
    llamadas = []
    monkeypatch.setattr(db, 'create_all', lambda *a, **k: llamadas.append(1))

    instancia()

    assert llamadas == [1]
