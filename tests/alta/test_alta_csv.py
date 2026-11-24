"""`flask alta areas|plataformas|usuarios` (FNC-182)."""
from pathlib import Path

import pytest

from app import db
from app.authz import ROLE_AREA_ADMIN, ROLE_USER
from app.modules.audit.models import AuditLog
from app.modules.core.models import Area, Platform
from app.modules.auth.models import User
from tests import fabricas
from tests.alta.conftest import (CLAVE_INICIAL, GRUPO_ADMINS, GRUPO_USUARIOS,
                                 volcado_de_la_bd)
from tests.directorio_falso import dn_persona

AREAS = ('nombre,descripcion,color,icono\n'
         'Finanzas,Área contable,#3b82f6,areas\n'
         'TI,Tecnología,#10b981,ajustes\n')
PLATAFORMAS = ('nombre,descripcion,area,enlace,icono\n'
               'Jira,Proyectos,TI,https://jira.ejemplo.test,plataformas\n')
USUARIOS = ('nombre,correo,rol,areas\n'
            'Ana Ruiz,ana@pruebas.local,usuario,Finanzas\n'
            'Carlos Gomez,carlos@pruebas.local,admin_area,Finanzas\n')


@pytest.fixture
def csv(tmp_path):
    def _csv(contenido, nombre='lote.csv'):
        ruta = tmp_path / nombre
        ruta.write_text(contenido, encoding='utf-8')
        return str(ruta)
    return _csv


def _cuenta(correo):
    db.session.expire_all()
    return User.query.filter_by(email=correo).first()


def _con_areas():
    fabricas.crear_area('Finanzas')
    fabricas.crear_area('TI')


# --------------------------------------------------------------------------- #
# Áreas y plataformas
# --------------------------------------------------------------------------- #

def test_areas_dry_run_no_escribe(app, correr, csv):
    antes = volcado_de_la_bd()
    r = correr('areas', csv(AREAS), '--dry-run')
    assert r.exit_code == 0, r.output
    assert 'SIMULACIÓN' in r.output and '2 creado' in r.output
    assert volcado_de_la_bd() == antes


def test_areas_crea_audita_y_repetir_es_conflicto_con_codigo_distinto_de_cero(
        app, correr, csv):
    r = correr('areas', csv(AREAS))
    assert r.exit_code == 0, r.output
    assert Area.query.count() == 2
    assert AuditLog.query.filter_by(user='sistema/CLI').count() == 1

    r = correr('areas', csv(AREAS))
    assert r.exit_code == 1 and 'ERROR' in r.output
    assert Area.query.count() == 2


def test_plataformas_dry_run_y_alta(app, correr, csv):
    _con_areas()
    antes = volcado_de_la_bd()
    r = correr('plataformas', csv(PLATAFORMAS), '--dry-run')
    assert r.exit_code == 0, r.output
    assert volcado_de_la_bd() == antes

    r = correr('plataformas', csv(PLATAFORMAS))
    assert r.exit_code == 0, r.output
    assert Platform.query.filter_by(name='Jira').count() == 1


def test_archivo_vacio_o_inexistente_falla(app, correr, csv, tmp_path):
    assert correr('areas', csv('nombre\n')).exit_code != 0
    assert correr('areas', str(tmp_path / 'no-esta.csv')).exit_code == 2


# --------------------------------------------------------------------------- #
# Usuarios
# --------------------------------------------------------------------------- #

def test_usuarios_solo_portal_no_toca_ldap(app, correr, csv):
    _con_areas()
    r = correr('usuarios', csv(USUARIOS))   # LDAP bloqueado por conftest
    assert r.exit_code == 0, r.output
    assert _cuenta('ana@pruebas.local').role == ROLE_USER
    assert _cuenta('carlos@pruebas.local').role == ROLE_AREA_ADMIN
    assert [a.name for a in _cuenta('ana@pruebas.local').areas] == ['Finanzas']


def test_usuarios_dry_run_no_escribe(app, correr, csv, ldap, con_entrega):
    _con_areas()
    antes = volcado_de_la_bd()
    r = correr('usuarios', csv(USUARIOS), '--dry-run', '--crear-en-ldap')
    assert r.exit_code == 0, r.output
    assert 'se crearía en LDAP' in r.output
    assert volcado_de_la_bd() == antes
    assert ldap.atributos(dn_persona('ana')) is None
    assert con_entrega.sends == []


def test_usuarios_fila_invalida_da_error_y_las_validas_se_crean(
        app, correr, csv):
    _con_areas()
    r = correr('usuarios', csv(USUARIOS + 'Mala,no-es-correo,usuario,\n'))
    assert r.exit_code == 1 and 'ERROR' in r.output
    assert _cuenta('ana@pruebas.local') is not None


