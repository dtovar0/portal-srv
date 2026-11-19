"""Onboarding con contraseña inicial entregada por Send (FNC-138, ADR-008).

Cubre el alta (`POST /users/directory`), la política publicada, el primer
intento síncrono, el reintento del worker con contraseña nueva, el reenvío
(`POST /users/<id>/credentials`) y que la contraseña nunca llega a la BD, la
auditoría, los logs ni las respuestas. Sin Vaultwarden, `bw`, SMTP ni LDAP
reales: dobles de `conftest.py` y `directorio_falso`.
"""
import logging
from datetime import timedelta

import pytest
from flask import g
from ldap3 import ALL_ATTRIBUTES, BASE
from ldap3.core.exceptions import LDAPConstraintViolationResult
from ldap3.extend import StandardExtendedOperations
from sqlalchemy import text

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from app.modules.directory import ldap_client
from app.modules.provisioning.configuracion import cargar_configuracion
from app.modules.provisioning.reloj import ahora
from app.modules.secretos.sends import SendRechazado
from app.modules.secretos.vaultwarden import GestorCaido
from app.modules.users import entrega_credenciales as entrega_mod
from app.modules.users.entrega_credenciales import (SLUG_INICIALES,
                                                    SLUG_NO_ENTREGADAS,
                                                    ejecutar_entrega,
                                                    vencidos)
from app.modules.users.models import EntregaCredenciales
from app.modules.users.politica_contrasena import \
    MENSAJE_RECHAZO_DIRECTORIO
from tests import directorio_falso, fabricas
from tests.directorio_falso import instalar_directorio
from tests.directory.conftest import dn_persona

URL = '/api/v1/users/directory'
CONTRASENA = 'Clave-De-Prueba-2026!x'  # ficticia; cumple la política
CENTINELA = 'Centinela-Unico-9271!zz'  # ficticia; cumple la política
CORREO = 'ana@pruebas.local'


@pytest.fixture
def escena(app):
    area = fabricas.crear_area('Área A')
    return {'super': fabricas.crear_usuario(ROLE_ADMIN),
            'admin': fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[area],
                                            areas_administradas=[area]),
            'area': area.id}


@pytest.fixture
def cliente_como(app, cliente_como):
    """Como el de `conftest.py`, pero olvida al actor anterior: la prueba
    mantiene un contexto de la app y Flask-Login guarda al usuario en `g`."""
    def _como(usuario):
        g.pop('_login_user', None)
        return cliente_como(usuario)
    return _como


@pytest.fixture
def directorio(monkeypatch, app):
    return instalar_directorio(monkeypatch)


def _cuerpo(**cambios):
    datos = {'uid': 'ana.ruiz', 'email': CORREO, 'given_name': 'Ana',
             'surname': 'Ruiz', 'area_ids': [], 'password': CONTRASENA}
    datos.update(cambios)
    return datos


def _alta(escena, cliente_como, **cambios):
    return cliente_como(escena['super']).post(URL, json=_cuerpo(**cambios))


def _entrega():
    db.session.expire_all()
    return EntregaCredenciales.query.one()


def _eventos(accion):
    return AuditLog.query.filter_by(action=accion).order_by(AuditLog.id).all()


def _clave_ldap(uid='ana.ruiz'):
    with ldap_client.ClienteDirectorio().conexion_servicio() as conexion:
        conexion.search(dn_persona(uid), '(objectClass=*)', BASE,
                        attributes=ALL_ATTRIBUTES)
        return conexion.entries[0].entry_attributes_as_dict.get('userPassword')


def _volver_vencida(entrega=None):
    entrega = entrega or EntregaCredenciales.query.one()
    entrega.next_attempt_at = ahora() - timedelta(seconds=1)
    db.session.commit()


def _volcado_de_la_bd():
    """Texto de todas las tablas: la contraseña no puede estar en ninguna."""
    partes = []
    for tabla in db.metadata.sorted_tables:
        for fila in db.session.execute(text(f'SELECT * FROM {tabla.name}')):
            partes.append(repr(tuple(fila)))
    return '\n'.join(partes)


