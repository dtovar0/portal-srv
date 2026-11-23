"""Pruebas unitarias para el módulo de Autoservicio de Contraseña (Aduana)."""
import base64
import hashlib
import hmac
import struct
import time
import pytest
from app import create_app, db
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog
from app.modules.auth.autoservicio import (
    generar_token_recuperacion,
    verificar_token_recuperacion,
    obtener_politica_contrasena,
    obtener_configuracion_autoservicio,
    solicitar_codigo_mfa,
    validar_desafio_mfa,
    verificar_codigo_totp,
    _secret_totp_usuario,
    ErrorAutoservicio,
    cambiar_contrasena,
    restablecer_con_token,
)


@pytest.fixture
def cliente(client):
    return client


def test_token_recuperacion_ciclo_completo(app):
    with app.app_context():
        correo = "operador@vivaro.com"
        token = generar_token_recuperacion(correo)
        assert isinstance(token, str) and len(token) > 10

        correo_verificado = verificar_token_recuperacion(token)
        assert correo_verificado == correo


def test_token_recuperacion_invalido(app):
    with app.app_context():
        with pytest.raises(ErrorAutoservicio) as exc:
            verificar_token_recuperacion("token-invalido-o-manipulado")
        assert "inválido" in str(exc.value).lower() or "expirado" in str(exc.value).lower()


def test_obtener_politica_contrasena():
    pol = obtener_politica_contrasena()
    assert "min_length" in pol
    assert pol["min_length"] >= 16
    assert "required_classes" in pol
    assert "symbols" in pol


def test_endpoint_politica_contrasena(cliente):
    resp = cliente.get('/api/v1/auth/autoservicio/politica')
    assert resp.status_code == 200
    datos = resp.get_json()
    assert datos["min_length"] >= 16


def test_solicitar_recuperacion_correo_invalido(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/solicitar-recuperacion', json={
        "email": "correo-no-valido"
    })
    assert resp.status_code == 400


def test_solicitar_recuperacion_respuesta_segura(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/solicitar-recuperacion', json={
        "email": "noexiste@vivaro.com"
    })
    assert resp.status_code == 200
    datos = resp.get_json()
    assert datos["status"] == "success"


def test_cambiar_contrasena_datos_incompletos(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/cambiar', json={
        "identificador": "user",
        "current_password": "",
        "new_password": "123"
    })
    assert resp.status_code == 400


def test_cambiar_contrasena_nueva_no_cumple_politica(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/cambiar', json={
        "identificador": "user",
        "current_password": "CurrentPassword123!",
        "new_password": "corta"
    })
    assert resp.status_code == 400


def test_restablecer_token_invalido(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/restablecer', json={
        "email": "user@vivaro.com",
        "token": "token-falso",
        "new_password": "NuevaContrasenaSegura2026!"
    })
    assert resp.status_code == 400


def test_autoservicio_configuracion_endpoint(cliente):
    """Verifica el endpoint de configuración pública con identidad Authelia."""
    resp = cliente.get('/api/v1/auth/autoservicio/configuracion')
    assert resp.status_code == 200
    datos = resp.get_json()
    assert datos["status"] == "success"
    assert datos["brand_name"] == "Authelia"
    assert "mfa_enabled" in datos
    assert datos["mfa_tipo"] in ("email", "authenticator", "ambos")
    assert "politica" in datos
    assert datos["politica"]["min_length"] >= 16


def test_solicitar_mfa_anti_enumeracion(cliente):
    """Verifica que solicitar MFA para usuario inexistente responda sin filtrar la cuenta."""
    resp = cliente.post('/api/v1/auth/autoservicio/mfa/solicitar', json={
        "identificador": "usuario_inexistente_12345"
    })
    assert resp.status_code == 200
    datos = resp.get_json()
    assert datos["status"] == "success"
    assert "Authelia" in datos["message"]


def test_solicitar_mfa_usuario_existente_y_validacion(app, monkeypatch):
    """Verifica la generación y validación de código de 6 dígitos por correo."""
    with app.test_request_context():
        u = User.query.filter_by(email="test_mfa@vivaro.com").first()
        if not u:
            u = User(email="test_mfa@vivaro.com", nombre="Usuario MFA Test", role="usuario")
            u.set_password("ContrasenaSeguraPrevia2026!")
            db.session.add(u)
            db.session.commit()

        codigos_enviados = []

        def mock_enviar(dest, codigo, nombre=None):
            codigos_enviados.append(codigo)
            return True

        monkeypatch.setattr('app.modules.auth.autoservicio._enviar_correo_mfa', mock_enviar)
        monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
        monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'email')

        resultado = solicitar_codigo_mfa("test_mfa@vivaro.com")
        assert resultado["status"] == "success"
        assert resultado["challenge_token"] != ""
        assert len(codigos_enviados) == 1
        codigo_enviado = codigos_enviados[0]
        assert len(codigo_enviado) == 6 and codigo_enviado.isdigit()

        # Validación con código correcto
        valido = validar_desafio_mfa("test_mfa@vivaro.com", codigo_enviado, resultado["challenge_token"])
        assert valido is True

        # Validación con código erróneo
        with pytest.raises(ErrorAutoservicio) as exc:
            validar_desafio_mfa("test_mfa@vivaro.com", "999999", resultado["challenge_token"])
        assert "incorrecto" in str(exc.value).lower()


