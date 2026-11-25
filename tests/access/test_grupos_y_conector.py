"""Grupos siempre y conector como paso adicional (FNC-196).

Servicio → cola falsa → worker → proveedor de grupos real sobre el directorio
simulado (`MOCK_SYNC`) y, cuando la plataforma lo tiene, el conector `noop`.
"""
import pytest

from app import db
from app.modules.access import services
from app.modules.access.models import PlatformAccessGrant
from app.modules.access.tipos import (ESTADO_ACTIVO, ESTADO_FALLIDO,
                                      ESTADO_FALLO_REVOCACION,
                                      ESTADO_REVOCADO, ORIGEN_SOLICITUD)
from app.modules.connectors import noop
from app.modules.core.models import Platform
from app.modules.platforms.tipos import (NIVEL_ADMIN, NIVEL_USUARIO,
                                         TIPO_CONECTOR)
from app.modules.provisioning import providers
from app.modules.provisioning.compuesto import ProveedorGrupoYConector
from app.modules.provisioning.ldap_provider import ProveedorLdap
from app.modules.provisioning.models import ProvisioningJob
from app.modules.provisioning.tipos import PROVEEDOR_LDAP
from tests import fabricas
from tests.access.conftest import recargar
from tests.connectors.conftest import (HOST_PERMITIDO,  # noqa: F401 (fixture)
                                       crear_conector, entorno_conector)
from tests.directorio_falso import ENTORNO_VALIDO, GRUPOS_BASE_DN
from tests.directory.conftest import DirectorioMock

CORREO = 'ana@pruebas.local'
GRUPO_USUARIOS = f'cn=app-tacacs-users,{GRUPOS_BASE_DN}'
GRUPO_ADMINS = f'cn=app-tacacs-admins,{GRUPOS_BASE_DN}'


@pytest.fixture(autouse=True)
def _noop_limpio():
    noop.limpiar()
    yield
    noop.limpiar()


@pytest.fixture
def directorio(monkeypatch, escena):
    """Directorio activo (variables LDAP_*) con la persona de la escena."""
    for nombre, valor in ENTORNO_VALIDO.items():
        monkeypatch.setenv(nombre, valor)
    monkeypatch.delenv('LDAP_PLATFORM_GROUP_TEMPLATE', raising=False)
    monkeypatch.delenv('LDAP_PROVISIONING_AUTO_CREATE_GROUPS', raising=False)
    monkeypatch.delenv('LDAP_AUTO_CREATE_PLATFORM_GROUPS', raising=False)
    mock = DirectorioMock(monkeypatch)
    dn_ana = mock.persona('ana', correo=CORREO)
    providers.registrar_proveedor(
        PROVEEDOR_LDAP,
        lambda: ProveedorGrupoYConector(ProveedorLdap(cliente=mock.cliente)))
    yield mock, dn_ana
    providers.registrar_proveedor(PROVEEDOR_LDAP, ProveedorGrupoYConector)


@pytest.fixture
def tacacs(escena):
    """Plataforma activa sin DN de grupo y sin conector."""
    return fabricas.crear_plataforma(escena['area'], 'Tacacs', status='Activo')


def _miembros(mock, dn):
    if dn not in mock.servidor.dit:
        return None
    return [v.decode() if isinstance(v, bytes) else str(v)
            for v in mock.servidor.dit[dn].get('member', [])]


def _otorgar(escena, plataforma, nivel=NIVEL_USUARIO):
    acceso = services.otorgar(escena['usuario'], plataforma, nivel,
                              ORIGEN_SOLICITUD, actor=escena['admin'],
                              request_id=1)
    db.session.commit()
    return acceso


# --------------------------------------------------------------------------- #
# Grupos siempre
# --------------------------------------------------------------------------- #

def test_sin_dn_ni_conector_se_deriva_y_se_agrega_al_grupo_de_usuarios(
        escena, tacacs, cola_falsa, directorio):
    mock, dn_ana = directorio

    acceso = _otorgar(escena, tacacs)

    assert cola_falsa.procesar() == ['exitoso']
    assert recargar(acceso.id).status == ESTADO_ACTIVO
    assert dn_ana in _miembros(mock, GRUPO_USUARIOS)  # grupo creado al vuelo
    plataforma = db.session.get(Platform, tacacs.id)
    assert plataforma.ldap_group_user_dn == GRUPO_USUARIOS
    assert plataforma.ldap_group_admin_dn == GRUPO_ADMINS


