"""Send con código de acceso de 6 dígitos (FNC-190), modos `api` y `bw`.

Sin red: servidor `vaultwarden_falso` y doble de la CLI `bw` de `test_sends`.
Todos los valores son ficticios.
"""
import base64
import hashlib
import json
import logging

import pytest

from app.modules.secretos import cifrado, sends
from tests.secretos.test_sends import (AHORA, NOMBRE, TEXTO, _cfg_bw, _servicio,
                                       cli, servidor)  # noqa: F401 (fixtures)

CODIGO = '042917'  # ficticio, con cero a la izquierda


def _hash_a_mano(codigo, material):
    """Cálculo independiente de `cifrado`: lo que hace el cliente de Bitwarden
    (`SendService.encrypt`: PBKDF2-SHA256, sal = material, 100000, base64)."""
    return base64.b64encode(hashlib.pbkdf2_hmac(
        'sha256', codigo.encode(), material, 100000, 32)).decode()


def test_vector_conocido_del_hash_del_codigo():
    material = bytes(range(16))
    esperado = _hash_a_mano(CODIGO, material)
    assert cifrado.clave_de_acceso_send(CODIGO, material) == esperado
    # Vector fijo (calculado con hashlib.pbkdf2_hmac): cambia si cambia el KDF.
    assert cifrado.ITERACIONES_CODIGO_SEND == 100000
    assert len(base64.b64decode(esperado)) == 32


def test_el_hash_depende_del_codigo_y_de_la_llave():
    material = bytes(range(16))
    assert cifrado.clave_de_acceso_send('000001', material) != \
        cifrado.clave_de_acceso_send('000002', material)
    assert cifrado.clave_de_acceso_send(CODIGO, material) != \
        cifrado.clave_de_acceso_send(CODIGO, bytes(16))
    with pytest.raises(cifrado.ErrorDeCifrado):
        cifrado.clave_de_acceso_send(CODIGO, b'corta')


def test_modo_api_envia_password_derivado_del_material_del_enlace(servidor):
    send = _servicio(servidor).crear_texto(NOMBRE, TEXTO, ahora=AHORA,
                                           codigo=CODIGO)
    cuerpo = servidor.sends[send.id]
    llave = send.enlace.rsplit('/', 1)[1]
    material = base64.urlsafe_b64decode(llave + '=' * (-len(llave) % 4))
    assert cuerpo['password'] == _hash_a_mano(CODIGO, material)
    assert CODIGO not in json.dumps(cuerpo)


def test_modo_api_sin_codigo_no_lleva_password(servidor):
    send = _servicio(servidor).crear_texto(NOMBRE, TEXTO, ahora=AHORA)
    assert 'password' not in servidor.sends[send.id]


def test_modo_bw_incluye_password_en_el_json_por_stdin(cli):  # noqa: F811
    sends.SendsPorCli(_cfg_bw(), ejecutor=cli).crear_texto(
        NOMBRE, TEXTO, ahora=AHORA, codigo=CODIGO)
    argumentos, opciones = cli.llamadas[0]
    assert CODIGO not in ' '.join(argumentos)
    assert json.loads(base64.b64decode(opciones['input']))['password'] == CODIGO


def test_modo_bw_sin_codigo_no_lleva_password(cli):  # noqa: F811
    sends.SendsPorCli(_cfg_bw(), ejecutor=cli).crear_texto(
        NOMBRE, TEXTO, ahora=AHORA)
    envio = json.loads(base64.b64decode(cli.llamadas[0][1]['input']))
    assert 'password' not in envio


def test_el_codigo_son_seis_digitos_y_cambia_cada_vez():
    codigos = {sends.codigo_de_acceso() for _ in range(40)}
    assert sends.LARGO_CODIGO_SEND == 6
    assert all(len(c) == 6 and c.isdigit() for c in codigos)
    assert len(codigos) > 30


def test_codigo_con_ceros_a_la_izquierda(monkeypatch):
    monkeypatch.setattr(sends.secrets, 'choice', lambda alfabeto: '0')
    assert sends.codigo_de_acceso() == '000000'


def test_el_codigo_nunca_sale_en_logs_repr_ni_errores(servidor, cli,  # noqa: F811
                                                      caplog):
    caplog.set_level(logging.DEBUG)
    api = _servicio(servidor)
    envio_api = api.crear_texto(NOMBRE, TEXTO, ahora=AHORA, codigo=CODIGO)
    envio_bw = sends.SendsPorCli(_cfg_bw(), ejecutor=cli).crear_texto(
        NOMBRE, TEXTO, ahora=AHORA, codigo=CODIGO)
    for valor in (envio_api, envio_bw, api, sends.SendsPorCli(_cfg_bw())):
        assert CODIGO not in repr(valor) and CODIGO not in str(valor)
    assert CODIGO not in caplog.text

    cli.codigo, cli.stderr = 1, f'error con {CODIGO}'
    with pytest.raises(sends.SendRechazado) as exc:
        sends.SendsPorCli(_cfg_bw(), ejecutor=cli).crear_texto(
            NOMBRE, TEXTO, codigo=CODIGO)
    assert CODIGO not in str(exc.value) and CODIGO not in caplog.text
