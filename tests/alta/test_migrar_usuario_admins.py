"""`migrar-usuario --plataforma-admin` y `--admin-area` (FNC-207)."""
import pytest

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN
from app.modules.access.models import PlatformAccessGrant
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from tests import fabricas
from tests.access.conftest import cola_falsa, manejadores_de_accesos  # noqa: F401
from tests.alta.conftest import (GRUPO_ADMINS, GRUPO_USUARIOS, con_entrega,  # noqa: F401
                                 correr, ldap)
from tests.alta.test_migrar_ldap import base  # noqa: F401 (fixture)
from tests.alta.test_migrar_usuario import (CMD, CORREO, _accesos, _cuenta,  # noqa: F401
                                            _estado, avisos_falsos, datos)
from tests.directorio_falso import dn_persona

BASE = (*CMD, '--area', 'Aduana')


def _por_nivel():
    return sorted((a.platform.name, a.level, a.origin, a.status)
                  for a in _accesos())


def test_plataforma_admin_otorga_nivel_admin_y_plataforma_sigue_en_usuario(
        datos, correr, cola_falsa):
    fabricas.crear_plataforma(datos['area'], 'Grafana')
    r = correr(*BASE, '--plataforma', 'Grafana', '--plataforma-admin', 'Zabbix',
               '--responsiva-firmada')

    assert r.exit_code == 0, r.output
    niveles = {a.platform.name: (a.level, a.origin, a.responsiva_firmada)
               for a in _accesos()}
    assert niveles == {'Zabbix': ('admin', 'migracion', True),
                       'Grafana': ('usuario', 'migracion', True)}


def test_alias_platform_admin(datos, correr, cola_falsa):
    r = correr(*BASE, '--platform-admin', 'Zabbix', '--responsiva-firmada')
    assert r.exit_code == 0, r.output
    assert [a.level for a in _accesos()] == ['admin']


def test_nivel_solo_aplica_a_plataforma(datos, correr, cola_falsa):
    fabricas.crear_plataforma(datos['area'], 'Grafana')
    r = correr(*BASE, '--nivel', 'admin', '--plataforma', 'Grafana',
               '--plataforma-admin', 'Zabbix')
    assert r.exit_code == 0, r.output
    assert {a.platform.name: a.level for a in _accesos()} == {
        'Zabbix': 'admin', 'Grafana': 'admin'}


def test_plataforma_admin_reemplaza_el_nivel_usuario(datos, correr, cola_falsa):
    primera = correr(*BASE, '--plataforma', 'Zabbix', '--responsiva-firmada')
    assert primera.exit_code == 0, primera.output
    for acceso in _accesos():          # el worker ya lo confirmó
        acceso.status = 'activo'
    db.session.commit()

    r = correr(*BASE, '--plataforma-admin', 'Zabbix', '--responsiva-firmada')

    assert r.exit_code == 0, r.output
    assert 'ya tiene un acceso vigente' not in r.output
    estados = {a.level: a.status for a in _accesos()}
    assert estados['admin'] != 'revocado' and estados['usuario'] == 'revocando'


def test_plataforma_admin_ya_vigente_se_omite(datos, correr, cola_falsa):
    argumentos = (*BASE, '--plataforma-admin', 'Zabbix', '--responsiva-firmada')
    assert correr(*argumentos).exit_code == 0
    r = correr(*argumentos)
    assert r.exit_code == 0, r.output
    assert 'ya tiene un acceso vigente' in r.output
    assert len(_accesos()) == 1


def test_misma_plataforma_en_ambas_es_error_de_uso(datos, correr):
    antes = _estado()
    r = correr(*BASE, '--plataforma', 'Zabbix', '--plataforma-admin', 'zabbix')
    assert r.exit_code == 2
    assert 'zabbix' in r.output and '--plataforma-admin' in r.output
    assert _estado() == antes and _cuenta() is None


def test_nivel_admin_no_integrado_es_error_y_no_escribe(datos, correr):
    datos['zabbix'].status = 'Inactivo'
    db.session.commit()
    antes = _estado()
    r = correr(*BASE, '--plataforma-admin', 'Zabbix')
    assert r.exit_code == 1 and 'nivel admin' in r.output
    assert _estado() == antes and _cuenta() is None


def test_plataforma_admin_de_otra_area_se_rechaza(datos, correr):
    r = correr(*BASE, '--plataforma-admin', 'Siebel')
    assert r.exit_code == 1 and 'no es de ninguna' in r.output
    assert _cuenta() is None


def _eli_en_grupo_de_usuarios(base):  # noqa: F811
    base.grupo(GRUPO_USUARIOS, [dn_persona('ana'), dn_persona('eli')])


def test_admin_area_cambia_rol_grupo_y_areas_administradas(
        datos, base, correr, cola_falsa):  # noqa: F811
    _eli_en_grupo_de_usuarios(base)
    r = correr(*BASE, '--admin-area', 'Aduana')

    assert r.exit_code == 0, r.output
    cuenta = _cuenta()
    assert cuenta.role == ROLE_AREA_ADMIN
    assert [a.name for a in cuenta.managed_areas] == ['Aduana']
    assert [a.name for a in cuenta.areas] == ['Aduana']
    assert dn_persona('eli') in base.miembros(GRUPO_ADMINS)
    assert dn_persona('eli') not in base.miembros(GRUPO_USUARIOS)
    assert 'administra el área «Aduana»: asignada' in r.output
    acciones = {a.action for a in AuditLog.query.all()}
    assert 'admin_asignado' in acciones


