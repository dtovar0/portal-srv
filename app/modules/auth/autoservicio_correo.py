"""Correos del autoservicio de contraseñas (FNC-174).

- Resolución del servidor SMTP (dedicado, general del portal o variables SMTP_*).
- Un único envío SMTP compartido por los tres correos: código MFA,
  confirmación de cambio y enlace de recuperación.
- Nunca se escribe en logs la contraseña, el código, el token ni el texto
  completo de una excepción (solo su tipo).
"""
import logging
import smtplib
import time
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.modules.auth.autoservicio_config import (
    LOGGER_AUTOSERVICIO, REMITENTE_CORREO_POR_OMISION, REMITENTE_NOMBRE_POR_OMISION,
    SEGUNDOS_POR_MINUTO, SMTP_CIFRADO_POR_OMISION, SMTP_PUERTO_POR_OMISION,
    VAR_SMTP_DEDICADO, VAR_SMTP_GENERAL, leer_variable,
    TOKEN_MAX_AGE_SEGUNDOS, smtp_depuracion_activa, tiempo_expiracion_mfa)

logger = logging.getLogger(f'{LOGGER_AUTOSERVICIO}.correo')

SMTP_TIMEOUT_SEGUNDOS = 15
VALIDEZ_ENLACE_MINUTOS = TOKEN_MAX_AGE_SEGUNDOS // SEGUNDOS_POR_MINUTO
SIN_SMTP_MENSAJE = ("No hay un servidor de correo (SMTP) configurado en el sistema. Configura SMTP_SERVER o "
                    "AUTOSERVICIO_SMTP_SERVER en el archivo .env o en Ajustes > Servidor de Correo.")


def _entorno(variables, clave):
    return leer_variable(variables[clave])


def resolver_smtp_autoservicio():
    """Obtiene la configuración SMTP para Autoservicio/Authelia.
    Prioridad:
    1. Variables dedicadas AUTOSERVICIO_SMTP_* en .env (si tienen servidor definido).
    2. Configuración unificada de Aduana (resolve_smtp_settings: variables SMTP_* o BD SMTPConfig).
    3. Variables SMTP_* directas del entorno.
    """
    ded, gen = VAR_SMTP_DEDICADO, VAR_SMTP_GENERAL
    server_dedicado = _entorno(ded, 'server').strip()
    if server_dedicado:
        return {
            'server': server_dedicado,
            'port': int(_entorno(ded, 'port') or SMTP_PUERTO_POR_OMISION),
            'username': _entorno(ded, 'user').strip() or None,
            'password': _entorno(ded, 'password') or None,
            'encryption': (_entorno(ded, 'encryption') or SMTP_CIFRADO_POR_OMISION).strip().lower(),
            'sender_name': (_entorno(ded, 'sender_name') or REMITENTE_NOMBRE_POR_OMISION).strip(),
            'sender_email': (_entorno(ded, 'sender_email') or REMITENTE_CORREO_POR_OMISION).strip(),
            'source': 'env_autoservicio',
        }

    # Fallback a la configuración global de Aduana (BD SMTPConfig o SMTP_*)
    try:
        from app.modules.notifications.services import resolve_smtp_settings
        global_cfg = resolve_smtp_settings()
        if global_cfg and global_cfg.is_usable:
            sender_name = (_entorno(ded, 'sender_name') or global_cfg.sender_name or REMITENTE_NOMBRE_POR_OMISION).strip()
            sender_email = (_entorno(ded, 'sender_email') or global_cfg.sender_email or REMITENTE_CORREO_POR_OMISION).strip()
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
        logger.warning("Autoservicio: no se pudo resolver configuración SMTP global: %s", type(exc).__name__)

    # Fallback directo a variables SMTP_* del entorno
    server_env = _entorno(gen, 'server').strip()
    if server_env:
        return {
            'server': server_env,
            'port': int(_entorno(gen, 'port') or SMTP_PUERTO_POR_OMISION),
            'username': _entorno(gen, 'user').strip() or None,
            'password': _entorno(gen, 'password') or None,
            'encryption': (_entorno(gen, 'encryption') or SMTP_CIFRADO_POR_OMISION).strip().lower(),
            'sender_name': (_entorno(ded, 'sender_name') or _entorno(gen, 'sender_name')
                            or REMITENTE_NOMBRE_POR_OMISION).strip(),
            'sender_email': (_entorno(ded, 'sender_email') or _entorno(gen, 'sender_email')
                             or REMITENTE_CORREO_POR_OMISION).strip(),
            'source': 'env_smtp',
        }

    return None


