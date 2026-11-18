"""Protección CSRF de la API v1 por origen (FNC-008, SEG-06, SEC-SES-04).

Verificación de origen (OWASP «Verifying Origin With Standard Headers»): toda
escritura (`POST`, `PUT`, `PATCH`, `DELETE`) a `/api/` se rechaza con
`403 csrf_invalido` si

- `Sec-Fetch-Site` es `cross-site`, o
- `Origin` (o, sin él, `Referer`) no es el host del portal: `Host` o
  `X-Forwarded-Host` (el que pone nginx o el rewrite de Next en desarrollo;
  un sitio ajeno no puede fijarlo en el navegador de la víctima sin
  *preflight* CORS), o `Origin: null`.

Sin `Origin` ni `Referer` (clientes que no son navegador: no son vector de
CSRF) la petición pasa. La cookie de sesión va con `SameSite=Lax`.
"""
from urllib.parse import urlsplit

from flask import request

from app.modules.api.csrf_provisional import CSRF_INVALIDO, SITIO_AJENO
from app.modules.api.helpers import error_response

METODOS_DE_ESCRITURA = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})
PREFIJO_API = '/api/'
ORIGEN_OPACO = 'null'


def _host_de(url):
    try:
        return (urlsplit(url).netloc or '').lower()
    except ValueError:
        return ''


def _hosts_del_portal():
    hosts = {request.host.lower()}
    reenviado = request.headers.get('X-Forwarded-Host', '')
    if reenviado:
        hosts.add(reenviado.split(',')[0].strip().lower())
    return hosts


def rechazo_por_origen():
    """Respuesta `403` si la escritura viene de otro sitio; `None` si no."""
    if request.method not in METODOS_DE_ESCRITURA or not request.path.startswith(PREFIJO_API):
        return None
    if request.headers.get('Sec-Fetch-Site', '').lower() == SITIO_AJENO:
        return error_response(*CSRF_INVALIDO)
    origen = request.headers.get('Origin')
    if origen is None:
        origen = request.headers.get('Referer')
    if origen is None:
        return None
    if origen.strip().lower() == ORIGEN_OPACO or _host_de(origen) not in _hosts_del_portal():
        return error_response(*CSRF_INVALIDO)
    return None


def registrar(app):
    """Activa la verificación en todas las peticiones y `SameSite=Lax`."""
    # Flask trae estas claves en `None`: se fijan salvo que ya tengan valor.
    for clave in ('SESSION_COOKIE_SAMESITE', 'REMEMBER_COOKIE_SAMESITE'):
        if not app.config.get(clave):
            app.config[clave] = 'Lax'
    app.before_request(rechazo_por_origen)
