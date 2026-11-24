"""Autoservicio con cuentas del directorio (FNC-168).

- Una cuenta `sso` (Authelia, mismo OpenLDAP) cambia la contraseña solo en
  LDAP: nunca queda hash en la BD, que la bloquearía al entrar por Authelia.
- La cuenta local se sigue sincronizando.
- La búsqueda local es exacta (sin comodines de `LIKE`).
- El enlace de recuperación sale de `BASE_URL`, nunca del `Host`.
"""
import pytest

from app import db
from app.modules.auth import autoservicio, autoservicio_correo
from app.modules.auth.autoservicio import (ErrorAutoservicio,
                                           cambiar_contrasena,
                                           generar_token_recuperacion,
                                           restablecer_con_token,
                                           restablecer_directo_mfa)
from app.modules.auth.autoservicio_cuentas import (cuenta_del_portal,
                                                   cuenta_local)
from app.modules.auth.models import User
from app.modules.auth.services import motivo_de_bloqueo
from app.modules.directory.errors import Resultado, ResultadoEscritura
from app.modules.directory.ldap_client import UsuarioDirectorio

CORREO = 'persona.sso@pruebas.local'
UID = 'persona.sso'
DN = f'uid={UID},ou=users,dc=pruebas,dc=local'
NUEVA = 'Nueva-Clave-De-Prueba-26!x'  # ficticia; cumple la política
ANTERIOR = 'Clave-Anterior-De-Prueba-1!'
BASE_URL_PRUEBA = 'https://portal.pruebas.local'


@pytest.fixture
def cuenta_sso(app):
    cuenta = User(email=CORREO, nombre='Persona SSO', role='usuario',
                  auth_source='sso', is_active=True)
    db.session.add(cuenta)
    db.session.commit()
    return cuenta.id


@pytest.fixture
def ldap_falso(monkeypatch):
    """Directorio activo con la persona; registra los Password Modify."""
    persona = UsuarioDirectorio(dn=DN, identificador=UID,
                                atributos={'mail': CORREO, 'cn': 'Persona SSO'})
    cambios = []

    class ClienteFalso:
        def buscar_por_correo(self, correo):
            return persona if correo == CORREO else None

        def buscar_usuario(self, uid):
            return persona if uid == UID else None

        def verificar_contrasena(self, _persona, contrasena):
            return contrasena == ANTERIOR

    class EscritorFalso:
        def __init__(self, cliente=None):
            pass

        def change_password(self, dn, nueva):
            cambios.append((dn, nueva))
            return ResultadoEscritura(Resultado.HECHO, dn)

    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'false')
    monkeypatch.setattr(autoservicio, 'directorio_activo', lambda: True)
    monkeypatch.setattr(autoservicio, 'ClienteDirectorio', ClienteFalso)
    monkeypatch.setattr(autoservicio, 'EscritorDirectorio', EscritorFalso)
    monkeypatch.setattr(autoservicio, 'enviar_correo_confirmacion_cambio',
                        lambda *a, **k: True)
    monkeypatch.setattr(autoservicio, 'sincronizar_jumpserver_o_externos',
                        lambda *a, **k: None)
    return cambios


def _cuenta(user_id):
    db.session.expire_all()
    return db.session.get(User, user_id)


def _sin_hash_y_sin_bloqueo(user_id):
    cuenta = _cuenta(user_id)
    assert cuenta.password_hash is None
    assert motivo_de_bloqueo(cuenta) is None  # sigue entrando por Authelia


def test_restablecer_con_enlace_cuenta_sso_solo_cambia_ldap(
        app, cuenta_sso, ldap_falso):
    with app.test_request_context():
        token = generar_token_recuperacion(CORREO)
        resultado = restablecer_con_token(CORREO, token, NUEVA)

    assert resultado['status'] == 'success'
    assert ldap_falso == [(DN, NUEVA)]
    _sin_hash_y_sin_bloqueo(cuenta_sso)