def test_nivel_admin_va_al_grupo_de_admins(escena, tacacs, cola_falsa,
                                           directorio):
    mock, dn_ana = directorio

    _otorgar(escena, tacacs, NIVEL_ADMIN)

    assert cola_falsa.procesar() == ['exitoso']
    assert dn_ana in _miembros(mock, GRUPO_ADMINS)
    assert _miembros(mock, GRUPO_USUARIOS) is None


def test_con_dn_explicito_se_usan_esos(escena, cola_falsa, directorio):
    mock, dn_ana = directorio
    explicita = fabricas.crear_plataforma(
        escena['area'], 'Tacacs', status='Activo',
        ldap_group_user_dn=f'cn=mi-grupo,{GRUPOS_BASE_DN}',
        ldap_group_admin_dn=f'cn=mi-admin,{GRUPOS_BASE_DN}')

    _otorgar(escena, explicita)

    assert cola_falsa.procesar() == ['exitoso']
    assert dn_ana in _miembros(mock, f'cn=mi-grupo,{GRUPOS_BASE_DN}')
    assert _miembros(mock, GRUPO_USUARIOS) is None


def test_sin_autocreacion_el_grupo_inexistente_falla(escena, tacacs,
                                                     cola_falsa, directorio,
                                                     monkeypatch):
    monkeypatch.setenv('LDAP_PROVISIONING_AUTO_CREATE_GROUPS', 'false')
    monkeypatch.setenv('LDAP_AUTO_CREATE_PLATFORM_GROUPS', 'false')
    acceso = _otorgar(escena, tacacs)

    assert cola_falsa.procesar() == ['fallido']
    assert recargar(acceso.id).status == ESTADO_FALLIDO


def test_revocar_quita_del_grupo(escena, tacacs, cola_falsa, directorio):
    mock, dn_ana = directorio
    acceso = _otorgar(escena, tacacs)
    cola_falsa.procesar()

    services.revocar(recargar(acceso.id), actor=escena['super'])
    db.session.commit()

    assert cola_falsa.procesar() == ['exitoso']
    assert recargar(acceso.id).status == ESTADO_REVOCADO
    assert dn_ana not in _miembros(mock, GRUPO_USUARIOS)


def test_cambio_de_nivel_solo_cambia_el_grupo(escena, tacacs, cola_falsa,
                                              directorio, entorno_conector):
    mock, dn_ana = directorio
    crear_conector(tacacs)
    _otorgar(escena, tacacs)
    cola_falsa.procesar()
    assert noop._CUENTAS == {(tacacs.id, NIVEL_USUARIO, CORREO)}

    _otorgar(escena, tacacs, NIVEL_ADMIN)
    assert sorted(cola_falsa.procesar()) == ['exitoso', 'exitoso']

    assert dn_ana not in _miembros(mock, GRUPO_USUARIOS)
    assert dn_ana in _miembros(mock, GRUPO_ADMINS)
    # El conector no se toca al cambiar de nivel (ni baja ni alta): el rol vía
    # conector queda para FNC-198 (revisor, FNC-196).
    assert noop._CUENTAS == {(tacacs.id, NIVEL_USUARIO, CORREO)}


# --------------------------------------------------------------------------- #
# Conector como paso adicional
# --------------------------------------------------------------------------- #

def test_con_conector_primero_el_grupo_y_despues_el_alta(
        escena, tacacs, cola_falsa, directorio, entorno_conector):
    mock, dn_ana = directorio
    crear_conector(tacacs)

    acceso = _otorgar(escena, tacacs)

    assert cola_falsa.procesar() == ['exitoso']
    assert recargar(acceso.id).status == ESTADO_ACTIVO
    assert dn_ana in _miembros(mock, GRUPO_USUARIOS)
    assert (tacacs.id, NIVEL_USUARIO, CORREO) in noop._CUENTAS
    assert ProvisioningJob.query.count() == 1  # un solo trabajo


def test_con_conector_revocar_quita_del_grupo_y_da_de_baja(
        escena, tacacs, cola_falsa, directorio, entorno_conector):
    mock, dn_ana = directorio
    crear_conector(tacacs)
    acceso = _otorgar(escena, tacacs)
    cola_falsa.procesar()

    services.revocar(recargar(acceso.id), actor=escena['super'])
    db.session.commit()

    assert cola_falsa.procesar() == ['exitoso']
    assert recargar(acceso.id).status == ESTADO_REVOCADO
    assert dn_ana not in _miembros(mock, GRUPO_USUARIOS)
    assert noop._CUENTAS == set()


