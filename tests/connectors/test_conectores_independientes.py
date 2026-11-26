"""Conectores independientes (FNC-213, contrato `conectores-y-ejecuciones.md`
v1.6): crear sin plataforma y asociar después. La matriz por rol está en
`tests/matriz_proteccion.py`; aquí, las reglas de cada endpoint."""
import pytest

from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER
from app.modules.audit.models import AuditLog
from app.modules.connectors import api_independientes as api_conectores
from app.modules.connectors.models import PlatformConnector
from app.modules.connectors.tipos import LARGO_NOMBRE
from app.modules.platforms.tipos import TIPO_CONECTOR
from tests import fabricas
from tests.connectors.conftest import (HOST_PERMITIDO, REFERENCIA,
                                       crear_conector)
from tests.connectors.test_api import acceso_vigente

A = '/api/v1'
NOMBRE = 'ERP usuarios'
CUERPO = {'name': NOMBRE, 'type': 'noop', 'host': HOST_PERMITIDO, 'port': 443,
          'params': {}, 'credential_ref': REFERENCIA, 'active': True}


def eventos(accion):
    return AuditLog.query.filter_by(action=accion).all()


@pytest.fixture
def plataforma(app, entorno_conector):
    area = fabricas.crear_area()
    return fabricas.crear_plataforma(area, integration_type=TIPO_CONECTOR,
                                     status='Activo')


@pytest.fixture
def superadmin(cliente_como):
    return cliente_como(fabricas.crear_usuario(ROLE_ADMIN))


@pytest.fixture
def libre(app, entorno_conector):
    """Conector sin plataforma."""
    return crear_conector(None, name=NOMBRE)


def crear(superadmin, **campos):
    return superadmin.post(f'{A}/connectors', json={**CUERPO, **campos})


# --------------------------------------------------------------------------- #
# Protección
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize('rol', [ROLE_USER, ROLE_AREA_ADMIN])
@pytest.mark.parametrize('metodo,sufijo,cuerpo', [
    ('GET', '', None), ('POST', '', CUERPO), ('GET', '/{id}', None),
    ('PUT', '/{id}', CUERPO), ('DELETE', '/{id}', {}),
    ('PUT', '/{id}/platform', {'platform_id': 1}),
    ('DELETE', '/{id}/platform', {}), ('POST', '/{id}/test', {})])
def test_solo_el_superadmin(libre, plataforma, cliente_como, rol, metodo,
                            sufijo, cuerpo):
    actor = fabricas.crear_usuario(rol, areas=[plataforma.area],
                                   areas_administradas=[plataforma.area]
                                   if rol == ROLE_AREA_ADMIN else ())
    respuesta = cliente_como(actor).open(
        f'{A}/connectors' + sufijo.format(id=libre.id), method=metodo,
        json=cuerpo)
    assert respuesta.status_code == 403
    assert PlatformConnector.query.count() == 1


@pytest.mark.parametrize('metodo,sufijo,cuerpo', [
    ('POST', '', CUERPO), ('PUT', '/{id}', CUERPO), ('DELETE', '/{id}', {}),
    ('PUT', '/{id}/platform', {'platform_id': 1}),
    ('DELETE', '/{id}/platform', {}), ('POST', '/{id}/test', {})])
def test_escrituras_solo_desde_el_portal_y_en_json(libre, superadmin, metodo,
                                                   sufijo, cuerpo):
    ruta = f'{A}/connectors' + sufijo.format(id=libre.id)
    sin_json = superadmin.open(ruta, method=metodo, data='x')
    ajena = superadmin.open(ruta, method=metodo, json=cuerpo,
                            headers={'Sec-Fetch-Site': 'cross-site'})
    assert sin_json.status_code == 415
    assert ajena.status_code == 403


# --------------------------------------------------------------------------- #
# Lectura
# --------------------------------------------------------------------------- #

