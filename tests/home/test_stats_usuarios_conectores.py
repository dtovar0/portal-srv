"""FNC-214: `GET /stats` con usuarios por rol y conectores (contrato `inicio.md` 1.2).

- `desglose.users_by_role`: usuarios (`usuario`) frente a administradores
  (`admin_area` y `administrador`), con el mismo alcance que `users`.
- `connectors` y `desglose.connectors` (asociados frente a sin asociar): solo
  el superadmin (los conectores son solo suyos, SEC-CON-11).
"""
from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.auth.models import User
from app.modules.connectors.models import PlatformConnector
from tests import fabricas

RUTA = '/api/v1/stats'


def _conector(plataforma, numero):
    valores = dict(platform_id=plataforma.id, type='noop',
                   host='conector.pruebas.local', port=443, params={},
                   credential_ref=f'ref-{numero}')
    # Con FNC-213 el conector lleva nombre.
    if hasattr(PlatformConnector, 'name'):
        valores['name'] = f'Conector {numero}'
    db.session.add(PlatformConnector(**valores))
    db.session.commit()


def _escena():
    area_a = fabricas.crear_area('Área A')
    area_b = fabricas.crear_area('Área B')
    pa = fabricas.crear_plataforma(area_a, 'PA')
    pb = fabricas.crear_plataforma(area_b, 'PB')
    super_ = fabricas.crear_usuario(ROLE_ADMIN)
    admin_a = fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[area_a],
                                     areas_administradas=[area_a])
    fabricas.crear_usuario(ROLE_AREA_ADMIN, areas=[area_b],
                           areas_administradas=[area_b])
    fabricas.crear_usuario(ROLE_USER, areas=[area_a])
    fabricas.crear_usuario(ROLE_USER, areas=[area_a])
    fabricas.crear_usuario(ROLE_USER, areas=[area_b])
    usuario = fabricas.crear_usuario(ROLE_USER, areas=[area_b])
    _conector(pa, 1)
    _conector(pb, 2)
    return super_.id, admin_a.id, usuario.id


def _pedir(cliente_como, user_id):
    db.session.expire_all()
    respuesta = cliente_como(db.session.get(User, user_id)).get(RUTA)
    assert respuesta.status_code == 200, respuesta.get_data(as_text=True)
    return respuesta.get_json()


def test_superadmin_usuarios_por_rol_y_conectores(app, cliente_como):
    super_, _, _ = _escena()
    datos = _pedir(cliente_como, super_)
    por_rol = datos['desglose']['users_by_role']
    # 4 con rol usuario; 3 administradores (super y dos admins de área).
    assert por_rol == {'parte': 4, 'resto': 3}
    assert por_rol['parte'] + por_rol['resto'] == datos['users']
    assert datos['connectors'] == 2
    assert datos['desglose']['connectors'] == {'parte': 2, 'resto': 0}


def test_admin_de_area_usuarios_de_su_alcance_y_sin_conectores(app, cliente_como):
    _, admin_a, _ = _escena()
    datos = _pedir(cliente_como, admin_a)
    por_rol = datos['desglose']['users_by_role']
    assert por_rol['parte'] + por_rol['resto'] == datos['users']
    assert 'connectors' not in datos
    assert 'connectors' not in datos['desglose']


def test_usuario_normal_sin_usuarios_ni_conectores(app, cliente_como):
    _, _, usuario = _escena()
    datos = _pedir(cliente_como, usuario)
    assert 'users_by_role' not in datos['desglose']
    assert 'connectors' not in datos
