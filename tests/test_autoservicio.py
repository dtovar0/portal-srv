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
    restablecer_directo_mfa,
    verificar_codigo_mfa_paso2,
    tiempo_expiracion_mfa,
    _obtener_serializador,
    _hash_codigo,
    SALT_MFA,
    resolver_smtp_autoservicio,
    _enviar_correo_mfa,
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


def test_restablecer_directo_mfa_exitoso(app, monkeypatch):
    """Verifica que un usuario con clave caducada/olvidada pueda restablecerla directamente con MFA."""
    with app.test_request_context():
        u = User.query.filter_by(email="caducado_mfa@vivaro.com").first()
        if not u:
            u = User(email="caducado_mfa@vivaro.com", nombre="Usuario Clave Caducada", role="usuario")
            u.set_password("OldPassword123456!")
            db.session.add(u)
            db.session.commit()

        monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
        monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'authenticator')

        # Derivar código TOTP válido
        import time, base64, hmac, hashlib, struct
        from app.modules.auth.autoservicio import _secret_totp_usuario
        secret = _secret_totp_usuario("caducado_mfa@vivaro.com")
        key = base64.b32decode(secret.upper(), casefold=True)
        ahora = int(time.time() // 30)
        msg = struct.pack('>Q', ahora)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        o = digest[19] & 0x0f
        val = (struct.unpack('>I', digest[o:o+4])[0] & 0x7fffffff) % 1000000
        codigo_valido = f"{val:06d}"

        # 1. Con código erróneo falla
        with pytest.raises(ErrorAutoservicio) as exc:
            restablecer_directo_mfa("caducado_mfa@vivaro.com", "NuevaClaveSegura2026!", "000000")
        assert "mfa" in str(exc.value).lower() or "código" in str(exc.value).lower()

        # 2. Con código correcto tiene éxito
        res = restablecer_directo_mfa("caducado_mfa@vivaro.com", "NuevaClaveSegura2026!", codigo_valido)
        assert res["status"] == "success"

        # Verificar que la contraseña cambió
        u_actualizado = User.query.filter_by(email="caducado_mfa@vivaro.com").first()
        assert u_actualizado.check_password("NuevaClaveSegura2026!") is True

        # Verificar auditoría
        log = AuditLog.query.filter_by(action="AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO (MFA)",
                                       target="caducado_mfa@vivaro.com").order_by(AuditLog.id.desc()).first()
        assert log is not None
        assert log.status == "success"
        assert log.module == "Autoservicio"


def test_endpoint_restablecer_mfa(cliente, monkeypatch):
    """Verifica la API POST /api/v1/auth/autoservicio/restablecer-mfa."""
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'authenticator')

    # Código inválido
    resp = cliente.post('/api/v1/auth/autoservicio/restablecer-mfa', json={
        "identifier": "usuario_prueba@vivaro.com",
        "new_password": "NuevaContrasenaSegura2026!",
        "mfa_code": "999999"
    })
    assert resp.status_code == 401


def test_verificar_codigo_mfa_paso2_exito_y_fallo(app, monkeypatch):
    """Verifica la función de validación intermedia de MFA para el paso 2 del asistente."""
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'authenticator')

    with app.app_context():
        # Faltan datos
        with pytest.raises(ErrorAutoservicio) as exc:
            verificar_codigo_mfa_paso2("", "123456")
        assert "usuario o correo" in str(exc.value).lower()

        with pytest.raises(ErrorAutoservicio) as exc:
            verificar_codigo_mfa_paso2("usuario@vivaro.com", "")
        assert "código" in str(exc.value).lower()

        # Código TOTP válido
        secret = _secret_totp_usuario("stepper_user@vivaro.com")
        key = base64.b32decode(secret.upper(), casefold=True)
        ahora = int(time.time() // 30)
        msg = struct.pack('>Q', ahora)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        o = digest[19] & 0x0f
        val = (struct.unpack('>I', digest[o:o+4])[0] & 0x7fffffff) % 1000000
        codigo_valido = f"{val:06d}"

        res = verificar_codigo_mfa_paso2("stepper_user@vivaro.com", codigo_valido)
        assert res["status"] == "success"


def test_endpoint_autoservicio_mfa_verificar(cliente, monkeypatch):
    """Verifica el endpoint POST /api/v1/auth/autoservicio/mfa/verificar."""
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'authenticator')

    # Código incorrecto retorna 401
    resp = cliente.post('/api/v1/auth/autoservicio/mfa/verificar', json={
        "identificador": "operador_test@vivaro.com",
        "mfa_code": "000000"
    })
    assert resp.status_code == 401


