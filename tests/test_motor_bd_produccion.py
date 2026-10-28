"""Fuera de desarrollo la BD debe ser MySQL; SQLite solo en dev (FNC-134)."""

import flask
import pytest

from app import create_app, db
from app.utils.uri_bd import (ErrorConfiguracionBD, SQLITE_URI_POR_DEFECTO,
                              construir_uri_bd)

BD_MYSQL = {'DB_ENGINE': 'mysql', 'DB_USER': 'usuario', 'DB_PASS': 'clave',
            'DB_HOST': 'bd.pruebas.invalid', 'DB_PORT': '3306',
            'DB_NAME': 'nexus_pruebas'}
ENTORNOS_NO_DEV = ['production', 'staging', '', 'Prod']


@pytest.fixture
def instancia(tmp_path, monkeypatch):
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


@pytest.mark.parametrize('entorno', ENTORNOS_NO_DEV)
def test_fuera_de_dev_sin_db_engine_no_arranca(instancia, monkeypatch, entorno):
    monkeypatch.setenv('APP_ENV', entorno)
    monkeypatch.delenv('DB_ENGINE')

    with pytest.raises(ErrorConfiguracionBD, match='DB_ENGINE'):
        instancia()


@pytest.mark.parametrize('motor', ['sqlite', 'SQLite', 'postgresql', ''])
def test_fuera_de_dev_con_motor_distinto_de_mysql_no_arranca(
        instancia, monkeypatch, motor):
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('DB_ENGINE', motor)

    with pytest.raises(ErrorConfiguracionBD, match='mysql'):
        instancia()


def test_el_mensaje_no_lleva_secretos(monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('DB_ENGINE', 'sqlite')
    monkeypatch.setenv('DB_PASS', 'clave-que-no-debe-salir')

    with pytest.raises(ErrorConfiguracionBD) as error:
        construir_uri_bd()

    assert 'clave-que-no-debe-salir' not in str(error.value)


@pytest.mark.parametrize('entorno', ENTORNOS_NO_DEV)
def test_fuera_de_dev_con_mysql_pasa_la_validacion(monkeypatch, entorno):
    monkeypatch.setenv('APP_ENV', entorno)
    for clave, valor in BD_MYSQL.items():
        monkeypatch.setenv(clave, valor)

    assert construir_uri_bd() == (
        'mysql+pymysql://usuario:clave@bd.pruebas.invalid:3306/nexus_pruebas')


def test_en_desarrollo_sqlite_sigue_funcionando(instancia, tmp_path,
                                                monkeypatch):
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.delenv('DB_ENGINE')

    aplicacion = instancia()

    assert aplicacion.config['SQLALCHEMY_DATABASE_URI'] == SQLITE_URI_POR_DEFECTO
    assert (tmp_path / 'nexus.db').exists()


def test_las_migraciones_usan_la_misma_regla(monkeypatch):
    """`migrations/env.py` llama a `construir_uri_bd`: producción sin MySQL falla."""
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('DB_ENGINE', 'sqlite')

    with pytest.raises(ErrorConfiguracionBD):
        construir_uri_bd()
