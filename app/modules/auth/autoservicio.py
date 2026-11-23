"""Módulo de Autoservicio de Contraseñas (Aduana).

Permite a los usuarios corporativos:
1. Cambiar su contraseña conociendo su contraseña actual (o si expiró).
2. Solicitar un enlace de recuperación por correo corporativo.
3. Restablecer su contraseña mediante un token firmado y con expiración.
4. Sincronizar de forma inmediata con JumpServer y el directorio OpenLDAP.

Reglas:
- La contraseña nunca se registra en texto plano ni se expone en logs.
- Valida estrictamente la política corporativa de contraseñas (FNC-138).
- Protegido contra ataques de fuerza bruta mediante auditoría y límites de intentos.
"""
import logging
import os
import requests
from datetime import datetime
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
TOKEN_MAX_AGE_SEGUNDOS = 900  # 15 minutos


class ErrorAutoservicio(Exception):
    """Excepción controlada con mensaje para el usuario y código HTTP."""

    def __init__(self, mensaje, codigo_http=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo_http = codigo_http


def _obtener_serializador():
    from flask import current_app
    secret_key = current_app.config.get('SECRET_KEY') or os.getenv('SECRET_KEY', 'aduana-fallback-secret')
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


def obtener_politica_contrasena():
    """Retorna la política de contraseñas para validación en tiempo real en frontend."""
    return cargar_politica().publica()


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


def _enviar_correo_recuperacion(correo, enlace, nombre=None):
    """Envía el correo de recuperación si SMTP está configurado."""
    from app.modules.notifications.services import resolve_smtp_settings, open_smtp
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    config = resolve_smtp_settings()
    if not config:
        logger.info("SMTP no activo: enlace de recuperación generado para %s: %s", correo, enlace)
        return False

    msg = MIMEMultipart()
    msg['From'] = f"{config.sender_name} <{config.sender_email}>"
    msg['To'] = correo
    msg['Subject'] = "Restablecimiento de Contraseña — Control de Acceso"

    saludo = f"Hola {nombre or correo}"
    cuerpo = (
        f"{saludo},\n\n"
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta corporativa.\n\n"
        f"Para continuar, haz clic en el siguiente enlace seguro (válido por 15 minutos):\n"
        f"{enlace}\n\n"
        "Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual no se modificará.\n\n"
        "— Seguridad y Control de Acceso"
    )
    msg.attach(MIMEText(cuerpo, 'plain'))

    try:
        smtp = open_smtp(config)
        smtp.send_message(msg)
        smtp.quit()
        return True
    except Exception as exc:
        logger.error("Error al enviar correo de recuperación a %s: %s", correo, type(exc).__name__)
        return False


def cambiar_contrasena(identificador, contrasena_actual, nueva_contrasena):
    """Cambia la contraseña validando la contraseña actual."""
    identificador = (identificador or '').strip()
    if not identificador or not contrasena_actual or not nueva_contrasena:
        raise ErrorAutoservicio('Debes indicar tu usuario/correo, contraseña actual y nueva contraseña.', 400)

    if bloqueado(identificador):
        raise ErrorAutoservicio('Has superado el límite de intentos fallidos. Intenta más tarde.', 429)

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
                                  detail='Autoservicio: contraseña actual incorrecta en LDAP')
                    raise ErrorAutoservicio('La contraseña actual es incorrecta.', 401)

                # Modificar en LDAP
                escritor = EscritorDirectorio(cliente)
                resultado = escritor.change_password(persona.dn, nueva_contrasena)
                if not resultado.exitoso:
                    raise ErrorAutoservicio('El directorio no pudo aplicar la nueva contraseña.', 500)

                # Hook de sincronización JumpServer
                sincronizar_jumpserver_o_externos(persona.identificador, nueva_contrasena)
                add_audit_log('AUTOSERVICIO: CONTRASEÑA ACTUALIZADA', status='success', target=identificador,
                              detail='Cambio de contraseña exitoso en LDAP y sincronización JumpServer')
                return {'status': 'success', 'message': 'Contraseña actualizada con éxito en el directorio.'}
        except ErrorAutoservicio:
            raise
        except Exception as exc:
            logger.error("Error cambiando contraseña en LDAP (%s): %s", identificador, type(exc).__name__)

    # 2. Búsqueda en Base de Datos Local
    user = User.query.filter(
        (User.email.ilike(identificador)) | (User.username.ilike(identificador))
    ).first()

    if user and user.password_hash and user.check_password(contrasena_actual):
        user.set_password(nueva_contrasena)
        db.session.commit()
        sincronizar_jumpserver_o_externos(user.email, nueva_contrasena)
        add_audit_log('AUTOSERVICIO: CONTRASEÑA ACTUALIZADA', status='success', target=identificador,
                      detail='Cambio de contraseña exitoso para cuenta local')
        return {'status': 'success', 'message': 'Contraseña actualizada con éxito.'}

    add_audit_log('ACCESO FALLIDO', status='error', target=identificador,
                  detail='Autoservicio: credenciales no válidas')
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
            nombre = user.nombre or user.username

    if existe:
        token = generar_token_recuperacion(correo)
        origen = base_url.rstrip('/') if base_url else (os.getenv('BASE_URL') or 'https://aduana.vivaro.com').rstrip('/')
        enlace = f"{origen}/autoservicio?token={token}&email={correo}"
        _enviar_correo_recuperacion(correo, enlace, nombre=nombre)
        add_audit_log('AUTOSERVICIO: RECUPERACION SOLICITADA', status='info', target=correo,
                      detail='Enlace de recuperación generado')

    # Respuesta genérica para evitar enumeración de cuentas
    return {
        'status': 'success',
        'message': 'Si tu cuenta existe en el directorio corporativo, recibirás un correo con las instrucciones.',
    }


def restablecer_con_token(correo, token, nueva_contrasena):
    """Aplica la nueva contraseña utilizando el token firmado."""
    correo = (correo or '').strip().lower()
    token = (token or '').strip()
    if not token or not nueva_contrasena:
        raise ErrorAutoservicio('Token y nueva contraseña son obligatorios.', 400)

    token_email = verificar_token_recuperacion(token)
    if correo and token_email != correo:
        raise ErrorAutoservicio('El correo no coincide con el token de recuperación.', 400)

    correo_objetivo = token_email

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
                add_audit_log('AUTOSERVICIO: CONTRASEÑA RESTABLECIDA', status='success', target=correo_objetivo,
                              detail='Restablecimiento por token exitoso en LDAP')
                return {'status': 'success', 'message': 'Contraseña restablecida exitosamente en el directorio.'}
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
        add_audit_log('AUTOSERVICIO: CONTRASEÑA RESTABLECIDA', status='success', target=correo_objetivo,
                      detail='Restablecimiento por token exitoso en cuenta local')
        return {'status': 'success', 'message': 'Contraseña restablecida exitosamente.'}

    raise ErrorAutoservicio('No se encontró la cuenta en el directorio.', 404)
