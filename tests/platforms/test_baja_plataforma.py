"""Baja de plataforma (FNC-144): bloqueo con accesos vigentes y limpieza del
historial cerrado sin dejar gente en los grupos sin rastro."""
import pytest

from app import db
from app.authz import ROLE_ADMIN, ROLE_USER
from app.modules.access.models import PlatformAccessGrant
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.access_requests.tipos import ESTADO_PENDIENTE
from app.modules.audit.models import AuditLog
from app.modules.connectors.models import PlatformConnector
from app.modules.core.models import Platform
from app.modules.home.services import resumen
from app.modules.provisioning import queue
from app.modules.provisioning.models import ProvisioningJob
from tests import fabricas

A = '/api/v1'
VIGENTES = ('en_proceso', 'activo', 'fallido', 'revocando', 'fallo_revocacion')


@pytest.fixture
def escena(app):
    superadmin = fabricas.crear_usuario(ROLE_ADMIN, email='super_baja@pruebas.local')
    usuario = fabricas.crear_usuario(ROLE_USER, email='solicitante@pruebas.local')
    area = fabricas.crear_area('Finanzas Test')
    plataforma = fabricas.crear_plataforma(area, 'Conta Test')
    return superadmin, usuario, plataforma


def _solicitud_pendiente(usuario, plataforma):
    solicitud = PlatformAccessRequest(
        user_id=usuario.id, platform_id=plataforma.id, level='usuario',
        status=ESTADO_PENDIENTE, slot_pendiente=1)
    db.session.add(solicitud)
    db.session.commit()
    return solicitud


def test_baja_plataforma_elimina_solicitudes_pendientes(escena, cliente_como):
    superadmin, usuario, plataforma = escena
    _solicitud_pendiente(usuario, plataforma)
    assert resumen(superadmin)['pending_approvals'] == 1

    res = cliente_como(superadmin).delete(f'{A}/platforms/{plataforma.id}')

    assert res.status_code == 200
    assert PlatformAccessRequest.query.filter_by(platform_id=plataforma.id).count() == 0
    assert resumen(superadmin)['pending_approvals'] == 0


@pytest.mark.parametrize('estado', VIGENTES)
def test_baja_con_acceso_vigente_responde_409_y_no_borra_nada(
        escena, cliente_como, estado):
    superadmin, usuario, plataforma = escena
    acceso = fabricas.crear_acceso(usuario, plataforma, estado=estado)
    _solicitud_pendiente(fabricas.crear_usuario(ROLE_USER), plataforma)
    plataforma_id, acceso_id = plataforma.id, acceso.id

    res = cliente_como(superadmin).delete(f'{A}/platforms/{plataforma_id}')

    assert res.status_code == 409
    assert res.get_json()['code'] == 'plataforma_con_accesos'
    db.session.expire_all()
    assert db.session.get(Platform, plataforma_id) is not None
    assert db.session.get(PlatformAccessGrant, acceso_id) is not None
    assert PlatformAccessRequest.query.filter_by(platform_id=plataforma_id).count() == 1


def test_baja_con_historial_cerrado_retira_y_desliga_trabajos(
        escena, cliente_como):
    superadmin, usuario, plataforma = escena
    acceso = fabricas.crear_acceso(usuario, plataforma, estado='revocado')
    trabajo = queue.encolar('revocar', usuario.id, plataforma, 'usuario',
                            'baja-prueba', access_id=acceso.id)
    trabajo.status = 'exitoso'
    db.session.commit()
    plataforma_id, trabajo_id = plataforma.id, trabajo.id

    res = cliente_como(superadmin).delete(f'{A}/platforms/{plataforma_id}')

    assert res.status_code == 200
    db.session.expire_all()
    assert PlatformAccessGrant.query.filter_by(platform_id=plataforma_id).count() == 0
    trabajo = db.session.get(ProvisioningJob, trabajo_id)
    assert trabajo is not None  # el historial de ejecuciones se conserva
    assert trabajo.platform_id is None and trabajo.access_id is None
    evento = AuditLog.query.filter_by(
        action='ELIMINAR PLATAFORMA: Conta Test').one()
    assert evento.before_state['accesos_revocados_retirados'] == 1
    assert evento.before_state['trabajos_desligados'] == 1


def test_baja_borra_el_conector_de_la_plataforma(escena, cliente_como):
    superadmin, _, plataforma = escena
    db.session.add(PlatformConnector(
        platform_id=plataforma.id, type='noop', host='conector.pruebas.local',
        port=443, params={}, credential_ref='ref-prueba'))
    db.session.commit()
    plataforma_id = plataforma.id

    res = cliente_como(superadmin).delete(f'{A}/platforms/{plataforma_id}')

    assert res.status_code == 200
    assert PlatformConnector.query.filter_by(platform_id=plataforma_id).count() == 0
