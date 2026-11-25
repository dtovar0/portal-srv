"""`--enviar-a` y `--solo` de `flask alta` (FNC-190): solo CLI, sin secretos."""
import logging

import pytest

from app import db
from app.modules.audit.models import AuditLog
from app.modules.users.entrega_credenciales import ejecutar_entrega
from app.modules.users.models import EntregaCredenciales
from tests.alta.conftest import (CLAVE_INICIAL, con_entrega, correr,  # noqa: F401
                                 ldap, volcado_de_la_bd)
from tests.alta.test_alta_csv import USUARIOS, _con_areas, csv  # noqa: F401
from tests.alta.test_migrar_ldap import base  # noqa: F401 (fixture)

DESTINO = 'prueba@empresa.test'
BASE = ('migrar-ldap', '--sin-grupo-del-portal', '--rotar-contrasena')


def _entrega(uid_correo):
    db.session.expire_all()
    return EntregaCredenciales.query.filter(
        EntregaCredenciales.uid == uid_correo).one()


def test_enviar_a_manda_el_correo_al_destino_y_no_a_la_persona(
        base, correr, con_entrega, caplog):  # noqa: F811
    caplog.set_level(logging.DEBUG)
    r = correr(*BASE, '--solo', 'ana', '--enviar-a', DESTINO, '--si')

    assert r.exit_code == 0, r.output
    [correo] = con_entrega.correos
    assert correo['destino'] == DESTINO
    assert correo['contexto']['usuario'] == 'ana'    # cuerpo: la persona
    assert 'ana@pruebas.local' not in {c['destino'] for c in con_entrega.correos}
    assert 'ATENCIÓN' in r.output and DESTINO in r.output
    assert base.clave('ana') != CLAVE_INICIAL         # la real cambió
    assert _entrega('ana').destinatario == DESTINO
    acciones = [a.action for a in AuditLog.query.all()]
    assert f'CREDENCIALES REDIRIGIDAS: ana → {DESTINO}' in acciones
    secretos = [con_entrega.contrasenas[0], con_entrega.sends[0]['codigo'],
                con_entrega.sends[0]['enlace']]
    for secreto in secretos:
        assert secreto not in r.output and secreto not in caplog.text
        assert secreto not in volcado_de_la_bd()


def test_solo_filtra_y_reporta_el_resto(base, correr, con_entrega):  # noqa: F811
    r = correr('migrar-ldap', '--sin-grupo-del-portal', '--solo', 'beto',
               '--dry-run')
    assert r.exit_code == 0, r.output
    assert 'fuera de --solo' in r.output        # ana y cora... (cora superadmin)
    assert 'beto@pruebas.local' in r.output
    assert 'ana@pruebas.local' not in r.output.replace('fuera de --solo', '')


def test_solo_con_uid_que_no_esta_es_error(base, correr, con_entrega):  # noqa: F811
    r = correr('migrar-ldap', '--sin-grupo-del-portal', '--solo', 'nadie',
               '--dry-run')
    assert r.exit_code != 0
    assert 'nadie' in r.output


def test_solo_sin_rotar_crea_solo_a_esa_persona(base, correr):  # noqa: F811
    r = correr('migrar-ldap', '--sin-grupo-del-portal', '--solo', 'ana')
    assert r.exit_code == 0, r.output
    from app.modules.auth.models import User
    assert [u.email for u in User.query.all()] == ['ana@pruebas.local']


def test_sin_si_pide_confirmacion_y_si_se_niega_no_cambia_nada(
        base, correr, con_entrega):  # noqa: F811
    antes = volcado_de_la_bd()
    r = correr(*BASE, '--solo', 'ana', '--enviar-a', DESTINO, input='n\n')
    assert r.exit_code != 0
    assert '¿Continuar? [s/N]' in r.output
    assert base.clave('ana') == CLAVE_INICIAL
    assert con_entrega.sends == [] and volcado_de_la_bd() == antes


def test_confirmando_con_s_se_ejecuta(base, correr, con_entrega):  # noqa: F811
    r = correr(*BASE, '--solo', 'ana', '--enviar-a', DESTINO, input='s\n')
    assert r.exit_code == 0, r.output
    assert con_entrega.correos[0]['destino'] == DESTINO


def test_dry_run_no_escribe_y_dice_a_quien_se_enviaria(
        base, correr, con_entrega):  # noqa: F811
    antes = volcado_de_la_bd()
    r = correr(*BASE, '--solo', 'ana', '--enviar-a', DESTINO, '--dry-run')
    assert r.exit_code == 0, r.output
    assert f'se enviaría a {DESTINO}' in r.output
    assert '¿Continuar?' not in r.output
    assert base.clave('ana') == CLAVE_INICIAL
    assert volcado_de_la_bd() == antes and con_entrega.sends == []


