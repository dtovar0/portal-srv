"""Regla de negocio (dueño, 2026-11-24, FNC-181): solo quien está dado de
alta y activo en el portal usa el autoservicio. Una persona que existe SOLO en
LDAP no recibe código ni enlace y no se le cambia nada; con alta en el portal
sí (por usuario o por correo)."""
import pytest

from app import db

from app.modules.auth import autoservicio, autoservicio_mfa
from app.modules.auth.autoservicio import (MENSAJE_SIN_ALTA, ErrorAutoservicio,
                                           cambiar_contrasena,
                                           restablecer_con_token,
                                           generar_token_recuperacion,
                                           solicitar_recuperacion,
                                           restablecer_directo_mfa,
                                           solicitar_codigo_mfa,
                                           verificar_codigo_mfa_paso2)
from app.modules.auth.models import User
from app.modules.directory.errors import Resultado, ResultadoEscritura
from app.modules.directory.ldap_client import UsuarioDirectorio

UID = 'lacid'
CORREO = 'lacid@vivaro.com'
DN = f'uid={UID},ou=users,dc=vivaro,dc=local'
NUEVA = 'Nueva-Clave-De-Prueba-26!x'  # ficticia; cumple la política
ANTERIOR = 'Clave-Anterior-De-Prueba-1!'


@pytest.fixture
def solo_en_ldap(app, monkeypatch):
    persona = UsuarioDirectorio(dn=DN, identificador=UID,
                                atributos={'mail': CORREO, 'cn': 'Persona'})
    cambios, codigos = [], {}

    class Cliente:
        def buscar_por_correo(self, correo):
            return persona if correo.lower() == CORREO else None

        def buscar_usuario(self, uid):
            return persona if uid == UID else None

        def verificar_contrasena(self, _persona, contrasena):
            return contrasena == ANTERIOR

    class Escritor:
        def __init__(self, cliente=None):
            pass

        def change_password(self, dn, nueva):
            cambios.append((dn, nueva))
            return ResultadoEscritura(Resultado.HECHO, dn)

    for modulo in (autoservicio, autoservicio_mfa):
        monkeypatch.setattr(modulo, 'directorio_activo', lambda: True)
        monkeypatch.setattr(modulo, 'ClienteDirectorio', Cliente)
    monkeypatch.setattr(autoservicio, 'EscritorDirectorio', Escritor)
    monkeypatch.setattr(autoservicio_mfa, 'enviar_correo_mfa',
                        lambda correo, codigo, nombre=None:
                        codigos.__setitem__(correo, codigo) or True)
    monkeypatch.setattr(autoservicio, 'enviar_correo_confirmacion_cambio',
                        lambda *a, **k: True)
    monkeypatch.setattr(autoservicio, 'sincronizar_jumpserver_o_externos',
                        lambda *a, **k: None)
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'email')
    assert User.query.filter_by(email=CORREO).first() is None
    return cambios, codigos


def _alta_en_portal(activa=True):
    cuenta = User(email=CORREO, nombre='Persona', role='usuario',
                  auth_source='sso', is_active=activa)
    db.session.add(cuenta)
    db.session.commit()


@pytest.mark.parametrize('identificador', [UID, CORREO])
def test_con_alta_en_portal_restablece_en_ldap(app, solo_en_ldap,
                                               identificador):
    cambios, codigos = solo_en_ldap
    _alta_en_portal()
    with app.test_request_context():
        desafio = solicitar_codigo_mfa(identificador)['challenge_token']
        assert desafio  # se envió el código al `mail` de LDAP
        verificar_codigo_mfa_paso2(identificador, codigos[CORREO], desafio)
        resultado = restablecer_directo_mfa(identificador, NUEVA,
                                            codigos[CORREO], desafio)

    assert resultado['status'] == 'success'
    assert cambios == [(DN, NUEVA)]


@pytest.mark.parametrize('identificador', [UID, CORREO])
def test_solo_en_ldap_no_recibe_codigo(app, solo_en_ldap, identificador):
    _, codigos = solo_en_ldap
    with app.test_request_context():
        respuesta = solicitar_codigo_mfa(identificador)

    assert respuesta['status'] == 'success'  # misma respuesta: sin enumeración
    assert respuesta['challenge_token'] == ''
    assert codigos == {}


@pytest.mark.parametrize('activa', [None, False])
def test_sin_alta_o_inactiva_no_cambia_nada(app, solo_en_ldap, monkeypatch,
                                             activa):
    """Aunque pasara el MFA (simulado), no se toca LDAP."""
    cambios, _ = solo_en_ldap
    if activa is not None:
        _alta_en_portal(activa=activa)
    monkeypatch.setattr(autoservicio, 'validar_desafio_mfa',
                        lambda *a, **k: None)
    with app.test_request_context():
        with pytest.raises(ErrorAutoservicio) as directo:
            restablecer_directo_mfa(UID, NUEVA, '123456')
        token = generar_token_recuperacion(CORREO)
        with pytest.raises(ErrorAutoservicio) as enlace:
            restablecer_con_token(CORREO, token, NUEVA)
        with pytest.raises(ErrorAutoservicio) as cambio:
            cambiar_contrasena(UID, ANTERIOR, NUEVA)

    for error in (directo, enlace, cambio):
        assert error.value.codigo_http == 403
        assert error.value.mensaje == MENSAJE_SIN_ALTA
    assert cambios == []


def test_solo_en_ldap_no_recibe_enlace(app, solo_en_ldap, monkeypatch):
    generados = []
    monkeypatch.setattr(autoservicio, 'generar_token_recuperacion',
                        lambda correo: generados.append(correo) or 'x')
    with app.test_request_context():
        respuesta = solicitar_recuperacion(CORREO)

    assert respuesta['status'] == 'success'  # misma respuesta
    assert generados == []