def test_tiempo_expiracion_mfa_configurable(monkeypatch):
    """Verifica que el tiempo de vida (TTL) sea por defecto 10 minutos (600s) y configurable por .env."""
    monkeypatch.delenv('AUTOSERVICIO_MFA_TTL_MINUTOS', raising=False)
    monkeypatch.delenv('AUTOSERVICIO_MFA_EXPIRACION_MINUTOS', raising=False)
    monkeypatch.delenv('AUTOSERVICIO_MFA_TTL_SEGUNDOS', raising=False)
    monkeypatch.delenv('AUTOSERVICIO_MFA_EXPIRACION_SEGUNDOS', raising=False)
    assert tiempo_expiracion_mfa() == 600

    # Configuración por minutos
    monkeypatch.setenv('AUTOSERVICIO_MFA_TTL_MINUTOS', '5')
    assert tiempo_expiracion_mfa() == 300

    # Configuración por segundos
    monkeypatch.delenv('AUTOSERVICIO_MFA_TTL_MINUTOS', raising=False)
    monkeypatch.setenv('AUTOSERVICIO_MFA_EXPIRACION_SEGUNDOS', '120')
    assert tiempo_expiracion_mfa() == 120


def test_mfa_codigo_expirado_falla(app, monkeypatch):
    """Verifica que un código MFA de 6 dígitos que superó su tiempo de vida sea rechazado."""
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'email')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TTL_MINUTOS', '10')

    with app.app_context():
        s = _obtener_serializador()
        codigo = "123456"
        token = s.dumps({
            'email': 'usuario_expira@vivaro.com',
            'code_hash': _hash_codigo(codigo),
            'ts': time.time(),
        }, salt=SALT_MFA)

        # Simular avance en el tiempo más allá del TTL de 10 minutos (600s)
        tiempo_futuro = time.time() + 700
        monkeypatch.setattr(time, 'time', lambda: tiempo_futuro)

        with pytest.raises(ErrorAutoservicio) as exc:
            validar_desafio_mfa('usuario_expira@vivaro.com', codigo, challenge_token=token)
        assert "expirado" in str(exc.value).lower()
        assert exc.value.codigo_http == 401


def test_resolver_smtp_dedicado_autoservicio(monkeypatch):
    """Verifica la prioridad de AUTOSERVICIO_SMTP_* sobre la configuración global."""
    monkeypatch.setenv('AUTOSERVICIO_SMTP_SERVER', 'smtp.authelia.local')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_PORT', '2525')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_USER', 'authelia_user')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_PASSWORD', 'secret_authelia')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_ENCRYPTION', 'ssl')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_SENDER_EMAIL', 'seguridad@vivaro.com')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_SENDER_NAME', 'Authelia Security')

    cfg = resolver_smtp_autoservicio()
    assert cfg is not None
    assert cfg['server'] == 'smtp.authelia.local'
    assert cfg['port'] == 2525
    assert cfg['username'] == 'authelia_user'
    assert cfg['password'] == 'secret_authelia'
    assert cfg['encryption'] == 'ssl'
    assert cfg['sender_email'] == 'seguridad@vivaro.com'
    assert cfg['sender_name'] == 'Authelia Security'
    assert cfg['source'] == 'env_autoservicio'


def test_resolver_smtp_fallback_global(app, monkeypatch):
    """Verifica que sin AUTOSERVICIO_SMTP_SERVER se utilice la configuración global de Aduana."""
    monkeypatch.delenv('AUTOSERVICIO_SMTP_SERVER', raising=False)
    monkeypatch.setenv('SMTP_SERVER', 'smtp.global.local')
    monkeypatch.setenv('SMTP_PORT', '587')
    monkeypatch.setenv('SMTP_USER', 'global_user')
    monkeypatch.setenv('SMTP_PASSWORD', 'global_pass')
    monkeypatch.setenv('SMTP_FORCE_ENV', 'true')

    with app.app_context():
        cfg = resolver_smtp_autoservicio()
        assert cfg is not None
        assert cfg['server'] == 'smtp.global.local'
        assert cfg['port'] == 587
        assert cfg['username'] == 'global_user'


