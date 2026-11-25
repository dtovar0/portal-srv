"""Resumen de la bandeja: `GET /access-requests/inbox/stats` (FNC-200)."""
from app import db
from app.authz import ROLE_USER
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.access_requests.tipos import (ESTADO_APROBADA,
                                               ESTADO_PENDIENTE,
                                               ESTADO_RECHAZADA)
from app.modules.provisioning.reloj import ahora
from tests import fabricas
from tests.access_requests.conftest import RUTA

STATS = f'{RUTA}/inbox/stats'


def solicitud(usuario, plataforma, estado=ESTADO_PENDIENTE):
    registro = PlatformAccessRequest(
        user_id=usuario.id, platform_id=plataforma.id, level='usuario',
        status=estado, created_at=ahora())
    registro.sincronizar_slot()
    db.session.add(registro)
    db.session.commit()
    return registro


def test_usuario_no_ve_el_resumen(escena, cliente_como):
    assert cliente_como(escena['usuario']).get(STATS).status_code == 403


def test_sin_datos_devuelve_las_tres_claves_en_cero(escena, cliente_como):
    cuerpo = cliente_como(escena['super']).get(STATS).get_json()

    assert cuerpo == {'total': 0,
                      'by_status': {'pendiente': 0, 'aprobada': 0,
                                    'rechazada': 0},
                      'by_area': [], 'by_platform': []}


def test_admin_de_area_cuenta_solo_sus_areas_y_no_las_propias(
        escena, cliente_como):
    solicitud(escena['usuario'], escena['plataforma'])
    solicitud(escena['usuario'], escena['plataforma'], ESTADO_APROBADA)
    solicitud(escena['ajeno'], escena['de_otra'])
    # Otro administrador de área (admin_otra) no entra en su alcance.
    solicitud(escena['admin_otra'], escena['plataforma'])

    cuerpo = cliente_como(escena['admin']).get(STATS).get_json()

    assert cuerpo['total'] == 2
    assert cuerpo['by_status'] == {'pendiente': 1, 'aprobada': 1,
                                   'rechazada': 0}
    assert cuerpo['by_area'] == [
        {'area_id': escena['area'].id, 'area': 'Finanzas', 'count': 2}]


def test_superadmin_cuenta_todas_con_agregados_y_orden(escena, cliente_como):
    otro = fabricas.crear_usuario(ROLE_USER, areas=[escena['area']])
    nueva = fabricas.crear_plataforma(escena['area'], 'Activos')
    solicitud(escena['usuario'], escena['plataforma'])
    solicitud(otro, escena['plataforma'], ESTADO_RECHAZADA)
    solicitud(escena['usuario'], nueva)
    solicitud(escena['ajeno'], escena['de_otra'], ESTADO_APROBADA)
    # Cuenta como solicitante la propia del superadmin: no cuenta.
    solicitud(escena['super'], escena['de_otra'])

    cuerpo = cliente_como(escena['super']).get(STATS).get_json()

    assert cuerpo['total'] == 4
    assert cuerpo['by_status'] == {'pendiente': 2, 'aprobada': 1,
                                   'rechazada': 1}
    assert cuerpo['by_area'] == [
        {'area_id': escena['area'].id, 'area': 'Finanzas', 'count': 3},
        {'area_id': escena['otra'].id, 'area': 'Ventas', 'count': 1}]
    # count desc; a igual número, nombre asc (Activos antes que CRM).
    assert cuerpo['by_platform'] == [
        {'platform_id': escena['plataforma'].id, 'platform': 'Contabilidad',
         'area': 'Finanzas', 'count': 2},
        {'platform_id': nueva.id, 'platform': 'Activos', 'area': 'Finanzas',
         'count': 1},
        {'platform_id': escena['de_otra'].id, 'platform': 'CRM',
         'area': 'Ventas', 'count': 1}]
