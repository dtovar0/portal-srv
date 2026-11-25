"""Nivel `admin` de los admins de área en las plataformas de sus áreas (FNC-185).

P6 (dueño, 2026-11-24): cada plataforma tiene su grupo `-users` y `-admins`;
el admin de área entra en `-admins` en las plataformas de sus áreas y, al
dejar de serlo, regresa a `-users` conservando el acceso.
"""
import pytest
from flask import g

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.access import services
from app.modules.access.area_admin_sync import sincronizar_cuenta
from app.modules.access.models import PlatformAccessGrant
from app.modules.access.tipos import (ESTADO_ACTIVO, ESTADO_EN_PROCESO,
                                      ESTADO_REVOCADO, ESTADO_REVOCANDO,
                                      MOTIVO_REEMPLAZO, MOTIVO_RETIRO_ADMIN,
                                      ORIGEN_ADMIN_DE_AREA, ORIGEN_SOLICITUD)
from app.modules.platforms.tipos import (NIVEL_ADMIN, NIVEL_USUARIO,
                                         TIPO_CONECTOR, TIPO_LDAP)
from app.modules.provisioning.models import ProvisioningJob
from tests import fabricas
from tests.access.conftest import GRUPO_USUARIO, recargar

A = '/api/v1'


@pytest.fixture
def cliente_como(cliente_como):
    def _cliente(usuario):
        g.pop('_login_user', None)
        return cliente_como(usuario)
    return _cliente


def _accesos(cuenta, plataforma):
    db.session.expire_all()
    return (PlatformAccessGrant.query
            .filter_by(user_id=cuenta.id, platform_id=plataforma.id)
            .order_by(PlatformAccessGrant.id).all())


def _por_nivel(cuenta, plataforma):
    return {a.level: a for a in _accesos(cuenta, plataforma)}


def _procesar(cola_falsa):
    cola_falsa.procesar()
    db.session.expire_all()


def _asignar(cliente_como, escena, cuenta, areas):
    respuesta = cliente_como(escena['super']).put(
        f'{A}/users/{cuenta.id}/managed-areas',
        json={'area_ids': [a.id for a in areas]})
    assert respuesta.status_code == 200, respuesta.get_json()


@pytest.fixture
def admin_activo(escena, cliente_como, cola_falsa, proveedor_simulado):
    """Una cuenta admin del área con su acceso `admin` ya activo."""
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[escena['area']])
    _asignar(cliente_como, escena, cuenta, [escena['area']])
    _procesar(cola_falsa)
    assert _por_nivel(cuenta, escena['plataforma'])[NIVEL_ADMIN].status == \
        ESTADO_ACTIVO
    return cuenta


# --------------------------------------------------------------------------- #
# Ser admin: nivel admin en las plataformas de sus áreas
# --------------------------------------------------------------------------- #

def test_hacer_admin_da_nivel_admin_y_trabajo_al_grupo_admin(
        escena, cliente_como, cola_falsa):
    nuevo = fabricas.crear_usuario(ROLE_AREA_ADMIN)

    _asignar(cliente_como, escena, nuevo, [escena['area']])

    acceso, = _accesos(nuevo, escena['plataforma'])
    assert (acceso.level, acceso.origin, acceso.status) == (
        NIVEL_ADMIN, ORIGEN_ADMIN_DE_AREA, ESTADO_EN_PROCESO)
    trabajo = db.session.get(ProvisioningJob, acceso.last_job_id)
    assert (trabajo.operation, trabajo.level, trabajo.provider) == (
        'otorgar', NIVEL_ADMIN, TIPO_LDAP)


def test_usuario_con_acceso_sube_a_admin_y_su_usuario_se_revoca(
        escena, cliente_como, cola_falsa, proveedor_simulado):
    cuenta = fabricas.crear_usuario(ROLE_USER, areas=[escena['area']])
    previo = services.otorgar(cuenta, escena['plataforma'], NIVEL_USUARIO,
                              ORIGEN_SOLICITUD, actor=escena['super'],
                              request_id=7)
    db.session.commit()
    _procesar(cola_falsa)
    cuenta.role = ROLE_AREA_ADMIN
    db.session.commit()

    _asignar(cliente_como, escena, cuenta, [escena['area']])

    # Nunca en ambos grupos: el de usuario sale en la misma operación.
    anterior = recargar(previo.id)
    assert (anterior.status, anterior.revoke_reason) == (
        ESTADO_REVOCANDO, MOTIVO_REEMPLAZO)
    nuevo = _por_nivel(cuenta, escena['plataforma'])[NIVEL_ADMIN]
    assert (nuevo.status, nuevo.origin) == (ESTADO_EN_PROCESO,
                                            ORIGEN_ADMIN_DE_AREA)
    _procesar(cola_falsa)
    assert recargar(previo.id).status == ESTADO_REVOCADO
    assert recargar(nuevo.id).status == ESTADO_ACTIVO


