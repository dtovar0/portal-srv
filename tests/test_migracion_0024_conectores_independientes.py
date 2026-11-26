"""Migración 0024 (FNC-213): conectores independientes (`platform_id` nulo,
`ON DELETE SET NULL`, `name` y `name_norm` únicos sin distinguir mayúsculas)."""
import importlib

import pytest
from alembic import command
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from tests.test_migraciones import migrar, motor_vacio  # noqa: F401 (fixture)

M = importlib.import_module(
    'migrations.versions.0024_conectores_independientes')
TABLA = 'platform_connectors'


def _sembrar(motor, plataformas, conectores):
    """`plataformas`: [(id, nombre)]; `conectores`: [(id, platform_id)]."""
    with motor.begin() as c:
        c.execute(text("INSERT INTO areas (id, name) VALUES (1, 'Área')"))
        for pid, nombre in plataformas:
            c.execute(text(
                'INSERT INTO platforms (id, name, description, area_id) '
                "VALUES (:i, :n, 'd', 1)"), {'i': pid, 'n': nombre})
        for cid, pid in conectores:
            c.execute(text(
                f'INSERT INTO {TABLA} (id, platform_id, type, host, port, '
                'params, credential_ref, credential_status, active, '
                "created_at, updated_at) VALUES (:i, :p, 'noop', 'h', 1, "
                "'{}', :r, 'sin_verificar', 1, '2026-01-01', '2026-01-01')"),
                {'i': cid, 'p': pid, 'r': f'ref/{cid}'})


def _filas(motor):
    with motor.connect() as c:
        return c.execute(text(
            f'SELECT id, platform_id, name, name_norm FROM {TABLA} '
            'ORDER BY id')).all()


def test_upgrade_rellena_el_nombre_con_el_de_la_plataforma(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0023')
    _sembrar(motor_vacio, [(1, 'Contabilidad'), (2, 'Nómina')],
             [(10, 1), (11, 2)])

    migrar(motor_vacio, command.upgrade, '0024')

    assert _filas(motor_vacio) == [
        (10, 1, 'Contabilidad', 'contabilidad'), (11, 2, 'Nómina', 'nómina')]


def test_upgrade_resuelve_nombres_iguales_sin_distinguir_mayusculas(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0023')
    _sembrar(motor_vacio, [(1, 'ERP'), (2, 'erp'), (3, 'Erp')],
             [(10, 1), (11, 2), (12, 3)])

    migrar(motor_vacio, command.upgrade, '0024')

    nombres = [f[2] for f in _filas(motor_vacio)]
    assert nombres == ['ERP', 'erp (2)', 'Erp (3)']
    assert len({f[3] for f in _filas(motor_vacio)}) == 3


def test_upgrade_recorta_el_nombre_con_el_sufijo_al_largo_maximo(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0023')
    largo = M.LARGO_NOMBRE
    _sembrar(motor_vacio, [(1, 'a' * largo), (2, 'A' * largo)],
             [(10, 1), (11, 2)])

    migrar(motor_vacio, command.upgrade, '0024')

    nombres = [f[2] for f in _filas(motor_vacio)]
    assert nombres[0] == 'a' * largo
    assert nombres[1].endswith(' (2)') and len(nombres[1]) == largo


def test_upgrade_permite_platform_id_nulo_y_unico_por_nombre(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0024')

    columnas = {c['name']: c for c in inspect(motor_vacio).get_columns(TABLA)}
    assert columnas['platform_id']['nullable'] is True
    assert columnas['name']['nullable'] is False
    assert columnas['name_norm']['nullable'] is False
    _sembrar(motor_vacio, [], [])
    with motor_vacio.begin() as c:
        for i in (1, 2):
            c.execute(text(
                f'INSERT INTO {TABLA} (id, platform_id, name, name_norm, '
                'type, host, port, params, credential_ref, '
                'credential_status, active, created_at, updated_at) VALUES '
                f"({i}, NULL, 'N{i}', 'n{i}', 'noop', 'h', 1, '{{}}', "
                "'r', 'sin_verificar', 1, '2026-01-01', '2026-01-01')"))
    with pytest.raises(IntegrityError):
        with motor_vacio.begin() as c:
            c.execute(text(f"UPDATE {TABLA} SET name_norm = 'n1' WHERE id = 2"))


def test_la_fk_pasa_a_set_null(motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0024')

    [fk] = [f for f in inspect(motor_vacio).get_foreign_keys(TABLA)
            if f['referred_table'] == 'platforms']
    assert fk['options'].get('ondelete') == 'SET NULL'


def test_downgrade_borra_los_conectores_sin_plataforma_y_restaura(
        motor_vacio):  # noqa: F811
    migrar(motor_vacio, command.upgrade, '0023')
    _sembrar(motor_vacio, [(1, 'Contabilidad')], [(10, 1)])
    migrar(motor_vacio, command.upgrade, '0024')
    with motor_vacio.begin() as c:
        c.execute(text(
            f'INSERT INTO {TABLA} (id, platform_id, name, name_norm, type, '
            "host, port, params, credential_ref, credential_status, active, "
            "created_at, updated_at) VALUES (11, NULL, 'Libre', 'libre', "
            "'noop', 'h', 1, '{}', 'r', 'sin_verificar', 1, '2026-01-01', "
            "'2026-01-01')"))

    migrar(motor_vacio, command.downgrade, '0023')

    inspector = inspect(motor_vacio)
    columnas = {c['name']: c for c in inspector.get_columns(TABLA)}
    assert 'name' not in columnas and 'name_norm' not in columnas
    assert columnas['platform_id']['nullable'] is False
    with motor_vacio.connect() as c:
        assert c.execute(text(f'SELECT id FROM {TABLA}')).scalars().all() == [10]
    [fk] = [f for f in inspector.get_foreign_keys(TABLA)
            if f['referred_table'] == 'platforms']
    assert fk['options'].get('ondelete') == 'CASCADE'
