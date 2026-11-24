"""Sincronización de la contraseña con sistemas externos del autoservicio (FNC-174)."""
import logging

import requests

from app.modules.auth.autoservicio_config import (LOGGER_AUTOSERVICIO, token_jumpserver,
                                                  url_jumpserver)

logger = logging.getLogger(f'{LOGGER_AUTOSERVICIO}.externos')

RUTA_SYNC_JUMPSERVER = '/api/v1/users/credentials/sync/'
TIMEOUT_JUMPSERVER_SEGUNDOS = 5


def sincronizar_jumpserver_o_externos(identificador, nueva_contrasena):
    """Hook de sincronización hacia JumpServer / Bóvedas externas."""
    jumpserver_url = url_jumpserver()
    if not jumpserver_url:
        return
    token = token_jumpserver()
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    endpoint = f"{jumpserver_url}{RUTA_SYNC_JUMPSERVER}"
    try:
        resp = requests.post(endpoint, json={'username': identificador, 'password': nueva_contrasena},
                             headers=headers, timeout=TIMEOUT_JUMPSERVER_SEGUNDOS)
        logger.info("JumpServer webhook sync status: %s", resp.status_code)
    except Exception as exc:
        logger.warning("Fallo en sincronización con JumpServer (%s): %s", identificador, type(exc).__name__)
