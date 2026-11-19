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
    migrar(motor_vacio, command.upgrade, '0016')

    columnas = {c['name'] for c in inspect(motor_vacio)
                .get_columns('credential_deliveries')}
    assert {'user_id', 'uid', 'status', 'attempts_count', 'max_attempts',
            'next_attempt_at', 'send_id', 'last_error'} <= columnas
    assert not {c for c in columnas
                if 'password' in c or 'link' in c or 'url' in c}
    assert set(SLUGS) <= _slugs(motor_vacio)


def test_downgrade_quita_la_tabla_y_solo_las_plantillas_sin_editar(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0016')
    with motor_vacio.begin() as conexion:
        conexion.execute(text(
            "UPDATE notification_templates SET subject = 'Editada' "
            "WHERE slug = 'credenciales_no_entregadas'"))

    migrar(motor_vacio, command.downgrade, '0015')

    assert 'credential_deliveries' not in inspect(motor_vacio).get_table_names()
    assert _slugs(motor_vacio) & set(SLUGS) == {'credenciales_no_entregadas'}


# FNC-160: el arranque de la app (`create_all`) creó la tabla vacía antes de
# migrar y 0016 fallaba con DuplicateTable. Vacía: se recrea; con filas: se
# detiene sin tocar nada.
def _crear_tabla_como_create_all(motor):
    from app.modules.users.models import EntregaCredenciales
    EntregaCredenciales.__table__.create(motor)


def test_tabla_vacia_creada_antes_de_migrar_no_detiene_el_upgrade(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0015')
    _crear_tabla_como_create_all(motor_vacio)

    migrar(motor_vacio, command.upgrade, '0016')

    assert 'credential_deliveries' in inspect(motor_vacio).get_table_names()
    assert set(SLUGS) <= _slugs(motor_vacio)


def test_tabla_con_filas_creada_antes_de_migrar_detiene_el_upgrade(
        motor_vacio):  # noqa: F811
    import pytest
    migrar(motor_vacio, command.upgrade, '0015')
    _crear_tabla_como_create_all(motor_vacio)
    with motor_vacio.begin() as conexion:
        conexion.execute(text(
            "INSERT INTO users (email, role, is_active) VALUES ('x@ejemplo.test', 'usuario', 1)"))
        conexion.execute(text(
            "INSERT INTO credential_deliveries (user_id, uid, status, attempts_count, "
            "max_attempts, created_at, updated_at) VALUES "
            "(1, 'x', 'pendiente', 0, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"))

    with pytest.raises(Exception, match='credential_deliveries'):
        migrar(motor_vacio, command.upgrade, '0016')
