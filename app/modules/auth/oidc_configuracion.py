"""Configuración del inicio de sesión por OIDC con Authelia (FNC-141, ADR-009).

Variables (`docs/configuracion/VARIABLES.md`):
- `OIDC_ISSUER_URL`: `https://<host de Authelia>`; nombre de host, nunca IP.
- `OIDC_CLIENT_ID`: identificador del cliente en Authelia (por defecto `portal`).
- `OIDC_CLIENT_SECRET`: secreto del cliente. Solo en `.env` o en el gestor de
  secretos; sin valor por defecto, y nunca aparece en logs ni en mensajes.
- `OIDC_REDIRECT_URI`: `https://<host del portal>/api/v1/auth/oidc/callback`,
  igual a la registrada en Authelia.
- `OIDC_SCOPES`: por defecto `openid profile email groups`.
  Incluye `groups` para que Authelia entregue la membresía de grupos (FNC-143).
- `OIDC_LOGOUT_URL`: URL de cierre de sesión de Authelia (ADR-009 4B). Obligatoria
  fuera de desarrollo: sin ella, «Cerrar sesión» no cierra la sesión de Authelia y
  en un equipo compartido el siguiente entra como el anterior (revisión de seguridad).

Fuera de desarrollo, las cuatro primeras son obligatorias y deben usar `https`;
si falta una, la app no arranca. En desarrollo, sin ninguna `OIDC_*` el acceso
por Authelia queda apagado (se entra por la ruta de emergencia).

`OIDC_HABILITADO=false` (FNC-157) apaga Authelia también fuera de desarrollo, para
instalar antes de configurarlo: solo entra la cuenta de emergencia por
`/acceso-emergencia`. Vacía o `true` = encendido (lo de siempre); otro valor es error.
"""
import os
from dataclasses import dataclass, field
from urllib.parse import urlsplit

from app.modules.directory.configuracion import es_ip_literal

VAR_ISSUER = 'OIDC_ISSUER_URL'
VAR_CLIENT_ID = 'OIDC_CLIENT_ID'
VAR_CLIENT_SECRET = 'OIDC_CLIENT_SECRET'
VAR_REDIRECT_URI = 'OIDC_REDIRECT_URI'
VAR_SCOPES = 'OIDC_SCOPES'
VAR_LOGOUT_URL = 'OIDC_LOGOUT_URL'
VAR_HABILITADO = 'OIDC_HABILITADO'
VALORES_APAGADO = frozenset({'false', '0', 'no'})
VALORES_ENCENDIDO = frozenset({'', 'true', '1', 'si', 'sí', 'yes'})
PREFIJO = 'OIDC_'

VAR_ENTORNO = 'APP_ENV'
ENTORNO_DESARROLLO = 'development'

CLIENT_ID_POR_DEFECTO = 'portal'
SCOPES_POR_DEFECTO = 'openid profile email groups'
ESQUEMA = 'https'
# Espera de cada llamada a Authelia (descubrimiento, JWKS, token, userinfo).
TIEMPO_ESPERA_SEGUNDOS = 10


class ErrorConfiguracionOidc(RuntimeError):
    """Variable `OIDC_*` ausente o insegura (el texto nunca lleva valores)."""


@dataclass(frozen=True)
class ConfiguracionOidc:
    issuer: str
    client_id: str
    client_secret: str = field(repr=False)
    redirect_uri: str
    scopes: str
    logout_url: str | None


def _leer(entorno, nombre):
    return (entorno.get(nombre) or '').strip()


def es_desarrollo(entorno=None):
    entorno = os.environ if entorno is None else entorno
    return _leer(entorno, VAR_ENTORNO).lower() == ENTORNO_DESARROLLO


def hay_variables_oidc(entorno=None):
    """`True` si alguna variable `OIDC_*` tiene valor."""
    entorno = os.environ if entorno is None else entorno
    return any(clave.startswith(PREFIJO) and clave != VAR_HABILITADO
               and (valor or '').strip() for clave, valor in entorno.items())


