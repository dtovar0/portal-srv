"""Proveedor OIDC simulado para las pruebas (FNC-141): sin red ni Authelia real.

Sustituye `requests.Session.request`, por donde Authlib hace el descubrimiento,
pide las llaves (JWKS), canjea el `code` y lee userinfo. Firma ID tokens reales
(RS256) con una llave generada en la prueba, así que la validación de Authlib
(firma, `iss`, `aud`, `exp`, `nonce`) se ejercita de verdad.
"""
import json
import time
from base64 import urlsafe_b64encode
from hashlib import sha256
from urllib.parse import parse_qs, urlsplit

import requests
from authlib.jose import JsonWebKey, jwt

ISSUER = 'https://auth.pruebas.invalid'
CLIENT_ID = 'portal'
CLIENT_SECRET = 'secreto-ficticio-de-prueba'
REDIRECT_URI = 'https://portal.pruebas.invalid/api/v1/auth/oidc/callback'
CODIGO = 'codigo-ficticio'
SUB = 'sub-ficticio-0001'
CORREO = 'persona.oidc@pruebas.invalid'
NOMBRE = 'Persona OIDC'

VARIABLES = {
    'OIDC_ISSUER_URL': ISSUER,
    'OIDC_CLIENT_ID': CLIENT_ID,
    'OIDC_CLIENT_SECRET': CLIENT_SECRET,
    'OIDC_REDIRECT_URI': REDIRECT_URI,
}


def _respuesta(url, datos, estado=200):
    respuesta = requests.Response()
    respuesta.status_code = estado
    respuesta._content = json.dumps(datos).encode()
    respuesta.headers['Content-Type'] = 'application/json'
    respuesta.url = url
    respuesta.encoding = 'utf-8'
    return respuesta


def _desafio_s256(verificador):
    digest = sha256(verificador.encode()).digest()
    return urlsafe_b64encode(digest).rstrip(b'=').decode()


class ProveedorOidc:
    """Authelia de mentira. Los atributos se ajustan por prueba antes del callback."""

    def __init__(self):
        self.llave = JsonWebKey.generate_key('RSA', 2048, is_private=True,
                                             options={'kid': 'llave-1'})
        self.llave_ajena = JsonWebKey.generate_key('RSA', 2048, is_private=True,
                                                   options={'kid': 'llave-1'})
        self.fin_de_sesion = None
        # Claims del userinfo (Authelia 4.38+ publica ahí email y name).
        self.userinfo = {'sub': SUB, 'email': CORREO, 'name': NOMBRE,
                         'email_verified': True}
        # Cambios al ID token: valores a reemplazar; `None` quita el claim.
        self.id_token_cambios = {}
        self.firmar_con_llave_ajena = False
        self.token_sin_id_token = False
        self.error_del_token = None
        self.peticiones = []
        self.nonce = None

    # -- ID token ---------------------------------------------------------- #

    def id_token(self):
        ahora = int(time.time())
        claims = {'iss': ISSUER, 'aud': CLIENT_ID, 'sub': self.userinfo['sub'],
                  'iat': ahora, 'exp': ahora + 300, 'nonce': self.nonce,
                  'auth_time': ahora}
        for clave, valor in self.id_token_cambios.items():
            if valor is None:
                claims.pop(clave, None)
            else:
                claims[clave] = valor
        llave = self.llave_ajena if self.firmar_con_llave_ajena else self.llave
        cabecera = {'alg': 'RS256', 'kid': 'llave-1'}
        return jwt.encode(cabecera, claims, llave).decode()

    # -- Red simulada ------------------------------------------------------ #

    def metadatos(self):
        datos = {
            'issuer': ISSUER,
            'authorization_endpoint': f'{ISSUER}/api/oidc/authorization',
            'token_endpoint': f'{ISSUER}/api/oidc/token',
            'userinfo_endpoint': f'{ISSUER}/api/oidc/userinfo',
            'jwks_uri': f'{ISSUER}/jwks.json',
            'id_token_signing_alg_values_supported': ['RS256'],
            'code_challenge_methods_supported': ['S256'],
        }
        if self.fin_de_sesion:
            datos['end_session_endpoint'] = self.fin_de_sesion
        return datos

    def _atender(self, sesion, metodo, url, **kwargs):
        self.peticiones.append((metodo, url, kwargs))
        ruta = urlsplit(url).path
        if ruta == '/.well-known/openid-configuration':
            return _respuesta(url, self.metadatos())
        if ruta == '/jwks.json':
            return _respuesta(url, {'keys': [self.llave.as_dict(is_private=False)]})
        if ruta == '/api/oidc/token':
            if self.error_del_token:
                return _respuesta(url, {'error': self.error_del_token}, 400)
            datos = {'access_token': 'acceso-ficticio', 'token_type': 'Bearer',
                     'expires_in': 3600}
            if not self.token_sin_id_token:
                datos['id_token'] = self.id_token()
            return _respuesta(url, datos)
        if ruta == '/api/oidc/userinfo':
            return _respuesta(url, self.userinfo)
        raise AssertionError(f'Petición no simulada: {metodo} {url}')

    def instalar(self, monkeypatch):
        proveedor = self

        def peticion(sesion, metodo, url, **kwargs):
            return proveedor._atender(sesion, metodo, url, **kwargs)
        monkeypatch.setattr(requests.sessions.Session, 'request', peticion)
        for clave, valor in VARIABLES.items():
            monkeypatch.setenv(clave, valor)
        from app.modules.auth import oidc
        oidc.reiniciar_clientes()
        return self

    # -- Flujo ------------------------------------------------------------- #

    def empezar(self, cliente):
        """`GET /auth/oidc/login`: devuelve (respuesta, parámetros de la URL de Authelia)."""
        respuesta = cliente.get('/api/v1/auth/oidc/login')
        destino = respuesta.headers.get('Location', '')
        parametros = {k: v[0] for k, v in parse_qs(urlsplit(destino).query).items()}
        self.nonce = parametros.get('nonce')
        return respuesta, parametros

    def callback(self, cliente, state, codigo=CODIGO, **extra):
        consulta = {'code': codigo, 'state': state, **extra}
        return cliente.get('/api/v1/auth/oidc/callback', query_string=consulta)

    def entrar(self, cliente):
        """Flujo completo correcto: devuelve la respuesta del callback."""
        _, parametros = self.empezar(cliente)
        return self.callback(cliente, parametros['state'])

    def peticion_del_token(self):
        """Cuerpo (dict) del canje del `code`, o `None` si no hubo."""
        for metodo, url, kwargs in self.peticiones:
            if urlsplit(url).path == '/api/oidc/token':
                datos = kwargs.get('data')
                if isinstance(datos, (str, bytes)):
                    datos = {k: v[0] for k, v in parse_qs(
                        datos.decode() if isinstance(datos, bytes) else datos).items()}
                return datos
        return None


desafio_s256 = _desafio_s256
