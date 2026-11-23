"""CSRF: manejo del error y exención de la API (FNC-023).

Hoy toda la API v1 está exenta de CSRF y la cookie no declara `SameSite`
(SEG-06). Lo correcto se prueba con `xfail(strict=True)` hasta FNC-008.
"""

import io

import pytest
from flask import jsonify

from app.modules.auth.models import User

RUTA_PROTEGIDA = '/prueba-csrf'
ORIGEN_AJENO = 'https://atacante.pruebas.invalid'
CABECERAS_AJENAS = {'Origin': ORIGEN_AJENO, 'Sec-Fetch-Site': 'cross-site'}


@pytest.fixture
def app_con_ruta_protegida(app):
    """Una ruta de prueba no exenta, para ver la respuesta del CSRFError."""
    app.add_url_rule(RUTA_PROTEGIDA, 'prueba_csrf',
                     lambda: jsonify({'status': 'success'}), methods=['POST'])
    return app


def test_sin_token_csrf_responde_400_en_json(app_con_ruta_protegida):
    respuesta = app_con_ruta_protegida.test_client().post(RUTA_PROTEGIDA)

    assert respuesta.status_code == 400
    assert respuesta.get_json() == {'status': 'error',
                                    'message': 'Token CSRF ausente o no válido.'}


def test_cookie_de_sesion_con_samesite(app):
    assert app.config.get('SESSION_COOKIE_SAMESITE') in ('Lax', 'Strict')


def test_formulario_de_otro_sitio_no_importa_un_respaldo(cliente_admin):
    respuesta = cliente_admin.post(
        '/api/v1/backup', headers=CABECERAS_AJENAS,
        data={'file': (io.BytesIO(b'no es zip'), 'r.zip')},
        content_type='multipart/form-data')

    assert respuesta.status_code in (400, 403)
    assert 'CSRF' in respuesta.get_json()['message'] or \
        respuesta.status_code == 403


def test_post_de_otro_sitio_no_purga_cuentas(cliente_admin):
    usuarios_antes = User.query.count()

    respuesta = cliente_admin.post('/api/v1/users/purge',
                                   headers=CABECERAS_AJENAS)

    assert respuesta.status_code in (400, 403)
    assert User.query.count() == usuarios_antes


# --- FNC-008: verificación de origen (casos que deben pasar o fallar) -------

def _purgar(cliente, **cabeceras):
    return cliente.post('/api/v1/users/purge', headers=cabeceras)


def test_mismo_origen_pasa(cliente_admin):
    respuesta = _purgar(cliente_admin, Origin='http://localhost')
    assert respuesta.status_code != 403


def test_host_reenviado_por_el_proxy_pasa(cliente_admin):
    """Next (dev) o nginx reenvían el host original en X-Forwarded-Host."""
    respuesta = _purgar(cliente_admin, Origin='https://portal.pruebas.invalid',
                        **{'X-Forwarded-Host': 'portal.pruebas.invalid'})
    assert respuesta.status_code != 403


def test_sin_origin_ni_referer_pasa(cliente_admin):
    """Clientes que no son navegador (curl, scripts) no son vector de CSRF."""
    assert _purgar(cliente_admin).status_code != 403


@pytest.mark.parametrize('cabeceras', [
    {'Origin': 'null'},
    {'Referer': 'https://atacante.pruebas.invalid/pagina'},
    {'Sec-Fetch-Site': 'cross-site'},
])
def test_origen_opaco_referer_ajeno_o_cross_site_da_403(cliente_admin, cabeceras):
    usuarios_antes = User.query.count()
    respuesta = _purgar(cliente_admin, **cabeceras)
    assert respuesta.status_code == 403
    assert respuesta.get_json()['code'] == 'csrf_invalido'
    assert User.query.count() == usuarios_antes


def test_lecturas_no_se_verifican(cliente_admin):
    assert cliente_admin.get('/api/v1/me', headers={'Origin': ORIGEN_AJENO}).status_code == 200


# --- FNC-008: cookie Secure y sesión de cuentas desactivadas ----------------

@pytest.mark.parametrize('entorno, segura', [('production', True), ('', True),
                                             ('development', False)])
def test_cookie_secure_fuera_de_desarrollo(monkeypatch, entorno, segura):
    from flask import Flask
    from app.modules.api.origen import registrar
    monkeypatch.setenv('APP_ENV', entorno)
    aplicacion = Flask(__name__)

    registrar(aplicacion)

    assert bool(aplicacion.config.get('SESSION_COOKIE_SECURE')) is segura
    assert bool(aplicacion.config.get('REMEMBER_COOKIE_SECURE')) is segura


def test_cuenta_desactivada_pierde_la_sesion_abierta(app, cliente_como, crear_usuario):
    """Lo garantiza Flask-Login: `UserMixin.is_authenticated` devuelve `is_active`."""
    from app import db
    usuario = crear_usuario()
    cliente = cliente_como(usuario)
    assert cliente.get('/api/v1/me').status_code == 200

    usuario.is_active = False
    db.session.commit()

    assert cliente.get('/api/v1/me').status_code == 401
