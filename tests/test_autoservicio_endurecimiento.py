"""FNC-177: endurecimiento del autoservicio (hallazgos Medios/Bajos)."""
import pytest

from app.modules.auth import autoservicio_config, autoservicio_correo
from app.modules.auth.autoservicio_correo import (ENVIO_FALLIDO_MENSAJE,
                                                  enviar_correo_mfa)

NOMBRE_HOSTIL = '<img src=x onerror=alert(1)>'
CFG_SMTP = {'server': 'smtp.interno.invalid', 'port': 2525,
            'encryption': 'none', 'username': '', 'password': '',
            'sender_email': 'autoservicio@pruebas.local',
            'sender_name': 'Autoservicio'}


def test_sin_clave_de_respaldo(app):
    with app.app_context():
        assert autoservicio_config.clave_secreta() == app.config['SECRET_KEY']
    assert not hasattr(autoservicio_config, 'SECRETO_RESPALDO_TOTP')
    assert not hasattr(autoservicio_config, 'SECRETO_RESPALDO_SERIALIZADOR')


@pytest.mark.parametrize('plantilla, args', [
    ('_html_codigo_mfa', ('Marca', NOMBRE_HOSTIL, '123456', 10)),
    ('_html_confirmacion', ('Marca', NOMBRE_HOSTIL, 'hoy')),
    ('_html_recuperacion', ('Marca', NOMBRE_HOSTIL, 'https://p.invalid/a?b=1&c="x"')),
])
def test_nombre_escapado_en_el_html(plantilla, args):
    html = getattr(autoservicio_correo, plantilla)(*args)
    assert NOMBRE_HOSTIL not in html
    assert '&lt;img' in html
    assert '"x"' not in html


def test_fallo_smtp_no_devuelve_el_detalle(monkeypatch):
    monkeypatch.setattr(autoservicio_correo, 'resolver_smtp_autoservicio',
                        lambda: dict(CFG_SMTP))
    monkeypatch.setattr(autoservicio_correo, '_enviar_smtp',
                        lambda *a, **k: OSError('smtp.interno.invalid:2525 rechazó'))

    exito, mensaje = enviar_correo_mfa('a@pruebas.local', '123456')

    assert exito is False
    assert mensaje == ENVIO_FALLIDO_MENSAJE
    assert 'smtp.interno' not in mensaje