def test_get_lista_ordenada_por_nombre_sin_distinguir_mayusculas(
        superadmin, entorno_conector):
    crear_conector(None, name='beta', credential_ref='pokemon/b')
    crear_conector(None, name='Alfa', credential_ref='pokemon/a')
    crear_conector(None, name='gamma', credential_ref='pokemon/g')
    respuesta = superadmin.get(f'{A}/connectors')
    assert respuesta.status_code == 200
    assert [c['name'] for c in respuesta.get_json()['items']] == [
        'Alfa', 'beta', 'gamma']


def test_get_forma_connector_v2_sin_plataforma(superadmin, libre):
    conector = superadmin.get(f'{A}/connectors/{libre.id}').get_json()[
        'connector']
    assert conector['id'] == libre.id and conector['name'] == NOMBRE
    assert conector['platform_id'] is None and conector['platform'] is None
    assert set(conector) == {'id', 'name', 'platform_id', 'platform', 'type',
                             'host', 'port', 'params', 'credential_ref',
                             'credential_status', 'active', 'updated_at'}


def test_get_forma_connector_v2_con_plataforma(superadmin, plataforma):
    conector = crear_conector(plataforma, name='Con plataforma')
    datos = superadmin.get(f'{A}/connectors/{conector.id}').get_json()[
        'connector']
    assert datos['platform_id'] == plataforma.id
    assert datos['platform'] == {
        'id': plataforma.id, 'name': plataforma.name,
        'area_id': plataforma.area_id, 'area': plataforma.area.name}


def test_get_inexistente_responde_404(superadmin, app):
    respuesta = superadmin.get(f'{A}/connectors/9999')
    assert respuesta.status_code == 404
    assert respuesta.get_json()['code'] == 'no_encontrado'


# --------------------------------------------------------------------------- #
# Crear
# --------------------------------------------------------------------------- #

def test_post_crea_sin_plataforma_audita_y_responde_201(superadmin,
                                                        entorno_conector):
    respuesta = crear(superadmin)
    assert respuesta.status_code == 201
    datos = respuesta.get_json()
    assert datos['status'] == 'success'
    assert datos['connector']['platform_id'] is None
    assert datos['connector']['name'] == NOMBRE
    [conector] = PlatformConnector.query.all()
    assert conector.platform_id is None
    [evento] = eventos('conector_creado')
    assert evento.after_state['name'] == NOMBRE


def test_post_recorta_el_nombre(superadmin, entorno_conector):
    respuesta = crear(superadmin, name='  ERP  ')
    assert respuesta.get_json()['connector']['name'] == 'ERP'


@pytest.mark.parametrize('nombre', [None, '', '   ', 5, 'a' * (LARGO_NOMBRE + 1),
                                    'con\x00control', 'sal\ndo'])
def test_post_nombre_invalido_responde_422(superadmin, entorno_conector,
                                           nombre):
    cuerpo = dict(CUERPO)
    if nombre is None:
        cuerpo.pop('name')
    else:
        cuerpo['name'] = nombre
    respuesta = superadmin.post(f'{A}/connectors', json=cuerpo)
    assert respuesta.status_code == 422
    assert 'name' in respuesta.get_json()['fields']
    assert PlatformConnector.query.count() == 0


def test_post_nombre_largo_maximo_es_valido(superadmin, entorno_conector):
    assert crear(superadmin, name='a' * LARGO_NOMBRE).status_code == 201


def test_post_nombre_repetido_sin_distinguir_mayusculas_responde_422(
        superadmin, libre):
    respuesta = crear(superadmin, name=NOMBRE.upper(),
                      credential_ref='pokemon/otra')
    assert respuesta.status_code == 422
    assert respuesta.get_json()['fields']['name'] == (
        'Ya existe un conector con ese nombre.')
    assert PlatformConnector.query.count() == 1


def test_post_valida_la_configuracion_como_la_ruta_por_plataforma(
        superadmin, entorno_conector):
    respuesta = crear(superadmin, host='ajeno.example.com', port=0)
    assert respuesta.status_code == 422
    assert {'host', 'port'} <= set(respuesta.get_json()['fields'])


