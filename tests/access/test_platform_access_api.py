"""Pruebas de la API v1 de accesos por plataforma:
`GET /platforms/<id>/access` y `POST /platforms/<id>/access` (FNC-058 / FNC-054).
"""
import pytest
from app import db
from app.modules.access.models import PlatformAccessGrant
from app.modules.access.tipos import ESTADO_ACTIVO, ESTADO_EN_PROCESO, ESTADO_FALLIDO, ORIGEN_SOLICITUD
from app.modules.platforms.tipos import NIVEL_USUARIO, TIPO_LDAP
from tests import fabricas
from tests.access.conftest import recargar

A = '/api/v1'


@pytest.fixture
def otra_plataforma(escena):
    return fabricas.crear_plataforma(escena['otra'], 'Ventas web',
                                     integration_type=TIPO_LDAP)


def test_listar_accesos_de_plataforma(escena, cliente_como):
    acceso = PlatformAccessGrant(
        user_id=escena['usuario'].id, platform_id=escena['plataforma'].id,
        level=NIVEL_USUARIO, origin=ORIGEN_SOLICITUD,
        status=ESTADO_ACTIVO)
    acceso.sincronizar_slots()
    db.session.add(acceso)
    db.session.commit()

    cliente = cliente_como(escena['admin'])
    res = cliente.get(f"{A}/platforms/{escena['plataforma'].id}/access")
    assert res.status_code == 200
    data = res.get_json()
    assert data['total'] == 1
    assert data['items'][0]['id'] == acceso.id
    assert data['items'][0]['user']['id'] == escena['usuario'].id


def test_otorgar_acceso_a_plataforma_exitoso(escena, cliente_como, cola_falsa):
    cliente = cliente_como(escena['admin'])
    res = cliente.post(
        f"{A}/platforms/{escena['plataforma'].id}/access",
        json={'user_id': escena['usuario'].id, 'level': 'usuario'},
        headers={'Sec-Fetch-Site': 'same-origin'}
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['access']['user']['id'] == escena['usuario'].id
    assert data['access']['platform']['id'] == escena['plataforma'].id
    assert data['access']['status'] == ESTADO_EN_PROCESO


def test_otorgar_acceso_rechaza_usuario_ajeno_a_area(escena, cliente_como, otra_plataforma, cola_falsa):
    # usuario está en área 'Finanzas', otra_plataforma está en área 'Ventas'
    cliente = cliente_como(escena['super'])
    res = cliente.post(
        f"{A}/platforms/{otra_plataforma.id}/access",
        json={'user_id': escena['usuario'].id, 'level': 'usuario'},
        headers={'Sec-Fetch-Site': 'same-origin'}
    )
    assert res.status_code == 404


@pytest.mark.parametrize('estado_inicial', [ESTADO_EN_PROCESO, ESTADO_FALLIDO])
def test_revocar_acceso_en_proceso_o_fallido_sin_conector_lo_cancela_exitosamente(escena, cliente_como, estado_inicial):
    from app.modules.platforms.tipos import TIPO_CONECTOR
    plataforma_directa = fabricas.crear_plataforma(escena['area'], 'Plataforma Directa', integration_type=TIPO_CONECTOR)
    acceso = PlatformAccessGrant(
        user_id=escena['usuario'].id, platform_id=plataforma_directa.id,
        level=NIVEL_USUARIO, origin=ORIGEN_SOLICITUD,
        status=estado_inicial)
    acceso.sincronizar_slots()
    db.session.add(acceso)
    db.session.commit()

    cliente = cliente_como(escena['admin'])
    res = cliente.post(
        f"{A}/access/{acceso.id}/revoke",
        json={'reason': 'Retirado por administrador'},
        headers={'Sec-Fetch-Site': 'same-origin'}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['access']['status'] == 'revocado'
    assert recargar(acceso.id).status == 'revocado'