def test_el_acceso_en_proceso_sube_a_admin_al_confirmarse(
        escena, cliente_como, cola_falsa, proveedor_simulado):
    cuenta = fabricas.crear_usuario(ROLE_USER, areas=[escena['area']])
    previo = services.otorgar(cuenta, escena['plataforma'], NIVEL_USUARIO,
                              ORIGEN_SOLICITUD, actor=escena['super'],
                              request_id=7)
    cuenta.role = ROLE_AREA_ADMIN
    db.session.commit()
    _asignar(cliente_como, escena, cuenta, [escena['area']])
    assert set(_por_nivel(cuenta, escena['plataforma'])) == {NIVEL_USUARIO}

    _procesar(cola_falsa)  # el otorgar de `usuario` se confirma
    _procesar(cola_falsa)  # y se ejecutan el `admin` y la revocación

    niveles = _por_nivel(cuenta, escena['plataforma'])
    assert niveles[NIVEL_ADMIN].status == ESTADO_ACTIVO
    assert recargar(previo.id).status == ESTADO_REVOCADO


def test_plataformas_de_otras_areas_no_cambian(escena, cliente_como,
                                               cola_falsa):
    otra = fabricas.crear_plataforma(
        escena['otra'], 'Ventas', integration_type=TIPO_LDAP,
        ldap_group_user_dn=GRUPO_USUARIO)
    nuevo = fabricas.crear_usuario(ROLE_AREA_ADMIN)

    _asignar(cliente_como, escena, nuevo, [escena['area']])

    assert not _accesos(nuevo, otra)
    assert len(_accesos(nuevo, escena['plataforma'])) == 1


def test_acceso_de_otra_area_conserva_su_nivel(escena, cliente_como,
                                               cola_falsa, proveedor_simulado):
    otra = fabricas.crear_plataforma(
        escena['otra'], 'Ventas', integration_type=TIPO_LDAP,
        ldap_group_user_dn=GRUPO_USUARIO)
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[escena['otra']])
    propio = services.otorgar(cuenta, otra, NIVEL_USUARIO, ORIGEN_SOLICITUD,
                              actor=escena['super'], request_id=8)
    db.session.commit()
    _procesar(cola_falsa)

    _asignar(cliente_como, escena, cuenta, [escena['area']])
    _asignar(cliente_como, escena, cuenta, [])

    assert (recargar(propio.id).status, recargar(propio.id).level) == (
        ESTADO_ACTIVO, NIVEL_USUARIO)


# --------------------------------------------------------------------------- #
# Dejar de serlo: regresa a usuario y conserva el acceso
# --------------------------------------------------------------------------- #

def _verificar_regreso(cuenta, plataforma, cola_falsa):
    niveles = _por_nivel(cuenta, plataforma)
    assert (niveles[NIVEL_ADMIN].status,
            niveles[NIVEL_ADMIN].revoke_reason) == (ESTADO_REVOCANDO,
                                                    MOTIVO_RETIRO_ADMIN)
    base = niveles[NIVEL_USUARIO]
    assert (base.status, base.origin) == (ESTADO_EN_PROCESO,
                                          ORIGEN_ADMIN_DE_AREA)
    _procesar(cola_falsa)
    niveles = _por_nivel(cuenta, plataforma)
    assert niveles[NIVEL_ADMIN].status == ESTADO_REVOCADO
    assert niveles[NIVEL_USUARIO].status == ESTADO_ACTIVO


def test_quitar_el_area_regresa_a_usuario_y_conserva_el_acceso(
        escena, cliente_como, cola_falsa, admin_activo):
    _asignar(cliente_como, escena, admin_activo, [])

    _verificar_regreso(admin_activo, escena['plataforma'], cola_falsa)


def test_quitar_el_rol_regresa_a_usuario_y_conserva_el_acceso(
        escena, cliente_como, cola_falsa, admin_activo):
    respuesta = cliente_como(escena['super']).put(
        f'{A}/users/{admin_activo.id}', json={'role': ROLE_USER})

    assert respuesta.status_code == 200, respuesta.get_json()
    _verificar_regreso(admin_activo, escena['plataforma'], cola_falsa)


