"""Segundo factor y tokens firmados del autoservicio (FNC-174).

- Token firmado de recuperación (enlace por correo).
- Código MFA de 6 dígitos por correo (desafío firmado) y TOTP (RFC 6238).
- La contraseña, el código y el token nunca se escriben en logs.
"""
import base64
import hashlib
import hmac
import logging
import secrets
import struct
import time

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.modules.audit.services import add_audit_log
from app.modules.auth.autoservicio_config import (LOGGER_AUTOSERVICIO,
                                                  TOKEN_MAX_AGE_SEGUNDOS,
                                                  clave_secreta, mfa_habilitado,
                                                  tiempo_expiracion_mfa, tipo_mfa)
from app.modules.auth.autoservicio_correo import enviar_correo_mfa
from app.modules.auth.autoservicio_cuentas import cuenta_del_portal
from app.modules.auth.autoservicio_errores import ErrorAutoservicio
from app.modules.auth.limite_intentos import bloqueado
from app.modules.directory.configuracion import directorio_activo
from app.modules.directory.ldap_client import ClienteDirectorio

logger = logging.getLogger(f'{LOGGER_AUTOSERVICIO}.mfa')

SALT_RECUPERACION = 'autoservicio-recuperacion-v1'
SALT_MFA = 'autoservicio-mfa-challenge-v1'
LONGITUD_CODIGO = 6
TOTP_PERIODO_SEGUNDOS = 30
TOTP_VENTANA = (-1, 0, 1)  # -30s, 0, +30s
TOTP_BYTES_SECRETO = 20  # 160 bits


def _obtener_serializador():
    return URLSafeTimedSerializer(clave_secreta())


def generar_token_recuperacion(correo):
    """Genera un token seguro con firma HMAC y marca de tiempo."""
    s = _obtener_serializador()
    return s.dumps({'email': correo.strip().lower()}, salt=SALT_RECUPERACION)


def verificar_token_recuperacion(token):
    """Verifica la firma y expiración del token. Retorna el correo o lanza ErrorAutoservicio."""
    s = _obtener_serializador()
    try:
        data = s.loads(token, salt=SALT_RECUPERACION, max_age=TOKEN_MAX_AGE_SEGUNDOS)
        return data.get('email')
    except SignatureExpired:
        raise ErrorAutoservicio('El enlace de recuperación ha expirado. Solicita uno nuevo.', 400)
    except (BadSignature, Exception):
        raise ErrorAutoservicio('El enlace de recuperación es inválido o está dañado.', 400)


def _hash_codigo(codigo):
    return hashlib.sha256(codigo.strip().encode('utf-8')).hexdigest()


def correo_de_la_cuenta(identificador):
    """`(correo, nombre)` de la cuenta de `identificador` (LDAP primero, luego
    el portal), o `(None, None)`. El código MFA se envía a ese correo y el
    desafío solo vale para él (FNC-175)."""
    correo = None
    nombre = None
    if directorio_activo():
        try:
            cliente = ClienteDirectorio()
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_usuario(identificador)
            if not persona and '@' in identificador:
                # Si no se encontró por correo exacto, intentar por uid extrayendo la parte de usuario
                persona = cliente.buscar_usuario(identificador.split('@')[0])
            if persona:
                correo = persona.correo or (identificador if '@' in identificador else None)
                nombre = persona.nombre
        except Exception as exc:
            logger.warning("Autoservicio MFA: Error al consultar LDAP (%s)", type(exc).__name__)
    if not correo:
        user = cuenta_del_portal(identificador)
        if user:
            correo = user.email
            nombre = user.nombre or user.email
    return (correo.lower() if correo else None), nombre


def solicitar_codigo_mfa(identificador):
    """Genera y envía un código de 6 dígitos al correo del usuario y retorna un challenge_token."""
    identificador = (identificador or '').strip()
    if not identificador:
        raise ErrorAutoservicio('Indica tu usuario o correo corporativo.', 400)

    if bloqueado(identificador):
        raise ErrorAutoservicio('Has superado el límite de intentos. Espera unos minutos.', 429)

    correo, nombre = correo_de_la_cuenta(identificador)

    # Si no se encontró, responder como si se enviara (anti-enumeración)
    if not correo:
        logger.info("Autoservicio MFA: Identificador '%s' no encontrado en LDAP ni en BD local", identificador)
        return {
            'status': 'success',
            'message': 'Si la cuenta existe en Authelia, recibirás un código de 6 dígitos.',
            'challenge_token': '',
        }

    # Generar código de 6 dígitos
    codigo_6 = f"{secrets.randbelow(10 ** LONGITUD_CODIGO):0{LONGITUD_CODIGO}d}"
    s = _obtener_serializador()
    challenge_token = s.dumps({
        'email': correo.lower(),
        'code_hash': _hash_codigo(codigo_6),
        'ts': time.time(),
    }, salt=SALT_MFA)

    res_envio = enviar_correo_mfa(correo, codigo_6, nombre=nombre)
    if isinstance(res_envio, tuple):
        exito_envio, error_envio = res_envio
    else:
        exito_envio, error_envio = bool(res_envio), "Fallo desconocido al enviar correo"

    if not exito_envio:
        from flask import current_app
        if not current_app.config.get('TESTING'):
            logger.error("Autoservicio MFA: No se pudo enviar el código de seguridad a %s", correo)
            raise ErrorAutoservicio(error_envio, 503)

    add_audit_log('AUTOSERVICIO: CODIGO MFA ENVIADO', status='info', target=correo,
                  detail='Código de verificación enviado por correo')

    # Ofuscar correo para respuesta amigable (ej. j***e@vivaro.com)
    partes = correo.split('@')
    enmascarado = partes[0][:1] + '***' + partes[0][-1:] + '@' + partes[1] if len(partes[0]) > 2 else correo

    return {
        'status': 'success',
        'message': f'Se ha enviado un código de seguridad de 6 dígitos a {enmascarado}.',
        'challenge_token': challenge_token,
    }


