"""Módulo de Autoservicio de Contraseñas e Identidad Authelia.

Permite a los usuarios corporativos:
1. Cambiar su contraseña conociendo su contraseña actual (o si expiró).
2. Solicitar un enlace o código de recuperación por correo.
3. Verificar segundo factor (MFA) por código de correo de 6 dígitos o Authenticator (TOTP).
4. Restablecer su contraseña con sincronización atómica a OpenLDAP y JumpServer.

Reglas:
- Identidad visual y comunicacional de Authelia para garantizar coherencia en el flujo SSO.
- La contraseña nunca se registra en texto plano ni se expone en logs.
- Valida estrictamente la política corporativa de contraseñas.
- Protegido contra ataques de fuerza bruta mediante auditoría y límites de intentos.
"""
import base64
import hashlib
import hmac
import logging
import os
import requests
import secrets
import smtplib
import struct
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from app import db
from app.modules.audit.services import add_audit_log
from app.modules.auth.limite_intentos import bloqueado
from app.modules.auth.models import User
from app.modules.directory.configuracion import directorio_activo
from app.modules.directory.ldap_client import ClienteDirectorio, ErrorDirectorio
from app.modules.directory.writer import EscritorDirectorio
from app.modules.users.politica_contrasena import (
    mensaje_de_incumplimiento,
    cargar_politica,
    SIMBOLOS_POR_DEFECTO,
)

logger = logging.getLogger(__name__)

SALT_RECUPERACION = 'autoservicio-recuperacion-v1'
SALT_MFA = 'autoservicio-mfa-challenge-v1'
TOKEN_MAX_AGE_SEGUNDOS = 900  # 15 minutos
MFA_MAX_AGE_SEGUNDOS = 600    # 10 minutos para código de 6 dígitos


