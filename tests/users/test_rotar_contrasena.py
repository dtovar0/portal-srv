"""Código de acceso del Send y `POST /users/<id>/rotar-contrasena` (FNC-190).

Sin Vaultwarden, `bw`, SMTP ni LDAP reales: dobles de `conftest.py` y
`directorio_falso`. Valores ficticios.
"""
import logging
import re

import pytest
from flask import g
from sqlalchemy import text

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.audit.models import AuditLog
from app.modules.secretos.vaultwarden import GestorCaido
from app.modules.users import entrega_credenciales as entrega_mod
from app.modules.users import rotar_contrasena
from app.modules.users.entrega_credenciales import (SLUG_INICIALES,
                                                    SLUG_ONBOARDING,
                                                    ejecutar_entrega)
from app.modules.users.models import EntregaCredenciales
from tests import directorio_falso, fabricas
from tests.directorio_falso import instalar_directorio
from tests.users.conftest import entrega  # noqa: F401 (fixture)

CORREO = 'ana@pruebas.local'
CLAVE_INICIAL = 'Clave-Inicial-2026!x'  # ficticia
PATRON_CODIGO = re.compile(r'\d{6}')


@pytest.fixture
def cliente_como(app, cliente_como):
    def _como(usuario):
        g.pop('_login_user', None)
        return cliente_como(usuario)
    return _como


@pytest.fixture
def directorio(monkeypatch, app):
    d = instalar_directorio(monkeypatch)
    d.agregar('ana', CLAVE_INICIAL, correo=CORREO)
    return d


@pytest.fixture
def listo(entrega, monkeypatch):  # noqa: F811
    """Vaultwarden simulado como listo para el preflight del endpoint."""
    monkeypatch.setattr(rotar_contrasena, 'servicio_de_sends', lambda: object())
    return entrega


def _cuenta_sso(origen='sso'):
    cuenta = fabricas.crear_usuario(ROLE_USER, email=CORREO)
    cuenta.auth_source = origen
    db.session.commit()
    return cuenta


def _url(cuenta):
    return f'/api/v1/users/{cuenta.id}/rotar-contrasena'


def _clave_ldap():
    from tests.alta.conftest import Escena
    return Escena(None).clave('ana')


def _volcado():
    db.session.expire_all()
    return '\n'.join(repr(tuple(f)) for t in db.metadata.sorted_tables
                     for f in db.session.execute(text(f'SELECT * FROM {t.name}')))


# --------------------------------------------------------------------------- #
# Código en el Send y el correo
# --------------------------------------------------------------------------- #

def test_enviar_credenciales_manda_el_codigo_al_send_y_al_correo(app, listo):
    codigo, send_id = entrega_mod.enviar_credenciales(
        CORREO, 'Ana', 'ana', 'Contrasena-Ficticia-1!')

    assert codigo is None and send_id
    [send] = listo.sends
    [correo] = listo.correos
    assert PATRON_CODIGO.fullmatch(send['codigo'])
    assert correo['contexto']['codigo'] == send['codigo']
    assert send['codigo'] not in send['texto']
    assert set(correo['contexto']) == set(
        entrega_mod.CLAVES_POR_PLANTILLA[SLUG_INICIALES])
    assert 'codigo' in entrega_mod.CLAVES_POR_PLANTILLA[SLUG_ONBOARDING]


def test_cada_envio_genera_un_codigo_nuevo(app, listo):
    for _ in range(3):
        entrega_mod.enviar_credenciales(CORREO, 'Ana', 'ana', 'Clave-1!')
    codigos = [s['codigo'] for s in listo.sends]
    assert len(set(codigos)) == 3


def test_plantilla_elegida_y_desconocida_vuelve_a_la_inicial(app, listo):
    entrega_mod.enviar_credenciales(CORREO, 'Ana', 'ana', 'x',
                                    plantilla=SLUG_ONBOARDING)
    entrega_mod.enviar_credenciales(CORREO, 'Ana', 'ana', 'x',
                                    plantilla='otra_cosa')
    assert [c['slug'] for c in listo.correos] == [SLUG_ONBOARDING,
                                                 SLUG_INICIALES]