def test_cuenta_usuario_existente_pasa_a_admin_area_con_auditoria_y_grupo(
        datos, base, correr, cola_falsa):  # noqa: F811
    _eli_en_grupo_de_usuarios(base)
    cuenta = fabricas.crear_usuario(email=CORREO, areas=[datos['area']])
    cuenta.auth_source = 'sso'
    db.session.commit()

    r = correr(*BASE, '--admin-area', 'Aduana')

    assert r.exit_code == 0, r.output
    assert _cuenta().role == ROLE_AREA_ADMIN
    assert AuditLog.query.filter_by(action='rol_cambiado').count() == 1
    assert dn_persona('eli') in base.miembros(GRUPO_ADMINS)
    assert dn_persona('eli') not in base.miembros(GRUPO_USUARIOS)


def test_admin_area_no_agrega_el_area_a_las_de_la_persona(
        datos, correr, cola_falsa):
    r = correr(*BASE, '--admin-area', 'Ventas')
    assert r.exit_code == 0, r.output
    cuenta = _cuenta()
    assert [a.name for a in cuenta.areas] == ['Aduana']
    assert [a.name for a in cuenta.managed_areas] == ['Ventas']


def test_admin_area_suma_a_las_que_ya_administraba(datos, correr, cola_falsa):
    cuenta = fabricas.crear_usuario(ROLE_AREA_ADMIN, email=CORREO,
                                    areas=[datos['area']],
                                    areas_administradas=[datos['otra']])
    cuenta.auth_source = 'sso'
    db.session.commit()
    r = correr(*BASE, '--admin-area', 'Aduana')
    assert r.exit_code == 0, r.output
    assert sorted(a.name for a in _cuenta().managed_areas) == ['Aduana', 'Ventas']


def test_admin_area_genera_accesos_automaticos_admin(datos, correr, cola_falsa):
    r = correr(*BASE, '--admin-area', 'Aduana', '--responsiva-firmada')
    assert r.exit_code == 0, r.output
    acceso, = _accesos()
    assert (acceso.platform.name, acceso.level, acceso.origin) == (
        'Zabbix', 'admin', 'admin_de_area')
    assert acceso.responsiva_firmada     # la firma activa lo pendiente


def test_admin_area_y_plataforma_admin_no_duplican_el_acceso(
        datos, correr, cola_falsa):
    r = correr(*BASE, '--plataforma-admin', 'Zabbix', '--admin-area', 'Aduana',
               '--responsiva-firmada')
    assert r.exit_code == 0, r.output
    assert [(a.level) for a in _accesos()] == ['admin']
    assert 'ya tiene un acceso vigente' in r.output


def test_admin_area_inexistente_o_inactiva_no_escribe(datos, correr):
    antes = _estado()
    r = correr(*BASE, '--admin-area', 'Fantasma')
    assert r.exit_code == 1 and 'inexistente' in r.output
    datos['otra'].status = 'Inactivo'
    db.session.commit()
    r = correr(*BASE, '--admin-area', 'Ventas')
    assert r.exit_code == 1 and 'inactiva' in r.output
    assert _estado() == antes and _cuenta() is None


def test_dry_run_muestra_lo_que_haria_y_no_escribe(
        datos, base, correr, cola_falsa):  # noqa: F811
    _eli_en_grupo_de_usuarios(base)
    antes = _estado()
    r = correr(*BASE, '--plataforma-admin', 'Zabbix', '--admin-area', 'Aduana',
               '--responsiva-firmada', '--notificar', '--dry-run')

    assert r.exit_code == 0, r.output
    assert _estado() == antes and _cuenta() is None
    assert 'se haría administradora de' in r.output
    assert 'se otorgaría' in r.output and 'nivel admin' in r.output
    assert dn_persona('eli') not in base.miembros(GRUPO_ADMINS)


def test_dry_run_con_cuenta_existente_anuncia_cambio_de_rol(
        datos, correr, cola_falsa):
    cuenta = fabricas.crear_usuario(email=CORREO, areas=[datos['area']])
    cuenta.auth_source = 'sso'
    db.session.commit()
    r = correr(*BASE, '--admin-area', 'Aduana', '--dry-run')
    assert r.exit_code == 0, r.output
    assert 'rol usuario → admin_area' in r.output
    assert _cuenta().role == 'usuario' and _cuenta().managed_areas == []


def test_superadmin_se_omite_con_las_opciones_nuevas(datos, correr):
    r = correr('migrar-usuario', 'cora', '--area', 'Aduana',
               '--plataforma-admin', 'Zabbix', '--admin-area', 'Aduana')
    assert r.exit_code == 0, r.output
    assert 'omitido: superadmin' in r.output and User.query.count() == 0


def test_cuenta_administrador_del_portal_no_cambia(datos, correr):
    fabricas.crear_usuario(ROLE_ADMIN, email=CORREO)
    r = correr(*BASE, '--admin-area', 'Aduana')
    assert r.exit_code == 0, r.output
    assert _cuenta().role == ROLE_ADMIN and _cuenta().managed_areas == []
