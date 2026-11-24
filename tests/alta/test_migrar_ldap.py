"""`flask alta migrar-ldap` (FNC-182) con el directorio y la entrega simulados."""
import logging

import pytest

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from app.modules.directory.writer import EscritorDirectorio
from tests import fabricas
from tests.alta.conftest import (CLAVE_INICIAL, GRUPO_ADMINS, GRUPO_AJENO,
                                 GRUPO_SUPERADMIN, GRUPO_USUARIOS,
                                 volcado_de_la_bd)
from tests.directorio_falso import dn_grupo, dn_persona
from tests.users.conftest import ENLACE  # noqa: F401


def _cuenta(correo):
    db.session.expire_all()
    return User.query.filter_by(email=correo).first()


def _volcado():
    db.session.expire_all()
    return (sorted((u.email, u.role) for u in User.query.all()),
            AuditLog.query.count())


@pytest.fixture
def base(ldap):
    """ana (users), beto (admins), cora (users y superadmin), dani sin mail."""
    for uid in ('ana', 'beto', 'cora'):
        ldap.persona(uid)
    ldap.persona('dani', correo='')
    ldap.persona('eli')
    ldap.grupo(GRUPO_USUARIOS, [dn_persona('ana'), dn_persona('cora'),
                                dn_persona('dani')])
    ldap.grupo(GRUPO_ADMINS, [dn_persona('beto')])
    ldap.grupo(GRUPO_SUPERADMIN, [dn_persona('cora')])
    ldap.grupo(GRUPO_AJENO, [dn_persona('ana'), dn_persona('eli'),
                             'uid=fuera,ou=otros,dc=pruebas,dc=local'])
    return ldap


def test_crea_sso_con_el_rol_del_grupo_y_omite_lo_demas(base, correr):
    r = correr('migrar-ldap', '--sin-grupo-del-portal')

    assert r.exit_code == 0, r.output
    ana, beto = _cuenta('ana@pruebas.local'), _cuenta('beto@pruebas.local')
    assert (ana.role, ana.auth_source, ana.is_active) == (ROLE_USER, 'sso', True)
    assert ana.password_hash is None
    assert (beto.role, beto.auth_source) == (ROLE_AREA_ADMIN, 'sso')
    assert _cuenta('cora@pruebas.local') is None          # superadmin
    assert 'omitido: superadmin' in r.output
    assert 'no tiene mail' in r.output                    # dani
    assert _cuenta('eli@pruebas.local') is None           # no está en los grupos


def test_dry_run_no_escribe_ni_en_la_bd_ni_en_ldap(base, correr, con_entrega):
    antes = _volcado()
    miembros = base.miembros(GRUPO_USUARIOS)

    r = correr('migrar-ldap', '--dry-run', '--rotar-contrasena',
               '--grupo', GRUPO_AJENO)

    assert r.exit_code == 0, r.output
    assert _volcado() == antes
    assert base.miembros(GRUPO_USUARIOS) == miembros
    assert base.clave('ana') == CLAVE_INICIAL
    assert con_entrega.sends == [] and con_entrega.correos == []
    assert 'SIMULACIÓN' in r.output and 'se agregaría' in r.output
    assert 'se rotaría' in r.output


def test_grupo_arbitrario_por_cn_y_dn_agrega_al_grupo_del_portal(base, correr):
    r = correr('migrar-ldap', '--grupo', GRUPO_AJENO)
    assert r.exit_code == 0, r.output

    # ana y eli: usuarios; la persona fuera de ou=personas se omite.
    assert _cuenta('eli@pruebas.local').role == ROLE_USER
    assert 'LDAP_USERS_BASE_DN' in r.output
    assert dn_persona('eli') in base.miembros(GRUPO_USUARIOS)
    assert dn_persona('ana') in base.miembros(GRUPO_USUARIOS)

    r = correr('migrar-ldap', '--grupo', dn_grupo(GRUPO_AJENO))
    assert r.exit_code == 0, r.output


def test_rol_forzado_lleva_al_grupo_de_admins(base, correr):
    r = correr('migrar-ldap', '--grupo', GRUPO_AJENO, '--rol', ROLE_AREA_ADMIN)

    assert r.exit_code == 0, r.output
    assert _cuenta('eli@pruebas.local').role == ROLE_AREA_ADMIN
    assert dn_persona('eli') in base.miembros(GRUPO_ADMINS)


def test_nunca_administrador_por_rol(base, correr):
    r = correr('migrar-ldap', '--rol', ROLE_ADMIN)
    assert r.exit_code == 2 and 'Invalid value' in r.output


def test_grupo_fuera_de_base_o_inexistente_es_error(base, correr):
    fuera = correr('migrar-ldap', '--grupo', 'cn=g,ou=otros,dc=pruebas,dc=local')
    assert fuera.exit_code != 0 and 'no está bajo' in fuera.output
    nada = correr('migrar-ldap', '--grupo', 'no-existe')
    assert nada.exit_code != 0 and 'no existe' in nada.output
    assert _cuenta('eli@pruebas.local') is None


