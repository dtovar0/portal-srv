"""Quitar a una cuenta de un área revoca sus accesos en esa área (FNC-152)."""
from app.modules.access.models import PlatformAccessGrant
from app.modules.access.salida_de_area import MOTIVO_SALIDA_DE_AREA
from app.modules.access.tipos import (ESTADO_ACTIVO, ESTADO_EN_PROCESO,
                                      ESTADO_REVOCADO, ESTADO_REVOCANDO)
from app.modules.platforms.tipos import TIPO_CONECTOR
from tests import fabricas
from tests.access.conftest import recargar

A = '/api/v1'


def test_sacar_del_area_revoca_el_acceso_activo(escena, cliente_como, cola_falsa):
    acceso = fabricas.crear_acceso(escena['usuario'], escena['plataforma'])

    respuesta = cliente_como(escena['super']).put(
        f"{A}/areas/{escena['area'].id}/users", json={'user_ids': [escena['admin2'].id]})

    assert respuesta.status_code == 200
    revocado = recargar(acceso.id)
    assert revocado.status == ESTADO_REVOCANDO
    assert revocado.revoke_reason == MOTIVO_SALIDA_DE_AREA


def test_quitar_el_area_al_usuario_revoca_el_acceso(escena, cliente_como, cola_falsa):
    acceso = fabricas.crear_acceso(escena['usuario'], escena['plataforma'])

    respuesta = cliente_como(escena['super']).put(
        f"{A}/users/{escena['usuario'].id}/areas", json={'area_ids': []})

    assert respuesta.status_code == 200
    assert recargar(acceso.id).status == ESTADO_REVOCANDO


def test_quien_sigue_en_el_area_conserva_su_acceso(escena, cliente_como, cola_falsa):
    acceso = fabricas.crear_acceso(escena['usuario'], escena['plataforma'])

    cliente_como(escena['super']).put(
        f"{A}/areas/{escena['area'].id}/users",
        json={'user_ids': [escena['usuario'].id, escena['admin2'].id]})

    assert recargar(acceso.id).status == ESTADO_ACTIVO


def test_accesos_de_otras_areas_no_se_tocan(escena, cliente_como, cola_falsa):
    otra_plataforma = fabricas.crear_plataforma(escena['otra'], 'CRM')
    acceso = fabricas.crear_acceso(escena['usuario'], otra_plataforma)

    cliente_como(escena['super']).put(
        f"{A}/users/{escena['usuario'].id}/areas", json={'area_ids': []})

    assert recargar(acceso.id).status == ESTADO_ACTIVO


def test_en_proceso_con_ldap_no_se_revoca(escena, cliente_como, cola_falsa):
    acceso = fabricas.crear_acceso(escena['usuario'], escena['plataforma'],
                                   estado=ESTADO_EN_PROCESO)

    cliente_como(escena['super']).put(
        f"{A}/users/{escena['usuario'].id}/areas", json={'area_ids': []})

    assert recargar(acceso.id).status == ESTADO_EN_PROCESO


def test_sin_conector_queda_revocado_sin_trabajo(escena, cliente_como, cola_falsa):
    manual = fabricas.crear_plataforma(escena['area'], 'Sin conector',
                                       integration_type=TIPO_CONECTOR)
    acceso = fabricas.crear_acceso(escena['usuario'], manual)

    cliente_como(escena['super']).put(
        f"{A}/users/{escena['usuario'].id}/areas", json={'area_ids': []})

    assert recargar(acceso.id).status == ESTADO_REVOCADO
    assert PlatformAccessGrant.query.get(acceso.id).last_job_id is None