def test_quitar_solo_una_de_dos_areas_baja_solo_esa(
        escena, cliente_como, cola_falsa, proveedor_simulado):
    otra = fabricas.crear_plataforma(
        escena['otra'], 'Ventas', integration_type=TIPO_LDAP,
        ldap_group_user_dn=GRUPO_USUARIO,
        ldap_group_admin_dn='cn=ventas-admin,ou=grupos,dc=pruebas,dc=local')
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN,
                                    areas=[escena['area'], escena['otra']])
    _asignar(cliente_como, escena, cuenta, [escena['area'], escena['otra']])
    _procesar(cola_falsa)

    _asignar(cliente_como, escena, cuenta, [escena['otra']])

    assert _por_nivel(cuenta, otra)[NIVEL_ADMIN].status == ESTADO_ACTIVO
    assert NIVEL_USUARIO in _por_nivel(cuenta, escena['plataforma'])
    assert NIVEL_USUARIO not in _por_nivel(cuenta, otra)


def test_sin_acceso_previo_queda_como_usuario(escena, cliente_como,
                                              cola_falsa):
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[escena['area']],
                                    areas_administradas=[escena['area']])
    assert not _accesos(cuenta, escena['plataforma'])

    _asignar(cliente_como, escena, cuenta, [])

    acceso, = _accesos(cuenta, escena['plataforma'])
    assert (acceso.level, acceso.origin) == (NIVEL_USUARIO,
                                             ORIGEN_ADMIN_DE_AREA)


def test_el_admin_en_proceso_baja_a_usuario_al_confirmarse(
        escena, cliente_como, cola_falsa, proveedor_simulado):
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[escena['area']])
    _asignar(cliente_como, escena, cuenta, [escena['area']])
    assert _por_nivel(cuenta, escena['plataforma'])[NIVEL_ADMIN].status == \
        ESTADO_EN_PROCESO
    _asignar(cliente_como, escena, cuenta, [])
    assert set(_por_nivel(cuenta, escena['plataforma'])) == {NIVEL_ADMIN}

    _procesar(cola_falsa)  # el otorgar `admin` se confirma → baja a `usuario`
    _procesar(cola_falsa)

    niveles = _por_nivel(cuenta, escena['plataforma'])
    assert niveles[NIVEL_ADMIN].status == ESTADO_REVOCADO
    assert niveles[NIVEL_USUARIO].status == ESTADO_ACTIVO


def test_un_admin_por_solicitud_no_se_baja(escena, cliente_como, cola_falsa,
                                           proveedor_simulado):
    cuenta = fabricas.crear_usuario(ROLE_USER, areas=[escena['area']])
    manual = services.otorgar(cuenta, escena['plataforma'], NIVEL_ADMIN,
                              ORIGEN_SOLICITUD, actor=escena['super'],
                              request_id=9)
    db.session.commit()
    _procesar(cola_falsa)
    cuenta.role = ROLE_AREA_ADMIN
    db.session.commit()

    _asignar(cliente_como, escena, cuenta, [escena['area']])
    _asignar(cliente_como, escena, cuenta, [])

    assert recargar(manual.id).status == ESTADO_ACTIVO
    assert len(_accesos(cuenta, escena['plataforma'])) == 1


# --------------------------------------------------------------------------- #
# Casos límite
# --------------------------------------------------------------------------- #

def test_sin_grupo_admin_guardado_igual_recibe_admin(escena, cliente_como,
                                                     cola_falsa):
    """FNC-196: toda plataforma tiene grupo de ambos niveles (se deriva si
    falta); antes el admin quedaba en `usuario` con un aviso en el log."""
    sin_admin = fabricas.crear_plataforma(
        escena['area'], 'Sin admin', integration_type=TIPO_LDAP,
        ldap_group_user_dn=GRUPO_USUARIO)
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN)

    _asignar(cliente_como, escena, cuenta, [escena['area']])

    acceso, = _accesos(cuenta, sin_admin)
    assert (acceso.level, acceso.status) == (NIVEL_ADMIN, ESTADO_EN_PROCESO)
    assert NIVEL_ADMIN in _por_nivel(cuenta, escena['plataforma'])


def test_el_superadmin_no_recibe_accesos_automaticos(escena, cola_falsa):
    sincronizar_cuenta(escena['super'], [escena['area']], [escena['area']])
    db.session.commit()

    assert not _accesos(escena['super'], escena['plataforma'])