def test_enviar_correo_mfa_sin_smtp_retorna_error(monkeypatch):
    """Verifica que sin servidor SMTP configurado retorne False y mensaje explicativo."""
    monkeypatch.delenv('AUTOSERVICIO_SMTP_SERVER', raising=False)
    monkeypatch.delenv('SMTP_SERVER', raising=False)
    monkeypatch.setattr('app.modules.auth.autoservicio.resolver_smtp_autoservicio', lambda: None)

    exito, error_msg = _enviar_correo_mfa('test@vivaro.com', '123456')
    assert exito is False
    assert 'No hay un servidor de correo (SMTP) configurado' in error_msg


def test_enviar_correo_mfa_cabeceras_rfc_y_html(monkeypatch):
    """Verifica que el correo incluya Sender explícito, From RFC 2047 y contenido HTML."""
    monkeypatch.setenv('AUTOSERVICIO_SMTP_SERVER', 'smtp.test.local')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_SENDER_NAME', 'Authelia • Autoservicio de Identidad')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_SENDER_EMAIL', 'authelia@vivaro.com')
    monkeypatch.setenv('AUTOSERVICIO_SMTP_ENCRYPTION', 'none')

    mensajes_enviados = []

    class MockSMTP:
        def __init__(self, *args, **kwargs):
            pass
        def starttls(self):
            pass
        def login(self, u, p):
            pass
        def send_message(self, msg, from_addr=None):
            mensajes_enviados.append((msg, from_addr))
        def quit(self):
            pass

    monkeypatch.setattr('smtplib.SMTP', MockSMTP)

    exito, err = _enviar_correo_mfa('operador@vivaro.com', '654321', nombre='Domingo Tovar')
    assert exito is True
    assert err is None
    assert len(mensajes_enviados) == 1

    msg, from_addr = mensajes_enviados[0]
    assert from_addr == 'authelia@vivaro.com'
    assert msg['Sender'] == 'authelia@vivaro.com'
    assert 'authelia@vivaro.com' in msg['From']
    assert msg['To'] == 'operador@vivaro.com'
    assert msg.is_multipart()

    # Verificar que contiene tanto texto como HTML
    payloads = msg.get_payload()
    assert len(payloads) == 2
    part_plain = payloads[0].get_payload(decode=True).decode('utf-8')
    part_html = payloads[1].get_payload(decode=True).decode('utf-8')
    assert '654321' in part_plain
    assert '654321' in part_html
    assert 'Authelia' in part_html
    assert 'Domingo Tovar' in part_html


def test_resultado_escritura_propiedades():
    from app.modules.directory.errors import Resultado, ResultadoEscritura
    res_ok = ResultadoEscritura(Resultado.HECHO, "uid=test,ou=users,dc=com")
    assert res_ok.exito is True
    assert res_ok.exitoso is True

    res_err = ResultadoEscritura(Resultado.ERROR_PERMANENTE, "uid=test,ou=users,dc=com", motivo="error")
    assert res_err.exito is False
    assert res_err.exitoso is False


def test_usuario_directorio_propiedades():
    from app.modules.directory.ldap_client import UsuarioDirectorio
    u = UsuarioDirectorio(
        dn="uid=dtovar,ou=People,dc=vivaro,dc=com",
        identificador="dtovar",
        atributos={"mail": "dtovar@vivaro.com", "cn": "Domingo Tovar", "displayName": "Domingo A. Tovar"}
    )
    assert u.nombre == "Domingo Tovar"
    assert u.correo == "dtovar@vivaro.com"

    u_sin_perfil = UsuarioDirectorio(
        dn="uid=sin_perfil,ou=People,dc=vivaro,dc=com",
        identificador="sin_perfil"
    )
    assert u_sin_perfil.nombre == "sin_perfil"
    assert u_sin_perfil.correo == ""


