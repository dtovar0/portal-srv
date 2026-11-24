"""Configuración del autoservicio de contraseñas (FNC-174).

Único lugar que lee las variables de entorno del autoservicio y sus alias
heredados (el `.env` de un entorno antiguo podría seguir usándolos).
Se lee en cada llamada, nunca al importar: la configuración puede cambiar
sin reiniciar y las pruebas la modifican.
"""
import os

from app.modules.users.politica_contrasena import cargar_politica

# Logger padre del autoservicio: la depuración de LDAP (directory/depuracion.py) engancha este nombre
# y los módulos hijos le propagan sus registros.
LOGGER_AUTOSERVICIO = 'app.modules.auth.autoservicio'

# Variables principales y alias heredados (registro: docs/configuracion/VARIABLES.md).
VAR_MFA_HABILITADO = 'AUTOSERVICIO_MFA_ENABLED'
VAR_MFA_TIPO = 'AUTOSERVICIO_MFA_TIPO'
VAR_MFA_TTL_MINUTOS = 'AUTOSERVICIO_MFA_TTL_MINUTOS'
ALIAS_MFA_TTL_MINUTOS = 'AUTOSERVICIO_MFA_EXPIRACION_MINUTOS'
VAR_MFA_TTL_SEGUNDOS = 'AUTOSERVICIO_MFA_TTL_SEGUNDOS'
ALIAS_MFA_TTL_SEGUNDOS = 'AUTOSERVICIO_MFA_EXPIRACION_SEGUNDOS'
VAR_AUTHELIA_URL = 'AUTHELIA_URL'
ALIAS_AUTHELIA_URL = 'AUTHELIA_SSO_URL'
VAR_OIDC_ISSUER_URL = 'OIDC_ISSUER_URL'
VAR_LONGITUD_GENERADA = 'PASSWORD_POLICY_GENERATED_LENGTH'
ALIAS_LONGITUD_GENERADA = 'AUTOSERVICIO_PASSWORD_LENGTH'
VAR_JUMPSERVER_URL = 'JUMPSERVER_API_URL'
ALIAS_JUMPSERVER_URL = 'JUMPSERVER_URL'
VAR_JUMPSERVER_TOKEN = 'JUMPSERVER_API_TOKEN'
VAR_DEBUG_SMTP = 'DEBUG_SMTP'

# SMTP dedicado del autoservicio y SMTP general del portal.
VAR_SMTP_DEDICADO = {
    'server': 'AUTOSERVICIO_SMTP_SERVER',
    'port': 'AUTOSERVICIO_SMTP_PORT',
    'user': 'AUTOSERVICIO_SMTP_USER',
    'password': 'AUTOSERVICIO_SMTP_PASSWORD',
    'encryption': 'AUTOSERVICIO_SMTP_ENCRYPTION',
    'sender_name': 'AUTOSERVICIO_SMTP_SENDER_NAME',
    'sender_email': 'AUTOSERVICIO_SMTP_SENDER_EMAIL',
}
VAR_SMTP_GENERAL = {
    'server': 'SMTP_SERVER',
    'port': 'SMTP_PORT',
    'user': 'SMTP_USER',
    'password': 'SMTP_PASSWORD',
    'encryption': 'SMTP_ENCRYPTION',
    'sender_name': 'SMTP_SENDER_NAME',
    'sender_email': 'SMTP_SENDER_EMAIL',
}

# Valores por omisión.
MARCA_NOMBRE = 'Authelia'
MARCA_TITULO = 'Authelia · Autoservicio de Identidad'
REMITENTE_NOMBRE_POR_OMISION = 'Authelia • Autoservicio de Identidad'
REMITENTE_CORREO_POR_OMISION = 'authelia@vivaro.com'
SMTP_PUERTO_POR_OMISION = '587'
SMTP_CIFRADO_POR_OMISION = 'starttls'
MFA_TIPO_POR_OMISION = 'email'
LONGITUD_GENERADA_POR_OMISION = 16
TOKEN_MAX_AGE_SEGUNDOS = 900  # 15 minutos: vida del enlace de recuperación
MFA_MAX_AGE_SEGUNDOS = 600    # 10 minutos para código de 6 dígitos
MFA_TTL_MINIMO_SEGUNDOS = 30
MFA_TTL_MINIMO_MINUTOS_EN_SEGUNDOS = 60
SEGUNDOS_POR_MINUTO = 60