def test_post_referencia_equivalente_a_la_de_otro_conector_responde_422(
        superadmin, libre):
    # Misma regla de siempre: la misma referencia se admite; una distinta que
    # da la misma variable de dev (B3), no, aunque el otro no tenga plataforma.
    respuesta = crear(superadmin, name='Otro',
                      credential_ref='pokemon/pruebas.noop')
    assert respuesta.status_code == 422
    assert 'credential_ref' in respuesta.get_json()['fields']


def test_post_campo_fuera_de_lista_responde_400(superadmin, entorno_conector):
    respuesta = crear(superadmin, platform_id=1)
    assert respuesta.status_code == 400
    assert respuesta.get_json()['code'] == 'campo_no_permitido'


# --------------------------------------------------------------------------- #
# Reemplazar
# --------------------------------------------------------------------------- #

def test_put_reemplaza_audita_lo_que_cambio_y_limpia_la_cache(
        superadmin, libre, monkeypatch):
    llamadas = []
    monkeypatch.setattr(api_conectores, 'limpiar_cache',
                        lambda: llamadas.append(True))
    respuesta = superadmin.put(f'{A}/connectors/{libre.id}',
                               json={**CUERPO, 'name': 'Nuevo nombre',
                                     'port': 8443})
    assert respuesta.status_code == 200
    assert respuesta.get_json()['connector']['name'] == 'Nuevo nombre'
    [evento] = eventos('conector_configurado')
    assert evento.before_state == {'name': NOMBRE, 'port': 443}
    assert evento.after_state == {'name': 'Nuevo nombre', 'port': 8443}
    assert llamadas == [True]


def test_put_sin_cambios_no_audita(superadmin, libre):
    assert superadmin.put(f'{A}/connectors/{libre.id}',
                          json=CUERPO).status_code == 200
    assert eventos('conector_configurado') == []


def test_put_puede_conservar_su_propio_nombre_y_referencia(superadmin, libre):
    respuesta = superadmin.put(f'{A}/connectors/{libre.id}',
                               json={**CUERPO, 'name': NOMBRE.lower()})
    assert respuesta.status_code == 200
    assert respuesta.get_json()['connector']['name'] == NOMBRE.lower()


def test_put_nombre_de_otro_conector_responde_422(superadmin, libre):
    otro = crear_conector(None, name='Otro', credential_ref='pokemon/otra')
    respuesta = superadmin.put(f'{A}/connectors/{otro.id}',
                               json={**CUERPO, 'name': NOMBRE.upper(),
                                     'credential_ref': 'pokemon/otra'})
    assert respuesta.status_code == 422
    assert 'name' in respuesta.get_json()['fields']


def test_put_inexistente_responde_404(superadmin, app):
    assert superadmin.put(f'{A}/connectors/9999',
                          json=CUERPO).status_code == 404


def test_put_cambiar_tipo_con_accesos_vigentes_responde_409(
        superadmin, plataforma):
    from tests.connectors.test_api import tipo_otro  # noqa: F401
    from app.modules.connectors import noop, registry
    from app.modules.connectors.registry import TipoConector
    registry.registrar_tipo(TipoConector('otro-pruebas', noop.ConectorNoop,
                                         noop.validar_params))
    try:
        conector = crear_conector(plataforma, name='Con accesos')
        acceso_vigente(plataforma)
        respuesta = superadmin.put(
            f'{A}/connectors/{conector.id}',
            json={**CUERPO, 'name': 'Con accesos', 'type': 'otro-pruebas'})
    finally:
        registry.quitar_tipo('otro-pruebas')
    assert respuesta.status_code == 409
    assert respuesta.get_json()['code'] == 'plataforma_con_accesos'


# --------------------------------------------------------------------------- #
# Eliminar
# --------------------------------------------------------------------------- #

def test_delete_borra_audita_y_limpia_la_cache(superadmin, libre, monkeypatch):
    llamadas = []
    monkeypatch.setattr(api_conectores, 'limpiar_cache',
                        lambda: llamadas.append(True))
    respuesta = superadmin.delete(f'{A}/connectors/{libre.id}', json={})
    assert respuesta.status_code == 200
    assert respuesta.get_json() == {'status': 'success'}
    assert PlatformConnector.query.count() == 0
    [evento] = eventos('conector_eliminado')
    assert evento.before_state['name'] == NOMBRE
    assert llamadas == [True]


