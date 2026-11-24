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
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
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
    Prioridad:
    1. Variables dedicadas AUTOSERVICIO_SMTP_* en .env (si tienen servidor definido).
    2. Configuración unificada de Aduana (resolve_smtp_settings: variables SMTP_* o BD SMTPConfig).
    3. Variables SMTP_* directas del entorno.
    """
    server_dedicado = (os.getenv('AUTOSERVICIO_SMTP_SERVER') or '').strip()
    if server_dedicado:
        port = int(os.getenv('AUTOSERVICIO_SMTP_PORT') or '587')
        username = (os.getenv('AUTOSERVICIO_SMTP_USER') or '').strip() or None
        password = os.getenv('AUTOSERVICIO_SMTP_PASSWORD') or None
        encryption = (os.getenv('AUTOSERVICIO_SMTP_ENCRYPTION') or 'starttls').strip().lower()
        sender_name = (os.getenv('AUTOSERVICIO_SMTP_SENDER_NAME') or 'Authelia • Autoservicio de Identidad').strip()
        sender_email = (os.getenv('AUTOSERVICIO_SMTP_SENDER_EMAIL') or 'authelia@vivaro.com').strip()
        return {
            'server': server_dedicado,
            'port': port,
            'username': username,
            'password': password,
            'encryption': encryption,
            'sender_name': sender_name,
            'sender_email': sender_email,
            'source': 'env_autoservicio',
        }

    # Fallback a la configuración global de Aduana (BD SMTPConfig o SMTP_*)
    try:
        from app.modules.notifications.services import resolve_smtp_settings
        global_cfg = resolve_smtp_settings()
        if global_cfg and global_cfg.is_usable:
            sender_name = (os.getenv('AUTOSERVICIO_SMTP_SENDER_NAME') or global_cfg.sender_name or 'Authelia • Autoservicio de Identidad').strip()
            sender_email = (os.getenv('AUTOSERVICIO_SMTP_SENDER_EMAIL') or global_cfg.sender_email or 'authelia@vivaro.com').strip()
            return {
                'server': global_cfg.server,
                'port': global_cfg.port,
                'username': global_cfg.username,
                'password': global_cfg.password,
                'encryption': global_cfg.encryption,
                'sender_name': sender_name,
                'sender_email': sender_email,
                'source': f"global_{global_cfg.source}",
            }
    except Exception as exc:
        logger.warning("Autoservicio: no se pudo resolver configuración SMTP global: %s", exc)

    # Fallback directo a variables SMTP_* del entorno
    server_env = (os.getenv('SMTP_SERVER') or '').strip()
    if server_env:
        port = int(os.getenv('SMTP_PORT') or '587')
        username = (os.getenv('SMTP_USER') or '').strip() or None
        password = os.getenv('SMTP_PASSWORD') or None
        encryption = (os.getenv('SMTP_ENCRYPTION') or 'starttls').strip().lower()
        sender_name = (os.getenv('AUTOSERVICIO_SMTP_SENDER_NAME') or os.getenv('SMTP_SENDER_NAME') or 'Authelia • Autoservicio de Identidad').strip()
        sender_email = (os.getenv('AUTOSERVICIO_SMTP_SENDER_EMAIL') or os.getenv('SMTP_SENDER_EMAIL') or 'authelia@vivaro.com').strip()
        return {
            'server': server_env,
            'port': port,
            'username': username,
            'password': password,
            'encryption': encryption,
            'sender_name': sender_name,
            'sender_email': sender_email,
            'source': 'env_smtp',
        }

    return None


def _enviar_correo_mfa(destinatario, codigo, nombre=None):
    """Envía el código de 6 dígitos mediante el servidor SMTP configurado.
    Retorna (True, None) si el envío fue exitoso, o (False, mensaje_error) si falló.
    """
    cfg = resolver_smtp_autoservicio()
    if not cfg:
        logger.warning("Autoservicio MFA: No hay servidor SMTP configurado en el sistema para enviar a %s", destinatario)
        return False, "No hay un servidor de correo (SMTP) configurado en el sistema. Configura SMTP_SERVER o AUTOSERVICIO_SMTP_SERVER en el archivo .env o en Ajustes > Servidor de Correo."

    ttl_minutos = max(1, tiempo_expiracion_mfa() // 60)
    brand_name = cfg.get('sender_name') or 'Authelia • Autoservicio de Identidad'
    asunto = f"{brand_name} • Código de verificación: {codigo}"

    cuerpo_plano = (
        f"Hola {nombre or destinatario}:\n\n"
        f"Has solicitado restablecer o actualizar tu contraseña corporativa en {brand_name}.\n\n"
        f"Tu código de seguridad de 6 dígitos es:\n\n"
        f"    {codigo}\n\n"
        f"Este código es válido durante {ttl_minutos} minutos y es requerido para autorizar el cambio.\n\n"
        f"Si tú no iniciaste esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña actual no ha sido modificada.\n\n"
        f"— {brand_name}"
    )

    cuerpo_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 24px 32px; background-color: #0284c7; background: linear-gradient(135deg, #0ea5e9, #0284c7); text-align: left;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">
                {brand_name}
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #e0f2fe;">
                Portal Seguro de Verificación y Autoservicio de Identidad
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
                Hola <strong>{nombre or destinatario}</strong>:
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                Has solicitado restablecer o actualizar la contraseña de tu cuenta corporativa.
                Para verificar tu identidad y validar la titularidad de tu cuenta, utiliza el siguiente código de seguridad de 6 dígitos:
              </p>
              
              <div style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 22px 20px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0284c7; display: inline-block;">
                  {codigo}
                </span>
                <p style="margin: 10px 0 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                  ⏱ Válido durante {ttl_minutos} minutos
                </p>
              </div>

              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #64748b;">
                Introduce este código en el paso 2 del portal para continuar con la actualización de tu contraseña.
              </p>

              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                  ⚠️ <strong>¿No solicitaste este cambio?</strong> Si no realizaste esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña actual no ha sido modificada.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                {brand_name} &bull; Vivaro
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    # Construir mensaje multipart/alternative con cabeceras RFC 5322 y RFC 2047
    msg = MIMEMultipart('alternative')
    msg['From'] = formataddr((str(Header(cfg['sender_name'], 'utf-8')), cfg['sender_email']))
    msg['Sender'] = cfg['sender_email']
    msg['Reply-To'] = cfg['sender_email']
    msg['To'] = destinatario
    msg['Subject'] = Header(asunto, 'utf-8')

    msg.attach(MIMEText(cuerpo_plano, 'plain', 'utf-8'))
    msg.attach(MIMEText(cuerpo_html, 'html', 'utf-8'))

    logger.info("Autoservicio MFA: Conectando a servidor SMTP %s:%s (cifrado: %s, auth: %s, remitente: %s) para enviar código a %s",
                cfg['server'], cfg['port'], cfg['encryption'], bool(cfg['username'] and cfg['password']), cfg['sender_email'], destinatario)

    try:
        if cfg['encryption'] == 'ssl':
            smtp = smtplib.SMTP_SSL(cfg['server'], cfg['port'], timeout=15)
        else:
            smtp = smtplib.SMTP(cfg['server'], cfg['port'], timeout=15)
            if cfg['encryption'] == 'starttls':
                smtp.starttls()
        if os.getenv('DEBUG_SMTP', '').strip().lower() == 'true':
            smtp.set_debuglevel(1)
        if cfg['username'] and cfg['password']:
            smtp.login(cfg['username'], cfg['password'])
        smtp.send_message(msg, from_addr=cfg['sender_email'])
        smtp.quit()
        logger.info("Autoservicio MFA: Código de 6 dígitos enviado exitosamente a %s vía %s", destinatario, cfg['server'])
        return True, None
    except Exception as exc:
        logger.error("Autoservicio MFA: Error al conectar o enviar vía SMTP a %s (%s:%s): %s",
                     destinatario, cfg['server'], cfg['port'], exc, exc_info=True)
        return False, f"Fallo al conectar con el servidor SMTP {cfg['server']}:{cfg['port']} ({type(exc).__name__}: {exc})"


def _enviar_correo_confirmacion_cambio(destinatario, nombre=None):
    """Envía un correo de notificación confirmando que la contraseña fue actualizada."""
    cfg = resolver_smtp_autoservicio()
    if not cfg:
        logger.info("Autoservicio: SMTP no activo al enviar confirmación de cambio a %s", destinatario)
        return False

    ahora_str = time.strftime('%Y-%m-%d %H:%M:%S')
    brand_name = cfg.get('sender_name') or 'Authelia • Autoservicio de Identidad'
    asunto = f"{brand_name} • Confirmación de actualización de contraseña"

    cuerpo_plano = (
        f"Hola {nombre or destinatario}:\n\n"
        f"Te confirmamos que la contraseña de tu cuenta corporativa ha sido actualizada exitosamente "
        f"a través del portal de Autoservicio de {brand_name}.\n\n"
        f"Fecha y hora del cambio: {ahora_str}\n\n"
        f"Si tú realizaste este cambio, no requieres realizar ninguna acción adicional. Tus credenciales "
        f"han sido sincronizadas de forma inmediata con el directorio corporativo y plataformas asociadas.\n\n"
        f"⚠️ IMPORTANTE: Si tú NO realizaste este cambio, tu cuenta puede estar en riesgo. "
        f"Comunícate de inmediato con el equipo de Seguridad y Administración de TI.\n\n"
        f"— {brand_name}"
    )

    cuerpo_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 24px 32px; background-color: #059669; background: linear-gradient(135deg, #10b981, #059669); text-align: left;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                ✅ Contraseña Actualizada Exitosamente
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #ecfdf5;">
                {brand_name} &bull; Autoservicio de Identidad
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
                Hola <strong>{nombre or destinatario}</strong>:
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
                Te confirmamos que la contraseña de tu cuenta corporativa ha sido actualizada exitosamente a través del portal de Autoservicio.
              </p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #166534;">
                  <strong>Fecha y hora del cambio:</strong> {ahora_str}
                </p>
                <p style="margin: 6px 0 0; font-size: 12px; color: #15803d;">
                  Tus nuevas credenciales han sido sincronizadas en el directorio corporativo y plataformas asociadas.
                </p>
              </div>
              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #b91c1c;">
                  ⚠️ <strong>IMPORTANTE:</strong> Si tú NO realizaste este cambio, tu cuenta puede estar en riesgo. Comunícate de inmediato con el equipo de Seguridad y Administración de TI.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                {brand_name} &bull; Vivaro
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    msg = MIMEMultipart('alternative')
    msg['From'] = formataddr((str(Header(cfg['sender_name'], 'utf-8')), cfg['sender_email']))
    msg['Sender'] = cfg['sender_email']
    msg['Reply-To'] = cfg['sender_email']
    msg['To'] = destinatario
    msg['Subject'] = Header(asunto, 'utf-8')

    msg.attach(MIMEText(cuerpo_plano, 'plain', 'utf-8'))
    msg.attach(MIMEText(cuerpo_html, 'html', 'utf-8'))

    logger.info("Autoservicio: Conectando a servidor SMTP %s:%s para enviar confirmación de cambio a %s",
                cfg['server'], cfg['port'], destinatario)
    try:
        if cfg['encryption'] == 'ssl':
            smtp = smtplib.SMTP_SSL(cfg['server'], cfg['port'], timeout=15)
        else:
            smtp = smtplib.SMTP(cfg['server'], cfg['port'], timeout=15)
            if cfg['encryption'] == 'starttls':
                smtp.starttls()
        if os.getenv('DEBUG_SMTP', '').strip().lower() == 'true':
            smtp.set_debuglevel(1)
        if cfg['username'] and cfg['password']:
            smtp.login(cfg['username'], cfg['password'])
        smtp.send_message(msg, from_addr=cfg['sender_email'])
        smtp.quit()
        logger.info("Autoservicio: Notificación de cambio de contraseña enviada a %s", destinatario)
        return True
    except Exception as exc:
        logger.error("Autoservicio: Error al enviar confirmación de cambio a %s (%s:%s): %s",
                     destinatario, cfg['server'], cfg['port'], exc, exc_info=True)
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
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_usuario(identificador)
            if not persona and '@' in identificador:
                # Si no se encontró por correo exacto, intentar por uid extrayendo la parte de usuario
                usuario_parte = identificador.split('@')[0]
                persona = cliente.buscar_usuario(usuario_parte)
            if persona:
                correo = persona.correo or (identificador if '@' in identificador else None)
                nombre = persona.nombre
        except Exception as exc:
            logger.warning("Autoservicio MFA: Error al consultar LDAP para '%s': %s", identificador, exc)

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
        logger.info("Autoservicio MFA: Identificador '%s' no encontrado en LDAP ni en BD local", identificador)
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

    res_envio = _enviar_correo_mfa(correo, codigo_6, nombre=nombre)
    if isinstance(res_envio, tuple):
        exito_envio, error_envio = res_envio
    else:
        exito_envio, error_envio = bool(res_envio), "Fallo desconocido al enviar correo"

    if not exito_envio:
        from flask import current_app
        if not current_app.config.get('TESTING'):
            logger.error("Autoservicio MFA: No se pudo enviar el código de seguridad a %s: %s", correo, error_envio)
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
    authelia_url = (os.getenv('AUTHELIA_URL') or os.getenv('AUTHELIA_SSO_URL') or
                    os.getenv('OIDC_ISSUER_URL') or '').strip() or None
    return {
        'status': 'success',
        'brand_name': 'Authelia',
        'brand_title': 'Authelia · Autoservicio de Identidad',
        'mfa_enabled': mfa_habilitado(),
        'mfa_tipo': tipo_mfa(),
        'mfa_ttl_segundos': ttl_seg,
        'mfa_ttl_minutos': max(1, ttl_seg // 60),
        'authelia_url': authelia_url,
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
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_usuario(identificador)
            if not persona and '@' in identificador:
                persona = cliente.buscar_usuario(identificador.split('@')[0])
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
            brand_name = cfg.get('sender_name') or 'Authelia • Autoservicio de Identidad'
            asunto = f"{brand_name} • Restablecimiento de Contraseña"
            cuerpo_plano = (
                f"Hola {nombre or correo}:\n\n"
                f"Recibimos una solicitud para restablecer tu contraseña en {brand_name}.\n\n"
                f"Haz clic en el siguiente enlace seguro (válido por 15 minutos):\n"
                f"{enlace}\n\n"
                "Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\n"
                f"— {brand_name}"
            )
            cuerpo_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 24px 32px; background-color: #0284c7; background: linear-gradient(135deg, #0ea5e9, #0284c7); text-align: left;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                {brand_name} &bull; Restablecimiento de Contraseña
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #e0f2fe;">
                Portal Seguro de Autoservicio de Identidad
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
                Hola <strong>{nombre or correo}</strong>:
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                Recibimos una solicitud para restablecer tu contraseña en {brand_name}.
                Haz clic en el siguiente botón seguro para establecer tu nueva clave (enlace válido durante 15 minutos):
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="{enlace}" style="background-color: #0284c7; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; display: inline-block;">
                  Restablecer mi Contraseña &rarr;
                </a>
              </div>
              <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                O copia y pega el siguiente enlace en tu navegador:<br>
                <a href="{enlace}" style="color: #0284c7; word-break: break-all;">{enlace}</a>
              </p>
              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                  ⚠️ Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                {brand_name} &bull; Vivaro
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

            msg = MIMEMultipart('alternative')
            msg['From'] = formataddr((str(Header(cfg['sender_name'], 'utf-8')), cfg['sender_email']))
            msg['Sender'] = cfg['sender_email']
            msg['Reply-To'] = cfg['sender_email']
            msg['To'] = correo
            msg['Subject'] = Header(asunto, 'utf-8')

            msg.attach(MIMEText(cuerpo_plano, 'plain', 'utf-8'))
            msg.attach(MIMEText(cuerpo_html, 'html', 'utf-8'))

            try:
                if cfg['encryption'] == 'ssl':
                    smtp = smtplib.SMTP_SSL(cfg['server'], cfg['port'], timeout=15)
                else:
                    smtp = smtplib.SMTP(cfg['server'], cfg['port'], timeout=15)
                    if cfg['encryption'] == 'starttls':
                        smtp.starttls()
                if os.getenv('DEBUG_SMTP', '').strip().lower() == 'true':
                    smtp.set_debuglevel(1)
                if cfg['username'] and cfg['password']:
                    smtp.login(cfg['username'], cfg['password'])
                smtp.send_message(msg, from_addr=cfg['sender_email'])
                smtp.quit()
                logger.info("Autoservicio: Enlace de recuperación enviado exitosamente a %s", correo)
            except Exception as exc:
                logger.error("Autoservicio: Error al enviar correo de recuperación (%s): %s", correo, exc, exc_info=True)
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
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_usuario(identificador)
            if not persona and '@' in identificador:
                persona = cliente.buscar_usuario(identificador.split('@')[0])
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