@pytest.mark.parametrize('plantilla', [SLUG_INICIALES, SLUG_ONBOARDING])
def test_el_worker_usa_la_plantilla_de_la_entrega_y_un_codigo_nuevo(
        app, directorio, listo, plantilla):
    cuenta = _cuenta_sso()
    listo.correo_responde = {'status': 'error'}
    entrega_ = EntregaCredenciales(
        cuenta=cuenta, uid='ana', status='pendientes', attempts_count=1,
        max_attempts=5, plantilla=plantilla)
    db.session.add(entrega_)
    db.session.commit()
    entrega_id = entrega_.id
    primer = entrega_mod.enviar_credenciales(CORREO, 'Ana', 'ana', 'x',
                                             plantilla=plantilla)
    assert primer[0] == entrega_mod.CODIGO_CORREO
    listo.correo_responde = {'status': 'success'}
    entrega_.next_attempt_at = None
    db.session.commit()

    assert ejecutar_entrega(entrega_id) == 'enviadas'

    assert listo.correos[-1]['slug'] == plantilla
    assert listo.sends[0]['codigo'] != listo.sends[-1]['codigo']


def test_el_codigo_no_llega_a_logs_ni_bd_ni_auditoria(
        app, directorio, listo, cliente_como, caplog):
    caplog.set_level(logging.DEBUG)
    cuenta = _cuenta_sso()
    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).post(_url(cuenta))

    assert r.status_code == 200, r.get_data(as_text=True)
    codigo = listo.sends[0]['codigo']
    assert codigo not in caplog.text
    assert codigo not in r.get_data(as_text=True)
    # Un código de 6 dígitos puede coincidir con una fecha o un id: se busca
    # entre las filas de auditoría y de entregas, que no deben llevarlo.
    for fila in AuditLog.query.all():
        assert codigo not in repr((fila.detail, fila.before_state,
                                   fila.after_state, fila.target))
    assert codigo not in repr([(e.last_error, e.send_id)
                               for e in EntregaCredenciales.query.all()])


# --------------------------------------------------------------------------- #
# Endpoint
# --------------------------------------------------------------------------- #

def test_superadmin_rota_y_entrega_sin_devolver_secretos(
        app, directorio, listo, cliente_como, caplog):
    caplog.set_level(logging.DEBUG)
    cuenta = _cuenta_sso()

    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).post(_url(cuenta))

    assert r.status_code == 200, r.get_data(as_text=True)
    assert r.get_json() == {'status': 'success',
                            'entrega': {'estado': 'enviadas'}}
    [send] = listo.sends
    [correo] = listo.correos
    assert correo['slug'] == SLUG_INICIALES and correo['destino'] == CORREO
    clave = listo.contrasenas[0]
    assert _clave_ldap() == directorio_falso.cifrado_simulado(clave)
    cuerpo = r.get_data(as_text=True)
    for secreto in (clave, send['enlace'], send['codigo']):
        assert secreto not in cuerpo and secreto not in caplog.text
        assert secreto not in _volcado()
    db.session.expire_all()
    fila = EntregaCredenciales.query.one()
    assert fila.status == 'enviadas' and fila.plantilla == SLUG_INICIALES
    acciones = {a.action for a in AuditLog.query.all()}
    assert 'ADMIN: ROTAR CONTRASEÑA' in acciones
    assert 'credenciales_reenviadas' in acciones


def test_cuenta_heredada_ldap_tambien_se_rota(app, directorio, listo,
                                              cliente_como):
    cuenta = _cuenta_sso('ldap')
    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).post(_url(cuenta))
    assert r.status_code == 200


def test_entrega_fallida_deja_pendiente_para_el_worker(
        app, directorio, listo, cliente_como):
    listo.correo_responde = {'status': 'error'}
    cuenta = _cuenta_sso()

    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).post(_url(cuenta))

    assert r.status_code == 200
    assert r.get_json()['entrega'] == {'estado': 'pendientes'}
    db.session.expire_all()
    fila = EntregaCredenciales.query.one()
    assert fila.last_error == entrega_mod.CODIGO_CORREO
    assert fila.attempts_count == 1 and fila.next_attempt_at is not None


