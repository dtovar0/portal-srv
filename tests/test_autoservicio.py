"""Pruebas unitarias para el módulo de Autoservicio de Contraseña (Aduana)."""
import pytest
from app import create_app, db
from app.modules.auth.models import User
from app.modules.auth.autoservicio import (
    generar_token_recuperacion,
    verificar_token_recuperacion,
    obtener_politica_contrasena,
    ErrorAutoservicio,
    cambiar_contrasena,
    restablecer_con_token,
)


@pytest.fixture
def cliente(client):
    return client


def test_token_recuperacion_ciclo_completo(app):
    with app.app_context():
        correo = "operador@vivaro.com"
        token = generar_token_recuperacion(correo)
        assert isinstance(token, str) and len(token) > 10

        correo_verificado = verificar_token_recuperacion(token)
        assert correo_verificado == correo


def test_token_recuperacion_invalido(app):
    with app.app_context():
        with pytest.raises(ErrorAutoservicio) as exc:
            verificar_token_recuperacion("token-invalido-o-manipulado")
        assert "inválido" in str(exc.value).lower() or "expirado" in str(exc.value).lower()


def test_obtener_politica_contrasena():
    pol = obtener_politica_contrasena()
    assert "min_length" in pol
    assert pol["min_length"] >= 16
    assert "required_classes" in pol
    assert "symbols" in pol


def test_endpoint_politica_contrasena(cliente):
    resp = cliente.get('/api/v1/auth/autoservicio/politica')
    assert resp.status_code == 200
    datos = resp.get_json()
    assert datos["min_length"] >= 16


def test_solicitar_recuperacion_correo_invalido(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/solicitar-recuperacion', json={
        "email": "correo-no-valido"
    })
    assert resp.status_code == 400


def test_solicitar_recuperacion_respuesta_segura(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/solicitar-recuperacion', json={
        "email": "noexiste@vivaro.com"
    })
    assert resp.status_code == 200
    datos = resp.get_json()
    assert datos["status"] == "success"


def test_cambiar_contrasena_datos_incompletos(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/cambiar', json={
        "identificador": "user",
        "current_password": "",
        "new_password": "123"
    })
    assert resp.status_code == 400


def test_cambiar_contrasena_nueva_no_cumple_politica(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/cambiar', json={
        "identificador": "user",
        "current_password": "CurrentPassword123!",
        "new_password": "corta"
    })
    assert resp.status_code == 400


def test_restablecer_token_invalido(cliente):
    resp = cliente.post('/api/v1/auth/autoservicio/restablecer', json={
        "email": "user@vivaro.com",
        "token": "token-falso",
        "new_password": "NuevaContrasenaSegura2026!"
    })
    assert resp.status_code == 400
