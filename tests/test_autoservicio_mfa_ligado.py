"""Regresión FNC-175 y FNC-176 (auditor-seguridad, 2026-11-24).

- FNC-175: el código MFA enviado a una cuenta no sirve para otra.
- FNC-176: con MFA apagado no hay restablecimiento directo (sin factor).
"""
import pytest

from app import db
from app.modules.auth import autoservicio_mfa
from app.modules.auth.autoservicio import (ErrorAutoservicio,
                                           restablecer_directo_mfa,
                                           solicitar_codigo_mfa,
                                           verificar_codigo_mfa_paso2)
from app.modules.auth.models import User

ATACANTE = 'atacante@pruebas.local'
VICTIMA = 'victima@pruebas.local'
ANTERIOR = 'Clave-Anterior-De-Prueba-1!'
NUEVA = 'Nueva-Clave-De-Prueba-26!x'  # ficticia; cumple la política


@pytest.fixture
def cuentas(app, monkeypatch):
    for correo in (ATACANTE, VICTIMA):
        cuenta = User(email=correo, nombre=correo, role='usuario',
                      auth_source='local', is_active=True)
        cuenta.set_password(ANTERIOR)
        db.session.add(cuenta)
    db.session.commit()
    monkeypatch.setattr(autoservicio_mfa, 'directorio_activo', lambda: False)


@pytest.fixture
def codigos(monkeypatch):
    """Captura el código que se enviaría por correo a cada cuenta."""
    enviados = {}

    def capturar(correo, codigo, nombre=None):
        enviados[correo] = codigo
        return True

    monkeypatch.setattr(autoservicio_mfa, 'enviar_correo_mfa', capturar)
    return enviados


def _mfa_por_correo(monkeypatch):
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'true')
    monkeypatch.setenv('AUTOSERVICIO_MFA_TIPO', 'email')


def _clave_intacta(correo):
    db.session.expire_all()
    return User.query.filter_by(email=correo).one().check_password(ANTERIOR)


def test_codigo_de_otra_cuenta_no_restablece(app, cuentas, codigos,
                                             monkeypatch):
    _mfa_por_correo(monkeypatch)
    with app.test_request_context():
        desafio = solicitar_codigo_mfa(ATACANTE)['challenge_token']
        with pytest.raises(ErrorAutoservicio) as error:
            restablecer_directo_mfa(VICTIMA, NUEVA, codigos[ATACANTE], desafio)

    assert error.value.codigo_http == 401
    assert _clave_intacta(VICTIMA)


def test_codigo_de_otra_cuenta_no_pasa_el_paso_2(app, cuentas, codigos,
                                                 monkeypatch):
    _mfa_por_correo(monkeypatch)
    with app.test_request_context():
        desafio = solicitar_codigo_mfa(ATACANTE)['challenge_token']
        with pytest.raises(ErrorAutoservicio):
            verificar_codigo_mfa_paso2(VICTIMA, codigos[ATACANTE], desafio)


def test_codigo_propio_si_restablece(app, cuentas, codigos, monkeypatch):
    _mfa_por_correo(monkeypatch)
    with app.test_request_context():
        desafio = solicitar_codigo_mfa(VICTIMA)['challenge_token']
        resultado = restablecer_directo_mfa(VICTIMA, NUEVA, codigos[VICTIMA],
                                            desafio)

    assert resultado['status'] == 'success'
    assert not _clave_intacta(VICTIMA)


def test_sin_mfa_no_hay_restablecimiento_directo(app, cuentas, monkeypatch):
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'false')
    with app.test_request_context():
        with pytest.raises(ErrorAutoservicio) as error:
            restablecer_directo_mfa(VICTIMA, NUEVA, '000000')

    assert error.value.codigo_http == 403
    assert _clave_intacta(VICTIMA)


def test_endpoint_sin_mfa_responde_403(app, client, cuentas, monkeypatch):
    monkeypatch.setenv('AUTOSERVICIO_MFA_ENABLED', 'false')
    respuesta = client.post('/api/v1/auth/autoservicio/restablecer-mfa', json={
        'identifier': VICTIMA, 'new_password': NUEVA, 'mfa_code': '000000'})

    assert respuesta.status_code == 403
    assert _clave_intacta(VICTIMA)