def test_restablecer_directo_mfa_ldap_exitoso(app, monkeypatch):
    """Verifica que restablecer_directo_mfa invoque correctamente al escritor LDAP y no falle con AttributeError."""
    from app.modules.directory.errors import Resultado, ResultadoEscritura
    from app.modules.directory.ldap_client import UsuarioDirectorio

    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'authenticator')

    with app.test_request_context():
        u = User.query.filter_by(email="dtovar@vivaro.com").first()
        if not u:
            u = User(email="dtovar@vivaro.com", nombre="Domingo Tovar", role="usuario")
            u.set_password("ClaveVieja12345678!")
            db.session.add(u)
            db.session.commit()

        secret = _secret_totp_usuario("dtovar@vivaro.com")
        key = base64.b32decode(secret.upper(), casefold=True)
        ahora = int(time.time() // 30)
        msg = struct.pack('>Q', ahora)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        o = digest[19] & 0x0f
        val = (struct.unpack('>I', digest[o:o+4])[0] & 0x7fffffff) % 1000000
        codigo_valido = f"{val:06d}"

        # Mock LDAP activo
        monkeypatch.setattr('app.modules.auth.autoservicio.directorio_activo', lambda: True)

        persona_ldap = UsuarioDirectorio(
            dn="uid=dtovar,ou=People,dc=vivaro,dc=com",
            identificador="dtovar",
            atributos={"mail": "dtovar@vivaro.com", "cn": "Domingo Tovar"}
        )

        class ClienteFalso:
            def buscar_por_correo(self, correo):
                return persona_ldap if correo == "dtovar@vivaro.com" else None
            def buscar_usuario(self, uid):
                return persona_ldap if uid == "dtovar" else None

        llamadas_cambio = []

        class EscritorFalso:
            def __init__(self, cliente=None):
                pass
            def change_password(self, dn, nueva_clave):
                llamadas_cambio.append((dn, nueva_clave))
                return ResultadoEscritura(Resultado.HECHO, dn)

        monkeypatch.setattr('app.modules.auth.autoservicio.ClienteDirectorio', ClienteFalso)
        monkeypatch.setattr('app.modules.auth.autoservicio.EscritorDirectorio', EscritorFalso)

        res = restablecer_directo_mfa("dtovar@vivaro.com", "NuevaClaveSuperSegura2026!", codigo_valido)
        assert res["status"] == "success"
        assert len(llamadas_cambio) == 1
        assert llamadas_cambio[0][0] == "uid=dtovar,ou=People,dc=vivaro,dc=com"
        assert llamadas_cambio[0][1] == "NuevaClaveSuperSegura2026!"

        # El usuario local también se sincronizó
        u_actualizado = User.query.filter_by(email="dtovar@vivaro.com").first()
        assert u_actualizado.check_password("NuevaClaveSuperSegura2026!") is True


def test_restablecer_directo_mfa_ldap_rechazo_no_silencia(app, monkeypatch):
    """Verifica que si LDAP rechaza la contraseña, se lance ErrorAutoservicio y no se reporte éxito."""
    from app.modules.directory.errors import Resultado, ResultadoEscritura
    from app.modules.directory.ldap_client import UsuarioDirectorio

    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'authenticator')

    with app.test_request_context():
        u = User.query.filter_by(email="rechazo_ldap@vivaro.com").first()
        if not u:
            u = User(email="rechazo_ldap@vivaro.com", nombre="Rechazo LDAP", role="usuario")
            u.set_password("ClaveVieja12345678!")
            db.session.add(u)
            db.session.commit()

        secret = _secret_totp_usuario("rechazo_ldap@vivaro.com")
        key = base64.b32decode(secret.upper(), casefold=True)
        ahora = int(time.time() // 30)
        msg = struct.pack('>Q', ahora)
        digest = hmac.new(key, msg, hashlib.sha1).digest()
        o = digest[19] & 0x0f
        val = (struct.unpack('>I', digest[o:o+4])[0] & 0x7fffffff) % 1000000
        codigo_valido = f"{val:06d}"

        monkeypatch.setattr('app.modules.auth.autoservicio.directorio_activo', lambda: True)

        persona_ldap = UsuarioDirectorio(
            dn="uid=rechazo_ldap,ou=People,dc=vivaro,dc=com",
            identificador="rechazo_ldap",
            atributos={"mail": "rechazo_ldap@vivaro.com", "cn": "Rechazo LDAP"}
        )

        class ClienteFalso:
            def buscar_por_correo(self, correo):
                return persona_ldap
            def buscar_usuario(self, uid):
                return persona_ldap

        class EscritorFalso:
            def __init__(self, cliente=None):
                pass
            def change_password(self, dn, nueva_clave):
                return ResultadoEscritura(Resultado.ERROR_PERMANENTE, dn, motivo="contrasena_rechazada")

        monkeypatch.setattr('app.modules.auth.autoservicio.ClienteDirectorio', ClienteFalso)
        monkeypatch.setattr('app.modules.auth.autoservicio.EscritorDirectorio', EscritorFalso)

        with pytest.raises(ErrorAutoservicio) as exc:
            restablecer_directo_mfa("rechazo_ldap@vivaro.com", "NuevaClaveRechazada2026!", codigo_valido)
        assert exc.value.codigo_http == 500
        assert "directorio" in str(exc.value).lower()

        # Comprobar que en BD local no se cambió a la clave rechazada
        u_check = User.query.filter_by(email="rechazo_ldap@vivaro.com").first()
        assert u_check.check_password("NuevaClaveRechazada2026!") is False





