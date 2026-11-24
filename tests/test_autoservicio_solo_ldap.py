"""Autoservicio con una persona que existe SOLO en LDAP (sin fila en `users`
del portal): el código MFA, el paso 2 y el restablecimiento funcionan y
cambian la contraseña en LDAP (pregunta del dueño, 2026-11-24)."""
import pytest

from app.modules.auth import autoservicio, autoservicio_mfa
from app.modules.auth.autoservicio import (restablecer_directo_mfa,
                                           solicitar_codigo_mfa,
                                           verificar_codigo_mfa_paso2)
from app.modules.auth.models import User
from app.modules.directory.errors import Resultado, ResultadoEscritura
from app.modules.directory.ldap_client import UsuarioDirectorio

UID = 'lacid'
CORREO = 'lacid@vivaro.com'
DN = f'uid={UID},ou=users,dc=vivaro,dc=local'
NUEVA = 'Nueva-Clave-De-Prueba-26!x'  # ficticia; cumple la política


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


@pytest.mark.parametrize('identificador', [UID, CORREO])
def test_solo_ldap_restablece_en_ldap(app, solo_en_ldap, identificador):
    cambios, codigos = solo_en_ldap
    with app.test_request_context():
        desafio = solicitar_codigo_mfa(identificador)['challenge_token']
        assert desafio  # se envió el código al `mail` de LDAP
        verificar_codigo_mfa_paso2(identificador, codigos[CORREO], desafio)
        resultado = restablecer_directo_mfa(identificador, NUEVA,
                                            codigos[CORREO], desafio)

    assert resultado['status'] == 'success'
    assert cambios == [(DN, NUEVA)]
    assert User.query.filter_by(email=CORREO).first() is None  # no se crea
