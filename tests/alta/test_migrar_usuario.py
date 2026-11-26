"""`flask alta migrar-usuario UID` (FNC-202) con el directorio y la entrega simulados."""
import pytest

from app import db
from app.authz import ROLE_ADMIN
from app.modules.access.models import PlatformAccessGrant
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from app.modules.provisioning.models import ProvisioningJob
from tests import fabricas
from tests.access.conftest import cola_falsa, manejadores_de_accesos  # noqa: F401
from tests.alta.conftest import (CLAVE_INICIAL, con_entrega, correr,  # noqa: F401
                                 ldap, volcado_de_la_bd)
from tests.alta.test_migrar_ldap import base  # noqa: F401 (fixture)

CORREO = 'eli@pruebas.local'     # eli existe en LDAP, fuera de los grupos
CMD = ('migrar-usuario', 'eli')


@pytest.fixture
def datos(base):  # noqa: F811
    area = fabricas.crear_area('Aduana')
    otra = fabricas.crear_area('Ventas')
    zabbix = fabricas.crear_plataforma(area, 'Zabbix')
    siebel = fabricas.crear_plataforma(otra, 'Siebel')
    return {'area': area, 'otra': otra, 'zabbix': zabbix, 'siebel': siebel}


def _cuenta():
    db.session.expire_all()
    return User.query.filter_by(email=CORREO).first()


def _accesos():
    db.session.expire_all()
    return PlatformAccessGrant.query.all()


def _estado():
    db.session.expire_all()
    return (sorted(u.email for u in User.query.all()), len(_accesos()),
            ProvisioningJob.query.count(),
            AuditLog.query.filter(~AuditLog.action.like('ALTA POR CLI%')).count())


def test_cuenta_area_responsiva_y_acceso_con_trabajo(datos, correr, cola_falsa):
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
               '--responsiva-firmada')

    assert r.exit_code == 0, r.output
    cuenta = _cuenta()
    assert (cuenta.auth_source, cuenta.role, cuenta.is_active) == (
        'sso', 'usuario', True)
    assert [a.name for a in cuenta.areas] == ['Aduana']
    assert cuenta.responsiva_firmada and cuenta.responsiva_firmada_at
    acceso, = _accesos()
    assert (acceso.origin, acceso.level, acceso.granted_by) == (
        'migracion', 'usuario', None)
    assert acceso.responsiva_firmada and acceso.last_job_id is not None
    trabajo, = ProvisioningJob.query.all()
    assert (trabajo.operation, trabajo.access_id) == ('otorgar', acceso.id)
    assert 'Resumen' in r.output
    firma = AuditLog.query.filter_by(action='firma_responsiva').one()
    assert 'migración' in firma.detail and firma.user == 'sistema/CLI'
    assert AuditLog.query.filter_by(action='ALTA POR CLI: migrar-usuario').count() == 1


def test_sin_responsiva_el_acceso_espera_la_firma(datos, correr, cola_falsa):
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix')

    assert r.exit_code == 0, r.output
    acceso, = _accesos()
    assert not acceso.responsiva_firmada and acceso.last_job_id is None
    assert ProvisioningJob.query.count() == 0
    assert not _cuenta().responsiva_firmada
    assert 'espera la firma' in r.output


def test_por_plataforma_marca_firmado_el_acceso_creado(
        datos, correr, cola_falsa, monkeypatch):
    monkeypatch.setenv('RESPONSIVA_MODO', 'por_plataforma')
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
               '--responsiva-firmada')

    assert r.exit_code == 0, r.output
    acceso, = _accesos()
    assert acceso.responsiva_firmada and acceso.last_job_id is not None
    assert ProvisioningJob.query.count() == 1


def test_por_plataforma_sin_responsiva_espera(datos, correr, cola_falsa,
                                              monkeypatch):
    monkeypatch.setenv('RESPONSIVA_MODO', 'por_plataforma')
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix')
    assert r.exit_code == 0, r.output
    acceso, = _accesos()
    assert not acceso.responsiva_firmada and ProvisioningJob.query.count() == 0


def test_nivel_admin(datos, correr, cola_falsa):
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
               '--nivel', 'admin', '--responsiva-firmada')
    assert r.exit_code == 0, r.output
    assert [a.level for a in _accesos()] == ['admin']


