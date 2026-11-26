"""Desglose `parte`/`resto` de `GET /api/v1/stats` (FNC-164).

Escenario: áreas A (activa), B (activa) e I (inactiva, sin plataformas);
plataformas activas e inactivas en A y B con visitas distintas.
"""
from collections import namedtuple

import pytest

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.access_requests.tipos import (ESTADO_APROBADA,
                                               ESTADO_PENDIENTE,
                                               ESTADO_RECHAZADA)
from app.modules.auth.models import User
from tests import fabricas

RUTA = '/api/v1/stats'
INACTIVO = 'Inactivo'
CLAVES = {'areas', 'platforms', 'requests', 'visits', 'users'}

Escena = namedtuple('Escena', 'super admin_a usuario_a1 usuario_a2 usuario_b')


def _solicitud(usuario, plataforma, estado):
    registro = PlatformAccessRequest(user_id=usuario.id,
                                     platform_id=plataforma.id,
                                     level='usuario', status=estado)
    registro.sincronizar_slot()
    db.session.add(registro)
    db.session.commit()


@pytest.fixture
def escena(app):
    area_a = fabricas.crear_area('Área A')
    area_b = fabricas.crear_area('Área B')
    fabricas.crear_area('Área I', status=INACTIVO)
    pa1 = fabricas.crear_plataforma(area_a, 'PA1', visits=3)
    pa2 = fabricas.crear_plataforma(area_a, 'PA2', visits=5, status=INACTIVO)
    pb1 = fabricas.crear_plataforma(area_b, 'PB1', visits=7)
    fabricas.crear_plataforma(area_b, 'PB2', visits=11, status=INACTIVO)
    super_ = fabricas.crear_usuario(ROLE_ADMIN)
    admin_a = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[area_a],
                                     areas_administradas=[area_a])
    ua1 = fabricas.crear_usuario(ROLE_USER, areas=[area_a])
    ua2 = fabricas.crear_usuario(ROLE_USER, areas=[area_a], activo=False)
    ub = fabricas.crear_usuario(ROLE_USER, areas=[area_b])
    fabricas.crear_acceso(ua1, pa1)
    _solicitud(ua1, pa1, ESTADO_PENDIENTE)
    _solicitud(ua1, pa2, ESTADO_APROBADA)
    _solicitud(ua2, pa1, ESTADO_RECHAZADA)
    _solicitud(ub, pb1, ESTADO_PENDIENTE)
    return Escena(super_.id, admin_a.id, ua1.id, ua2.id, ub.id)


def _pedir(cliente_como, user_id):
    db.session.expire_all()
    respuesta = cliente_como(db.session.get(User, user_id)).get(RUTA)
    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    return respuesta.get_json()


def _sumas_cuadran(datos):
    for clave, par in datos['desglose'].items():
        assert set(par) == {'parte', 'resto'}, clave
        # FNC-214: `users_by_role` reparte el mismo contador `users`.
        contador = 'users' if clave == 'users_by_role' else clave
        assert par['parte'] + par['resto'] == datos[contador], clave


def test_superadmin_desglose_de_cada_indicador(escena, cliente_como):
    datos = _pedir(cliente_como, escena.super)
    assert datos['desglose'] == {
        'areas': {'parte': 2, 'resto': 1},
        'platforms': {'parte': 2, 'resto': 2},
        'requests': {'parte': 2, 'resto': 2},
        'visits': {'parte': 10, 'resto': 16},
        'users': {'parte': 4, 'resto': 1},
        # FNC-214: 3 con rol usuario y 2 administradores; sin conectores.
        'users_by_role': {'parte': 3, 'resto': 2},
        'connectors': {'parte': 0, 'resto': 0},
    }
    _sumas_cuadran(datos)


def test_admin_de_area_solo_ve_lo_suyo(escena, cliente_como):
    datos = _pedir(cliente_como, escena.admin_a)
    assert datos['desglose'] == {
        'areas': {'parte': 1, 'resto': 0},
        'platforms': {'parte': 1, 'resto': 1},
        'requests': {'parte': 2, 'resto': 1},
        'visits': {'parte': 3, 'resto': 5},
        'users': {'parte': 1, 'resto': 1},
        'users_by_role': {'parte': 2, 'resto': 0},
    }
    _sumas_cuadran(datos)


def test_usuario_normal_solicitudes_propias_y_sin_users(escena, cliente_como):
    datos = _pedir(cliente_como, escena.usuario_a1)
    assert 'users' not in datos and 'users' not in datos['desglose']
    assert set(datos['desglose']) == CLAVES - {'users'}
    assert datos['desglose']['requests'] == {'parte': 1, 'resto': 1}
    _sumas_cuadran(datos)


@pytest.mark.parametrize('nombre, debe', [
    ('super', True), ('admin_a', True), ('usuario_a1', False),
    ('usuario_b', False)])
def test_users_solo_para_administradores(escena, cliente_como, nombre, debe):
    datos = _pedir(cliente_como, getattr(escena, nombre))
    assert ('users' in datos['desglose']) is debe
    assert ('users' in datos) is debe


def test_las_claves_existentes_no_cambian(escena, cliente_como):
    datos = _pedir(cliente_como, escena.super)
    assert {'areas', 'platforms', 'visits', 'most_visited',
            'platforms_by_area', 'requests', 'users', 'desglose'} <= set(datos)
