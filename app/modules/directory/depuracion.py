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


def _es_directorio_escribible(carpeta):
    """Verifica si un directorio existe o se puede crear y permite escritura real."""
    if not carpeta:
        return False
    try:
        os.makedirs(carpeta, exist_ok=True)
        prueba = os.path.join(carpeta, '.probe_write')
        with open(prueba, 'w') as f:
            f.write('ok')
        try:
            os.remove(prueba)
        except OSError:
            pass
        return True
    except (OSError, PermissionError):
        return False


def resolver_carpeta_logs(entorno=None):
    """Devuelve la ruta al directorio de logs que tenga permisos de escritura.

    Prioriza:
    1. Variable de entorno `LOG_DIR` o `LOGDIR` si está configurada.
    2. Directorios estándar de despliegue (`/var/log/portal`, `/var/log/portal-backend`).
    3. Carpeta `logs/` en la raíz del proyecto (para desarrollo o despliegues permisivos).
    4. Carpeta `logs/` en el directorio de trabajo actual (`os.getcwd()`).
    5. Directorio temporal `/tmp/portal_logs` (garantizado por `PrivateTmp=true` en systemd).
    """
    entorno = os.environ if entorno is None else entorno

    candidatos = []

    # 1. Variables de entorno explícitas
    for var in ('LOG_DIR', 'LOGDIR'):
        val = (entorno.get(var) or '').strip()
        if val:
            candidatos.append(val)

    # 2. Directorios estándar de despliegue en Linux
    for ruta_estandar in ('/var/log/portal', '/var/log/portal-backend'):
        candidatos.append(ruta_estandar)

    # 3. Carpeta 'logs/' en la raíz del proyecto
    raiz_proyecto = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    candidatos.append(os.path.join(raiz_proyecto, CARPETA_LOG))

    # 4. Carpeta 'logs/' en cwd
    candidatos.append(os.path.join(os.getcwd(), CARPETA_LOG))

    # 5. Directorio temporal del sistema (seguro con PrivateTmp)
    candidatos.append(os.path.join('/tmp', 'portal_logs'))

    for carpeta in candidatos:
        if _es_directorio_escribible(carpeta):
            return carpeta

    return None


def activar_si_se_pide(entorno=None):
    """Activa el log detallado si `DEBUG_LDAP` vale `true`."""
    entorno = os.environ if entorno is None else entorno
    if entorno.get(VAR_DEBUG) != 'true':
        return False
    set_library_log_detail_level(EXTENDED)

    formato = logging.Formatter('%(asctime)s [%(levelname)s] [%(name)s]: %(message)s')
    manejador_consola = logging.StreamHandler()
    manejador_consola.setFormatter(formato)

    manejador_archivo = None
    carpeta = resolver_carpeta_logs(entorno)
    ruta_archivo = None

    if carpeta:
        try:
            ruta_archivo = os.path.join(carpeta, ARCHIVO_LOG)
            manejador_archivo = logging.FileHandler(ruta_archivo, encoding='utf-8')
            manejador_archivo.setFormatter(formato)
        except (OSError, PermissionError) as exc:
            logging.getLogger(__name__).warning(
                "No se pudo crear archivo de log en %s (%s). Se usará registro en consola.",
                carpeta, exc
            )
            manejador_archivo = None

    # 1. Logger de ldap3 (operaciones y protocolo de bajo nivel)
    registro_ldap3 = logging.getLogger('ldap3')
    registro_ldap3.setLevel(logging.DEBUG)
    if manejador_archivo and ruta_archivo:
        tiene_archivo_ldap = any(
            isinstance(h, logging.FileHandler) and getattr(h, 'baseFilename', '') == ruta_archivo
            for h in registro_ldap3.handlers
        )
        if not tiene_archivo_ldap:
            registro_ldap3.addHandler(manejador_archivo)

    if not any(isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler) for h in registro_ldap3.handlers):
        registro_ldap3.addHandler(manejador_consola)

    # 2. Loggers de la aplicación relacionados con LDAP y Autoservicio
    if manejador_archivo and ruta_archivo:
        loggers_app = (
            'app.modules.directory',
            'app.modules.auth.autoservicio',
            'app.modules.users.entrega_credenciales',
        )
        for nombre in loggers_app:
            reg = logging.getLogger(nombre)
            reg.setLevel(logging.DEBUG)
            tiene_archivo = any(
                isinstance(h, logging.FileHandler) and getattr(h, 'baseFilename', '') == ruta_archivo
                for h in reg.handlers
            )
            if not tiene_archivo:
                reg.addHandler(manejador_archivo)

    return True