# --------------------------------------------------------------------------- #
# Política y alta
# --------------------------------------------------------------------------- #

def test_la_politica_se_publica_a_los_administradores(escena, cliente_como):
    for actor in (escena['super'], escena['admin']):
        r = cliente_como(actor).get('/api/v1/users/password-policy')
        assert r.status_code == 200
        assert r.get_json() == {'status': 'success', 'policy': {
            'min_length': 16, 'max_length': 128,
            'required_classes': ['mayusculas', 'minusculas', 'digitos',
                                 'simbolos'],
            'symbols': '!#$%&()*+,-./:;<=>?@[]^_{}~'}}


def test_la_politica_no_se_publica_a_un_usuario_ni_a_un_anonimo(
        escena, cliente_como, client):
    usuario = fabricas.crear_usuario(ROLE_USER)
    assert cliente_como(usuario).get(
        '/api/v1/users/password-policy').status_code == 403
    g.pop('_login_user', None)
    assert client.get('/api/v1/users/password-policy').status_code == 401


@pytest.mark.parametrize('clave, campo', [
    ('Abcdefghi-12345', 'password'),          # 15 caracteres
    ('abcdefghij-123456', 'password'),        # sin mayúscula
    ('Abcdefghij 123456-', 'password'),       # espacio
    ('', 'password'),
    (None, 'password'),
    (12345678901234567, 'password'),
])
def test_contrasena_fuera_de_politica_da_422_sin_tocar_el_directorio(
        escena, directorio, cliente_como, entrega, clave, campo):
    r = _alta(escena, cliente_como, password=clave)

    assert r.status_code == 422, r.get_data(as_text=True)
    assert campo in r.get_json()['fields']
    assert directorio.filtros == []
    assert entrega.sends == []
    assert User.query.filter_by(email=CORREO).first() is None


def test_la_validacion_no_confia_en_el_cliente_aunque_sea_valida_en_ldap(
        escena, directorio, cliente_como, entrega):
    r = _alta(escena, cliente_como, password='corta-1A!')
    assert r.status_code == 422
    assert 'Entre 16 y 128 caracteres.' == r.get_json()['fields']['password']


def test_la_contrasena_no_aparece_en_el_repr_del_alta():
    from app.modules.users.directory_accounts import AltaDirectorio
    alta = AltaDirectorio('ana.ruiz', CORREO, 'Ana', 'Ruiz', (), CENTINELA)
    assert CENTINELA not in repr(alta)


# --------------------------------------------------------------------------- #
# Primer intento síncrono
# --------------------------------------------------------------------------- #

def test_alta_con_vaultwarden_y_correo_deja_las_credenciales_enviadas(
        escena, directorio, cliente_como, entrega):
    r = _alta(escena, cliente_como)

    assert r.status_code == 201, r.get_data(as_text=True)
    usuario = r.get_json()['user']
    assert usuario['credentials_status'] == 'enviadas'
    assert usuario['credentials_sent_at']

    # Send: usuario, contraseña (la escrita) y URL del portal.
    [send] = entrega.sends
    assert send['texto'] == (f'Usuario: ana.ruiz\nContraseña: {CONTRASENA}\n'
                             f'Portal: {entrega_mod.url_del_portal()}')
    # Correo: solo el enlace (plantilla `credenciales_iniciales`).
    [correo] = entrega.correos
    assert correo['slug'] == SLUG_INICIALES and correo['destino'] == CORREO
    assert correo['contexto']['enlace'] == send['enlace']
    assert CONTRASENA not in str(correo)
    assert set(correo['contexto']) == set(
        entrega_mod.CLAVES_POR_PLANTILLA[SLUG_INICIALES])
    # LDAP: Password Modify con la contraseña escrita (guardada cifrada).
    assert _clave_ldap() == [directorio_falso.cifrado_simulado(CONTRASENA)]
    fila = _entrega()
    assert fila.status == 'enviadas' and fila.send_id == send['id']
    assert fila.last_error is None and fila.attempts_count == 1
    [enviadas] = _eventos('credenciales_enviadas')
    assert enviadas.status == 'success'
    assert enviadas.actor_id == escena['super'].id