def test_dry_run_no_escribe_nada(datos, correr, con_entrega, cola_falsa):
    antes = _estado()
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
               '--responsiva-firmada', '--rotar-contrasena', '--dry-run')

    assert r.exit_code == 0, r.output
    assert _estado() == antes
    assert 'SIMULACIÓN' in r.output and 'se otorgaría' in r.output
    assert 'se rotaría' in r.output and 'se registraría la responsiva' in r.output
    assert con_entrega.sends == [] and con_entrega.correos == []


@pytest.mark.parametrize('argumentos, texto', [
    (('--area', 'Fantasma'), 'inexistente'),
    ((), 'falta --area o --admin-area'),
    (('--area', 'Aduana', '--plataforma', 'Nada'), 'inexistente'),
    (('--area', 'Aduana', '--plataforma', 'Siebel'), 'no es de ninguna'),
])
def test_validaciones_previas_no_escriben(datos, correr, argumentos, texto):
    antes = _estado()
    r = correr(*CMD, *argumentos)
    assert r.exit_code == 1
    assert texto in r.output
    assert _estado() == antes


def test_area_inactiva(datos, correr):
    datos['area'].status = 'Inactivo'
    db.session.commit()
    r = correr(*CMD, '--area', 'Aduana')
    assert r.exit_code == 1 and 'inactiva' in r.output
    assert _cuenta() is None


def test_plataforma_inactiva_o_nivel_no_integrado(datos, correr):
    datos['zabbix'].status = 'Inactivo'
    db.session.commit()
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix')
    assert r.exit_code == 1 and 'inactiva' in r.output and 'nivel usuario' in r.output
    assert _cuenta() is None


def test_plataforma_de_otra_area_de_la_persona_si_se_acepta(
        datos, correr, cola_falsa):
    r = correr(*CMD, '--area', 'Aduana', '--area', 'Ventas',
               '--plataforma', 'Siebel')
    assert r.exit_code == 0, r.output
    assert sorted(a.name for a in _cuenta().areas) == ['Aduana', 'Ventas']


def test_ya_existente_continua_y_acceso_vigente_se_omite(
        datos, correr, cola_falsa):
    cuenta = fabricas.crear_usuario(email=CORREO, areas=[datos['area']])
    cuenta.auth_source = 'sso'
    db.session.commit()
    argumentos = (*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
                  '--responsiva-firmada')
    r1 = correr(*argumentos)
    assert r1.exit_code == 0, r1.output
    assert 'ya existe en el portal' in r1.output
    r2 = correr(*argumentos)
    assert r2.exit_code == 0, r2.output
    assert 'ya tiene un acceso vigente' in r2.output
    assert len(_accesos()) == 1 and ProvisioningJob.query.count() == 1


def test_rota_solo_si_no_hubo_errores(datos, correr, con_entrega, cola_falsa):
    r = correr(*CMD, '--area', 'Fantasma', '--rotar-contrasena')
    assert r.exit_code == 1
    assert con_entrega.sends == [] and con_entrega.correos == []
    assert datos and CLAVE_INICIAL


def test_rotacion_con_exito_no_imprime_secretos(datos, base, correr,  # noqa: F811
                                                con_entrega, cola_falsa):
    r = correr(*CMD, '--area', 'Aduana', '--rotar-contrasena')
    assert r.exit_code == 0, r.output
    assert 'ROTADO' in r.output
    assert base.clave('eli') != CLAVE_INICIAL
    for secreto in (con_entrega.contrasenas[0], con_entrega.sends[0]['enlace']):
        assert secreto not in r.output and secreto not in volcado_de_la_bd()


def test_superadmin_se_omite(datos, correr):
    r = correr('migrar-usuario', 'cora', '--area', 'Aduana')
    assert r.exit_code == 0, r.output
    assert 'omitido: superadmin' in r.output
    assert User.query.count() == 0


def test_cuenta_administrador_del_portal_se_omite(datos, correr):
    fabricas.crear_usuario(ROLE_ADMIN, email=CORREO)
    r = correr(*CMD, '--area', 'Aduana')
    assert r.exit_code == 0, r.output
    assert 'superadmin en el portal' in r.output
    assert _accesos() == []


