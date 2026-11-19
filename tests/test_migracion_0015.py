"""Migración 0015 (FNC-138): `credential_deliveries` y plantillas de correo."""
from alembic import command
from sqlalchemy import inspect, text

from tests.test_migraciones import migrar, motor_vacio  # noqa: F401 (fixture)

SLUGS = ('credenciales_iniciales', 'credenciales_no_entregadas')


def _slugs(motor):
    with motor.connect() as conexion:
        return set(conexion.execute(text(
            'SELECT slug FROM notification_templates')).scalars())


def test_upgrade_crea_la_tabla_sin_columnas_de_secretos_y_las_plantillas(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0015')

    columnas = {c['name'] for c in inspect(motor_vacio)
                .get_columns('credential_deliveries')}
    assert {'user_id', 'uid', 'status', 'attempts_count', 'max_attempts',
            'next_attempt_at', 'send_id', 'last_error'} <= columnas
    assert not {c for c in columnas
                if 'password' in c or 'link' in c or 'url' in c}
    assert set(SLUGS) <= _slugs(motor_vacio)


def test_downgrade_quita_la_tabla_y_solo_las_plantillas_sin_editar(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0015')
    with motor_vacio.begin() as conexion:
        conexion.execute(text(
            "UPDATE notification_templates SET subject = 'Editada' "
            "WHERE slug = 'credenciales_no_entregadas'"))

    migrar(motor_vacio, command.downgrade, '0014')

    assert 'credential_deliveries' not in inspect(motor_vacio).get_table_names()
    assert _slugs(motor_vacio) & set(SLUGS) == {'credenciales_no_entregadas'}
