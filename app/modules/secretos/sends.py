"""Sends de texto de Vaultwarden para entregar credenciales (FNC-136, ADR-008).

Dos modos, elegibles con `VAULTWARDEN_SEND_MODO` (decisión 10 del ADR-008):

- `api` (por defecto): `ClienteVaultwarden.crear_send_texto`, con la cuenta de
  servicio `VAULTWARDEN_*`. El cifrado es del lado del cliente: la llave del
  Send son 16 bytes aleatorios que viajan solo en el fragmento `#` del enlace
  (el servidor nunca los ve); el nombre y el texto se cifran con la llave
  derivada (HKDF) y la llave se guarda cifrada con la clave de usuario.
- `bw`: la CLI `bw` del servidor con una sesión ya desbloqueada
  (`VAULTWARDEN_BW_SESSION`). El JSON del Send entra por la entrada estándar
  (nunca por argumentos: se verían en la lista de procesos) y la sesión solo
  se pasa en el entorno del proceso hijo, junto con un entorno mínimo.

Reglas comunes: ningún valor (texto, llave, sesión, enlace) aparece en `repr`,
errores ni logs; un fallo transitorio es `GestorCaido` y uno permanente
`GestorMalConfigurado` (o `SendRechazado`, con su `motivo`). Borrar es
idempotente: un Send que ya no existe no es un error.
"""
import base64
import json
import logging
import os
import re
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from app.modules.secretos import cifrado
from app.modules.secretos.configuracion import (MODO_BW,
                                                ErrorConfiguracionSecretos,
                                                cargar_configuracion,
                                                cargar_configuracion_send)
from app.modules.secretos.vaultwarden import (ESTADOS_TRANSITORIOS,
                                              ClienteVaultwarden,
                                              ErrorDeGestor, GestorCaido,
                                              GestorMalConfigurado, _campo,
                                              cliente_del_entorno)

logger = logging.getLogger(__name__)

RUTA_SENDS = '/api/sends'
ESTADO_NO_ENCONTRADO = 404
# Id de un Send: GUID; solo eso se admite en la ruta de borrado.
PATRON_ID_SEND = re.compile(r'[0-9a-fA-F-]{36}')
TIPO_SEND_TEXTO = 0
MOTIVO_SEND_DESHABILITADO = 'send_deshabilitado'
MOTIVO_RECHAZADO = 'rechazado'
# Vaultwarden responde 400 con este texto cuando la política de la
# organización deshabilita los Sends.
MARCAS_POLITICA_SEND = ('policy', 'política')
FORMATO_FECHA = '%Y-%m-%dT%H:%M:%S.000Z'
MARCA_ENLACE_SEND = '#/send/'
ESQUEMA_ENLACE = 'https://'

TIEMPO_ESPERA_BW_SEGUNDOS = 30
# Entorno mínimo del proceso `bw`: nada más del entorno del portal (que tiene
# otras credenciales) llega al hijo.
ENTORNO_BW_PERMITIDO = ('PATH', 'HOME', 'LANG', 'LC_ALL', 'XDG_CONFIG_HOME',
                        'BITWARDENCLI_APPDATA_DIR', 'NODE_EXTRA_CA_CERTS',
                        'SSL_CERT_FILE')
VAR_SESION_BW = 'BW_SESSION'
# Salidas de error de `bw` (en minúsculas) por clase; solo se clasifican, el
# texto nunca se copia a un error ni al log.
SENALES_TRANSITORIAS = ('econnrefused', 'enotfound', 'etimedout',
                        'econnreset', 'fetch failed', 'getaddrinfo',
                        'socket hang up', 'network')
SENALES_NO_ENCONTRADO = ('not found',)


class SendRechazado(GestorMalConfigurado):
    """Vaultwarden o `bw` rechazó crear el Send (permanente); `motivo` dice por
    qué (`send_deshabilitado` o `rechazado`)."""

    def __init__(self, texto, motivo=MOTIVO_RECHAZADO):
        super().__init__(texto)
        self.motivo = motivo


@dataclass(frozen=True)
class SendCreado:
    """Un Send recién creado: `id` (para borrarlo) y `enlace` (secreto: lleva
    la llave en el fragmento, nunca se registra)."""

    id: str
    enlace: str = field(repr=False)

    def __str__(self):
        return repr(self)


def _fecha(momento):
    return momento.strftime(FORMATO_FECHA)


def fechas_del_send(cfg, ahora=None):
    """`(expiración, borrado)` como las pide Vaultwarden (UTC, ISO 8601)."""
    ahora = ahora or datetime.now(timezone.utc)
    return (_fecha(ahora + timedelta(days=cfg.caducidad_dias)),
            _fecha(ahora + timedelta(days=cfg.borrado_dias)))


