"""Sends de texto de Vaultwarden, modos `api` y `bw` (FNC-136, ADR-008).

Sin red: el servidor es `vaultwarden_falso` y la CLI `bw`, un doble de
`subprocess.run`. Todos los valores son ficticios.
"""
import base64
import hashlib
import hmac
import json
import logging
import subprocess
from datetime import datetime, timezone

import pytest

from app.modules.secretos import cifrado, sends
from app.modules.secretos.configuracion import (ConfiguracionSend,
                                                ErrorConfiguracionSecretos,
                                                cargar_configuracion,
                                                cargar_configuracion_send,
                                                validar_al_arrancar)
from app.modules.secretos.vaultwarden import (ClienteVaultwarden, GestorCaido,
                                              GestorMalConfigurado)
from tests.secretos import vaultwarden_falso as vf

TEXTO = 'Usuario: ana.ruiz / Contraseña: Valor-Ficticio-9!'
NOMBRE = 'Credenciales de ana.ruiz'
SESION_BW = 'sesion-bw-ficticia'
AHORA = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)


class Reloj:
    def __call__(self):
        return 1000.0


@pytest.fixture
def servidor():
    return vf.VaultwardenFalso()


def _servicio(servidor, **variables):
    entorno = {**vf.ENTORNO, **variables}
    cfg = cargar_configuracion(entorno)
    cliente = ClienteVaultwarden(cfg, transporte=servidor, reloj=Reloj())
    cfg_send = cargar_configuracion_send(entorno)
    return sends.SendsPorApi(cfg_send, cliente,
                             cfg_send.base_url or cfg.url)


def _descifrar_send(servidor, send_id, enlace):
    """Ida y vuelta: lo que haría quien abre el enlace."""
    cuerpo = servidor.sends[send_id]
    fragmento = enlace.split('#/send/', 1)[1]
    acceso, llave = fragmento.split('/')
    material = base64.urlsafe_b64decode(llave + '=' * (-len(llave) % 4))
    # La llave guardada (cifrada con la clave de usuario) coincide con la del
    # enlace.
    assert cifrado.descifrar_simetrico(
        cuerpo['key'], servidor.clave_usuario) == material
    clave = cifrado.derivar_clave_send(material)
    return (acceso, cifrado.descifrar_texto(cuerpo['name'], clave),
            cifrado.descifrar_texto(cuerpo['text']['text'], clave))


# ------------------------------------------------------------------ cifrado

def test_cifrar_y_descifrar_simetrico_ida_y_vuelta():
    clave = vf.clave_aleatoria()
    valor = cifrado.cifrar_simetrico('ñandú 123', clave)
    assert valor.startswith('2.') and valor.count('|') == 2
    assert cifrado.descifrar_texto(valor, clave) == 'ñandú 123'
    # IV aleatorio: el mismo texto no da el mismo valor.
    assert cifrado.cifrar_simetrico('ñandú 123', clave) != valor


def test_el_mac_se_valida():
    clave = vf.clave_aleatoria()
    tipo, resto = cifrado.cifrar_simetrico('hola', clave).split('.', 1)
    iv, datos, mac = resto.split('|')
    adulterado = base64.b64encode(bytes(32)).decode()
    with pytest.raises(cifrado.ErrorDeCifrado):
        cifrado.descifrar_simetrico(f'2.{iv}|{datos}|{adulterado}', clave)


