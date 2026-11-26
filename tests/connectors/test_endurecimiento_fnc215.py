"""FNC-215: observaciones Bajas de seguridad de FNC-213 (contrato conectores 1.7).

1. Asociar a una plataforma **destino** con accesos vigentes exige
   `confirmar: true`; sin él, `409 plataforma_destino_con_accesos` con el número
   en `accesos_vigentes`. La auditoría guarda cuántos había.
2. Las comprobaciones de accesos vigentes bloquean la fila de la plataforma
   (`SELECT ... FOR UPDATE`), y `otorgar` también: no se cuela un acceso entre
   la cuenta y el cambio (TOCTOU).
3. La baja de una plataforma emite `conector_desasociado` por su conector.
"""
import pytest
from sqlalchemy.dialects import postgresql

from app import db
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.audit.models import AuditLog
from app.modules.connectors import api_independientes as api_conectores
from app.modules.connectors.models import PlatformConnector
from app.modules.platforms import estado
from tests import fabricas
from tests.connectors.conftest import crear_conector
from tests.connectors.test_api import acceso_vigente
from tests.connectors.test_conectores_independientes import (  # noqa: F401
    A, NOMBRE, libre, plataforma, superadmin)


def eventos(accion):
    return AuditLog.query.filter_by(action=accion).all()


def asociar(cliente, conector, plataforma_id, **extra):
    return cliente.put(f'{A}/connectors/{conector.id}/platform',
                       json={'platform_id': plataforma_id, **extra})


# 1. Destino con accesos vigentes ------------------------------------------- #

def test_destino_con_accesos_sin_confirmar_responde_409_con_el_numero(
        superadmin, libre, plataforma):
    acceso_vigente(plataforma)
    respuesta = asociar(superadmin, libre, plataforma.id)
    assert respuesta.status_code == 409
    cuerpo = respuesta.get_json()
    assert cuerpo['code'] == 'plataforma_destino_con_accesos'
    assert cuerpo['accesos_vigentes'] == 1
    assert PlatformConnector.query.get(libre.id).platform_id is None
    assert eventos('conector_asociado') == []


def test_destino_con_accesos_confirmado_asocia_y_audita_el_numero(
        superadmin, libre, plataforma):
    acceso_vigente(plataforma)
    respuesta = asociar(superadmin, libre, plataforma.id, confirmar=True)
    assert respuesta.status_code == 200
    assert respuesta.get_json()['connector']['platform_id'] == plataforma.id
    [evento] = eventos('conector_asociado')
    assert evento.after_state['accesos_vigentes_destino'] == 1


def test_destino_sin_accesos_no_pide_confirmar(superadmin, libre, plataforma):
    assert asociar(superadmin, libre, plataforma.id).status_code == 200


@pytest.mark.parametrize('valor', ['si', 1, None, []])
def test_confirmar_no_booleano_responde_422(superadmin, libre, plataforma,
                                            valor):
    respuesta = asociar(superadmin, libre, plataforma.id, confirmar=valor)
    assert respuesta.status_code == 422
    assert 'confirmar' in respuesta.get_json()['fields']


# 2. Bloqueo de la fila de la plataforma ------------------------------------ #

def test_bloquear_plataforma_usa_for_update():
    sentencia = estado.consulta_bloqueo(7)
    sql = str(sentencia.compile(dialect=postgresql.dialect()))
    assert 'FOR UPDATE' in sql


@pytest.fixture
def bloqueos(monkeypatch):
    llamadas = []
    original = estado.bloquear_plataforma

    def espia(plataforma_id):
        llamadas.append(plataforma_id)
        return original(plataforma_id)

    monkeypatch.setattr(estado, 'bloquear_plataforma', espia)
    return llamadas


def test_eliminar_desasociar_y_asociar_bloquean_la_plataforma(
        superadmin, libre, plataforma, bloqueos):
    assert asociar(superadmin, libre, plataforma.id).status_code == 200
    assert plataforma.id in bloqueos
    bloqueos.clear()
    assert superadmin.delete(f'{A}/connectors/{libre.id}/platform',
                             json={}).status_code == 200
    assert bloqueos == [plataforma.id]
    bloqueos.clear()
    conector = crear_conector(plataforma, name='Para borrar')
    assert superadmin.delete(f'{A}/connectors/{conector.id}',
                             json={}).status_code == 200
    assert bloqueos == [plataforma.id]


def test_aprobar_una_solicitud_bloquea_la_plataforma(superadmin, plataforma,
                                                     bloqueos):
    """`otorgar` (lo usan aprobar, automáticos y altas) bloquea la fila."""
    usuario = fabricas.crear_usuario(areas=[plataforma.area])
    solicitud = PlatformAccessRequest(user_id=usuario.id,
                                      platform_id=plataforma.id,
                                      level='usuario', status='pendiente')
    solicitud.sincronizar_slot()
    db.session.add(solicitud)
    db.session.commit()
    respuesta = superadmin.post(
        f'{A}/access-requests/{solicitud.id}/approve', json={})
    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    assert plataforma.id in bloqueos


# 3. Baja de plataforma ----------------------------------------------------- #

def test_baja_de_plataforma_audita_la_desasociacion(superadmin, plataforma):
    conector = crear_conector(plataforma, name='Se queda libre')
    plataforma_id = plataforma.id
    assert superadmin.delete(f'{A}/platforms/{plataforma_id}').status_code == 200
    [evento] = eventos('conector_desasociado')
    assert evento.target == 'Se queda libre'
    assert evento.before_state == {'platform_id': plataforma_id}
    assert evento.after_state == {'platform_id': None}
    assert PlatformConnector.query.get(conector.id).platform_id is None