def test_uid_inexistente_en_ldap(datos, correr):
    r = correr('migrar-usuario', 'nadie', '--area', 'Aduana')
    assert r.exit_code == 1 and 'no está en LDAP_USERS_BASE_DN' in r.output


def test_sin_correo_en_ldap(datos, correr):
    r = correr('migrar-usuario', 'dani', '--area', 'Aduana')
    assert r.exit_code == 1 and 'no tiene mail' in r.output


def test_enviar_a_exige_rotar(datos, correr):
    r = correr(*CMD, '--area', 'Aduana', '--enviar-a', 'x@empresa.test')
    assert r.exit_code == 2


def test_origen_migracion_solo_lo_otorga_el_sistema(datos, correr, cola_falsa):
    from app.modules.access import errores, rules
    from app.modules.provisioning import reintento
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
               '--responsiva-firmada')
    assert r.exit_code == 0, r.output
    cuenta = _cuenta()
    admin = fabricas.crear_usuario(ROLE_ADMIN)
    with pytest.raises(errores.ErrorDeAcceso):     # con actor humano, no
        rules.validar_otorgamiento(admin, cuenta, datos['zabbix'], 'migracion')
    with pytest.raises(errores.ErrorDeAcceso):     # P1: plataforma de otra área
        rules.validar_otorgamiento(None, cuenta, datos['siebel'], 'migracion')
    # El reintento del trabajo revalida como sistema, no como el actor.
    trabajo, = ProvisioningJob.query.all()
    reintento._revalidar(trabajo, admin)


@pytest.fixture
def avisos_falsos(monkeypatch):
    from app.modules.notifications import access_notifications as avisos
    class Llamadas(list):
        pass
    llamadas = Llamadas()

    def falso(usuario, plataforma, nivel):
        llamadas.append((usuario.email, plataforma.name, nivel))
        return {'status': falso.estado, 'recipients': 1}
    falso.estado = avisos.ENVIADO
    monkeypatch.setattr(avisos, 'notificar_solicitud_aprobada', falso)
    llamadas.falso = falso
    return llamadas


def test_notificar_avisa_por_cada_plataforma_otorgada(
        datos, correr, cola_falsa, avisos_falsos):
    r = correr(*CMD, '--area', 'Aduana', '--area', 'Ventas',
               '--plataforma', 'Zabbix', '--plataforma', 'Siebel',
               '--notificar')
    assert r.exit_code == 0, r.output
    assert sorted(avisos_falsos) == [(CORREO, 'Siebel', 'usuario'),
                                     (CORREO, 'Zabbix', 'usuario')]
    assert 'aviso de aprobado' in r.output


def test_sin_notificar_no_avisa(datos, correr, cola_falsa, avisos_falsos):
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix')
    assert r.exit_code == 0, r.output
    assert avisos_falsos == []


def test_notificar_no_avisa_si_ya_estaba_vigente(datos, correr, cola_falsa,
                                                 avisos_falsos):
    argumentos = (*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
                  '--notificar')
    assert correr(*argumentos).exit_code == 0
    assert len(avisos_falsos) == 1
    r = correr(*argumentos)
    assert r.exit_code == 0, r.output
    assert len(avisos_falsos) == 1


def test_notificar_dry_run_solo_anuncia(datos, correr, cola_falsa,
                                        avisos_falsos):
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
               '--notificar', '--dry-run')
    assert r.exit_code == 0, r.output
    assert avisos_falsos == [] and f'se notificaría a {CORREO}' in r.output


def test_fallo_de_correo_no_deshace_y_se_reporta(datos, correr, cola_falsa,
                                                 avisos_falsos):
    avisos_falsos.falso.estado = 'error'
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
               '--notificar')
    assert r.exit_code == 1
    assert 'falló el envío' in r.output
    assert len(_accesos()) == 1                      # el acceso se conserva


def test_notificar_respeta_los_interruptores(datos, correr, cola_falsa,
                                             monkeypatch):
    monkeypatch.setenv('NOTIFY_ACCESS_EVENTS', 'false')
    r = correr(*CMD, '--area', 'Aduana', '--plataforma', 'Zabbix',
               '--notificar')
    assert r.exit_code == 0, r.output
    assert 'no enviado' in r.output