def _enviar_smtp(cfg, destinatario, asunto, cuerpo_plano, cuerpo_html, etiqueta):
    """Arma el mensaje multipart (RFC 5322 / RFC 2047) y lo envía por SMTP.
    Retorna None si salió bien o la excepción si falló (ya registrada solo por su tipo).
    """
    msg = MIMEMultipart('alternative')
    msg['From'] = formataddr((str(Header(cfg['sender_name'], 'utf-8')), cfg['sender_email']))
    msg['Sender'] = cfg['sender_email']
    msg['Reply-To'] = cfg['sender_email']
    msg['To'] = destinatario
    msg['Subject'] = Header(asunto, 'utf-8')
    msg.attach(MIMEText(cuerpo_plano, 'plain', 'utf-8'))
    msg.attach(MIMEText(cuerpo_html, 'html', 'utf-8'))

    logger.info("Autoservicio: conectando a %s:%s (cifrado: %s, auth: %s, remitente: %s) para enviar %s a %s",
                cfg['server'], cfg['port'], cfg['encryption'], bool(cfg['username'] and cfg['password']),
                cfg['sender_email'], etiqueta, destinatario)
    try:
        if cfg['encryption'] == 'ssl':
            smtp = smtplib.SMTP_SSL(cfg['server'], cfg['port'], timeout=SMTP_TIMEOUT_SEGUNDOS)
        else:
            smtp = smtplib.SMTP(cfg['server'], cfg['port'], timeout=SMTP_TIMEOUT_SEGUNDOS)
            if cfg['encryption'] == 'starttls':
                smtp.starttls()
        if smtp_depuracion_activa():
            smtp.set_debuglevel(1)
        if cfg['username'] and cfg['password']:
            smtp.login(cfg['username'], cfg['password'])
        smtp.send_message(msg, from_addr=cfg['sender_email'])
        smtp.quit()
        logger.info("Autoservicio: %s enviado a %s vía %s", etiqueta, destinatario, cfg['server'])
        return None
    except Exception as exc:
        logger.error("Autoservicio: error al enviar %s a %s (%s:%s): %s",
                     etiqueta, destinatario, cfg['server'], cfg['port'], type(exc).__name__)
        return exc


def _marca(cfg):
    return cfg.get('sender_name') or REMITENTE_NOMBRE_POR_OMISION


def _html_codigo_mfa(brand_name, saludo, codigo, ttl_minutos):
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 20px 28px; border-bottom: 1px solid #e2e8f0; text-align: left;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">
                {brand_name}
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">
                Verificación de identidad
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
                Hola <strong>{saludo}</strong>:
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                Usa este código para continuar con el cambio de contraseña:
              </p>
              
              <div style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 22px 20px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0284c7; display: inline-block;">
                  {codigo}
                </span>
                <p style="margin: 10px 0 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                  Válido durante {ttl_minutos} minutos
                </p>
              </div>

              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                                    <strong>¿No solicitaste este cambio?</strong> Ignora este correo. Tu contraseña no ha sido modificada.
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


def _html_confirmacion(brand_name, saludo, ahora_str):
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 20px 28px; border-bottom: 1px solid #e2e8f0; text-align: left;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Contraseña actualizada
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">
                {brand_name} &bull; Autoservicio de Identidad
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
                Hola <strong>{saludo}</strong>:
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
                  <strong>¿No fuiste tú?</strong> Si tú NO realizaste este cambio, tu cuenta puede estar en riesgo. Comunícate de inmediato con el equipo de Seguridad y Administración de TI.
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


def _html_recuperacion(brand_name, saludo, enlace):
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 20px 28px; border-bottom: 1px solid #e2e8f0; text-align: left;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                {brand_name} &bull; Restablecimiento de Contraseña
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">
                Recuperación de acceso
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #334155;">
                Hola <strong>{saludo}</strong>:
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