def test_usuarios_crear_en_ldap_crea_entrada_portal_y_entrega(
        app, correr, csv, ldap, con_entrega):
    _con_areas()
    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap')

    assert r.exit_code == 0, r.output
    assert ldap.atributos(dn_persona('ana')) is not None
    assert _cuenta('ana@pruebas.local').auth_source == 'sso'
    assert len(con_entrega.sends) == 2 and len(con_entrega.correos) == 2
    for clave in con_entrega.contrasenas:
        assert clave not in r.output
        assert clave not in volcado_de_la_bd()
    # El rol lleva a la persona al grupo del portal que corresponde.
    assert dn_persona('carlos') in ldap.miembros(GRUPO_ADMINS)
    assert dn_persona('ana') in ldap.miembros(GRUPO_USUARIOS)


def test_usuarios_existente_en_ldap_es_conflicto_sin_el_flag(
        app, correr, csv, ldap, con_entrega):
    _con_areas()
    ldap.persona('ana')
    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap')

    assert r.exit_code == 1
    assert 'CONFLICTO' in r.output and '--omitir-si-existe-en-ldap' in r.output
    assert _cuenta('ana@pruebas.local') is None
    assert _cuenta('carlos@pruebas.local') is not None   # el otro sigue


def test_usuarios_omitir_si_existe_vincula_sso_y_puede_rotar(
        app, correr, csv, ldap, con_entrega):
    _con_areas()
    ldap.persona('ana')
    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap',
               '--omitir-si-existe-en-ldap', '--rotar-contrasena')

    assert r.exit_code == 0, r.output
    ana = _cuenta('ana@pruebas.local')
    assert ana.auth_source == 'sso' and ana.password_hash is None
    assert ldap.clave('ana') != CLAVE_INICIAL      # rotada
    assert 'ROTADO' in r.output
    assert len(con_entrega.sends) == 2             # ana (rotada) y carlos (alta)


def test_usuarios_omitir_sin_rotar_no_cambia_la_clave_en_ldap(
        app, correr, csv, ldap, con_entrega):
    _con_areas()
    ldap.persona('ana')
    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap',
               '--omitir-si-existe-en-ldap')
    assert r.exit_code == 0, r.output
    assert ldap.clave('ana') == CLAVE_INICIAL


def test_flags_de_ldap_sin_crear_en_ldap_es_error_de_uso(app, correr, csv):
    r = correr('usuarios', csv(USUARIOS), '--rotar-contrasena')
    assert r.exit_code == 2


def test_crear_en_ldap_sin_entrega_no_escribe_nada(
        app, correr, csv, ldap, monkeypatch):
    _con_areas()
    antes = volcado_de_la_bd()
    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap')   # sin Vaultwarden
    assert r.exit_code != 0 and 'No se puede entregar' in r.output
    assert volcado_de_la_bd() == antes
    assert ldap.atributos(dn_persona('ana')) is None


def test_los_csv_de_ejemplo_de_scripts_alta_son_validos(app, correr):
    carpeta = str(Path(__file__).resolve().parents[2] / 'scripts' / 'alta') + '/'
    assert correr('areas', carpeta + 'areas.ejemplo.csv').exit_code == 0
    assert correr('plataformas', carpeta + 'plataformas.ejemplo.csv').exit_code == 0
    r = correr('usuarios', carpeta + 'usuarios.ejemplo.csv', '--dry-run')
    assert r.exit_code == 0, r.output
    assert '3 creado' in r.output


def test_usuarios_superadmin_de_ldap_no_se_vincula_ni_rota(
        app, correr, csv, ldap, con_entrega):
    from tests.alta.conftest import GRUPO_SUPERADMIN
    _con_areas()
    ldap.persona('ana')
    ldap.grupo(GRUPO_SUPERADMIN, [dn_persona('ana')])
    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap',
               '--omitir-si-existe-en-ldap', '--rotar-contrasena')

    assert 'omitido: superadmin' in r.output
    assert _cuenta('ana@pruebas.local') is None
    assert ldap.clave('ana') == CLAVE_INICIAL
    assert ldap.miembros(GRUPO_USUARIOS) is None or \
        dn_persona('ana') not in ldap.miembros(GRUPO_USUARIOS)


def test_usuarios_crear_en_ldap_valida_el_uid_como_el_api(
        app, correr, csv, ldap, con_entrega):
    _con_areas()
    r = correr('usuarios', csv('nombre,correo,rol,areas,uid\n'
                               'Ana Ruiz,ana@pruebas.local,usuario,,A B\n'),
               '--crear-en-ldap')
    assert r.exit_code == 1 and 'uid:' in r.output
    assert _cuenta('ana@pruebas.local') is None


def test_la_salida_no_deja_pasar_caracteres_de_control(app, correr, csv):
    r = correr('areas', csv('nombre,descripcion,color,icono\n'
                            'Mala\x1b[2J,x,#3b82f6,areas\n'))
    assert '\x1b' not in r.output