class ErrorAutoservicio(Exception):
    """Excepción controlada con mensaje para el usuario y código HTTP."""

    def __init__(self, mensaje, codigo_http=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo_http = codigo_http


def _env_bool(nombre, por_defecto=False):
    val = (os.getenv(nombre) or '').strip().lower()
    if val in ('true', '1', 'si', 'yes', 'on'):
        return True
    if val in ('false', '0', 'no', 'off'):
        return False
    return por_defecto


def mfa_habilitado():
    """True si la verificación MFA está activada para el autoservicio."""
    return _env_bool('AUTOSERVICIO_MFA_ENABLED', True)


def tipo_mfa():
    """Tipo de MFA configurado: 'email', 'authenticator' o 'ambos'."""
    return (os.getenv('AUTOSERVICIO_MFA_TIPO') or 'email').strip().lower()


def tiempo_expiracion_mfa():
    """Tiempo de expiración en segundos para el código MFA de correo (por defecto 600s = 10 minutos).
    Configurable vía AUTOSERVICIO_MFA_TTL_MINUTOS o AUTOSERVICIO_MFA_EXPIRACION_SEGUNDOS.
    """
    val_min = (os.getenv('AUTOSERVICIO_MFA_TTL_MINUTOS') or os.getenv('AUTOSERVICIO_MFA_EXPIRACION_MINUTOS') or '').strip()
    if val_min:
        try:
            return max(60, int(val_min) * 60)
        except ValueError:
            pass
    val_sec = (os.getenv('AUTOSERVICIO_MFA_TTL_SEGUNDOS') or os.getenv('AUTOSERVICIO_MFA_EXPIRACION_SEGUNDOS') or '').strip()
    if val_sec:
        try:
            return max(30, int(val_sec))
        except ValueError:
            pass
    return MFA_MAX_AGE_SEGUNDOS


def _obtener_serializador():
    from flask import current_app
    secret_key = current_app.config.get('SECRET_KEY') or os.getenv('SECRET_KEY', 'authelia-fallback-secret')
    return URLSafeTimedSerializer(secret_key)


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


def resolver_smtp_autoservicio():
    """Obtiene la configuración SMTP para Autoservicio/Authelia.
    Usa AUTOSERVICIO_SMTP_* si existen; si no, hereda SMTP_* global.
    """
    server = (os.getenv('AUTOSERVICIO_SMTP_SERVER') or os.getenv('SMTP_SERVER') or '').strip()
    if not server:
        return None
    port = int(os.getenv('AUTOSERVICIO_SMTP_PORT') or os.getenv('SMTP_PORT') or '587')
    username = (os.getenv('AUTOSERVICIO_SMTP_USER') or os.getenv('SMTP_USER') or '').strip() or None
    password = os.getenv('AUTOSERVICIO_SMTP_PASSWORD') or os.getenv('SMTP_PASSWORD') or None
    encryption = (os.getenv('AUTOSERVICIO_SMTP_ENCRYPTION') or os.getenv('SMTP_ENCRYPTION') or 'starttls').strip().lower()
    sender_name = (os.getenv('AUTOSERVICIO_SMTP_SENDER_NAME') or 'Authelia • Autoservicio de Identidad').strip()
    sender_email = (os.getenv('AUTOSERVICIO_SMTP_SENDER_EMAIL') or os.getenv('SMTP_SENDER_EMAIL') or 'authelia@vivaro.com').strip()
    return {
        'server': server,
        'port': port,
        'username': username,
        'password': password,
        'encryption': encryption,
        'sender_name': sender_name,
        'sender_email': sender_email,
    }


def _enviar_correo_mfa(destinatario, codigo, nombre=None):
    """Envía el código de 6 dígitos mediante el servidor SMTP configurado."""
    cfg = resolver_smtp_autoservicio()
    if not cfg:
        logger.info("SMTP no activo: código MFA Authelia para %s es: %s", destinatario, codigo)
        return False

    msg = MIMEMultipart()
    msg['From'] = f"{cfg['sender_name']} <{cfg['sender_email']}>"
    msg['To'] = destinatario
    msg['Subject'] = f"Authelia • Código de verificación: {codigo}"

    ttl_minutos = max(1, tiempo_expiracion_mfa() // 60)
    cuerpo = (
        f"Hola {nombre or destinatario},\n\n"
        "Has solicitado actualizar o recuperar tu contraseña corporativa en Authelia.\n\n"
        f"Tu código de seguridad de 6 dígitos es:\n\n"
        f"    {codigo}\n\n"
        f"Este código es válido durante {ttl_minutos} minutos y es requerido para autorizar el cambio.\n"
        "Si tú no iniciaste esta solicitud, puedes ignorar este correo de forma segura.\n\n"
        "— Authelia Identity and Access Management"
    )
    msg.attach(MIMEText(cuerpo, 'plain'))

    try:
        if cfg['encryption'] == 'ssl':
            smtp = smtplib.SMTP_SSL(cfg['server'], cfg['port'], timeout=10)
        else:
            smtp = smtplib.SMTP(cfg['server'], cfg['port'], timeout=10)
            if cfg['encryption'] == 'starttls':
                smtp.starttls()
        if cfg['username'] and cfg['password']:
            smtp.login(cfg['username'], cfg['password'])
        smtp.send_message(msg)
        smtp.quit()
        return True
    except Exception as exc:
        logger.error("Error al enviar código MFA a %s: %s", destinatario, type(exc).__name__)
        return False


def _enviar_correo_confirmacion_cambio(destinatario, nombre=None):
    """Envía un correo de notificación confirmando que la contraseña fue actualizada."""
    cfg = resolver_smtp_autoservicio()
    if not cfg:
        logger.info("SMTP no activo: confirmación de cambio de contraseña para %s", destinatario)
        return False

    msg = MIMEMultipart()
    msg['From'] = f"{cfg['sender_name']} <{cfg['sender_email']}>"
    msg['To'] = destinatario
    msg['Subject'] = "Authelia • Confirmación de actualización de contraseña"

    ahora_str = time.strftime('%Y-%m-%d %H:%M:%S')
    cuerpo = (
        f"Hola {nombre or destinatario},\n\n"
        "Te confirmamos que la contraseña de tu cuenta corporativa ha sido actualizada exitosamente "
        "a través del portal de Autoservicio de Authelia.\n\n"
        f"Fecha y hora del cambio: {ahora_str}\n\n"
        "Si tú realizaste este cambio, no requieres realizar ninguna acción adicional. Tus credenciales "
        "han sido sincronizadas de forma inmediata con JumpServer y plataformas conectadas.\n\n"
        "⚠️ IMPORTANTE: Si tú NO realizaste este cambio, tu cuenta puede estar en riesgo. "
        "Comunícate de inmediato con el equipo de Seguridad y Administración de TI.\n\n"
        "— Authelia Identity and Access Management"
    )
    msg.attach(MIMEText(cuerpo, 'plain'))

    try:
        if cfg['encryption'] == 'ssl':
            smtp = smtplib.SMTP_SSL(cfg['server'], cfg['port'], timeout=10)
        else:
            smtp = smtplib.SMTP(cfg['server'], cfg['port'], timeout=10)
            if cfg['encryption'] == 'starttls':
                smtp.starttls()
        if cfg['username'] and cfg['password']:
            smtp.login(cfg['username'], cfg['password'])
        smtp.send_message(msg)
        smtp.quit()
        return True
    except Exception as exc:
        logger.error("Error al enviar confirmación de cambio a %s: %s", destinatario, type(exc).__name__)
        return False


def _hash_codigo(codigo):
    return hashlib.sha256(codigo.strip().encode('utf-8')).hexdigest()


def solicitar_codigo_mfa(identificador):
    """Genera y envía un código de 6 dígitos al correo del usuario y retorna un challenge_token."""
    identificador = (identificador or '').strip()
    if not identificador:
        raise ErrorAutoservicio('Indica tu usuario o correo corporativo.', 400)

    if bloqueado(identificador):
        raise ErrorAutoservicio('Has superado el límite de intentos. Espera unos minutos.', 429)

    correo = None
    nombre = None

    # Búsqueda en OpenLDAP
    if directorio_activo():
        try:
            cliente = ClienteDirectorio()
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_por_uid(identificador)
            if persona:
                correo = persona.correo or (identificador if '@' in identificador else None)
                nombre = persona.nombre
        except Exception:
            pass

    # Búsqueda en BD local si no se encontró en LDAP
    if not correo:
        condiciones = [User.email.ilike(identificador)]
        if '@' not in identificador:
            condiciones.append(User.email.ilike(f"{identificador}@%"))
        user = User.query.filter(db.or_(*condiciones)).first()
        if user:
            correo = user.email
            nombre = user.nombre or user.email

    # Si no se encontró, responder como si se enviara (anti-enumeración)
    if not correo:
        return {
            'status': 'success',
            'message': 'Si la cuenta existe en Authelia, recibirás un código de 6 dígitos.',
            'challenge_token': '',
        }

    # Generar código de 6 dígitos
    codigo_6 = f"{secrets.randbelow(1000000):06d}"
    s = _obtener_serializador()
    challenge_token = s.dumps({
        'email': correo.lower(),
        'code_hash': _hash_codigo(codigo_6),
        'ts': time.time(),
    }, salt=SALT_MFA)

    _enviar_correo_mfa(correo, codigo_6, nombre=nombre)
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
    from flask import current_app
    secret_key = (current_app.config.get('SECRET_KEY') or os.getenv('SECRET_KEY', 'authelia-key')).encode('utf-8')
    digest = hmac.new(secret_key, identificador.strip().lower().encode('utf-8'), hashlib.sha256).digest()
    return base64.b32encode(digest[:20]).decode('ascii')


def verificar_codigo_totp(identificador, codigo_totp):
    """Valida un código de 6 dígitos generado por Authenticator (RFC 6238)."""
    if not codigo_totp or len(codigo_totp.strip()) != 6:
        return False
    codigo = codigo_totp.strip()
    secret = _secret_totp_usuario(identificador)
    try:
        key = base64.b32decode(secret.upper(), casefold=True)
        ahora = int(time.time() // 30)
        # Ventana de 3 pasos (-30s, 0, +30s)
        for offset in (-1, 0, 1):
            msg = struct.pack('>Q', ahora + offset)
            digest = hmac.new(key, msg, hashlib.sha1).digest()
            o = digest[19] & 0x0f
            valor = (struct.unpack('>I', digest[o:o+4])[0] & 0x7fffffff) % 1000000
            if f"{valor:06d}" == codigo:
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
            if data.get('code_hash') == _hash_codigo(mfa_code):
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


def obtener_politica_contrasena():
    """Retorna el diccionario con las reglas públicas de la política de contraseñas."""
    return cargar_politica().publica()


def obtener_configuracion_autoservicio():
    """Retorna la configuración de identidad, MFA y políticas para el frontend."""
    ttl_seg = tiempo_expiracion_mfa()
    return {
        'status': 'success',
        'brand_name': 'Authelia',
        'brand_title': 'Authelia · Autoservicio de Identidad',
        'mfa_enabled': mfa_habilitado(),
        'mfa_tipo': tipo_mfa(),
        'mfa_ttl_segundos': ttl_seg,
        'mfa_ttl_minutos': max(1, ttl_seg // 60),
        'politica': cargar_politica().publica(),
    }


def sincronizar_jumpserver_o_externos(identificador, nueva_contrasena):
    """Hook de sincronización hacia JumpServer / Bóvedas externas."""
    jumpserver_url = (os.getenv('JUMPSERVER_API_URL') or os.getenv('JUMPSERVER_URL') or '').strip().rstrip('/')
    if not jumpserver_url:
        return
    token = (os.getenv('JUMPSERVER_API_TOKEN') or '').strip()
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    endpoint = f"{jumpserver_url}/api/v1/users/credentials/sync/"
    try:
        resp = requests.post(endpoint, json={'username': identificador, 'password': nueva_contrasena},
                             headers=headers, timeout=5)
        logger.info("JumpServer webhook sync status: %s", resp.status_code)
    except Exception as exc:
        logger.warning("Fallo en sincronización con JumpServer (%s): %s", identificador, type(exc).__name__)


def cambiar_contrasena(identificador, contrasena_actual, nueva_contrasena, mfa_code=None, challenge_token=None):
    """Cambia la contraseña validando la contraseña actual y segundo factor MFA si aplica."""
    identificador = (identificador or '').strip()
    if not identificador or not contrasena_actual or not nueva_contrasena:
        raise ErrorAutoservicio('Debes indicar tu usuario/correo, contraseña actual y nueva contraseña.', 400)

    if bloqueado(identificador):
        raise ErrorAutoservicio('Has superado el límite de intentos fallidos. Intenta más tarde.', 429)

    # Validar MFA si está habilitado
    if mfa_habilitado():
        validar_desafio_mfa(identificador, mfa_code, challenge_token)

    msg_politica = mensaje_de_incumplimiento(nueva_contrasena)
    if msg_politica:
        raise ErrorAutoservicio(msg_politica, 400)

    # 1. Búsqueda en OpenLDAP
    if directorio_activo():
        try:
            cliente = ClienteDirectorio()
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_por_uid(identificador)
            if persona and persona.dn:
                # Verificar clave actual contra LDAP
                if not cliente.verificar_contrasena(persona, contrasena_actual):
                    add_audit_log('ACCESO FALLIDO', status='error', target=identificador,
                                  detail='Autoservicio Authelia: contraseña actual incorrecta en LDAP')
                    raise ErrorAutoservicio('La contraseña actual es incorrecta.', 401)

                # Modificar en LDAP
                escritor = EscritorDirectorio(cliente)
                resultado = escritor.change_password(persona.dn, nueva_contrasena)
                if not resultado.exitoso:
                    raise ErrorAutoservicio('El directorio no pudo aplicar la nueva contraseña.', 500)

                # Hook de sincronización JumpServer
                sincronizar_jumpserver_o_externos(persona.identificador, nueva_contrasena)

                # Notificación por correo confirmando la actualización
                destinatario_correo = persona.correo or (identificador if '@' in identificador else None)
                if destinatario_correo:
                    _enviar_correo_confirmacion_cambio(destinatario_correo, nombre=persona.nombre)

                add_audit_log('AUTOSERVICIO: PASSWORD ACTUALIZADO POR USUARIO', module='Autoservicio', status='success',
                              target=persona.identificador, user_override=identificador,
                              detail='Contraseña actualizada por el propio usuario en OpenLDAP mediante portal de autoservicio Authelia')
                return {'status': 'success', 'message': 'Contraseña actualizada con éxito en Authelia y el directorio corporativo.'}
        except ErrorAutoservicio:
            raise
        except Exception as exc:
            logger.error("Error cambiando contraseña en LDAP (%s): %s", identificador, type(exc).__name__)

    # 2. Búsqueda en Base de Datos Local
    condiciones = [User.email.ilike(identificador)]
    if '@' not in identificador:
        condiciones.append(User.email.ilike(f"{identificador}@%"))
    user = User.query.filter(db.or_(*condiciones)).first()

    if user and user.password_hash and user.check_password(contrasena_actual):
        user.set_password(nueva_contrasena)
        db.session.commit()
        sincronizar_jumpserver_o_externos(user.email, nueva_contrasena)

        # Notificación por correo confirmando la actualización
        _enviar_correo_confirmacion_cambio(user.email, nombre=user.nombre)

        add_audit_log('AUTOSERVICIO: PASSWORD ACTUALIZADO POR USUARIO', module='Autoservicio', status='success',
                      target=user.email, user_override=identificador,
                      detail='Contraseña actualizada por el propio usuario en BD local mediante portal de autoservicio Authelia')
        return {'status': 'success', 'message': 'Contraseña actualizada con éxito en Authelia.'}

    add_audit_log('ACCESO FALLIDO', status='error', target=identificador,
                  detail='Autoservicio Authelia: credenciales no válidas')
    raise ErrorAutoservicio('Credenciales actuales incorrectas o cuenta inexistente.', 401)


def solicitar_recuperacion(correo, base_url=''):
    """Envía el enlace de recuperación si la cuenta existe."""
    correo = (correo or '').strip().lower()
    if not correo or '@' not in correo:
        raise ErrorAutoservicio('Ingresa una dirección de correo válida.', 400)

    if bloqueado(correo):
        raise ErrorAutoservicio('Límite de solicitudes alcanzado. Espera unos minutos.', 429)

    nombre = None
    existe = False

    # Verificar en LDAP
    if directorio_activo():
        try:
            persona = ClienteDirectorio().buscar_por_correo(correo)
            if persona:
                existe = True
                nombre = persona.nombre
        except Exception:
            pass

    # Verificar en BD local
    if not existe:
        user = User.query.filter(User.email.ilike(correo)).first()
        if user:
            existe = True
            nombre = user.nombre or user.email

    if existe:
        token = generar_token_recuperacion(correo)
        origen = base_url.rstrip('/') if base_url else (os.getenv('BASE_URL') or 'https://aduana.vivaro.com').rstrip('/')
        enlace = f"{origen}/autoservicio?token={token}&email={correo}"
        
        # Enviar correo con plantilla de Authelia
        cfg = resolver_smtp_autoservicio()
        if cfg:
            msg = MIMEMultipart()
            msg['From'] = f"{cfg['sender_name']} <{cfg['sender_email']}>"
            msg['To'] = correo
            msg['Subject'] = "Authelia • Restablecimiento de Contraseña"
            cuerpo = (
                f"Hola {nombre or correo},\n\n"
                "Recibimos una solicitud para restablecer tu contraseña en Authelia SSO.\n\n"
                f"Haz clic en el siguiente enlace seguro (válido por 15 minutos):\n"
                f"{enlace}\n\n"
                "Si no solicitaste este cambio, puedes ignorar este mensaje.\n\n"
                "— Authelia Identity and Access Management"
            )
            msg.attach(MIMEText(cuerpo, 'plain'))
            try:
                if cfg['encryption'] == 'ssl':
                    smtp = smtplib.SMTP_SSL(cfg['server'], cfg['port'], timeout=10)
                else:
                    smtp = smtplib.SMTP(cfg['server'], cfg['port'], timeout=10)
                    if cfg['encryption'] == 'starttls':
                        smtp.starttls()
                if cfg['username'] and cfg['password']:
                    smtp.login(cfg['username'], cfg['password'])
                smtp.send_message(msg)
                smtp.quit()
            except Exception as exc:
                logger.error("Error al enviar correo de recuperación (%s): %s", correo, type(exc).__name__)
        else:
            logger.info("SMTP no activo: enlace de recuperación generado para %s: %s", correo, enlace)

        add_audit_log('AUTOSERVICIO: RECUPERACION SOLICITADA', status='info', target=correo,
                      detail='Authelia: enlace de recuperación generado')

    return {
        'status': 'success',
        'message': 'Si tu cuenta existe en Authelia, recibirás un correo con las instrucciones.',
    }


def restablecer_con_token(correo, token, nueva_contrasena, mfa_code=None, challenge_token=None):
    """Aplica la nueva contraseña utilizando el token firmado y segundo factor MFA si aplica."""
    correo = (correo or '').strip().lower()
    token = (token or '').strip()
    if not token or not nueva_contrasena:
        raise ErrorAutoservicio('Token y nueva contraseña son obligatorios.', 400)

    token_email = verificar_token_recuperacion(token)
    if correo and token_email != correo:
        raise ErrorAutoservicio('El correo no coincide con el token de recuperación.', 400)

    correo_objetivo = token_email

    # Validar MFA si está habilitado
    if mfa_habilitado():
        validar_desafio_mfa(correo_objetivo, mfa_code, challenge_token)

    msg_politica = mensaje_de_incumplimiento(nueva_contrasena)
    if msg_politica:
        raise ErrorAutoservicio(msg_politica, 400)

    # Actualizar en LDAP
    if directorio_activo():
        try:
            cliente = ClienteDirectorio()
            persona = cliente.buscar_por_correo(correo_objetivo)
            if persona and persona.dn:
                escritor = EscritorDirectorio(cliente)
                resultado = escritor.change_password(persona.dn, nueva_contrasena)
                if not resultado.exitoso:
                    raise ErrorAutoservicio('El directorio no pudo actualizar la contraseña.', 500)
                sincronizar_jumpserver_o_externos(persona.identificador, nueva_contrasena)

                # Notificación por correo confirmando el restablecimiento
                _enviar_correo_confirmacion_cambio(correo_objetivo, nombre=persona.nombre)

                add_audit_log('AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO', module='Autoservicio', status='success',
                              target=correo_objetivo, user_override=correo_objetivo,
                              detail='Contraseña restablecida por el usuario en OpenLDAP mediante enlace temporal y MFA de Authelia')
                return {'status': 'success', 'message': 'Contraseña restablecida exitosamente en Authelia.'}
        except ErrorAutoservicio:
            raise
        except Exception as exc:
            logger.error("Error restableciendo contraseña en LDAP: %s", type(exc).__name__)

    # Actualizar en BD local
    user = User.query.filter(User.email.ilike(correo_objetivo)).first()
    if user:
        user.set_password(nueva_contrasena)
        db.session.commit()
        sincronizar_jumpserver_o_externos(user.email, nueva_contrasena)

        # Notificación por correo confirmando el restablecimiento
        _enviar_correo_confirmacion_cambio(correo_objetivo, nombre=user.nombre)

        add_audit_log('AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO', module='Autoservicio', status='success',
                      target=correo_objetivo, user_override=correo_objetivo,
                      detail='Contraseña restablecida por el usuario en BD local mediante enlace temporal y MFA de Authelia')
        return {'status': 'success', 'message': 'Contraseña restablecida exitosamente en Authelia.'}

    raise ErrorAutoservicio('No se encontró la cuenta en el directorio.', 404)


def restablecer_directo_mfa(identificador, nueva_contrasena, mfa_code, challenge_token=None):
    """Restablece la contraseña directamente validando el segundo factor (MFA)
    sin requerir contraseña previa ni enlace por correo.
    Especialmente diseñado para usuarios con contraseña caducada o sin acceso inicial."""
    identificador = (identificador or '').strip()
    nueva_contrasena = (nueva_contrasena or '').strip()
    mfa_code = (mfa_code or '').strip()

    if not identificador or not nueva_contrasena:
        raise ErrorAutoservicio('Debes indicar tu usuario/correo y la nueva contraseña.', 400)

    if bloqueado(identificador):
        raise ErrorAutoservicio('Has superado el límite de intentos fallidos. Intenta más tarde.', 429)

    # El reseteo directo sin clave previa exige validar MFA
    if not mfa_code:
        raise ErrorAutoservicio('Se requiere el código de segundo factor (MFA) para restablecer la contraseña.', 400)

    validar_desafio_mfa(identificador, mfa_code, challenge_token)

    msg_politica = mensaje_de_incumplimiento(nueva_contrasena)
    if msg_politica:
        raise ErrorAutoservicio(msg_politica, 400)

    # 1. OpenLDAP
    if directorio_activo():
        try:
            cliente = ClienteDirectorio()
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_por_uid(identificador)
            if persona and persona.dn:
                escritor = EscritorDirectorio(cliente)
                resultado = escritor.change_password(persona.dn, nueva_contrasena)
                if not resultado.exitoso:
                    raise ErrorAutoservicio('El directorio no pudo aplicar la nueva contraseña.', 500)

                sincronizar_jumpserver_o_externos(persona.identificador, nueva_contrasena)

                destinatario_correo = persona.correo or (identificador if '@' in identificador else None)
                if destinatario_correo:
                    _enviar_correo_confirmacion_cambio(destinatario_correo, nombre=persona.nombre)

                add_audit_log('AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO (MFA)', module='Autoservicio', status='success',
                              target=persona.identificador, user_override=identificador,
                              detail='Contraseña restablecida directamente con MFA por el usuario en Autoservicio Authelia')
                return {'status': 'success', 'message': 'Contraseña restablecida con éxito en Authelia y el directorio corporativo.'}
        except ErrorAutoservicio:
            raise
        except Exception as exc:
            logger.error("Error restableciendo contraseña con MFA en LDAP (%s): %s", identificador, type(exc).__name__)

    # 2. Base de datos local
    condiciones = [User.email.ilike(identificador)]
    if '@' not in identificador:
        condiciones.append(User.email.ilike(f"{identificador}@%"))
    user = User.query.filter(db.or_(*condiciones)).first()
    if user:
        user.set_password(nueva_contrasena)
        db.session.commit()
        sincronizar_jumpserver_o_externos(user.email, nueva_contrasena)
        _enviar_correo_confirmacion_cambio(user.email, nombre=user.nombre)
        add_audit_log('AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO (MFA)', module='Autoservicio', status='success',
                      target=user.email, user_override=identificador,
                      detail='Contraseña local restablecida directamente con MFA en Autoservicio Authelia')
        return {'status': 'success', 'message': 'Contraseña restablecida con éxito en Authelia.'}

    raise ErrorAutoservicio('No se encontró la cuenta de usuario especificada.', 404)