def enviar_correo_mfa(destinatario, codigo, nombre=None):
    """Envía el código de 6 dígitos mediante el servidor SMTP configurado.
    Retorna (True, None) si el envío fue exitoso, o (False, mensaje_error) si falló.
    """
    cfg = resolver_smtp_autoservicio()
    if not cfg:
        logger.warning("Autoservicio MFA: No hay servidor SMTP configurado en el sistema para enviar a %s", destinatario)
        return False, SIN_SMTP_MENSAJE

    ttl_minutos = max(1, tiempo_expiracion_mfa() // SEGUNDOS_POR_MINUTO)
    brand_name = _marca(cfg)
    saludo = nombre or destinatario
    asunto = f"Código de verificación: {codigo}"

    cuerpo_plano = (
        f"Hola {saludo}:\n\n"
        f"Has solicitado restablecer o actualizar tu contraseña corporativa en {brand_name}.\n\n"
        f"Tu código de seguridad de 6 dígitos es:\n\n"
        f"    {codigo}\n\n"
        f"Este código es válido durante {ttl_minutos} minutos y es requerido para autorizar el cambio.\n\n"
        f"Si tú no iniciaste esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña actual no ha sido modificada.\n\n"
        f"— {brand_name}"
    )
    cuerpo_html = _html_codigo_mfa(brand_name, saludo, codigo, ttl_minutos)

    error = _enviar_smtp(cfg, destinatario, asunto, cuerpo_plano, cuerpo_html, 'código MFA')
    if error is None:
        return True, None
    return False, (f"Fallo al conectar con el servidor SMTP {cfg['server']}:{cfg['port']} "
                   f"({type(error).__name__}: {error})")


def enviar_correo_confirmacion_cambio(destinatario, nombre=None):
    """Envía un correo de notificación confirmando que la contraseña fue actualizada."""
    cfg = resolver_smtp_autoservicio()
    if not cfg:
        logger.info("Autoservicio: SMTP no activo al enviar confirmación de cambio a %s", destinatario)
        return False

    ahora_str = time.strftime('%Y-%m-%d %H:%M:%S')
    brand_name = _marca(cfg)
    saludo = nombre or destinatario

    cuerpo_plano = (
        f"Hola {saludo}:\n\n"
        f"Te confirmamos que la contraseña de tu cuenta corporativa ha sido actualizada exitosamente "
        f"a través del portal de Autoservicio de {brand_name}.\n\n"
        f"Fecha y hora del cambio: {ahora_str}\n\n"
        f"Si tú realizaste este cambio, no requieres realizar ninguna acción adicional. Tus credenciales "
        f"han sido sincronizadas de forma inmediata con el directorio corporativo y plataformas asociadas.\n\n"
        f"⚠️ IMPORTANTE: Si tú NO realizaste este cambio, tu cuenta puede estar en riesgo. "
        f"Comunícate de inmediato con el equipo de Seguridad y Administración de TI.\n\n"
        f"— {brand_name}"
    )
    cuerpo_html = _html_confirmacion(brand_name, saludo, ahora_str)

    return _enviar_smtp(cfg, destinatario, "Contraseña actualizada", cuerpo_plano, cuerpo_html,
                        'confirmación de cambio') is None


def enviar_correo_recuperacion(destinatario, enlace, nombre=None):
    """Envía el enlace de recuperación. Retorna True si salió, False si falló o no hay SMTP."""
    cfg = resolver_smtp_autoservicio()
    if not cfg:
        # Sin SMTP el enlace no se escribe completo en el log: lleva el token.
        logger.info("SMTP no activo: enlace de recuperación generado para %s (sin token en el log): %s",
                    destinatario, enlace.split('?')[0])
        return False

    brand_name = _marca(cfg)
    saludo = nombre or destinatario
    cuerpo_plano = (
        f"Hola {saludo}:\n\n"
        f"Recibimos una solicitud para restablecer tu contraseña en {brand_name}.\n\n"
        f"Haz clic en el siguiente enlace seguro (válido por {VALIDEZ_ENLACE_MINUTOS} minutos):\n"
        f"{enlace}\n\n"
        "Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\n"
        f"— {brand_name}"
    )
    cuerpo_html = _html_recuperacion(brand_name, saludo, enlace)
    return _enviar_smtp(cfg, destinatario, "Restablece tu contraseña", cuerpo_plano, cuerpo_html,
                        'enlace de recuperación') is None