def test_delete_con_accesos_vigentes_responde_409(superadmin, plataforma):
    conector = crear_conector(plataforma, name='Con accesos')
    acceso_vigente(plataforma)
    respuesta = superadmin.delete(f'{A}/connectors/{conector.id}', json={})
    assert respuesta.status_code == 409
    assert respuesta.get_json()['code'] == 'plataforma_con_accesos'
    assert PlatformConnector.query.count() == 1


def test_delete_inexistente_y_con_campos(superadmin, libre):
    assert superadmin.delete(f'{A}/connectors/9999',
                             json={}).status_code == 404
    respuesta = superadmin.delete(f'{A}/connectors/{libre.id}',
                                  json={'x': 1})
    assert respuesta.status_code == 400
    assert PlatformConnector.query.count() == 1


# --------------------------------------------------------------------------- #
# Asociar
# --------------------------------------------------------------------------- #

def asociar(superadmin, conector, plataforma_id):
    return superadmin.put(f'{A}/connectors/{conector.id}/platform',
                          json={'platform_id': plataforma_id})


def test_asociar_vincula_y_audita(superadmin, libre, plataforma):
    respuesta = asociar(superadmin, libre, plataforma.id)
    assert respuesta.status_code == 200
    datos = respuesta.get_json()['connector']
    assert datos['platform_id'] == plataforma.id
    assert datos['platform']['name'] == plataforma.name
    [evento] = eventos('conector_asociado')
    assert evento.platform_id == plataforma.id
    assert evento.area_id == plataforma.area_id
    assert evento.after_state['platform_id'] == plataforma.id


def test_asociar_a_la_misma_plataforma_no_cambia_ni_audita(
        superadmin, plataforma):
    conector = crear_conector(plataforma, name='Ya asociado')
    respuesta = asociar(superadmin, conector, plataforma.id)
    assert respuesta.status_code == 200
    assert eventos('conector_asociado') == []


def test_asociar_a_plataforma_con_otro_conector_responde_409(
        superadmin, libre, plataforma):
    crear_conector(plataforma, name='Otro', credential_ref='pokemon/otra')
    respuesta = asociar(superadmin, libre, plataforma.id)
    assert respuesta.status_code == 409
    assert respuesta.get_json()['code'] == 'plataforma_con_conector'
    assert db.session.get(PlatformConnector, libre.id).platform_id is None


def test_asociar_plataforma_o_conector_inexistente_responde_404(
        superadmin, libre):
    assert asociar(superadmin, libre, 9999).status_code == 404
    respuesta = superadmin.put(f'{A}/connectors/9999/platform',
                               json={'platform_id': 1})
    assert respuesta.status_code == 404


@pytest.mark.parametrize('cuerpo,codigo', [
    ({}, 422), ({'platform_id': 'x'}, 422), ({'platform_id': True}, 422),
    ({'platform_id': None}, 422), ({'platform_id': 1, 'otro': 1}, 400)])
def test_asociar_cuerpo_invalido(superadmin, libre, cuerpo, codigo):
    respuesta = superadmin.put(f'{A}/connectors/{libre.id}/platform',
                               json=cuerpo)
    assert respuesta.status_code == codigo
    if codigo == 422:
        assert 'platform_id' in respuesta.get_json()['fields']


def test_mover_a_otra_plataforma_con_accesos_vigentes_responde_409(
        superadmin, plataforma):
    conector = crear_conector(plataforma, name='Asociado')
    acceso_vigente(plataforma)
    destino = fabricas.crear_plataforma(plataforma.area, nombre='Destino')
    respuesta = asociar(superadmin, conector, destino.id)
    assert respuesta.status_code == 409
    assert respuesta.get_json()['code'] == 'plataforma_con_accesos'
    assert db.session.get(PlatformConnector,
                          conector.id).platform_id == plataforma.id