def oidc_apagado(entorno=None):
    """`True` con `OIDC_HABILITADO=false` (FNC-157); valor no reconocido = error."""
    entorno = os.environ if entorno is None else entorno
    valor = _leer(entorno, VAR_HABILITADO).lower()
    if valor in VALORES_APAGADO:
        return True
    if valor in VALORES_ENCENDIDO:
        return False
    raise ErrorConfiguracionOidc(f'{VAR_HABILITADO} debe ser true o false.')


def _url_https(valor, nombre, entorno):
    partes = urlsplit(valor)
    esquema_admitido = (partes.scheme.lower() == ESQUEMA
                        or (es_desarrollo(entorno) and partes.scheme.lower() == 'http'))
    if not esquema_admitido:
        raise ErrorConfiguracionOidc(f'{nombre} debe usar https://.')
    if partes.username or partes.password or partes.fragment:
        raise ErrorConfiguracionOidc(
            f'{nombre} no admite usuario, contraseña ni fragmento.')
    host = partes.hostname
    if not host or es_ip_literal(host):
        raise ErrorConfiguracionOidc(
            f'{nombre} debe usar un nombre de host, no una dirección IP.')
    try:
        partes.port
    except ValueError:
        raise ErrorConfiguracionOidc(f'{nombre} tiene un puerto inválido.') from None
    return valor


def _requerida(entorno, nombre):
    valor = _leer(entorno, nombre)
    if not valor:
        raise ErrorConfiguracionOidc(f'Falta {nombre}.')
    return valor


def leer_configuracion(entorno=None):
    """Configuración validada, o `None` si el OIDC no está configurado.

    Fuera de desarrollo, la falta de variables es un error. En desarrollo,
    sin ninguna `OIDC_*` devuelve `None`; con alguna, exige todas.
    """
    entorno = os.environ if entorno is None else entorno
    if oidc_apagado(entorno):
        return None
    if not hay_variables_oidc(entorno):
        if es_desarrollo(entorno):
            return None
        raise ErrorConfiguracionOidc(
            f'Faltan {VAR_ISSUER}, {VAR_CLIENT_SECRET} y {VAR_REDIRECT_URI}: '
            'el inicio de sesión es solo por Authelia.')
    issuer = _url_https(_requerida(entorno, VAR_ISSUER), VAR_ISSUER, entorno)
    if urlsplit(issuer).query:
        raise ErrorConfiguracionOidc(f'{VAR_ISSUER} no admite consulta.')
    # Sin `strip()`: un secreto puede empezar o terminar en espacio.
    secreto = entorno.get(VAR_CLIENT_SECRET) or ''
    if not secreto.strip():
        raise ErrorConfiguracionOidc(f'Falta {VAR_CLIENT_SECRET}.')
    redirect_uri = _url_https(_requerida(entorno, VAR_REDIRECT_URI),
                              VAR_REDIRECT_URI, entorno)
    scopes = _leer(entorno, VAR_SCOPES) or SCOPES_POR_DEFECTO
    if 'openid' not in scopes.split():
        raise ErrorConfiguracionOidc(f'{VAR_SCOPES} debe incluir openid.')
    logout = _leer(entorno, VAR_LOGOUT_URL)
    if logout:
        _url_https(logout, VAR_LOGOUT_URL, entorno)
    elif not es_desarrollo(entorno):
        raise ErrorConfiguracionOidc(
            f'Falta {VAR_LOGOUT_URL}: sin ella, cerrar sesión no cierra la sesión de '
            'Authelia.')
    return ConfiguracionOidc(
        issuer=issuer.rstrip('/'),
        client_id=_leer(entorno, VAR_CLIENT_ID) or CLIENT_ID_POR_DEFECTO,
        client_secret=secreto, redirect_uri=redirect_uri, scopes=scopes,
        logout_url=logout or None)


def validar_al_arrancar():
    """Variables `OIDC_*` inválidas (o ausentes fuera de desarrollo) detienen el arranque."""
    leer_configuracion()
