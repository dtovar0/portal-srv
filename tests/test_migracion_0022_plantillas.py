"""Migración 0022 (FNC-203): resembrar las plantillas que falten."""
import importlib

from alembic import command
from sqlalchemy import text

from tests.test_migraciones import migrar, motor_vacio  # noqa: F401 (fixture)

M = importlib.import_module('migrations.versions.0022_resembrar_plantillas')
SLUGS = {'solicitud_nueva', 'solicitud_aprobada', 'solicitud_rechazada',
         'aprovisionamiento_fallido', 'credenciales_iniciales',
         'credenciales_no_entregadas', 'onboarding_aduana'}


def _filas(motor):
    with motor.connect() as conexion:
        return {f[0]: tuple(f) for f in conexion.execute(text(
            'SELECT slug, subject, body, is_html FROM notification_templates'))}


def _vaciar(motor):
    with motor.begin() as conexion:
        conexion.execute(text('DELETE FROM notification_templates'))


def test_definiciones_cubren_las_siete_plantillas():
    assert set(M.definiciones()) == SLUGS


def test_bd_sin_plantillas_las_recupera_con_el_texto_de_head(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0021')
    esperado = _filas(motor_vacio)
    _vaciar(motor_vacio)

    migrar(motor_vacio, command.upgrade, '0022')

    filas = _filas(motor_vacio)
    assert set(filas) == SLUGS
    assert filas == esperado
    assert all(f[3] for f in filas.values())


def test_no_toca_una_plantilla_existente_editada(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0021')
    with motor_vacio.begin() as conexion:
        conexion.execute(text('DELETE FROM notification_templates '
                              "WHERE slug IN ('solicitud_nueva', 'onboarding_aduana')"))
        conexion.execute(text(
            "UPDATE notification_templates SET subject = 'Editada', "
            "body = '<p>Mía</p>' WHERE slug = 'solicitud_aprobada'"))

    migrar(motor_vacio, command.upgrade, '0022')

    filas = _filas(motor_vacio)
    assert set(filas) == SLUGS
    assert filas['solicitud_aprobada'][1:3] == ('Editada', '<p>Mía</p>')


def test_es_idempotente_y_el_downgrade_no_borra(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0021')
    _vaciar(motor_vacio)
    migrar(motor_vacio, command.upgrade, '0022')
    primera = _filas(motor_vacio)

    migrar(motor_vacio, command.downgrade, '0021')
    assert _filas(motor_vacio) == primera
    migrar(motor_vacio, command.upgrade, '0022')
    assert _filas(motor_vacio) == primera
    with motor_vacio.connect() as conexion:
        assert conexion.execute(text(
            'SELECT COUNT(*) FROM notification_templates')).scalar() == len(SLUGS)