def test_mover_a_otra_plataforma_sin_accesos_audita_el_antes(
        superadmin, plataforma):
    conector = crear_conector(plataforma, name='Asociado')
    destino = fabricas.crear_plataforma(plataforma.area, nombre='Destino')
    assert asociar(superadmin, conector, destino.id).status_code == 200
    [evento] = eventos('conector_asociado')
    assert evento.before_state['platform_id'] == plataforma.id
    assert evento.after_state['platform_id'] == destino.id


def test_una_plataforma_no_puede_tener_dos_conectores(app, plataforma,
                                                      entorno_conector):
    crear_conector(plataforma, name='Uno', credential_ref='pokemon/uno')
    with pytest.raises(Exception):
        crear_conector(plataforma, name='Dos', credential_ref='pokemon/dos')
    db.session.rollback()


# --------------------------------------------------------------------------- #
# Desasociar
# --------------------------------------------------------------------------- #

def test_desasociar_deja_el_conector_sin_plataforma_y_audita(
        superadmin, plataforma):
    conector = crear_conector(plataforma, name='Asociado')
    respuesta = superadmin.delete(f'{A}/connectors/{conector.id}/platform',
                                  json={})
    assert respuesta.status_code == 200
    datos = respuesta.get_json()['connector']
    assert datos['platform_id'] is None and datos['platform'] is None
    assert db.session.get(PlatformConnector, conector.id) is not None
    [evento] = eventos('conector_desasociado')
    assert evento.before_state['platform_id'] == plataforma.id
    assert evento.platform_id == plataforma.id


def test_desasociar_sin_plataforma_responde_409(superadmin, libre):
    respuesta = superadmin.delete(f'{A}/connectors/{libre.id}/platform',
                                  json={})
    assert respuesta.status_code == 409
    assert respuesta.get_json()['code'] == 'conector_sin_plataforma'


def test_desasociar_con_accesos_vigentes_responde_409(superadmin, plataforma):
    conector = crear_conector(plataforma, name='Asociado')
    acceso_vigente(plataforma)
    respuesta = superadmin.delete(f'{A}/connectors/{conector.id}/platform',
                                  json={})
    assert respuesta.status_code == 409
    assert respuesta.get_json()['code'] == 'plataforma_con_accesos'


def test_desasociar_inexistente_y_con_campos(superadmin, plataforma):
    assert superadmin.delete(f'{A}/connectors/9999/platform',
                             json={}).status_code == 404
    conector = crear_conector(plataforma, name='Asociado')
    assert superadmin.delete(f'{A}/connectors/{conector.id}/platform',
                             json={'x': 1}).status_code == 400


# --------------------------------------------------------------------------- #
# Probar
# --------------------------------------------------------------------------- #

def test_probar_sin_plataforma_responde_409(superadmin, libre):
    respuesta = superadmin.post(f'{A}/connectors/{libre.id}/test', json={})
    assert respuesta.status_code == 409
    assert respuesta.get_json()['code'] == 'conector_sin_plataforma'


def test_probar_asociado_como_la_ruta_por_plataforma(app, superadmin,
                                                     conector_noop):
    _, configuracion, _ = conector_noop
    configuracion.name = 'Conector de prueba'
    db.session.commit()
    respuesta = superadmin.post(f'{A}/connectors/{configuracion.id}/test',
                                json={})
    assert respuesta.status_code == 200
    assert respuesta.get_json()['result'] == 'ok'
    assert len(eventos('conector_probado')) == 1


def test_probar_inexistente_responde_404(superadmin, app):
    assert superadmin.post(f'{A}/connectors/9999/test',
                           json={}).status_code == 404


# --------------------------------------------------------------------------- #
# Compatibilidad de las rutas por plataforma
# --------------------------------------------------------------------------- #

def test_put_por_plataforma_crea_con_el_nombre_de_la_plataforma(
        superadmin, plataforma):
    cuerpo = {k: v for k, v in CUERPO.items() if k != 'name'}
    respuesta = superadmin.put(f'{A}/platforms/{plataforma.id}/connector',
                               json=cuerpo)
    assert respuesta.status_code == 200
    datos = respuesta.get_json()['connector']
    assert datos['name'] == plataforma.name and datos['id']
    assert datos['platform_id'] == plataforma.id