@pytest.mark.parametrize('valor', ['sin-arroba', 'a@b', 'a b@c.d', ''])
def test_correo_invalido_es_error_de_uso(base, correr, valor):
    r = correr(*BASE, '--enviar-a', valor, '--si')
    assert r.exit_code == 2


def test_enviar_a_sin_rotar_es_error_de_uso(base, correr):
    r = correr('migrar-ldap', '--enviar-a', DESTINO, '--si')
    assert r.exit_code == 2


def test_usuarios_tambien_acepta_enviar_a(app, correr, csv, ldap,  # noqa: F811
                                          con_entrega):
    _con_areas()
    ldap.persona('ana')
    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap',
               '--omitir-si-existe-en-ldap', '--rotar-contrasena',
               '--enviar-a', DESTINO, '--si')
    assert r.exit_code == 0, r.output
    destinos = {c['destino'] for c in con_entrega.correos}
    assert DESTINO in destinos                       # ana, rotada
    assert 'carlos@pruebas.local' in destinos        # el alta no se redirige


def test_el_reintento_del_worker_va_al_mismo_destinatario(
        base, correr, con_entrega):  # noqa: F811
    con_entrega.correo_responde = {'status': 'error'}
    r = correr(*BASE, '--solo', 'ana', '--enviar-a', DESTINO, '--si')
    assert r.exit_code != 0                            # quedó pendiente
    entrega = _entrega('ana')
    assert entrega.destinatario == DESTINO and entrega.status == 'pendientes'
    con_entrega.correo_responde = {'status': 'success'}
    entrega.next_attempt_at = None
    db.session.commit()

    assert ejecutar_entrega(entrega.id) == 'enviadas'

    assert con_entrega.correos[-1]['destino'] == DESTINO
    assert 'ana@pruebas.local' not in {c['destino'] for c in con_entrega.correos}


def test_la_api_y_el_portal_no_aceptan_destinatario(
        app, correr, cliente_como):
    from app.authz import ROLE_ADMIN
    from tests import fabricas
    actor = cliente_como(fabricas.crear_usuario(ROLE_ADMIN))
    for campo in ('destinatario', 'enviar_a'):
        r = actor.post('/api/v1/users/directory', json={
            'uid': 'x.y', 'email': 'x@pruebas.local', 'given_name': 'X',
            'surname': 'Y', 'area_ids': [], 'password': 'Clave-Larga-2026!x',
            campo: DESTINO})
        assert r.status_code == 400
        assert r.get_json()['code'] == 'campo_no_permitido'
        r = actor.post('/api/v1/users/1/rotar-contrasena', json={campo: DESTINO})
        assert r.status_code == 400


def test_solo_con_persona_fuera_de_los_grupos_se_busca_en_ldap(  # FNC-201
        base, correr, con_entrega):  # noqa: F811
    """Caso de dmartinez: existe en LDAP pero no está en el grupo pedido."""
    from app.modules.auth.models import User
    r = correr('migrar-ldap', '--grupo', 'app-aduana-users', '--solo', 'eli',
               '--sin-grupo-del-portal')
    assert r.exit_code == 0, r.output
    assert 'no es miembro' not in r.output
    assert [u.email for u in User.query.all()] == ['eli@pruebas.local']


def test_solo_sin_grupo_busca_en_ldap(base, correr):  # noqa: F811
    from app.modules.auth.models import User
    r = correr('migrar-ldap', '--solo', 'eli', '--sin-grupo-del-portal')
    assert r.exit_code == 0, r.output
    assert [u.email for u in User.query.all()] == ['eli@pruebas.local']


def test_solo_superadmin_fuera_de_grupo_se_omite(base, correr):  # noqa: F811
    from app.modules.auth.models import User
    r = correr('migrar-ldap', '--grupo', 'app-tacacs-user', '--solo', 'cora',
               '--sin-grupo-del-portal')
    assert r.exit_code == 0, r.output
    assert 'omitido: superadmin' in r.output and User.query.count() == 0


def test_solo_inexistente_dice_que_no_esta_en_ldap(base, correr):  # noqa: F811
    r = correr('migrar-ldap', '--solo', 'nadie', '--dry-run')
    assert r.exit_code == 1
    assert 'no está en LDAP_USERS_BASE_DN' in r.output
