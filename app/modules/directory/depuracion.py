"""Log detallado de `ldap3` y operaciones de directorio con `DEBUG_LDAP=true`.

Escribe las tramas de red de `ldap3` y los eventos de aplicación de directorio
en la carpeta `logs/` (`logs/ldap_debug.log`) y en la consola.
`ldap3` oculta las contraseñas de bind en su log.
"""
import logging
import os

from ldap3.utils.log import EXTENDED, set_library_log_detail_level

VAR_DEBUG = 'DEBUG_LDAP'
CARPETA_LOG = 'logs'
ARCHIVO_LOG = 'ldap_debug.log'


def resolver_carpeta_logs(entorno=None):
    """Devuelve la ruta absoluta al directorio de logs.

    Prioriza `LOG_DIR` o `LOGDIR` si están definidos en el entorno; de lo
    contrario, utiliza la carpeta `logs/` en la raíz del proyecto.
    Garantiza que la carpeta exista antes de retornar.
    """
    entorno = os.environ if entorno is None else entorno
    directorio_configurado = (entorno.get('LOG_DIR') or entorno.get('LOGDIR') or '').strip()
    if directorio_configurado and os.path.isabs(directorio_configurado):
        carpeta = directorio_configurado
    else:
        raiz_proyecto = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        carpeta = os.path.join(raiz_proyecto, CARPETA_LOG)

    try:
        os.makedirs(carpeta, exist_ok=True)
    except Exception:
        carpeta = os.path.join(os.getcwd(), CARPETA_LOG)
        os.makedirs(carpeta, exist_ok=True)
    return carpeta


def activar_si_se_pide(entorno=None):
    """Activa el log detallado si `DEBUG_LDAP` vale `true`."""
    entorno = os.environ if entorno is None else entorno
    if entorno.get(VAR_DEBUG) != 'true':
        return False
    set_library_log_detail_level(EXTENDED)

    carpeta = resolver_carpeta_logs(entorno)
    ruta_archivo = os.path.join(carpeta, ARCHIVO_LOG)

    formato = logging.Formatter('%(asctime)s [%(levelname)s] [%(name)s]: %(message)s')
    manejador_archivo = logging.FileHandler(ruta_archivo, encoding='utf-8')
    manejador_archivo.setFormatter(formato)
    manejador_consola = logging.StreamHandler()
    manejador_consola.setFormatter(formato)

    # 1. Logger de ldap3 (operaciones y protocolo de bajo nivel)
    registro_ldap3 = logging.getLogger('ldap3')
    registro_ldap3.setLevel(logging.DEBUG)
    tiene_archivo_ldap = any(
        isinstance(h, logging.FileHandler) and getattr(h, 'baseFilename', '') == ruta_archivo
        for h in registro_ldap3.handlers
    )
    if not tiene_archivo_ldap:
        registro_ldap3.addHandler(manejador_archivo)
    if not any(isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler) for h in registro_ldap3.handlers):
        registro_ldap3.addHandler(manejador_consola)

    # 2. Loggers de la aplicación relacionados con LDAP y Autoservicio
    loggers_app = (
        'app.modules.directory',
        'app.modules.auth.autoservicio',
        'app.modules.users.entrega_credenciales',
    )
    for nombre in loggers_app:
        reg = logging.getLogger(nombre)
        reg.setLevel(logging.DEBUG)
        # Evitar duplicar FileHandler si ya apunta al mismo archivo
        tiene_archivo = any(
            isinstance(h, logging.FileHandler) and getattr(h, 'baseFilename', '') == ruta_archivo
            for h in reg.handlers
        )
        if not tiene_archivo:
            reg.addHandler(manejador_archivo)

    return True
