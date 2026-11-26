"""Migración 0023 (FNC-210): plantilla `plataforma_desactivada`."""
import importlib

from alembic import command
from sqlalchemy import text

from tests.test_migraciones import migrar, motor_vacio  # noqa: F401 (fixture)

M = importlib.import_module(
    'migrations.versions.0023_plantilla_plataforma_desactivada')
SLUG = 'plataforma_desactivada'


def _fila(motor):
    with motor.connect() as conexion:
        return conexion.execute(text(
            'SELECT subject, body, is_html FROM notification_templates '
            'WHERE slug = :s'), {'s': SLUG}).first()


def test_upgrade_inserta_la_plantilla_html(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0022')
    assert _fila(motor_vacio) is None

    migrar(motor_vacio, command.upgrade, '0023')

    asunto, cuerpo, es_html = _fila(motor_vacio)
    assert '{plataforma}' in asunto and es_html
    assert 'suspendido' in cuerpo and '{area}' in cuerpo and '{url}' in cuerpo


def test_no_pisa_una_plantilla_editada_y_el_downgrade_la_conserva(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0022')
    with motor_vacio.begin() as conexion:
        conexion.execute(text(
            'INSERT INTO notification_templates (slug, name, subject, body, '
            "is_html) VALUES (:s, 'Mía', 'Editada', '<p>Mía</p>', 1)"),
            {'s': SLUG})

    migrar(motor_vacio, command.upgrade, '0023')
    assert _fila(motor_vacio)[:2] == ('Editada', '<p>Mía</p>')

    migrar(motor_vacio, command.downgrade, '0022')
    assert _fila(motor_vacio) is not None


def test_downgrade_borra_la_plantilla_sin_cambios(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0023')

    migrar(motor_vacio, command.downgrade, '0022')

    assert _fila(motor_vacio) is None