def _hkdf_sha256(material, sal, info, largo):
    extraida = hmac.new(sal, material, hashlib.sha256).digest()
    bloque, salida = b'', b''
    for numero in range(1, -(-largo // 32) + 1):
        bloque = hmac.new(extraida, bloque + info + bytes([numero]),
                          hashlib.sha256).digest()
        salida += bloque
    return salida[:largo]


def test_derivacion_de_la_llave_del_send_es_determinista_y_de_64_bytes():
    material = bytes(range(16))
    uno, dos = (cifrado.derivar_clave_send(material) for _ in range(2))
    assert (uno._enc, uno._mac) == (dos._enc, dos._mac)
    assert len(uno._enc) + len(uno._mac) == 64
    # Contra HKDF-SHA256 (RFC 5869) escrito aparte con `hmac`.
    assert uno._enc + uno._mac == _hkdf_sha256(material, b'bitwarden-send',
                                               b'send', 64)
    with pytest.raises(cifrado.ErrorDeCifrado):
        cifrado.derivar_clave_send(b'corta')


def test_repr_de_la_clave_y_del_send_no_muestran_valores():
    send = sends.SendCreado(id='x', enlace='https://v/#/send/a/llave-secreta')
    assert 'llave-secreta' not in repr(send) + str(send)


# ---------------------------------------------------------------- modo api

def test_crea_el_send_cifrado_y_el_enlace_lleva_la_llave_en_el_fragmento(
        servidor):
    servicio = _servicio(servidor)
    send = servicio.crear_texto(NOMBRE, TEXTO, ahora=AHORA)

    assert send.enlace.startswith(vf.URL + '/#/send/')
    acceso, nombre, texto = _descifrar_send(servidor, send.id, send.enlace)
    assert (nombre, texto) == (NOMBRE, TEXTO)
    assert acceso == 'acc1'
    cuerpo = servidor.sends[send.id]
    # Nada en claro viaja al servidor.
    assert TEXTO not in json.dumps(cuerpo) and NOMBRE not in json.dumps(cuerpo)
    assert cuerpo['text']['hidden'] is True and cuerpo['hideEmail'] is True
    assert cuerpo['type'] == 0 and cuerpo['maxAccessCount'] == 3
    assert cuerpo['expirationDate'] == '2026-11-25T12:00:00.000Z'
    assert cuerpo['deletionDate'] == '2026-11-25T12:00:00.000Z'


def test_fechas_y_aperturas_salen_de_las_variables(servidor):
    servicio = _servicio(servidor, ONBOARDING_SEND_EXPIRATION_DAYS='2',
                         ONBOARDING_SEND_MAX_ACCESS_COUNT='1',
                         ONBOARDING_SEND_DELETION_DAYS='10')
    send = servicio.crear_texto(NOMBRE, TEXTO, ahora=AHORA)
    cuerpo = servidor.sends[send.id]
    assert cuerpo['maxAccessCount'] == 1
    assert cuerpo['expirationDate'] == '2026-11-20T12:00:00.000Z'
    assert cuerpo['deletionDate'] == '2026-11-28T12:00:00.000Z'


def test_base_url_propia_para_el_enlace(servidor):
    servicio = _servicio(
        servidor, VAULTWARDEN_SEND_BASE_URL='https://send.pruebas.invalid/')
    send = servicio.crear_texto(NOMBRE, TEXTO)
    assert send.enlace.startswith('https://send.pruebas.invalid/#/send/')


def test_dos_sends_tienen_llaves_distintas(servidor):
    servicio = _servicio(servidor)
    uno = servicio.crear_texto(NOMBRE, TEXTO)
    dos = servicio.crear_texto(NOMBRE, TEXTO)
    assert uno.enlace.split('/')[-1] != dos.enlace.split('/')[-1]


def test_un_401_renueva_la_sesion_una_vez(servidor):
    servicio = _servicio(servidor)
    servicio.crear_texto(NOMBRE, TEXTO)
    servidor.token_vigente = 'otro-token'  # la sesión guardada deja de valer
    servicio._cliente._sesion.token = 'vencido'
    send = servicio.crear_texto(NOMBRE, TEXTO)
    assert send.id in servidor.sends


def test_vaultwarden_caido_es_transitorio(servidor):
    servidor.estado_forzado['/api/sends'] = 503
    with pytest.raises(GestorCaido):
        _servicio(servidor).crear_texto(NOMBRE, TEXTO)


def test_sin_red_es_transitorio(servidor):
    servicio = _servicio(servidor)
    servicio.crear_texto(NOMBRE, TEXTO)
    servidor.excepcion = GestorCaido('sin red')
    with pytest.raises(GestorCaido):
        servicio.crear_texto(NOMBRE, TEXTO)


def test_politica_deshabilitar_send_es_permanente_con_motivo(servidor):
    servidor.estado_forzado['/api/sends'] = 400
    servidor.cuerpo_forzado['/api/sends'] = (
        b'{"message":"Due to an Enterprise Policy, you are only able to '
        b'delete an existing Send."}')
    with pytest.raises(sends.SendRechazado) as exc:
        _servicio(servidor).crear_texto(NOMBRE, TEXTO)
    assert exc.value.motivo == sends.MOTIVO_SEND_DESHABILITADO
    assert 'Enterprise' not in str(exc.value)


def test_otro_4xx_es_permanente_rechazado(servidor):
    servidor.estado_forzado['/api/sends'] = 422
    with pytest.raises(sends.SendRechazado) as exc:
        _servicio(servidor).crear_texto(NOMBRE, TEXTO)
    assert exc.value.motivo == sends.MOTIVO_RECHAZADO
    assert isinstance(exc.value, GestorMalConfigurado)


def test_borrar_es_idempotente(servidor):
    servicio = _servicio(servidor)
    send = servicio.crear_texto(NOMBRE, TEXTO)
    servicio.borrar(send.id)
    assert send.id not in servidor.sends
    servicio.borrar(send.id)  # 404: ya no existe, sin error


def test_borrar_rechaza_identificadores_que_no_son_guid(servidor):
    with pytest.raises(GestorMalConfigurado):
        _servicio(servidor).borrar('../sync')


def test_borrar_con_servidor_caido_es_transitorio(servidor):
    servicio = _servicio(servidor)
    send = servicio.crear_texto(NOMBRE, TEXTO)
    servidor.estado_forzado[f'/api/sends/{send.id}'] = 502
    with pytest.raises(GestorCaido):
        servicio.borrar(send.id)


def test_ningun_valor_aparece_en_logs_ni_errores(servidor, caplog):
    caplog.set_level(logging.DEBUG)
    servicio = _servicio(servidor)
    send = servicio.crear_texto(NOMBRE, TEXTO)
    servidor.estado_forzado['/api/sends'] = 422
    with pytest.raises(sends.SendRechazado) as exc:
        servicio.crear_texto(NOMBRE, TEXTO)
    llave = send.enlace.rsplit('/', 1)[1]
    visibles = caplog.text + str(exc.value) + repr(servicio)
    for valor in (TEXTO, 'Valor-Ficticio-9!', llave, vf.CLIENT_SECRET,
                  vf.CONTRASENA_MAESTRA):
        assert valor not in visibles


# ---------------------------------------------------------------- modo bw

# Id con forma de GUID, como los de `bw` (los demás se rechazan).
ID_SEND_BW = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

class CliFalsa:
    """Doble de `subprocess.run` que imita `bw send create` y `bw send delete`."""

    def __init__(self):
        self.llamadas = []
        self.codigo = 0
        self.stderr = ''
        self.stdout = None
        self.excepcion = None

    def __call__(self, argumentos, **opciones):
        self.llamadas.append((list(argumentos), opciones))
        if self.excepcion:
            raise self.excepcion
        salida = self.stdout
        if salida is None and argumentos[1:3] == ['send', 'create']:
            salida = json.dumps({
                'id': ID_SEND_BW, 'accessUrl': 'https://vault.pruebas.invalid/'
                                          '#/send/acc/llave'})
        return subprocess.CompletedProcess(argumentos, self.codigo,
                                           salida or '', self.stderr)


@pytest.fixture
def cli():
    return CliFalsa()


def _cfg_bw(**cambios):
    return ConfiguracionSend(modo='bw', bw_bin='/usr/bin/bw',
                             bw_session=SESION_BW, **cambios)


def test_bw_crea_el_send_con_el_json_por_stdin_y_la_sesion_en_el_entorno(cli):
    send = sends.SendsPorCli(_cfg_bw(), ejecutor=cli).crear_texto(
        NOMBRE, TEXTO, ahora=AHORA)
    assert send.id == ID_SEND_BW and '#/send/acc/llave' in send.enlace

    argumentos, opciones = cli.llamadas[0]
    assert argumentos == ['/usr/bin/bw', 'send', 'create']
    # Ni el texto ni la sesión van en los argumentos (se verían en `ps`).
    assert TEXTO not in ' '.join(argumentos)
    assert SESION_BW not in ' '.join(argumentos)
    assert opciones['env']['BW_SESSION'] == SESION_BW
    assert opciones['env']['BW_NOINTERACTION'] == 'true'
    envio = json.loads(base64.b64decode(opciones['input']))
    assert envio['text'] == {'text': TEXTO, 'hidden': True}
    assert envio['maxAccessCount'] == 3 and envio['hideEmail'] is True
    assert envio['deletionDate'] == '2026-11-25T12:00:00.000Z'


def test_bw_no_hereda_el_entorno_del_portal(cli, monkeypatch):
    monkeypatch.setenv('VAULTWARDEN_CLIENT_SECRET', 'secreto-del-portal')
    monkeypatch.setenv('SECRET_KEY', 'otra-clave')
    sends.SendsPorCli(_cfg_bw(), ejecutor=cli).crear_texto(NOMBRE, TEXTO)
    entorno = cli.llamadas[0][1]['env']
    assert 'VAULTWARDEN_CLIENT_SECRET' not in entorno
    assert 'SECRET_KEY' not in entorno


@pytest.mark.parametrize('stderr, esperado', [
    ('Error: connect ECONNREFUSED', GestorCaido),
    ('Vault is locked.', sends.SendRechazado),
    ('Error: policy: sends disabled', sends.SendRechazado),
])
def test_bw_clasifica_los_fallos_sin_copiar_su_texto(cli, stderr, esperado):
    cli.codigo, cli.stderr = 1, stderr
    with pytest.raises(esperado) as exc:
        sends.SendsPorCli(_cfg_bw(), ejecutor=cli).crear_texto(NOMBRE, TEXTO)
    assert stderr not in str(exc.value)


def test_bw_no_instalado_y_tiempo_agotado(cli):
    servicio = sends.SendsPorCli(_cfg_bw(), ejecutor=cli)
    cli.excepcion = FileNotFoundError()
    with pytest.raises(GestorMalConfigurado):
        servicio.crear_texto(NOMBRE, TEXTO)
    cli.excepcion = subprocess.TimeoutExpired('bw', 30)
    with pytest.raises(GestorCaido):
        servicio.crear_texto(NOMBRE, TEXTO)


@pytest.mark.parametrize('salida', ['no es json', '{}', '{"id": 1}',
                                    '{"id": "a", "accessUrl": "http://x/#/send/a/k"}',
                                    '{"id": "a", "accessUrl": "https://x/otra"}'])
def test_bw_respuesta_inesperada_se_rechaza(cli, salida):
    cli.stdout = salida
    with pytest.raises(GestorMalConfigurado):
        sends.SendsPorCli(_cfg_bw(), ejecutor=cli).crear_texto(NOMBRE, TEXTO)


def test_bw_borrar_es_idempotente(cli):
    servicio = sends.SendsPorCli(_cfg_bw(), ejecutor=cli)
    servicio.borrar(ID_SEND_BW)
    assert cli.llamadas[0][0] == ['/usr/bin/bw', 'send', 'delete', '--', ID_SEND_BW]
    cli.codigo, cli.stderr = 1, 'Not found.'
    servicio.borrar(ID_SEND_BW)
    cli.stderr = 'Error: connect ECONNRESET'
    with pytest.raises(GestorCaido):
        servicio.borrar(ID_SEND_BW)


def test_bw_nada_sensible_en_logs_ni_repr(cli, caplog):
    caplog.set_level(logging.DEBUG)
    servicio = sends.SendsPorCli(_cfg_bw(), ejecutor=cli)
    servicio.crear_texto(NOMBRE, TEXTO)
    assert SESION_BW not in repr(servicio) + repr(servicio._cfg) + caplog.text
    assert TEXTO not in caplog.text


# ---------------------------------------------------------- modo y entorno

def test_el_modo_se_elige_con_la_variable(servidor, monkeypatch):
    entorno = {**vf.ENTORNO, 'VAULTWARDEN_SEND_MODO': 'bw',
               'VAULTWARDEN_BW_SESSION': SESION_BW}
    assert isinstance(sends.servicio_de_sends(entorno), sends.SendsPorCli)
    assert isinstance(sends.servicio_de_sends(vf.ENTORNO), sends.SendsPorApi)


def test_sin_configuracion_falla_cerrado():
    with pytest.raises(GestorMalConfigurado):
        sends.crear_send_texto(NOMBRE, TEXTO, entorno={})


def test_valores_por_defecto_de_la_configuracion_del_send():
    cfg = cargar_configuracion_send({})
    assert (cfg.modo, cfg.caducidad_dias, cfg.max_aperturas,
            cfg.borrado_dias, cfg.base_url) == ('api', 7, 3, 7, None)


@pytest.mark.parametrize('variable, valor', [
    ('VAULTWARDEN_SEND_MODO', 'otro'),
    ('VAULTWARDEN_SEND_MODO', 'bw'),                  # sin sesión
    ('ONBOARDING_SEND_EXPIRATION_DAYS', '0'),
    ('ONBOARDING_SEND_EXPIRATION_DAYS', '31'),
    ('ONBOARDING_SEND_EXPIRATION_DAYS', 'siete'),
    ('ONBOARDING_SEND_MAX_ACCESS_COUNT', '0'),
    ('ONBOARDING_SEND_MAX_ACCESS_COUNT', '11'),
    ('ONBOARDING_SEND_DELETION_DAYS', '32'),
    ('VAULTWARDEN_SEND_BASE_URL', 'http://send.pruebas.invalid'),
    ('VAULTWARDEN_SEND_BASE_URL', 'https://2130706433'),
])
def test_valores_fuera_de_rango_no_arrancan_y_no_se_muestran(variable, valor):
    with pytest.raises(ErrorConfiguracionSecretos) as exc:
        cargar_configuracion_send({variable: valor})
    if len(valor) > 3 and valor != 'otro':
        assert valor not in str(exc.value)


def test_borrado_no_puede_ser_antes_de_la_caducidad():
    with pytest.raises(ErrorConfiguracionSecretos):
        cargar_configuracion_send({'ONBOARDING_SEND_EXPIRATION_DAYS': '10',
                                   'ONBOARDING_SEND_DELETION_DAYS': '9'})


def test_el_borrado_por_defecto_sigue_a_una_caducidad_larga():
    cfg = cargar_configuracion_send({'ONBOARDING_SEND_EXPIRATION_DAYS': '20'})
    assert cfg.borrado_dias == 20


def test_validar_al_arrancar_revisa_las_variables_del_send_siempre():
    with pytest.raises(ErrorConfiguracionSecretos):
        validar_al_arrancar({'ONBOARDING_SEND_MAX_ACCESS_COUNT': '99'})
    assert validar_al_arrancar({}) is None


# --- Revisión de seguridad (FNC-138) -----------------------------------------

@pytest.mark.parametrize('send_id', ['-x', '--help', 'abc', ''])
def test_bw_borrar_rechaza_ids_que_no_son_guid(cli, send_id):
    """Un id que empieza con `-` se volvería opción de `bw`."""
    with pytest.raises(sends.GestorMalConfigurado):
        sends.SendsPorCli(_cfg_bw(), ejecutor=cli).borrar(send_id)
    assert cli.llamadas == []


def test_bw_rechaza_un_enlace_de_otro_servidor(cli):
    cli.stdout = json.dumps({'id': ID_SEND_BW,
                             'accessUrl': 'https://otro.pruebas.invalid/#/send/acc/llave'})
    servicio = sends.SendsPorCli(_cfg_bw(base_url='https://vault.pruebas.invalid'), ejecutor=cli)
    with pytest.raises(sends.GestorMalConfigurado):
        servicio.crear_texto(NOMBRE, TEXTO, ahora=AHORA)


def test_bw_acepta_el_enlace_del_servidor_configurado(cli):
    servicio = sends.SendsPorCli(_cfg_bw(base_url='https://vault.pruebas.invalid'), ejecutor=cli)
    assert servicio.crear_texto(NOMBRE, TEXTO, ahora=AHORA).id == ID_SEND_BW