def test_verificar_totp_rfc6238(app):
    """Verifica el cálculo de TOTP estándar RFC 6238."""
    with app.app_context():
        identificador = "operador_totp@vivaro.com"
        secret = _secret_totp_usuario(identificador)
        key = base64.b32decode(secret.upper(), casefold=True)
        ahora = int(time.time() // 30)
        msg = struct.pack('>Q', ahora)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        o = digest[19] & 0x0f
        valor = (struct.unpack('>I', digest[o:o+4])[0] & 0x7fffffff) % 1000000
        codigo_valido = f"{valor:06d}"

        # Código correcto
        assert verificar_codigo_totp(identificador, codigo_valido) is True

        # Código incorrecto
        codigo_falso = f"{(valor + 12345) % 1000000:06d}"
        assert verificar_codigo_totp(identificador, codigo_falso) is False


def test_cambiar_contrasena_exige_mfa_cuando_esta_habilitado(app, monkeypatch):
    """Verifica que cambiar_contrasena exija validación MFA si AUTOSERVICIO_MFA_ENABLED=true."""
    with app.test_request_context():
        u = User.query.filter_by(email="user_mfa_req@vivaro.com").first()
        if not u:
            u = User(email="user_mfa_req@vivaro.com", nombre="Usuario Req MFA", role="usuario")
            u.set_password("OldPasswordValida2026!")
            db.session.add(u)
            db.session.commit()

        monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
        monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'email')

        with pytest.raises(ErrorAutoservicio) as exc:
            cambiar_contrasena("user_mfa_req", "OldPasswordValida2026!", "NuevaContrasenaSegura2026!", mfa_code=None)
        assert "mfa" in str(exc.value).lower() or "segundo factor" in str(exc.value).lower()


def test_cambiar_contrasena_envia_correo_confirmacion_y_audita(app, monkeypatch):
    """Verifica envío de correo de confirmación y bitácora diferenciada al cambiar contraseña."""
    with app.test_request_context():
        u = User.query.filter_by(email="usuario_confirm@vivaro.com").first()
        if not u:
            u = User(email="usuario_confirm@vivaro.com", nombre="Operador Confirmacion", role="usuario")
            u.set_password("OldPassword12345678!")
            db.session.add(u)
            db.session.commit()

        confirmaciones = []

        def mock_confirmacion(dest, nombre=None):
            confirmaciones.append({'dest': dest, 'nombre': nombre})
            return True

        monkeypatch.setattr('app.modules.auth.autoservicio._enviar_correo_confirmacion_cambio', mock_confirmacion)
        monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'false')

        resultado = cambiar_contrasena("usuario_confirm@vivaro.com", "OldPassword12345678!", "NewPasswordSegura2026!")
        assert resultado["status"] == "success"

        # Verificar envío de correo de confirmación
        assert len(confirmaciones) == 1
        assert confirmaciones[0]['dest'] == "usuario_confirm@vivaro.com"

        # Verificar registro en auditoría con acción específica de autoservicio
        log = AuditLog.query.filter_by(action="AUTOSERVICIO: PASSWORD ACTUALIZADO POR USUARIO",
                                       target="usuario_confirm@vivaro.com").order_by(AuditLog.id.desc()).first()
        assert log is not None
        assert log.status == "success"
        assert log.module == "Autoservicio"


def test_restablecer_contrasena_envia_correo_confirmacion_y_audita(app, monkeypatch):
    """Verifica envío de correo de confirmación y bitácora diferenciada al restablecer con token."""
    with app.test_request_context():
        u = User.query.filter_by(email="usuario_token_audit@vivaro.com").first()
        if not u:
            u = User(email="usuario_token_audit@vivaro.com", nombre="Operador Token", role="usuario")
            u.set_password("OldPassToken123456!")
            db.session.add(u)
            db.session.commit()

        confirmaciones = []

        def mock_confirmacion(dest, nombre=None):
            confirmaciones.append({'dest': dest, 'nombre': nombre})
            return True

        monkeypatch.setattr('app.modules.auth.autoservicio._enviar_correo_confirmacion_cambio', mock_confirmacion)
        monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'false')

        token = generar_token_recuperacion("usuario_token_audit@vivaro.com")
        resultado = restablecer_con_token("usuario_token_audit@vivaro.com", token, "NuevaClaveToken2026!")
        assert resultado["status"] == "success"

        # Verificar envío de correo de confirmación
        assert len(confirmaciones) == 1
        assert confirmaciones[0]['dest'] == "usuario_token_audit@vivaro.com"

        # Verificar registro en auditoría con acción específica de autoservicio
        log = AuditLog.query.filter_by(action="AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO",
                                       target="usuario_token_audit@vivaro.com").order_by(AuditLog.id.desc()).first()
        assert log is not None
        assert log.status == "success"
        assert log.module == "Autoservicio"

