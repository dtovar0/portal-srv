"""Fuera de desarrollo la BD debe ser MySQL o PostgreSQL; SQLite solo en dev
(FNC-134, FNC-146)."""

import io
import pathlib

import flask
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url

from app import create_app, db
from app.utils.uri_bd import (ErrorConfiguracionBD, SQLITE_URI_POR_DEFECTO,
                              construir_uri_bd)

BD_MYSQL = {'DB_ENGINE': 'mysql', 'DB_USER': 'usuario', 'DB_PASS': 'clave',
            'DB_HOST': 'bd.pruebas.invalid', 'DB_PORT': '3306',
            'DB_NAME': 'nexus_pruebas'}
ENTORNOS_NO_DEV = ['production', 'staging', '', 'Prod']
RAIZ = pathlib.Path(__file__).resolve().parents[1]


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


@pytest.mark.parametrize('motor', ['sqlite', 'SQLite', 'postgres', 'MySQL', ''])
def test_fuera_de_dev_con_motor_no_admitido_no_arranca(
        instancia, monkeypatch, motor):
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('DB_ENGINE', motor)

    with pytest.raises(ErrorConfiguracionBD, match='"mysql" o "postgresql"'):
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
    """`migrations/env.py` llama a `construir_uri_bd`: producción con SQLite falla."""
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('DB_ENGINE', 'sqlite')

    with pytest.raises(ErrorConfiguracionBD):
        construir_uri_bd()


@pytest.mark.parametrize('entorno', ENTORNOS_NO_DEV)
def test_fuera_de_dev_con_postgresql_pasa_la_validacion(monkeypatch, entorno):
    monkeypatch.setenv('APP_ENV', entorno)
    for clave, valor in {**BD_MYSQL, 'DB_ENGINE': 'postgresql',
                         'DB_PORT': '5432'}.items():
        monkeypatch.setenv(clave, valor)

    assert construir_uri_bd() == (
        'postgresql+psycopg2://usuario:clave@bd.pruebas.invalid:5432/nexus_pruebas')


@pytest.mark.parametrize('motor', ['mysql', 'postgresql'])
def test_la_contrasena_con_caracteres_especiales_queda_escapada(
        monkeypatch, motor):
    monkeypatch.setenv('APP_ENV', 'production')
    for clave, valor in {**BD_MYSQL, 'DB_ENGINE': motor,
                         'DB_PASS': 'a@b:c/d#e'}.items():
        monkeypatch.setenv(clave, valor)

    url = make_url(construir_uri_bd())

    assert url.password == 'a@b:c/d#e'
    assert url.host == 'bd.pruebas.invalid'
    assert url.database == 'nexus_pruebas'


def test_sin_puerto_usa_el_del_motor(monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    for clave, valor in {**BD_MYSQL, 'DB_ENGINE': 'postgresql'}.items():
        monkeypatch.setenv(clave, valor)
    monkeypatch.setenv('DB_PORT', '')

    assert make_url(construir_uri_bd()).port is None


def test_puerto_no_numerico_no_arranca(monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    for clave, valor in {**BD_MYSQL, 'DB_PORT': '54x'}.items():
        monkeypatch.setenv(clave, valor)

    with pytest.raises(ErrorConfiguracionBD, match='DB_PORT'):
        construir_uri_bd()


# Tramos de `alembic upgrade --sql`: 0003 y 0012 leen datos con `get_bind()`
# (no hay SQL estático posible); son de datos, con SQLAlchemy Core portable.
TRAMOS_SIN_LECTURA = ('0002', '0003:0011')


@pytest.mark.parametrize('motor', ['mysql', 'postgresql'])
def test_las_migraciones_generan_sql_para_el_motor(monkeypatch, motor):
    """Las migraciones de esquema se traducen al dialecto sin conectarse."""
    monkeypatch.setenv('APP_ENV', 'production')
    for clave, valor in {**BD_MYSQL, 'DB_ENGINE': motor}.items():
        monkeypatch.setenv(clave, valor)
    salida = io.StringIO()
    configuracion = Config(str(RAIZ / 'alembic.ini'), output_buffer=salida)
    configuracion.set_main_option('script_location', str(RAIZ / 'migrations'))

    for tramo in TRAMOS_SIN_LECTURA:
        command.upgrade(configuracion, tramo, sql=True)

    sql = salida.getvalue()
    for tabla in ('users', 'audit_logs', 'platform_access_grants',
                  'platform_access_requests', 'platform_connectors',
                  'provisioning_jobs'):
        assert f'CREATE TABLE {tabla}' in sql
    assert "UPDATE alembic_version SET version_num='0011'" in sql


@pytest.mark.parametrize('valor', ['postgresql ', ' postgresql', '"postgresql"'])
def test_motor_con_espacios_o_comillas_se_limpia_como_en_preflight(
        monkeypatch, valor):
    monkeypatch.setenv('APP_ENV', 'production')
    for clave, dato in {**BD_MYSQL, 'DB_ENGINE': valor}.items():
        monkeypatch.setenv(clave, dato)

    assert construir_uri_bd().startswith('postgresql+psycopg2://')


# --- TLS hacia la BD (FNC-151) ------------------------------------------------

@pytest.mark.parametrize('motor, esperado', [
    ('postgresql', {'sslmode': 'verify-full'}),
    ('mysql', {'ssl_check_hostname': 'true'}),
])
def test_con_ca_exige_tls_verificado(monkeypatch, tmp_path, motor, esperado):
    ca = tmp_path / 'ca.pem'
    ca.write_text('certificado de prueba')
    monkeypatch.setenv('APP_ENV', 'production')
    for clave, valor in {**BD_MYSQL, 'DB_ENGINE': motor, 'DB_TLS_CA_FILE': str(ca)}.items():
        monkeypatch.setenv(clave, valor)

    consulta = dict(make_url(construir_uri_bd()).query)

    for clave, valor in esperado.items():
        assert consulta[clave] == valor
    assert str(ca) in consulta.values()


def test_sin_ca_no_agrega_parametros_tls(monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    for clave, valor in {**BD_MYSQL, 'DB_ENGINE': 'postgresql', 'DB_TLS_CA_FILE': ''}.items():
        monkeypatch.setenv(clave, valor)
    assert dict(make_url(construir_uri_bd()).query) == {}


def test_ca_inexistente_no_arranca(monkeypatch, tmp_path):
    monkeypatch.setenv('APP_ENV', 'production')
    for clave, valor in {**BD_MYSQL, 'DB_TLS_CA_FILE': str(tmp_path / 'no-existe.pem')}.items():
        monkeypatch.setenv(clave, valor)
    with pytest.raises(ErrorConfiguracionBD, match='DB_TLS_CA_FILE'):
        construir_uri_bd()