def test_ya_miembro_del_grupo_del_portal_no_cambia(base, correr):
    antes = base.miembros(GRUPO_USUARIOS)
    r = correr('migrar-ldap', '--grupo', GRUPO_USUARIOS)

    assert r.exit_code == 0, r.output
    assert 'ya estaba' in r.output
    assert base.miembros(GRUPO_USUARIOS) == antes


def test_sin_grupo_del_portal_no_escribe_en_ldap(base, correr):
    antes = base.miembros(GRUPO_USUARIOS)
    r = correr('migrar-ldap', '--grupo', GRUPO_AJENO, '--sin-grupo-del-portal')

    assert r.exit_code == 0, r.output
    assert base.miembros(GRUPO_USUARIOS) == antes
    assert _cuenta('eli@pruebas.local') is not None


def test_existente_se_omite_y_con_actualizar_rol_se_ajusta(base, correr):
    previa = fabricas.crear_usuario(ROLE_USER, email='beto@pruebas.local')
    r = correr('migrar-ldap', '--sin-grupo-del-portal')
    assert r.exit_code == 0, r.output
    assert 'ya existe en el portal' in r.output
    assert _cuenta('beto@pruebas.local').role == ROLE_USER

    r = correr('migrar-ldap', '--actualizar-rol', '--sin-grupo-del-portal')
    assert r.exit_code == 0, r.output
    assert _cuenta('beto@pruebas.local').role == ROLE_AREA_ADMIN


def test_superadmin_del_portal_no_se_toca(base, correr):
    fabricas.crear_usuario(ROLE_ADMIN, email='beto@pruebas.local')
    r = correr('migrar-ldap', '--actualizar-rol', '--sin-grupo-del-portal')
    assert r.exit_code == 0, r.output
    assert _cuenta('beto@pruebas.local').role == ROLE_ADMIN


def test_rotacion_solo_a_los_de_la_corrida_sin_contrasena_en_ningun_lado(
        base, correr, con_entrega, caplog):
    caplog.set_level(logging.DEBUG)
    r = correr('migrar-ldap', '--rotar-contrasena', '--sin-grupo-del-portal')

    assert r.exit_code == 0, r.output
    assert r.output.count('ROTADO') == 2   # ana y beto
    assert base.clave('ana') != CLAVE_INICIAL
    assert base.clave('beto') != CLAVE_INICIAL
    assert base.clave('cora') == CLAVE_INICIAL    # superadmin
    assert base.clave('eli') == CLAVE_INICIAL     # fuera de los grupos
    contrasenas = con_entrega.contrasenas
    assert len(contrasenas) == 2 and len(con_entrega.correos) == 2
    audit = volcado_de_la_bd()
    for clave in contrasenas:
        assert clave not in r.output
        assert clave not in caplog.text
        assert clave not in audit
    assert all(c['contexto']['enlace'] for c in con_entrega.correos)


@pytest.mark.parametrize('falla', ['correo', 'base_url', 'vaultwarden'])
def test_sin_vaultwarden_o_correo_no_rota_ni_escribe(
        base, correr, con_entrega, monkeypatch, falla):
    from app.modules.alta import rotacion
    from app.modules.secretos.sends import SendRechazado
    if falla == 'correo':
        monkeypatch.setenv('ENABLE_NOTIFICATIONS', 'false')
    elif falla == 'base_url':
        monkeypatch.delenv('BASE_URL')
    else:
        def _sin_gestor():
            raise SendRechazado('apagado')
        monkeypatch.setattr(rotacion, 'servicio_de_sends', _sin_gestor)
    antes = _volcado()

    r = correr('migrar-ldap', '--rotar-contrasena')

    assert r.exit_code != 0
    assert 'No se puede entregar' in r.output
    assert base.clave('ana') == CLAVE_INICIAL
    assert _volcado() == antes
    assert con_entrega.sends == []


def test_rotacion_con_correo_caido_deja_la_entrega_pendiente(
        base, correr, con_entrega):
    from app.modules.users.models import EntregaCredenciales
    con_entrega.correo_responde = {'status': 'error'}

    r = correr('migrar-ldap', '--rotar-contrasena', '--sin-grupo-del-portal',
               '--grupo', GRUPO_ADMINS)

    assert r.exit_code != 0
    assert 'queda pendiente' in r.output
    db.session.expire_all()
    entrega = EntregaCredenciales.query.one()
    assert entrega.status == 'pendientes' and entrega.last_error
    assert con_entrega.contrasenas[0] not in r.output


def test_actualizar_rol_quita_del_grupo_del_otro_rol(base, correr):
    fabricas.crear_usuario(ROLE_USER, email='beto@pruebas.local')
    # beto está en admins en LDAP y, a propósito, también en usuarios.
    EscritorDirectorio().add_member(dn_grupo(GRUPO_USUARIOS),
                                    dn_persona('beto'))
    assert dn_persona('beto') in base.miembros(GRUPO_USUARIOS)

    r = correr('migrar-ldap', '--actualizar-rol', '--grupo', GRUPO_ADMINS)

    assert r.exit_code == 0, r.output
    assert _cuenta('beto@pruebas.local').role == ROLE_AREA_ADMIN
    assert dn_persona('beto') in base.miembros(GRUPO_ADMINS)
    assert dn_persona('beto') not in (base.miembros(GRUPO_USUARIOS) or [])
