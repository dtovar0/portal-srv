"""Pruebas del flujo de Carta Responsiva de TI (GET /responsiva y POST /me/firmar-responsiva)."""

import pytest
from app import db
from app.modules.auth.models import User
from tests import fabricas


def test_flujo_completo_responsiva(app, cliente_como):
    """Un usuario nuevo sin firma debe poder consultar la responsiva y firmarla."""
    with app.app_context():
        usuario = fabricas.crear_usuario(email='responsiva.test@empresa.local', rol='usuario')
        usuario.responsiva_firmada = False
        usuario.responsiva_firmada_at = None
        db.session.commit()
        user_id = usuario.id

    cliente = cliente_como(usuario)

    # 1. /me indica que la responsiva no está firmada
    resp_me = cliente.get('/api/v1/me')
    assert resp_me.status_code == 200
    datos_me = resp_me.get_json()
    assert datos_me['responsiva_firmada'] is False
    assert datos_me['responsiva_firmada_at'] is None

    # 2. Endpoints protegidos devuelven 403 responsiva_requerida
    resp_areas = cliente.get('/api/v1/areas')
    assert resp_areas.status_code == 403
    assert resp_areas.get_json()['code'] == 'responsiva_requerida'

    # 3. GET /responsiva permite leer los términos
    resp_resp = cliente.get('/api/v1/responsiva')
    assert resp_resp.status_code == 200
    datos_resp = resp_resp.get_json()
    assert datos_resp['firmada'] is False
    assert 'Carta Responsiva' in datos_resp['titulo']
    assert len(datos_resp['contenido']) > 50

    # 4. POST /me/firmar-responsiva registra la firma
    resp_firmar = cliente.post('/api/v1/me/firmar-responsiva')
    assert resp_firmar.status_code == 200
    assert resp_firmar.get_json()['status'] == 'success'

    # 5. /me ahora confirma que está firmada
    resp_me2 = cliente.get('/api/v1/me')
    assert resp_me2.status_code == 200
    assert resp_me2.get_json()['responsiva_firmada'] is True
    assert resp_me2.get_json()['responsiva_firmada_at'] is not None

    # 6. Ahora las áreas ya son accesibles
    resp_areas2 = cliente.get('/api/v1/areas')
    assert resp_areas2.status_code == 200