def test_conector_inactivo_no_se_ejecuta(escena, tacacs, cola_falsa,
                                         directorio, entorno_conector):
    mock, dn_ana = directorio
    crear_conector(tacacs, active=False)

    _otorgar(escena, tacacs)

    assert cola_falsa.procesar() == ['exitoso']
    assert dn_ana in _miembros(mock, GRUPO_USUARIOS)
    assert noop._CUENTAS == set()


def test_fallo_del_conector_deja_fallido_con_su_error_y_conserva_el_grupo(
        escena, tacacs, cola_falsa, directorio, entorno_conector,
        sin_correo):
    mock, dn_ana = directorio
    # Host fuera de la lista blanca: falla el conector, no el grupo.
    crear_conector(tacacs, host='otro.pruebas.local')

    acceso = _otorgar(escena, tacacs)

    assert cola_falsa.procesar() == ['fallido']
    assert recargar(acceso.id).status == ESTADO_FALLIDO
    assert dn_ana in _miembros(mock, GRUPO_USUARIOS)  # no se revierte
    intento = ProvisioningJob.query.one().attempts[0]
    assert intento.error == 'El host del conector no está autorizado.'


def test_fallo_del_conector_al_revocar_deja_fallo_revocacion(
        escena, tacacs, cola_falsa, directorio, entorno_conector, sin_correo):
    mock, dn_ana = directorio
    configuracion = crear_conector(tacacs)
    acceso = _otorgar(escena, tacacs)
    cola_falsa.procesar()
    configuracion.host = 'otro.pruebas.local'
    db.session.commit()

    services.revocar(recargar(acceso.id), actor=escena['super'])
    db.session.commit()

    assert cola_falsa.procesar() == ['fallido']
    assert recargar(acceso.id).status == ESTADO_FALLO_REVOCACION
    assert dn_ana not in _miembros(mock, GRUPO_USUARIOS)  # ya se quitó


def test_plataforma_conector_heredada_sin_directorio_solo_usa_el_conector(
        escena, cola_falsa, entorno_conector):
    plataforma = fabricas.crear_plataforma(
        escena['area'], 'Zabbix', status='Activo',
        integration_type=TIPO_CONECTOR)
    crear_conector(plataforma)
    providers.registrar_proveedor(PROVEEDOR_LDAP, ProveedorGrupoYConector)
    try:
        acceso = _otorgar(escena, plataforma)
        assert cola_falsa.procesar() == ['exitoso']
    finally:
        providers.registrar_proveedor(PROVEEDOR_LDAP, ProveedorGrupoYConector)

    assert recargar(acceso.id).status == ESTADO_ACTIVO
    assert (plataforma.id, NIVEL_USUARIO, CORREO) in noop._CUENTAS


def test_sin_grupos_ni_conector_ni_directorio_es_registro_manual(escena):
    plataforma = fabricas.crear_plataforma(escena['area'], 'Wiki',
                                           status='Activo')

    assert services.registro_manual(plataforma) is True
    assert PlatformAccessGrant.query.count() == 0


def test_revocar_acceso_heredado_sin_grupo_igual_da_de_baja_el_conector(
        escena, tacacs, cola_falsa, directorio, entorno_conector):
    """auditor-seguridad H1: sin grupo (nunca existió) la baja llega al
    conector."""
    mock, dn_ana = directorio
    crear_conector(tacacs)
    acceso = _otorgar(escena, tacacs)
    cola_falsa.procesar()
    # El grupo desaparece del directorio (heredado/migrado sin crear).
    del mock.servidor.dit[GRUPO_USUARIOS]

    services.revocar(recargar(acceso.id), actor=escena['super'])
    db.session.commit()

    assert cola_falsa.procesar() == ['exitoso']
    assert recargar(acceso.id).status == ESTADO_REVOCADO
    assert noop._CUENTAS == set()


def test_el_nombre_de_una_plataforma_no_deriva_un_grupo_de_rol(
        escena, cola_falsa, directorio):
    """auditor-seguridad H2: `Aduana` derivaría `app-aduana-admins`."""
    mock, dn_ana = directorio
    aduana = fabricas.crear_plataforma(escena['area'], 'Aduana',
                                       status='Activo')

    _otorgar(escena, aduana, NIVEL_ADMIN)

    db.session.expire_all()
    plataforma = db.session.get(Platform, aduana.id)
    assert plataforma.ldap_group_admin_dn is None  # no se guardó
    assert plataforma.ldap_group_user_dn is None  # `-users` también es de rol
    assert cola_falsa.procesar() == ['fallido']
    assert _miembros(mock, f'cn=app-aduana-admins,{GRUPOS_BASE_DN}') is None
