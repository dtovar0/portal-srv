"""Cliente OIDC (Authlib) de Authelia: código de autorización con PKCE (FNC-141, ADR-009).

- La petición de autorización lleva `state`, `nonce` y `code_challenge` (S256);
  Authlib guarda `state`, `nonce` y `code_verifier` en la sesión firmada del
  portal (cookie `HttpOnly`), nunca en una respuesta ni en una URL.
- Al volver, Authlib valida `state`, canjea el `code` con el `code_verifier` y
  valida el ID token (firma por JWKS, `iss`, `aud`, `exp`, `nonce`).
- Los claims (`email`, `name`) se leen del endpoint userinfo, que Authelia
  4.38+ usa para ellos, y se cruzan con el ID token por `sub`.
- El rol nunca se lee del token (SEG-10): este módulo solo devuelve identidad.
"""
import logging
from dataclasses import dataclass
from urllib.parse import urlencode, urlsplit

from authlib.integrations.flask_client import OAuth
from flask import current_app

from app.modules.auth.oidc_configuracion import (TIEMPO_ESPERA_SEGUNDOS,
                                                 ConfiguracionOidc,
                                                 ErrorConfiguracionOidc,
                                                 leer_configuracion)

logger = logging.getLogger(__name__)

NOMBRE_CLIENTE = 'authelia'
RUTA_DESCUBRIMIENTO = '/.well-known/openid-configuration'
RUTA_INICIO_PORTAL = '/login'

# Códigos de `/login?error=` (docs/contratos/autenticacion.md).
ERROR_NO_DISPONIBLE = 'oidc_no_disponible'
ERROR_DENEGADO = 'acceso_denegado'
ERROR_AUTENTICACION = 'autenticacion_fallida'
ERROR_IDENTIDAD = 'identidad_incompleta'
ERROR_CUENTA = 'cuenta_no_disponible'
# Códigos de error OAuth que se auditan tal cual; cualquier otro texto del
# callback (lo elige quien llama) se audita como «otro» (revisión de seguridad).
CODIGOS_OAUTH_AUDITABLES = frozenset({
    'invalid_request', 'unauthorized_client', 'access_denied', 'unsupported_response_type',
    'invalid_scope', 'server_error', 'temporarily_unavailable', 'mismatching_state',
    'invalid_grant', 'invalid_client', 'login_required', 'consent_required',
    'interaction_required'})


class ErrorOidc(Exception):
    """Fallo del flujo OIDC; `codigo` es el de `?error=` y `motivo` solo va a la auditoría."""

    def __init__(self, codigo, motivo):
        super().__init__(motivo)
        self.codigo = codigo
        self.motivo = motivo


@dataclass(frozen=True)
class Identidad:
    sub: str
    correo: str
    nombre: str
    grupos: tuple[str, ...] = ()


# Un cliente por configuración: conserva el descubrimiento y las llaves en memoria.
_clientes = {}


def reiniciar_clientes():
    """Olvida los clientes creados (pruebas, o tras cambiar la configuración)."""
    _clientes.clear()


def configuracion():
    """Configuración vigente, o `None` si el OIDC no está configurado."""
    try:
        return leer_configuracion()
    except ErrorConfiguracionOidc:
        logger.error('OIDC: configuración inválida; el acceso por Authelia queda apagado.')
        return None


def oidc_habilitado():
    return configuracion() is not None


def cliente(config: ConfiguracionOidc):
    """Cliente de Authlib para `config` (se crea una vez por configuración)."""
    clave = (config.issuer, config.client_id, config.scopes, config.client_secret)
    if clave not in _clientes:
        registro = OAuth(current_app._get_current_object())
        registro.register(
            name=NOMBRE_CLIENTE,
            client_id=config.client_id,
            client_secret=config.client_secret,
            server_metadata_url=f'{config.issuer}{RUTA_DESCUBRIMIENTO}',
            client_kwargs={
                'scope': config.scopes,
                'code_challenge_method': 'S256',
                'token_endpoint_auth_method': 'client_secret_basic',
                'default_timeout': TIEMPO_ESPERA_SEGUNDOS,
            })
        _clientes[clave] = registro.create_client(NOMBRE_CLIENTE)
    return _clientes[clave]


def _texto(valor):
    return valor.strip() if isinstance(valor, str) else ''