def _b64_url(datos):
    return base64.urlsafe_b64encode(datos).rstrip(b'=').decode()


def construir_send(nombre, texto, clave_usuario, cfg, ahora=None):
    """`(cuerpo, material)`: el JSON de `POST /api/sends` con `name` y
    `text.text` cifrados con la llave derivada del Send, y la llave del Send
    (`key`) cifrada con la clave de usuario. `material` va al enlace."""
    material = cifrado.material_de_send()
    clave_send = cifrado.derivar_clave_send(material)
    expiracion, borrado = fechas_del_send(cfg, ahora)
    cuerpo = {
        'type': TIPO_SEND_TEXTO,
        'name': cifrado.cifrar_simetrico(nombre, clave_send),
        'notes': None,
        'key': cifrado.cifrar_simetrico(material, clave_usuario),
        'text': {'text': cifrado.cifrar_simetrico(texto, clave_send),
                 'hidden': True},
        'maxAccessCount': cfg.max_aperturas,
        'expirationDate': expiracion,
        'deletionDate': borrado,
        'disabled': False,
        'hideEmail': True,
    }
    return cuerpo, material


def enlace_de_send(base, acceso_id, material):
    """`<base>/#/send/<accessId>/<llave en base64url>`."""
    return f'{base.rstrip("/")}/{MARCA_ENLACE_SEND}{acceso_id}/' \
           f'{_b64_url(material)}'


def es_politica_de_send(cuerpo):
    """`True` si el cuerpo de un 400 dice que la política deshabilita los
    Sends. Solo se inspecciona; nunca se guarda ni se registra."""
    try:
        texto = cuerpo.decode('utf-8', 'ignore').lower()
    except AttributeError:
        return False
    return 'send' in texto and any(m in texto for m in MARCAS_POLITICA_SEND)


# --------------------------------------------------------------------------- #
# Modo `bw`
# --------------------------------------------------------------------------- #

class SendsPorCli:
    """Sends con la CLI `bw` (sesión desbloqueada en `BW_SESSION`)."""

    def __init__(self, configuracion, ejecutor=subprocess.run):
        self._cfg = configuracion
        self._ejecutor = ejecutor

    def __repr__(self):
        return '<SendsPorCli>'

    def _entorno(self):
        entorno = {k: os.environ[k] for k in ENTORNO_BW_PERMITIDO
                   if k in os.environ}
        entorno[VAR_SESION_BW] = self._cfg.bw_session
        entorno['BW_NOINTERACTION'] = 'true'
        return entorno

    def _correr(self, argumentos, entrada=None):
        try:
            proceso = self._ejecutor(
                [self._cfg.bw_bin, *argumentos], input=entrada,
                capture_output=True, text=True, env=self._entorno(),
                timeout=TIEMPO_ESPERA_BW_SEGUNDOS, check=False)
        except FileNotFoundError:
            raise GestorMalConfigurado('La CLI bw no está instalada.') \
                from None
        except subprocess.TimeoutExpired:
            raise GestorCaido('La CLI bw no respondió a tiempo.') from None
        except OSError as exc:
            raise GestorMalConfigurado(
                f'No se pudo ejecutar la CLI bw ({type(exc).__name__}).') \
                from None
        return proceso

    @staticmethod
    def _clasificar(proceso, operacion):
        """Lanza el error que corresponde a una salida distinta de cero."""
        salida = (proceso.stderr or '').lower()
        if any(senal in salida for senal in SENALES_TRANSITORIAS):
            raise GestorCaido(f'bw: {operacion} sin conexión con Vaultwarden.')
        if any(senal in salida for senal in MARCAS_POLITICA_SEND):
            raise SendRechazado(f'bw: {operacion} rechazado por la política.',
                                MOTIVO_SEND_DESHABILITADO)
        raise SendRechazado(f'bw: {operacion} falló (código '
                            f'{proceso.returncode}).')

    def crear_texto(self, nombre, texto, ahora=None):
        cfg = self._cfg
        expiracion, borrado = fechas_del_send(cfg, ahora)
        envio = {'type': TIPO_SEND_TEXTO, 'name': nombre, 'notes': None,
                 'text': {'text': texto, 'hidden': True},
                 'maxAccessCount': cfg.max_aperturas,
                 'expirationDate': expiracion, 'deletionDate': borrado,
                 'disabled': False, 'hideEmail': True}
        codificado = base64.b64encode(json.dumps(envio).encode()).decode()
        proceso = self._correr(['send', 'create'], entrada=codificado)
        if proceso.returncode != 0:
            self._clasificar(proceso, 'crear el Send')
        try:
            datos = json.loads(proceso.stdout)
            enlace, send_id = datos['accessUrl'], datos['id']
        except (ValueError, KeyError, TypeError):
            raise GestorMalConfigurado('bw: respuesta de Send inesperada.') \
                from None
        if (not isinstance(enlace, str) or not isinstance(send_id, str)
                or not enlace.startswith(ESQUEMA_ENLACE)
                or MARCA_ENLACE_SEND not in enlace):
            raise GestorMalConfigurado('bw: enlace de Send inesperado.')
        return SendCreado(id=send_id, enlace=enlace)

    def borrar(self, send_id):
        proceso = self._correr(['send', 'delete', send_id])
        if proceso.returncode == 0:
            return
        if any(s in (proceso.stderr or '').lower()
               for s in SENALES_NO_ENCONTRADO):
            return  # ya no existe
        self._clasificar(proceso, 'borrar el Send')


