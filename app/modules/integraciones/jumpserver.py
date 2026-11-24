"""Sincronización de la contraseña con JumpServer (FNC-174, FNC-190).

JumpServer guarda la contraseña de cada persona para su autologin: cada cambio
de contraseña tiene que llegar hasta allá. Un solo punto lo dispara:
`EscritorDirectorio` avisa a los oyentes registrados (`registrar_oyente_...`
en `directory/writer.py`) cuando Password Modify termina en `HECHO`, sea cual
sea el camino (autoservicio, «Editar usuario», alta, entrega y worker, CLI,
rotación). Las cuentas `local` sin LDAP (fallback del autoservicio) llaman
`sincronizar_contrasena` directamente.

- Sin `JUMPSERVER_API_URL` (o alias `JUMPSERVER_URL`) no hace nada.
- La URL debe ser `https` con nombre de host (sin IP): el token viaja en la
  petición. Una URL inválida se registra y no se llama.
- No sigue redirecciones (el cuerpo lleva la contraseña): un 3xx es un fallo.
- Un fallo de JumpServer NO revierte LDAP ni rompe el flujo: se registra (solo
  el tipo del error) y queda en auditoría (con sesión propia) «JUMPSERVER: SINCRONIZACIÓN
  FALLIDA» con el identificador, para que el administrador lo vea.
- La contraseña nunca aparece en logs, auditoría ni errores.
"""
import logging
from urllib.parse import urlsplit

import requests

from flask import has_request_context
from sqlalchemy.orm import Session

from app import db
from app.modules.audit.ip_cliente import ip_cliente
from app.modules.audit.models import AuditLog
from app.modules.audit.services import IP_INTERNA, _actor
from app.modules.auth.autoservicio_config import (token_jumpserver,
                                                  url_jumpserver)
from app.modules.directory.configuracion import es_ip_literal
from app.modules.directory.writer import registrar_oyente_cambio_contrasena

logger = logging.getLogger(__name__)

RUTA_SYNC_JUMPSERVER = '/api/v1/users/credentials/sync/'
TIMEOUT_JUMPSERVER_SEGUNDOS = 5
ESQUEMA_PERMITIDO = 'https'
ACCION_FALLIDA = 'JUMPSERVER: SINCRONIZACIÓN FALLIDA'
MODULO_AUDITORIA = 'Integraciones'
# Un 3xx también es fallo: no se sigue (el cuerpo lleva la contraseña).
ESTADO_ERROR_MINIMO = 300
LARGO_OBJETIVO = 255


def _url_valida(url):
    partes = urlsplit(url)
    return (partes.scheme == ESQUEMA_PERMITIDO and bool(partes.hostname)
            and not es_ip_literal(partes.hostname))


def _registrar_fallo(identificador, motivo):
    logger.warning('JumpServer: no se sincronizó la contraseña (%s).', motivo)
    try:
        # Sesión propia: el oyente corre en medio de la transacción de quien
        # cambia la contraseña (alta, «Editar usuario») y no debe confirmar ni
        # deshacer lo que esa transacción tiene pendiente.
        usuario, actor_id = _actor(False)
        ip = ip_cliente() if has_request_context() else IP_INTERNA
        with Session(db.engine) as sesion:
            sesion.add(AuditLog(
                user=usuario, actor_id=actor_id, action=ACCION_FALLIDA,
                status='error', module=MODULO_AUDITORIA,
                target=str(identificador)[:LARGO_OBJETIVO], ip_address=ip,
                detail=f'No se pudo sincronizar la contraseña de '
                       f'{identificador} con JumpServer ({motivo}).'))
            sesion.commit()
    except Exception as exc:  # la auditoría nunca rompe el flujo
        logger.error('JumpServer: no se auditó el fallo (%s).',
                     type(exc).__name__)


def sincronizar_contrasena(identificador, contrasena):
    """Avisa a JumpServer de la contraseña nueva de `identificador`; nunca lanza."""
    url = url_jumpserver()
    if not url:
        return
    if not _url_valida(url):
        _registrar_fallo(identificador, 'URL no válida: se exige https con '
                                        'nombre de host')
        return
    token = token_jumpserver()
    cabeceras = {'Authorization': f'Bearer {token}'} if token else {}
    try:
        respuesta = requests.post(
            f'{url}{RUTA_SYNC_JUMPSERVER}',
            json={'username': identificador, 'password': contrasena},
            headers=cabeceras, timeout=TIMEOUT_JUMPSERVER_SEGUNDOS,
            allow_redirects=False)
    except Exception as exc:  # solo el tipo: el texto podría llevar la URL
        _registrar_fallo(identificador, type(exc).__name__)
        return
    if respuesta.status_code >= ESTADO_ERROR_MINIMO:
        _registrar_fallo(identificador, f'HTTP {respuesta.status_code}')
        return
    logger.info('JumpServer: contraseña sincronizada (HTTP %s).',
                respuesta.status_code)


def registrar():
    """Conecta la sincronización al cambio de contraseña del directorio."""
    registrar_oyente_cambio_contrasena(sincronizar_contrasena)