def test_una_cuenta_que_pasa_a_superadmin_pierde_sus_automaticos(
        escena, cola_falsa, admin_activo):
    admin_activo.role = ROLE_ADMIN  # por fuera de la API (rol reservado)
    admin_activo.managed_areas = []
    sincronizar_cuenta(admin_activo, areas_quitadas=[escena['area']])
    db.session.commit()

    niveles = _por_nivel(admin_activo, escena['plataforma'])
    assert set(niveles) == {NIVEL_ADMIN}
    assert niveles[NIVEL_ADMIN].status == ESTADO_REVOCANDO


def test_plataforma_sin_conector_disponible_usa_el_trabajo_como_antes(
        escena, cliente_como, cola_falsa):
    manual = fabricas.crear_plataforma(escena['area'], 'Manual',
                                       integration_type=TIPO_CONECTOR)
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN)

    _asignar(cliente_como, escena, cuenta, [escena['area']])

    acceso, = _accesos(cuenta, manual)
    assert (acceso.level, acceso.status) == (NIVEL_ADMIN, ESTADO_EN_PROCESO)
    assert acceso.last_job_id is not None


def test_cuenta_inactiva_no_recibe_acceso_al_ser_admin(escena, cola_falsa):
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, activo=False,
                                    areas_administradas=[escena['area']])

    sincronizar_cuenta(cuenta, [escena['area']])
    db.session.commit()

    assert not _accesos(cuenta, escena['plataforma'])


# --------------------------------------------------------------------------- #
# Hallazgos de revisor y auditor-seguridad (FNC-185)
# --------------------------------------------------------------------------- #

def test_un_admin_desactivado_que_deja_de_serlo_no_conserva_el_grupo_admin(
        escena, cliente_como, cola_falsa, admin_activo):
    admin_activo.is_active = False
    db.session.commit()

    _asignar(cliente_como, escena, admin_activo, [])

    niveles = _por_nivel(admin_activo, escena['plataforma'])
    assert set(niveles) == {NIVEL_ADMIN}
    assert niveles[NIVEL_ADMIN].status == ESTADO_REVOCANDO


def test_quien_no_es_del_area_pierde_el_acceso_al_dejar_de_administrar(
        escena, cliente_como, cola_falsa, proveedor_simulado):
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[escena['otra']])
    _asignar(cliente_como, escena, cuenta, [escena['area']])
    _procesar(cola_falsa)

    _asignar(cliente_como, escena, cuenta, [])

    niveles = _por_nivel(cuenta, escena['plataforma'])
    assert set(niveles) == {NIVEL_ADMIN}  # P1: sin `usuario` fuera del área
    assert niveles[NIVEL_ADMIN].status == ESTADO_REVOCANDO


def test_plataforma_movida_con_admin_en_proceso_no_deja_acceso_en_la_nueva_area(
        escena, cliente_como, cola_falsa, proveedor_simulado):
    ajena = fabricas.crear_area('Legal')
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[ajena])
    _asignar(cliente_como, escena, cuenta, [escena['area']])
    assert _por_nivel(cuenta, escena['plataforma'])[NIVEL_ADMIN].status == \
        ESTADO_EN_PROCESO
    cliente_como(escena['super']).put(
        f'{A}/platforms/{escena["plataforma"].id}',
        json={'area_id': escena['otra'].id})

    _procesar(cola_falsa)
    _procesar(cola_falsa)

    assert not [a for a in _accesos(cuenta, escena['plataforma'])
                if a.status == ESTADO_ACTIVO and a.level == NIVEL_USUARIO]


def test_nivel_destino_aun_saliendo_no_lanza_error(escena, cliente_como,
                                                   cola_falsa, admin_activo):
    # Se quita y devuelve el área antes de que corra el ejecutor.
    _asignar(cliente_como, escena, admin_activo, [])
    _asignar(cliente_como, escena, admin_activo, [escena['area']])

    niveles = _por_nivel(admin_activo, escena['plataforma'])
    assert niveles[NIVEL_ADMIN].status == ESTADO_REVOCANDO  # sin 500


def test_ldap_heredada_con_solo_grupo_admin_si_recibe_acceso(
        escena, cliente_como, cola_falsa):
    heredada = fabricas.crear_plataforma(
        escena['area'], 'Solo admin', integration_type=TIPO_LDAP,
        ldap_group_admin_dn='cn=solo-admin,ou=grupos,dc=pruebas,dc=local')
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[escena['area']])

    _asignar(cliente_como, escena, cuenta, [escena['area']])

    # FNC-196: el grupo `usuario` que falta se deriva; antes no recibía acceso.
    acceso, = _accesos(cuenta, heredada)
    assert acceso.level == NIVEL_ADMIN
