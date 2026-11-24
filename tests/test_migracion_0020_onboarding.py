"""Migración 0020 (FNC-190): `plantilla` en las entregas y plantilla de onboarding."""
import importlib

from alembic import command
from sqlalchemy import inspect, text

from tests.test_migraciones import migrar, motor_vacio  # noqa: F401 (fixture)

M = importlib.import_module('migrations.versions.0020_send_con_codigo_y_onboarding')
ONBOARDING = 'onboarding_aduana'
INICIALES = 'credenciales_iniciales'


def _cuerpo(motor, slug):
    with motor.connect() as conexion:
        return conexion.execute(text(
            'SELECT body FROM notification_templates WHERE slug = :s'),
            {'s': slug}).scalar()


def test_upgrade_agrega_la_columna_la_plantilla_y_actualiza_la_de_credenciales(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0019')
    assert _cuerpo(motor_vacio, INICIALES) == M.CUERPO_INICIALES_0016

    migrar(motor_vacio, command.upgrade, '0020')

    columnas = {c['name']: c for c in inspect(motor_vacio)
                .get_columns('credential_deliveries')}
    assert 'plantilla' in columnas and not columnas['plantilla']['nullable']
    assert 'destinatario' in columnas and columnas['destinatario']['nullable']
    cuerpo = _cuerpo(motor_vacio, ONBOARDING)
    for variable in ('{nombre}', '{usuario}', '{enlace}', '{codigo}', '{url}',
                     '{url}/autoservicio'):
        assert variable in cuerpo
    assert 'Authelia' in cuerpo and 'nadie de TI' in cuerpo
    assert '{codigo}' in _cuerpo(motor_vacio, INICIALES)


def test_filas_existentes_quedan_con_la_plantilla_por_omision(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0019')
    with motor_vacio.begin() as conexion:
        conexion.execute(text(
            "INSERT INTO users (email, role, is_active) VALUES ('x@ejemplo.test', 'usuario', 1)"))
        conexion.execute(text(
            "INSERT INTO credential_deliveries (user_id, uid, status, attempts_count, "
            "max_attempts, created_at, updated_at) VALUES "
            "(1, 'x', 'pendientes', 0, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"))

    migrar(motor_vacio, command.upgrade, '0020')

    with motor_vacio.connect() as conexion:
        assert conexion.execute(text(
            'SELECT plantilla FROM credential_deliveries')).scalar() == INICIALES


def test_no_pisa_una_plantilla_editada_ni_una_onboarding_existente(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0019')
    with motor_vacio.begin() as conexion:
        conexion.execute(text(
            "UPDATE notification_templates SET body = 'Editada' WHERE slug = :s"),
            {'s': INICIALES})
        conexion.execute(text(
            "INSERT INTO notification_templates (slug, name, subject, body, is_html, updated_at) "
            "VALUES (:s, 'Propia', 'Asunto propio', 'Mía', 1, CURRENT_TIMESTAMP)"),
            {'s': ONBOARDING})

    migrar(motor_vacio, command.upgrade, '0020')

    assert _cuerpo(motor_vacio, INICIALES) == 'Editada'
    assert _cuerpo(motor_vacio, ONBOARDING) == 'Mía'


def test_downgrade_quita_la_columna_y_devuelve_las_plantillas(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0020')

    migrar(motor_vacio, command.downgrade, '0019')

    assert not {'plantilla', 'destinatario'} & {
        c['name'] for c in inspect(motor_vacio)
        .get_columns('credential_deliveries')}
    assert _cuerpo(motor_vacio, ONBOARDING) is None
    assert _cuerpo(motor_vacio, INICIALES) == M.CUERPO_INICIALES_0016


def test_downgrade_conserva_las_plantillas_editadas(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0020')
    with motor_vacio.begin() as conexion:
        conexion.execute(text(
            "UPDATE notification_templates SET subject = 'Editado' WHERE slug = :s"),
            {'s': ONBOARDING})
        conexion.execute(text(
            "UPDATE notification_templates SET body = 'Editada' WHERE slug = :s"),
            {'s': INICIALES})

    migrar(motor_vacio, command.downgrade, '0019')

    assert _cuerpo(motor_vacio, ONBOARDING) is not None
    assert _cuerpo(motor_vacio, INICIALES) == 'Editada'