def _secret_totp_usuario(identificador):
    """Deriva un secreto TOTP estándar de 160 bits (base32) por usuario."""
    secret_key = clave_secreta().encode('utf-8')
    digest = hmac.new(secret_key, identificador.strip().lower().encode('utf-8'), hashlib.sha256).digest()
    return base64.b32encode(digest[:TOTP_BYTES_SECRETO]).decode('ascii')


def verificar_codigo_totp(identificador, codigo_totp):
    """Valida un código de 6 dígitos generado por Authenticator (RFC 6238)."""
    if not codigo_totp or len(codigo_totp.strip()) != LONGITUD_CODIGO:
        return False
    codigo = codigo_totp.strip()
    secret = _secret_totp_usuario(identificador)
    try:
        key = base64.b32decode(secret.upper(), casefold=True)
        ahora = int(time.time() // TOTP_PERIODO_SEGUNDOS)
        for offset in TOTP_VENTANA:
            msg = struct.pack('>Q', ahora + offset)
            digest = hmac.new(key, msg, hashlib.sha1).digest()
            o = digest[19] & 0x0f
            valor = (struct.unpack('>I', digest[o:o+4])[0] & 0x7fffffff) % 10 ** LONGITUD_CODIGO
            if hmac.compare_digest(f"{valor:0{LONGITUD_CODIGO}d}", codigo):
                return True
        return False
    except Exception:
        return False


def validar_desafio_mfa(identificador, mfa_code, challenge_token=None):
    """Verifica el segundo factor si está activado en el entorno."""
    if not mfa_habilitado():
        return True

    mfa_code = (mfa_code or '').strip()
    if not mfa_code:
        raise ErrorAutoservicio('Se requiere el código de verificación de 6 dígitos (MFA).', 400)

    tipo = tipo_mfa()

    # 1. Verificación por Email
    if tipo in ('email', 'ambos') and challenge_token:
        s = _obtener_serializador()
        try:
            data = s.loads(challenge_token, salt=SALT_MFA, max_age=tiempo_expiracion_mfa())
            # FNC-175: el desafío solo vale para la cuenta a la que se envió el
            # código; con el de otra cuenta, mismo error (sin enumeración).
            correo_cuenta, _ = correo_de_la_cuenta((identificador or '').strip())
            mismo_codigo = hmac.compare_digest(str(data.get('code_hash') or ''),
                                               _hash_codigo(mfa_code))
            misma_cuenta = bool(correo_cuenta) and hmac.compare_digest(
                str(data.get('email') or '').lower(), correo_cuenta)
            if mismo_codigo and misma_cuenta:
                return True
            raise ErrorAutoservicio('Código de verificación de correo incorrecto.', 401)
        except SignatureExpired:
            raise ErrorAutoservicio('El código de verificación ha expirado. Solicita uno nuevo.', 401)
        except ErrorAutoservicio:
            raise
        except Exception:
            raise ErrorAutoservicio('Token de verificación inválido.', 400)

    # 2. Verificación por Authenticator (TOTP)
    if tipo in ('authenticator', 'ambos'):
        if verificar_codigo_totp(identificador, mfa_code):
            return True
        if tipo == 'authenticator':
            raise ErrorAutoservicio('Código de Authenticator inválido o desfasado.', 401)

    raise ErrorAutoservicio('No se pudo verificar el código de segundo factor.', 401)


def verificar_codigo_mfa_paso2(identificador, mfa_code, challenge_token=None):
    """Valida el código de segundo factor en el paso 2 del asistente."""
    identificador = (identificador or '').strip()
    mfa_code = (mfa_code or '').strip()
    if not identificador:
        raise ErrorAutoservicio('Indica tu usuario o correo corporativo.', 400)
    if not mfa_code:
        raise ErrorAutoservicio('Ingresa el código numérico de 6 dígitos.', 400)
    validar_desafio_mfa(identificador, mfa_code, challenge_token)
    return {
        'status': 'success',
        'message': 'Código de seguridad verificado correctamente.'
    }