def test_restablecer_con_mfa_cuenta_sso_solo_cambia_ldap(
        app, cuenta_sso, ldap_falso, monkeypatch):
    monkeypatch.setattr(autoservicio, 'validar_desafio_mfa',
                        lambda *a, **k: None)
    with app.test_request_context():
        resultado = restablecer_directo_mfa(UID, NUEVA, '123456')

    assert resultado['status'] == 'success'
    assert ldap_falso == [(DN, NUEVA)]
    _sin_hash_y_sin_bloqueo(cuenta_sso)


def test_cambiar_cuenta_sso_solo_cambia_ldap(app, cuenta_sso, ldap_falso):
    with app.test_request_context():
        resultado = cambiar_contrasena(CORREO, ANTERIOR, NUEVA)

    assert resultado['status'] == 'success'
    assert ldap_falso == [(DN, NUEVA)]
    _sin_hash_y_sin_bloqueo(cuenta_sso)


def test_cuenta_sso_fuera_del_directorio_no_recibe_hash_local(
        app, cuenta_sso, monkeypatch):
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'false')
    monkeypatch.setattr(autoservicio, 'directorio_activo', lambda: False)
    with app.test_request_context():
        token = generar_token_recuperacion(CORREO)
        with pytest.raises(ErrorAutoservicio) as error:
            restablecer_con_token(CORREO, token, NUEVA)

    assert error.value.codigo_http == 404
    assert _cuenta(cuenta_sso).password_hash is None


def test_cuenta_local_se_sigue_sincronizando(app, ldap_falso):
    local = User(email=CORREO, nombre='Local', role='usuario',
                 auth_source='local', is_active=True)
    local.set_password(ANTERIOR)
    db.session.add(local)
    db.session.commit()

    with app.test_request_context():
        token = generar_token_recuperacion(CORREO)
        restablecer_con_token(CORREO, token, NUEVA)

    assert _cuenta(local.id).check_password(NUEVA)


@pytest.mark.parametrize('texto', ['%', '_%', '%@%', 'persona%'])
def test_busqueda_local_sin_comodines(app, cuenta_sso, texto):
    assert cuenta_del_portal(texto) is None


def test_busqueda_local_por_usuario_y_por_correo(app, cuenta_sso):
    assert cuenta_del_portal(UID).id == cuenta_sso
    assert cuenta_del_portal(CORREO.upper()).id == cuenta_sso
    assert cuenta_local(CORREO) is None  # `sso` no es local


def test_enlace_de_recuperacion_usa_base_url_y_no_el_host(
        app, client, cuenta_sso, ldap_falso, monkeypatch):
    monkeypatch.setenv('BASE_URL', BASE_URL_PRUEBA)
    enviados = []
    monkeypatch.setattr(autoservicio_correo, 'resolver_smtp_autoservicio', lambda: None)
    original = autoservicio.generar_token_recuperacion
    monkeypatch.setattr(autoservicio, 'generar_token_recuperacion',
                        lambda correo: enviados.append(correo) or original(correo))
    registros = []
    monkeypatch.setattr(autoservicio_correo.logger, 'info',
                        lambda msg, *args: registros.append(msg % args))

    respuesta = client.post(
        '/api/v1/auth/autoservicio/solicitar-recuperacion',
        json={'email': CORREO}, headers={'Host': 'atacante.invalid'})

    assert respuesta.status_code == 200
    assert enviados == [CORREO]
    enlaces = [r for r in registros if 'enlace de recuperación' in r]
    assert enlaces and BASE_URL_PRUEBA in enlaces[0]
    assert 'atacante.invalid' not in enlaces[0]
    assert 'token=' not in enlaces[0]  # FNC-174: el token no se escribe en el log


def test_sin_base_url_no_se_genera_enlace(app, client, cuenta_sso, ldap_falso,
                                          monkeypatch):
    monkeypatch.setenv('BASE_URL', '')
    generados = []
    monkeypatch.setattr(autoservicio, 'generar_token_recuperacion',
                        lambda correo: generados.append(correo) or 'x')

    respuesta = client.post(
        '/api/v1/auth/autoservicio/solicitar-recuperacion',
        json={'email': CORREO})

    assert respuesta.status_code == 200  # misma respuesta: sin enumeración
    assert generados == []