def identidad_del_callback(config: ConfiguracionOidc) -> Identidad:
    """Completa el flujo del callback y devuelve la identidad verificada.

    Lanza `ErrorOidc` con el código para el cliente; nunca incluye tokens,
    `code` ni `state` en el motivo.
    """
    from authlib.integrations.base_client.errors import OAuthError
    remoto = cliente(config)
    try:
        # `iss` contra OIDC_ISSUER_URL, no solo contra el descubrimiento.
        token = remoto.authorize_access_token(claims_options={
            'iss': {'essential': True, 'values': [config.issuer, f'{config.issuer}/']}})
    except OAuthError as exc:
        if exc.error == 'access_denied':
            raise ErrorOidc(ERROR_DENEGADO, 'Authelia negó el acceso') from None
        codigo = exc.error if exc.error in CODIGOS_OAUTH_AUDITABLES else 'otro'
        raise ErrorOidc(ERROR_AUTENTICACION, f'OIDC: {codigo}') from None
    except Exception as exc:
        raise ErrorOidc(ERROR_AUTENTICACION,
                        f'OIDC: {type(exc).__name__} al validar el callback') from None

    # Authlib solo valida el ID token si viene; aquí es obligatorio.
    claims_id = token.get('userinfo')
    if not claims_id or not _texto(claims_id.get('sub')):
        raise ErrorOidc(ERROR_AUTENTICACION, 'OIDC: la respuesta no trae ID token válido')
    sub = _texto(claims_id['sub'])

    try:
        claims = dict(claims_id)
        if token.get('access_token'):
            informacion = remoto.userinfo(token=token)
            if _texto(informacion.get('sub')) != sub:
                raise ErrorOidc(ERROR_AUTENTICACION, 'OIDC: el sub de userinfo no coincide')
            claims.update(informacion)
    except ErrorOidc:
        raise
    except Exception as exc:
        raise ErrorOidc(ERROR_AUTENTICACION,
                        f'OIDC: {type(exc).__name__} al leer userinfo') from None

    correo = _texto(claims.get('email')).lower()
    if not correo:
        raise ErrorOidc(ERROR_IDENTIDAD, 'OIDC: el token no trae correo')
    # Si Authelia publica `email_verified`, se exige verdadero. No se exige que
    # venga: el correo sale del `mail` de LDAP, que solo escribe el portal tras
    # comprobar que no está repetido (revisión de seguridad, hallazgo 4).
    if claims.get('email_verified') is False:
        raise ErrorOidc(ERROR_IDENTIDAD, 'OIDC: correo no verificado')
    nombre = _texto(claims.get('name')) or correo

    grupos_candidatos = []
    for fuente in (claims.get('groups'), claims.get('group'),
                   claims_id.get('groups') if isinstance(claims_id, dict) else None,
                   claims_id.get('group') if isinstance(claims_id, dict) else None):
        if fuente:
            if isinstance(fuente, (str, bytes)):
                grupos_candidatos.append(fuente)
            elif isinstance(fuente, (list, tuple, set)):
                grupos_candidatos.extend(fuente)
    vistos = set()
    grupos_limpios = []
    for g in grupos_candidatos:
        txt = str(g).strip()
        if txt and txt not in vistos:
            vistos.add(txt)
            grupos_limpios.append(txt)
    return Identidad(sub=sub, correo=correo, nombre=nombre, grupos=tuple(grupos_limpios))


def _origen(url):
    partes = urlsplit(url)
    return f'{partes.scheme}://{partes.netloc}'


def origen_del_portal(config: ConfiguracionOidc):
    """`https://<host del portal>`, según `OIDC_REDIRECT_URI`."""
    return _origen(config.redirect_uri)


def url_de_cierre(config: ConfiguracionOidc):
    """URL de cierre de sesión de Authelia, o `None`.

    Sale de la configuración (`OIDC_LOGOUT_URL`) y, si falta, del
    `end_session_endpoint` del descubrimiento; nunca del `Host` de la petición.
    El retorno es la pantalla de acceso del portal, según `OIDC_REDIRECT_URI`.
    """
    retorno = f'{origen_del_portal(config)}{RUTA_INICIO_PORTAL}'
    if config.logout_url:
        separador = '&' if urlsplit(config.logout_url).query else '?'
        return f'{config.logout_url}{separador}{urlencode({"rd": retorno})}'
    try:
        metadatos = cliente(config).load_server_metadata()
    except Exception:
        logger.warning('OIDC: no se pudo leer el descubrimiento para el cierre de sesión.')
        return None
    fin = _texto(metadatos.get('end_session_endpoint'))
    if not fin:
        return None
    separador = '&' if urlsplit(fin).query else '?'
    return f'{fin}{separador}{urlencode({"client_id": config.client_id, "post_logout_redirect_uri": retorno})}'