def leer_variable(*nombres):
    """Primer valor no vacío (sin recortar) entre la variable y sus alias."""
    for nombre in nombres:
        valor = os.getenv(nombre)
        if valor:
            return valor
    return ''


def clave_secreta():
    """Clave de firma de la aplicación. Sin respaldo fijo (FNC-177): la app no
    arranca sin `SECRET_KEY` (`app/__init__.py`), y una clave conocida
    permitiría falsificar enlaces y códigos."""
    from flask import current_app
    return current_app.config['SECRET_KEY']


def smtp_depuracion_activa():
    return leer_variable(VAR_DEBUG_SMTP).strip().lower() == 'true'


def _env_bool(nombre, por_defecto=False):
    val = (os.getenv(nombre) or '').strip().lower()
    if val in ('true', '1', 'si', 'yes', 'on'):
        return True
    if val in ('false', '0', 'no', 'off'):
        return False
    return por_defecto


def mfa_habilitado():
    """True si la verificación MFA está activada para el autoservicio."""
    return _env_bool(VAR_MFA_HABILITADO, True)


def tipo_mfa():
    """Tipo de MFA configurado: 'email', 'authenticator' o 'ambos'."""
    return (os.getenv(VAR_MFA_TIPO) or MFA_TIPO_POR_OMISION).strip().lower()


def tiempo_expiracion_mfa():
    """Tiempo de expiración en segundos para el código MFA de correo (por defecto 600s = 10 minutos).
    Configurable vía AUTOSERVICIO_MFA_TTL_MINUTOS o AUTOSERVICIO_MFA_TTL_SEGUNDOS (y sus alias heredados).
    """
    val_min = leer_variable(VAR_MFA_TTL_MINUTOS, ALIAS_MFA_TTL_MINUTOS).strip()
    if val_min:
        try:
            return max(MFA_TTL_MINIMO_MINUTOS_EN_SEGUNDOS, int(val_min) * SEGUNDOS_POR_MINUTO)
        except ValueError:
            pass
    val_sec = leer_variable(VAR_MFA_TTL_SEGUNDOS, ALIAS_MFA_TTL_SEGUNDOS).strip()
    if val_sec:
        try:
            return max(MFA_TTL_MINIMO_SEGUNDOS, int(val_sec))
        except ValueError:
            pass
    return MFA_MAX_AGE_SEGUNDOS


def url_jumpserver():
    """URL de JumpServer sin barra final; vacía = no se avisa."""
    return leer_variable(VAR_JUMPSERVER_URL, ALIAS_JUMPSERVER_URL).strip().rstrip('/')


def token_jumpserver():
    return leer_variable(VAR_JUMPSERVER_TOKEN).strip()


def obtener_politica_contrasena():
    """Retorna el diccionario con las reglas públicas de la política de contraseñas."""
    return cargar_politica().publica()


def obtener_configuracion_autoservicio():
    """Retorna la configuración de identidad, MFA y políticas para el frontend."""
    ttl_seg = tiempo_expiracion_mfa()
    authelia_url = leer_variable(VAR_AUTHELIA_URL, ALIAS_AUTHELIA_URL, VAR_OIDC_ISSUER_URL).strip() or None
    cfg_gen = leer_variable(VAR_LONGITUD_GENERADA, ALIAS_LONGITUD_GENERADA).strip()
    longitud_generada = int(cfg_gen) if cfg_gen.isdigit() else LONGITUD_GENERADA_POR_OMISION
    return {
        'status': 'success',
        'brand_name': MARCA_NOMBRE,
        'brand_title': MARCA_TITULO,
        'mfa_enabled': mfa_habilitado(),
        'mfa_tipo': tipo_mfa(),
        'mfa_ttl_segundos': ttl_seg,
        'mfa_ttl_minutos': max(1, ttl_seg // SEGUNDOS_POR_MINUTO),
        'authelia_url': authelia_url,
        'politica': cargar_politica().publica(),
        'password_length': longitud_generada,
    }