def test_put_por_plataforma_con_nombre_ocupado_agrega_el_id(
        superadmin, plataforma):
    crear_conector(None, name=plataforma.name.upper(),
                   credential_ref='pokemon/otra')
    cuerpo = {k: v for k, v in CUERPO.items() if k != 'name'}
    respuesta = superadmin.put(f'{A}/platforms/{plataforma.id}/connector',
                               json=cuerpo)
    assert respuesta.status_code == 200
    assert respuesta.get_json()['connector']['name'] == (
        f'{plataforma.name} ({plataforma.id})')


def test_put_por_plataforma_con_nombre_y_respaldo_ocupados_no_da_500(
        superadmin, plataforma):
    crear_conector(None, name=plataforma.name, credential_ref='pokemon/a')
    crear_conector(None, name=f'{plataforma.name} ({plataforma.id})',
                   credential_ref='pokemon/b')
    cuerpo = {k: v for k, v in CUERPO.items() if k != 'name'}
    respuesta = superadmin.put(f'{A}/platforms/{plataforma.id}/connector',
                               json=cuerpo)
    assert respuesta.status_code == 200
    assert respuesta.get_json()['connector']['name'] == (
        f'{plataforma.name} ({plataforma.id}-2)')


def test_put_por_plataforma_no_acepta_name(superadmin, plataforma):
    respuesta = superadmin.put(f'{A}/platforms/{plataforma.id}/connector',
                               json=CUERPO)
    assert respuesta.status_code == 400


def test_put_por_plataforma_reemplaza_el_asociado_sin_cambiar_su_nombre(
        superadmin, plataforma):
    conector = crear_conector(plataforma, name='Nombre propio')
    cuerpo = {k: v for k, v in CUERPO.items() if k != 'name'}
    respuesta = superadmin.put(f'{A}/platforms/{plataforma.id}/connector',
                               json={**cuerpo, 'port': 8443})
    assert respuesta.status_code == 200
    assert respuesta.get_json()['connector']['name'] == 'Nombre propio'
    assert db.session.get(PlatformConnector, conector.id).port == 8443


def test_get_por_plataforma_trae_id_y_nombre(superadmin, plataforma):
    conector = crear_conector(plataforma, name='Nombre propio')
    datos = superadmin.get(
        f'{A}/platforms/{plataforma.id}/connector').get_json()['connector']
    assert datos['id'] == conector.id and datos['name'] == 'Nombre propio'


def test_delete_por_plataforma_elimina_el_conector(superadmin, plataforma):
    crear_conector(plataforma, name='Asociado')
    respuesta = superadmin.delete(f'{A}/platforms/{plataforma.id}/connector',
                                  json={})
    assert respuesta.status_code == 200
    assert PlatformConnector.query.count() == 0


# --------------------------------------------------------------------------- #
# Efectos en el resto del sistema
# --------------------------------------------------------------------------- #

def test_un_conector_sin_plataforma_no_cuenta_como_disponible(libre):
    from app.modules.connectors.consultas import configuracion_de
    assert configuracion_de(None) is None


def test_referencias_de_otras_incluye_conectores_sin_plataforma(libre,
                                                                plataforma):
    from app.modules.connectors.consultas import referencias_de_otras
    propio = crear_conector(plataforma, name='Propio',
                            credential_ref='pokemon/propio')
    assert referencias_de_otras(propio.id) == [REFERENCIA]
    assert sorted(referencias_de_otras(None)) == sorted(
        [REFERENCIA, 'pokemon/propio'])


# --------------------------------------------------------------------------- #
# Modelo
# --------------------------------------------------------------------------- #

def test_la_clave_del_nombre_se_calcula_sin_mayusculas(libre):
    assert libre.name_norm == NOMBRE.casefold()
    libre.name = 'Straße'
    assert libre.name_norm == 'strasse'


def test_la_base_rechaza_nombres_iguales_sin_distinguir_mayusculas(libre):
    with pytest.raises(Exception):
        crear_conector(None, name=NOMBRE.upper(),
                       credential_ref='pokemon/otra')
    db.session.rollback()