# --------------------------------------------------------------------------- #
# Modo `api` y punto de entrada
# --------------------------------------------------------------------------- #

class SendsPorApi:
    """Sends con la API de Vaultwarden (cuenta de servicio)."""

    def __init__(self, configuracion, cliente, base_url):
        self._cfg = configuracion
        self._cliente = cliente
        self._base = base_url

    def __repr__(self):
        return '<SendsPorApi>'

    def crear_texto(self, nombre, texto, ahora=None):
        sesion = self._cliente.sesion_de_usuario()
        cuerpo, material = construir_send(nombre, texto, sesion.clave_usuario,
                                          self._cfg, ahora)
        respuesta = self._cliente.pedir_autenticado(
            'POST', RUTA_SENDS, json.dumps(cuerpo).encode())
        self._validar_creacion(respuesta)
        datos = ClienteVaultwarden._json(respuesta, 'la creación del Send')
        send_id, acceso = _campo(datos, 'id'), _campo(datos, 'accessId')
        if not (isinstance(send_id, str) and send_id
                and isinstance(acceso, str) and acceso):
            raise GestorMalConfigurado('Vaultwarden: Send sin identificador.')
        return SendCreado(id=send_id,
                          enlace=enlace_de_send(self._base, acceso, material))

    @staticmethod
    def _validar_creacion(respuesta):
        """4xx (salvo 401, ya reintentado) es un rechazo permanente."""
        estado = respuesta.estado
        if estado in ESTADOS_TRANSITORIOS or 200 <= estado < 300:
            return
        if estado == 400 and es_politica_de_send(respuesta.cuerpo):
            raise SendRechazado('Vaultwarden: la política de la organización '
                                'deshabilita los Sends.',
                                MOTIVO_SEND_DESHABILITADO)
        raise SendRechazado(f'Vaultwarden: crear el Send respondió {estado}.')

    def borrar(self, send_id):
        if not isinstance(send_id, str) or not send_id \
                or not PATRON_ID_SEND.fullmatch(send_id):
            raise GestorMalConfigurado('Identificador de Send inválido.')
        respuesta = self._cliente.pedir_autenticado(
            'DELETE', f'{RUTA_SENDS}/{send_id}')
        if respuesta.estado == ESTADO_NO_ENCONTRADO \
                or 200 <= respuesta.estado < 300:
            return  # idempotente: ya no existe
        if respuesta.estado in ESTADOS_TRANSITORIOS:
            raise GestorCaido(f'Vaultwarden: borrar el Send respondió '
                              f'{respuesta.estado}.')
        raise GestorMalConfigurado(f'Vaultwarden: borrar el Send respondió '
                                   f'{respuesta.estado}.')


def servicio_de_sends(entorno=None):
    """`SendsPorApi` o `SendsPorCli` según `VAULTWARDEN_SEND_MODO`."""
    try:
        cfg = cargar_configuracion_send(entorno)
        if cfg.modo == MODO_BW:
            return SendsPorCli(cfg)
        base = cfg.base_url or cargar_configuracion(entorno).url
    except ErrorConfiguracionSecretos as exc:
        raise GestorMalConfigurado(str(exc)) from None
    return SendsPorApi(cfg, cliente_del_entorno(entorno), base)


def crear_send_texto(nombre, texto, entorno=None):
    """Crea un Send de texto oculto y devuelve su `SendCreado`.

    Lanza `GestorCaido` (transitorio) o `GestorMalConfigurado` (permanente;
    `SendRechazado` lleva `motivo`).
    """
    return servicio_de_sends(entorno).crear_texto(nombre, texto)


def borrar_send(send_id, entorno=None):
    """Borra un Send; idempotente (404 = ya no existe)."""
    servicio_de_sends(entorno).borrar(send_id)


__all__ = ('ErrorDeGestor', 'SendCreado', 'SendRechazado', 'SendsPorApi',
           'SendsPorCli', 'borrar_send', 'crear_send_texto',
           'servicio_de_sends')