def test_vaultwarden_caido_crea_la_cuenta_con_credenciales_pendientes(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('detalle interno vault.invalid')

    r = _alta(escena, cliente_como)

    assert r.status_code == 201, r.get_data(as_text=True)
    assert r.get_json()['user']['credentials_status'] == 'pendientes'
    assert r.get_json()['user']['credentials_sent_at'] is None
    assert entrega.correos == []                     # nada por correo
    fila = _entrega()
    assert fila.status == 'pendientes' and fila.attempts_count == 1
    assert fila.last_error == 'gestor_no_disponible'
    assert fila.next_attempt_at > ahora()             # reintento programado
    assert 'vault.invalid' not in fila.last_error
    [evento] = _eventos('credenciales_pendientes')
    assert evento.status == 'warning'


def test_send_deshabilitado_por_la_organizacion_queda_pendiente_con_su_codigo(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = SendRechazado('x', 'send_deshabilitado')
    _alta(escena, cliente_como)
    assert _entrega().last_error == 'send_deshabilitado'


def test_correo_fallido_queda_pendiente_y_borra_el_send_creado(
        escena, directorio, cliente_como, entrega):
    entrega.correo_responde = {'status': 'error'}

    r = _alta(escena, cliente_como)

    assert r.get_json()['user']['credentials_status'] == 'pendientes'
    assert _entrega().last_error == 'correo_no_enviado'
    assert entrega.borrados == [entrega.sends[0]['id']]
    assert _entrega().send_id is None


def test_el_correo_que_lanza_excepcion_tambien_queda_pendiente(
        escena, directorio, cliente_como, entrega, monkeypatch):
    from app.modules.notifications import services

    def _revienta(*args, **kwargs):
        raise RuntimeError(f'smtp {CONTRASENA}')
    monkeypatch.setattr(services, 'send_notification_by_slug', _revienta)

    r = _alta(escena, cliente_como)

    assert r.status_code == 201
    assert r.get_json()['user']['credentials_status'] == 'pendientes'


def test_notificaciones_desactivadas_dejan_pendientes_sin_crear_el_send(
        escena, directorio, cliente_como, entrega, monkeypatch):
    monkeypatch.setenv('ENABLE_NOTIFICATIONS', 'false')

    r = _alta(escena, cliente_como)

    assert r.get_json()['user']['credentials_status'] == 'pendientes'
    assert _entrega().last_error == 'notificaciones_desactivadas'
    assert entrega.sends == [] and entrega.correos == []


def test_sin_base_url_queda_pendiente_sin_crear_el_send(
        escena, directorio, cliente_como, entrega, monkeypatch):
    monkeypatch.delenv('BASE_URL')

    r = _alta(escena, cliente_como)

    assert r.get_json()['user']['credentials_status'] == 'pendientes'
    assert _entrega().last_error == 'base_url_no_configurada'
    assert entrega.sends == []


def test_la_contrasena_no_llega_a_la_bd_la_auditoria_los_logs_ni_la_respuesta(
        escena, directorio, cliente_como, entrega, caplog):
    entrega.error_send = GestorCaido(f'falló con {CENTINELA}')
    with caplog.at_level(logging.DEBUG):
        r = _alta(escena, cliente_como, password=CENTINELA)
        entrega.error_send = None
        _volver_vencida()
        ejecutar_entrega(EntregaCredenciales.query.one().id)

    assert r.status_code == 201
    assert CENTINELA not in r.get_data(as_text=True)
    assert CENTINELA not in caplog.text
    assert CENTINELA not in _volcado_de_la_bd()
    for evento in AuditLog.query.all():
        assert CENTINELA not in repr([evento.detail, evento.target,
                                      evento.before_state,
                                      evento.after_state])
    # Ningún enlace ni llave de Send en la BD ni en la auditoría.
    assert 'llave' not in _volcado_de_la_bd()


def test_la_alta_tiene_la_entrega_en_la_misma_transaccion_que_la_cuenta(
        escena, directorio, cliente_como, entrega, monkeypatch):
    """Aunque el primer intento reviente, la cuenta queda con su reintento."""
    monkeypatch.setattr(entrega_mod, 'enviar_credenciales',
                        lambda *a, **k: (_ for _ in ()).throw(
                            RuntimeError('boom')))

    r = _alta(escena, cliente_como)

    assert r.status_code == 201
    assert r.get_json()['user']['credentials_status'] == 'pendientes'
    assert _entrega().next_attempt_at > ahora()


# --------------------------------------------------------------------------- #
# `ppolicy` del directorio
# --------------------------------------------------------------------------- #

def test_el_rechazo_de_ppolicy_es_un_422_propio_y_no_crea_nada(
        escena, directorio, cliente_como, entrega, monkeypatch):
    def _rechaza(self, **_):
        raise LDAPConstraintViolationResult(
            'Password is in history del servidor ldap.interno')
    monkeypatch.setattr(StandardExtendedOperations, 'modify_password',
                        _rechaza)

    r = _alta(escena, cliente_como)

    assert r.status_code == 422, r.get_data(as_text=True)
    datos = r.get_json()
    assert datos['fields'] == {'password': MENSAJE_RECHAZO_DIRECTORIO}
    assert 'history' not in r.get_data(as_text=True)
    assert 'ldap.interno' not in r.get_data(as_text=True)
    assert User.query.filter_by(email=CORREO).first() is None
    assert EntregaCredenciales.query.count() == 0
    assert entrega.sends == []
    # La entrada recién creada se retiró: no queda una cuenta sin contraseña.
    with ldap_client.ClienteDirectorio().conexion_servicio() as conexion:
        conexion.search(dn_persona('ana.ruiz'), '(objectClass=*)', BASE,
                        attributes=[])
        assert conexion.entries == []


# --------------------------------------------------------------------------- #
# Worker: reintento con contraseña nueva
# --------------------------------------------------------------------------- #

def test_el_reintento_genera_otra_contrasena_la_reescribe_y_deja_enviadas(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    assert _clave_ldap() == [directorio_falso.cifrado_simulado(CONTRASENA)]
    entrega.error_send = None
    _volver_vencida()

    assert ejecutar_entrega(_entrega().id) == 'enviadas'

    fila = _entrega()
    assert fila.status == 'enviadas' and fila.last_error is None
    assert fila.attempts_count == 2 and fila.locked_by is None
    [nueva] = entrega.contrasenas
    assert nueva != CONTRASENA
    assert _clave_ldap() == [directorio_falso.cifrado_simulado(nueva)]
    assert entrega.correos[0]['contexto']['enlace'] == entrega.sends[0]['enlace']
    [evento] = _eventos('credenciales_enviadas')
    assert evento.user == 'sistema' and evento.actor_id is None


def test_el_reintento_no_corre_antes_de_su_hora_ni_cuando_ya_esta_enviada(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    assert ejecutar_entrega(_entrega().id) is None        # aún no le toca
    assert entrega.sends == []

    entrega.error_send = None
    _volver_vencida()
    assert ejecutar_entrega(_entrega().id) == 'enviadas'
    assert ejecutar_entrega(_entrega().id) is None        # ya terminó
    assert len(entrega.sends) == 1


def test_un_reintento_fallido_programa_el_siguiente_con_backoff(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    _volver_vencida()

    assert ejecutar_entrega(_entrega().id) == 'pendientes'

    fila = _entrega()
    assert fila.attempts_count == 2 and fila.next_attempt_at > ahora()
    assert fila.locked_at is None


def test_la_reserva_es_exclusiva(escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    _volver_vencida()
    cfg = cargar_configuracion()
    entrega_id = _entrega().id

    assert entrega_mod.reservar(entrega_id, 'w1', cfg) is True
    db.session.commit()
    assert entrega_mod.reservar(entrega_id, 'w2', cfg) is False
    # Reserva vencida: otro worker la retoma.
    fila = _entrega()
    fila.locked_at = ahora() - timedelta(seconds=cfg.vencimiento_reserva + 1)
    db.session.commit()
    assert entrega_mod.reservar(entrega_id, 'w2', cfg) is True


def test_el_barrido_lista_solo_las_entregas_que_ya_toca_reintentar(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    cfg = cargar_configuracion()
    fila = _entrega()
    assert vencidos(cfg) == []                         # aún no le toca
    _volver_vencida(fila)
    assert vencidos(cfg) == [fila.id]
    fila.status, fila.max_attempts = 'pendientes', fila.attempts_count
    db.session.commit()
    assert vencidos(cfg) == []                         # intentos agotados


def test_el_tipo_de_trabajo_esta_registrado_en_el_worker(app):
    from app.modules.provisioning.tipos_de_trabajo import \
        funciones_permitidas
    assert entrega_mod.FUNCION_ENTREGA in funciones_permitidas()


def test_agotados_los_intentos_avisa_a_los_superadmins_y_sigue_pendiente(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    fila = _entrega()
    fila.max_attempts = 2
    db.session.commit()
    _volver_vencida()

    assert ejecutar_entrega(fila.id) == 'pendientes'

    fila = _entrega()
    assert fila.status == 'pendientes' and fila.next_attempt_at is None
    assert vencidos(cargar_configuracion()) == []
    aviso = [c for c in entrega.correos if c['slug'] == SLUG_NO_ENTREGADAS]
    assert len(aviso) == 1
    assert aviso[0]['destino'] == escena['super'].email
    assert aviso[0]['contexto']['usuario'] == 'ana.ruiz'
    assert CONTRASENA not in str(aviso)
    agotada = [e for e in _eventos('credenciales_pendientes')
               if e.user == 'sistema']
    assert len(agotada) == 1 and agotada[0].status == 'error'


def test_directorio_caido_en_el_reintento_queda_pendiente(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    entrega.error_send = None
    _volver_vencida()
    directorio.error = RuntimeError('ldap caído')

    assert ejecutar_entrega(_entrega().id) == 'pendientes'

    assert _entrega().last_error == 'directorio_no_disponible'
    assert entrega.sends == []


# --------------------------------------------------------------------------- #
# Reenviar credenciales
# --------------------------------------------------------------------------- #

def _cuenta_con_entrega(escena, directorio, cliente_como):
    assert _alta(escena, cliente_como).status_code == 201
    return User.query.filter_by(email=CORREO).one()


def _reenviar(cliente, cuenta_id, **cuerpo):
    return cliente.post(f'/api/v1/users/{cuenta_id}/credentials', json=cuerpo)


def test_reenviar_genera_contrasena_y_send_nuevos_y_borra_el_anterior(
        escena, directorio, cliente_como, entrega):
    cuenta = _cuenta_con_entrega(escena, directorio, cliente_como)
    send_anterior = entrega.sends[0]['id']

    r = _reenviar(cliente_como(escena['super']), cuenta.id)

    assert r.status_code == 200, r.get_data(as_text=True)
    assert r.get_json()['user']['credentials_status'] == 'enviadas'
    assert len(entrega.sends) == 2 and len(entrega.correos) == 2
    nueva = entrega.contrasenas[1]
    assert nueva != CONTRASENA
    assert _clave_ldap() == [directorio_falso.cifrado_simulado(nueva)]
    assert entrega.borrados == [send_anterior]
    assert _entrega().send_id == entrega.sends[1]['id']
    [reenviada] = _eventos('credenciales_reenviadas')
    assert reenviada.actor_id == escena['super'].id
    assert nueva not in repr([reenviada.detail, reenviada.after_state])
    assert nueva not in _volcado_de_la_bd()


def test_reenviar_con_vaultwarden_caido_responde_202_y_deja_el_reintento(
        escena, directorio, cliente_como, entrega):
    cuenta = _cuenta_con_entrega(escena, directorio, cliente_como)
    entrega.error_send = GestorCaido('caído')

    r = _reenviar(cliente_como(escena['super']), cuenta.id)

    assert r.status_code == 202, r.get_data(as_text=True)
    assert r.get_json()['user']['credentials_status'] == 'pendientes'
    fila = _entrega()
    assert fila.status == 'pendientes' and fila.next_attempt_at > ahora()
    assert fila.attempts_count == 1
    assert entrega.borrados == []          # el Send anterior sigue hasta el éxito
    assert len(_eventos('credenciales_pendientes')) == 1


def test_reenviar_tras_agotar_los_intentos_vuelve_a_abrirlos(
        escena, directorio, cliente_como, entrega):
    cuenta = _cuenta_con_entrega(escena, directorio, cliente_como)
    fila = _entrega()
    fila.status, fila.attempts_count, fila.max_attempts = 'pendientes', 5, 5
    db.session.commit()

    assert _reenviar(cliente_como(escena['super']),
                     cuenta.id).status_code == 200
    assert _entrega().attempts_count == 0


def test_reenviar_con_el_directorio_caido_da_503_sin_crear_el_send(
        escena, directorio, cliente_como, entrega):
    cuenta = _cuenta_con_entrega(escena, directorio, cliente_como)
    envios = len(entrega.sends)
    directorio.error = RuntimeError('ldap caído')

    r = _reenviar(cliente_como(escena['super']), cuenta.id)

    assert r.status_code == 503
    assert r.get_json()['code'] == 'directorio_no_disponible'
    assert len(entrega.sends) == envios


def test_reenviar_es_solo_del_superadmin(escena, directorio, cliente_como,
                                         entrega, client):
    cuenta = _cuenta_con_entrega(escena, directorio, cliente_como)
    assert _reenviar(cliente_como(escena['admin']),
                     cuenta.id).status_code == 403
    usuario = fabricas.crear_usuario(ROLE_USER)
    assert _reenviar(cliente_como(usuario), cuenta.id).status_code == 403
    g.pop('_login_user', None)
    assert _reenviar(client, cuenta.id).status_code == 401
    assert len(entrega.sends) == 1


def test_reenviar_a_una_cuenta_inexistente_da_404(escena, cliente_como):
    r = _reenviar(cliente_como(escena['super']), 9999)
    assert r.status_code == 404


@pytest.mark.parametrize('origen', ['local', 'sso', 'ldap'])
def test_reenviar_a_una_cuenta_sin_onboarding_del_portal_da_409(
        escena, cliente_como, entrega, origen):
    cuenta = fabricas.crear_usuario(ROLE_USER)
    cuenta.auth_source = origen
    db.session.commit()

    r = _reenviar(cliente_como(escena['super']), cuenta.id)

    assert r.status_code == 409
    assert r.get_json()['code'] == 'credenciales_no_aplicables'
    assert entrega.sends == []


def test_reenviar_no_acepta_campos_en_el_cuerpo(escena, directorio,
                                                cliente_como, entrega):
    cuenta = _cuenta_con_entrega(escena, directorio, cliente_como)
    r = _reenviar(cliente_como(escena['super']), cuenta.id,
                  password=CENTINELA)
    assert r.status_code == 400
    assert r.get_json()['code'] == 'campo_no_permitido'
    assert len(entrega.sends) == 1


# --------------------------------------------------------------------------- #
# `credentials_status` en `ManagedUser`
# --------------------------------------------------------------------------- #

def test_una_cuenta_sin_onboarding_no_tiene_estado_de_credenciales(app):
    from app.modules.users.serializacion import usuario_gestionado
    cuenta = fabricas.crear_usuario(ROLE_USER)
    datos = usuario_gestionado(cuenta)
    assert datos['credentials_status'] is None
    assert datos['credentials_sent_at'] is None


def test_borrar_la_cuenta_borra_su_entrega(escena, directorio, cliente_como,
                                           entrega):
    cuenta = _cuenta_con_entrega(escena, directorio, cliente_como)
    db.session.delete(cuenta)
    db.session.commit()
    assert EntregaCredenciales.query.count() == 0