def test_admin_de_area_y_usuario_no_pueden(app, directorio, listo,
                                           cliente_como):
    cuenta = _cuenta_sso()
    area = fabricas.crear_area('Área A')
    admin = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[area],
                                   areas_administradas=[area])
    for actor in (admin, fabricas.crear_usuario(ROLE_USER)):
        assert cliente_como(actor).post(_url(cuenta)).status_code == 403
    assert listo.sends == []
    assert _clave_ldap() == CLAVE_INICIAL


def test_cuenta_local_es_400_y_cuenta_inexistente_404(app, directorio, listo,
                                                      cliente_como):
    local = fabricas.crear_usuario(ROLE_USER)
    super_ = cliente_como(fabricas.crear_usuario(ROLE_ADMIN))
    r = super_.post(_url(local))
    assert r.status_code == 400
    assert r.get_json()['code'] == 'cuenta_no_es_del_directorio'
    assert super_.post('/api/v1/users/999999/rotar-contrasena').status_code == 404
    assert listo.sends == []


def test_con_cuerpo_es_campo_no_permitido(app, directorio, listo,
                                          cliente_como):
    cuenta = _cuenta_sso()
    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).post(
        _url(cuenta), json={'password': 'Otra-Clave-2026!'})
    assert r.status_code == 400
    assert r.get_json()['code'] == 'campo_no_permitido'
    assert _clave_ldap() == CLAVE_INICIAL


@pytest.mark.parametrize('falla,code', [
    ('correo', 'notificaciones_desactivadas'),
    ('base_url', 'base_url_no_configurada'),
    ('vaultwarden', 'gestor_no_disponible'),
    ('directorio', 'directorio_no_disponible'),
])
def test_si_algo_no_esta_listo_es_503_sin_tocar_ldap(
        app, directorio, listo, cliente_como, monkeypatch, falla, code):
    from app.modules.secretos.sends import SendRechazado
    cuenta = _cuenta_sso()
    if falla == 'correo':
        monkeypatch.setenv('ENABLE_NOTIFICATIONS', 'false')
    elif falla == 'base_url':
        monkeypatch.delenv('BASE_URL')
    elif falla == 'vaultwarden':
        def _apagado():
            raise SendRechazado('apagado')
        monkeypatch.setattr(rotar_contrasena, 'servicio_de_sends', _apagado)
    else:
        monkeypatch.setattr(rotar_contrasena, 'directorio_activo',
                            lambda: False)
    actor = cliente_como(fabricas.crear_usuario(ROLE_ADMIN))
    antes = _volcado()

    r = actor.post(_url(cuenta))

    assert r.status_code == 503
    assert r.get_json()['code'] == code
    assert _clave_ldap() == CLAVE_INICIAL
    assert listo.sends == [] and listo.correos == []
    assert EntregaCredenciales.query.count() == 0
    assert _volcado() == antes


def test_plantilla_editada_sin_codigo_no_crea_el_send(app, listo):
    from app.modules.notifications.models import NotificationTemplate
    db.session.add(NotificationTemplate(
        slug=SLUG_INICIALES, name='Editada', subject='x', body='Sin código',
        is_html=True))
    db.session.commit()

    codigo, send_id = entrega_mod.enviar_credenciales(CORREO, 'Ana', 'ana', 'x')

    assert codigo == entrega_mod.CODIGO_PLANTILLA_SIN_CODIGO and send_id is None
    assert listo.sends == [] and listo.correos == []


def test_la_rotacion_del_portal_borra_un_destinatario_sustituto_del_cli(
        app, directorio, listo, cliente_como):
    cuenta = _cuenta_sso()
    db.session.add(EntregaCredenciales(
        cuenta=cuenta, uid='ana', status='enviadas', attempts_count=1,
        max_attempts=5, destinatario='otro@empresa.test'))
    db.session.commit()

    r = cliente_como(fabricas.crear_usuario(ROLE_ADMIN)).post(_url(cuenta))

    assert r.status_code == 200
    assert listo.correos[0]['destino'] == CORREO
    db.session.expire_all()
    assert EntregaCredenciales.query.one().destinatario is None
