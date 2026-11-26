"""API v1 de conectores independientes (FNC-213, contrato
`docs/contratos/conectores-y-ejecuciones.md` v1.6, «Conectores
independientes»): se crean sin plataforma y se asocian después.

| Ruta | Usuario | Admin de área | Superadmin |
|---|---|---|---|
| `GET`, `POST /connectors` | 403 | 403 | 200 / 201 |
| `GET`, `PUT`, `DELETE /connectors/<id>` | 403 | 403 | 200 |
| `PUT`, `DELETE /connectors/<id>/platform` | 403 | 403 | 200 |
| `POST /connectors/<id>/test` | 403 | 403 | 200 |

Mismas reglas que las rutas por plataforma (`api.py`): solo superadmin,
`escritura_del_portal`, cuerpo `{}` en `DELETE`, `test` y desasociar, y
`limpiar_cache()` tras cada escritura. Sin cache de credenciales de por
medio, `GET` no la toca.

Orden en las escrituras: conector (`404`) → cuerpo JSON y lista blanca
(`400`) → validación (`422`) → reglas de estado (`409`) → guardado y auditoría
en la misma transacción.
"""
from flask import jsonify
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from app import db
from app.authz import admin_required
from app.modules.api.csrf_provisional import escritura_del_portal
from app.modules.api.helpers import (NO_ENCONTRADO, error_response,
                                     leer_cuerpo, validation_error)
from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log
from app.modules.connectors.api import (CAMPOS_PERMITIDOS,
                                        CONECTOR_CONCURRENTE,
                                        MENSAJE_PRUEBA_ERROR,
                                        MENSAJE_PRUEBA_OK,
                                        PLATAFORMA_CON_ACCESOS,
                                        RESULTADO_ERROR, RESULTADO_OK,
                                        connectors_api_bp)
from app.modules.connectors.consultas import nombre_en_uso
from app.modules.connectors.credenciales import limpiar_cache
from app.modules.connectors.models import PlatformConnector
from app.modules.connectors.prueba import probar_conexion
from app.modules.connectors.servicio import (MODULO_AUDITORIA, auditar_cambio,
                                             estado, validar_conector)
from app.modules.connectors.validacion import MENSAJE_NOMBRE_EN_USO
from app.modules.core.models import Platform
from app.modules.platforms.estado import accesos_vigentes

CAMPOS_CREAR = CAMPOS_PERMITIDOS | {'name'}
CAMPO_PLATAFORMA = 'platform_id'

PLATAFORMA_CON_CONECTOR = ('La plataforma ya tiene otro conector.', 409,
                           'plataforma_con_conector')
CONECTOR_SIN_PLATAFORMA = ('El conector no está asociado a una plataforma.',
                           409, 'conector_sin_plataforma')
MENSAJE_PLATAFORMA = 'Indica el identificador de la plataforma.'


def _conector(conector_id):
    """`(conector, None)` o `(None, respuesta 404)`."""
    conector = db.session.get(PlatformConnector, conector_id)
    if conector is None:
        return None, error_response(*NO_ENCONTRADO)
    return conector, None


def _plataforma_de(conector):
    return db.session.get(Platform, conector.platform_id) \
        if conector.platform_id else None


def _con_accesos(conector):
    """`True` si su plataforma asociada tiene accesos vigentes."""
    plataforma = _plataforma_de(conector)
    return plataforma is not None and accesos_vigentes(plataforma) > 0


def _respuesta(conector, codigo=200):
    return jsonify({'status': 'success',
                    'connector': conector.to_dict_v2()}), codigo


def _auditar_vinculo(evento, conector, plataforma, antes_id):
    add_audit_log(evento, status='success', module=MODULO_AUDITORIA,
                  target=conector.name,
                  platform_id=plataforma.id if plataforma else antes_id,
                  area_id=plataforma.area_id if plataforma else None,
                  before={CAMPO_PLATAFORMA: antes_id},
                  after={CAMPO_PLATAFORMA:
                         plataforma.id if plataforma else None},
                  commit=False)


@connectors_api_bp.route('/connectors')
@login_required
@admin_required
def list_connectors():
    conectores = PlatformConnector.query.order_by(
        PlatformConnector.name_norm, PlatformConnector.id).all()
    return jsonify({'items': [c.to_dict_v2() for c in conectores]})


@connectors_api_bp.route('/connectors', methods=['POST'])
@login_required
@admin_required
@escritura_del_portal
def post_connector():
    datos, error = leer_cuerpo(CAMPOS_CREAR)
    if error is not None:
        return error
    limpio, errores = validar_conector(datos)
    if errores:
        return validation_error(errores)
    conector = PlatformConnector(**limpio)
    db.session.add(conector)
    db.session.flush()
    auditar_cambio(conector, {}, None, evento=Evento.CONECTOR_CREADO)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        if nombre_en_uso(limpio['name']):
            return validation_error({'name': MENSAJE_NOMBRE_EN_USO})
        raise
    limpiar_cache()
    return _respuesta(conector, 201)


@connectors_api_bp.route('/connectors/<int:connector_id>')
@login_required
@admin_required
def get_independent_connector(connector_id):
    conector, error = _conector(connector_id)
    if error is not None:
        return error
    return jsonify({'connector': conector.to_dict_v2()})


@connectors_api_bp.route('/connectors/<int:connector_id>', methods=['PUT'])
@login_required
@admin_required
@escritura_del_portal
def put_independent_connector(connector_id):
    conector, error = _conector(connector_id)
    if error is not None:
        return error
    datos, error = leer_cuerpo(CAMPOS_CREAR)
    if error is not None:
        return error
    limpio, errores = validar_conector(datos, conector.id)
    if errores:
        return validation_error(errores)
    if conector.type != limpio['type'] and _con_accesos(conector):
        return error_response(*PLATAFORMA_CON_ACCESOS)
    antes = estado(conector)
    for campo, valor in limpio.items():
        setattr(conector, campo, valor)
    auditar_cambio(conector, antes, _plataforma_de(conector))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        if nombre_en_uso(limpio['name'], connector_id):
            return validation_error({'name': MENSAJE_NOMBRE_EN_USO})
        return error_response(*CONECTOR_CONCURRENTE)
    limpiar_cache()
    return _respuesta(conector)


@connectors_api_bp.route('/connectors/<int:connector_id>', methods=['DELETE'])
@login_required
@admin_required
@escritura_del_portal
def delete_independent_connector(connector_id):
    conector, error = _conector(connector_id)
    if error is not None:
        return error
    _, error = leer_cuerpo()
    if error is not None:
        return error
    if _con_accesos(conector):
        return error_response(*PLATAFORMA_CON_ACCESOS)
    plataforma = _plataforma_de(conector)
    add_audit_log(Evento.CONECTOR_ELIMINADO, status='warning',
                  module=MODULO_AUDITORIA, target=conector.name,
                  platform_id=plataforma.id if plataforma else None,
                  area_id=plataforma.area_id if plataforma else None,
                  before=estado(conector), commit=False)
    db.session.delete(conector)
    db.session.commit()
    limpiar_cache()
    return jsonify({'status': 'success'})


@connectors_api_bp.route('/connectors/<int:connector_id>/platform',
                         methods=['PUT'])
@login_required
@admin_required
@escritura_del_portal
def associate_connector(connector_id):
    conector, error = _conector(connector_id)
    if error is not None:
        return error
    datos, error = leer_cuerpo({CAMPO_PLATAFORMA})
    if error is not None:
        return error
    destino_id = datos.get(CAMPO_PLATAFORMA)
    if not isinstance(destino_id, int) or isinstance(destino_id, bool):
        return validation_error({CAMPO_PLATAFORMA: MENSAJE_PLATAFORMA})
    destino = db.session.get(Platform, destino_id)
    if destino is None:
        return error_response(*NO_ENCONTRADO)
    if conector.platform_id == destino.id:
        return _respuesta(conector)
    ocupante = PlatformConnector.query.filter_by(platform_id=destino.id).first()
    if ocupante is not None:
        return error_response(*PLATAFORMA_CON_CONECTOR)
    if _con_accesos(conector):
        return error_response(*PLATAFORMA_CON_ACCESOS)
    antes_id = conector.platform_id
    conector.platform_id = destino.id
    _auditar_vinculo(Evento.CONECTOR_ASOCIADO, conector, destino, antes_id)
    try:
        db.session.commit()
    except IntegrityError:
        # Otra petición asoció esa plataforma a la vez (`uq_..._platform_id`).
        db.session.rollback()
        return error_response(*PLATAFORMA_CON_CONECTOR)
    limpiar_cache()
    return _respuesta(conector)


@connectors_api_bp.route('/connectors/<int:connector_id>/platform',
                         methods=['DELETE'])
@login_required
@admin_required
@escritura_del_portal
def disassociate_connector(connector_id):
    conector, error = _conector(connector_id)
    if error is not None:
        return error
    _, error = leer_cuerpo()
    if error is not None:
        return error
    plataforma = _plataforma_de(conector)
    if plataforma is None:
        return error_response(*CONECTOR_SIN_PLATAFORMA)
    if accesos_vigentes(plataforma) > 0:
        return error_response(*PLATAFORMA_CON_ACCESOS)
    conector.platform_id = None
    _auditar_vinculo(Evento.CONECTOR_DESASOCIADO, conector, None, plataforma.id)
    db.session.commit()
    limpiar_cache()
    return _respuesta(conector)


@connectors_api_bp.route('/connectors/<int:connector_id>/test',
                         methods=['POST'])
@login_required
@admin_required
@escritura_del_portal
def test_independent_connector(connector_id):
    conector, error = _conector(connector_id)
    if error is not None:
        return error
    _, error = leer_cuerpo()
    if error is not None:
        return error
    plataforma = _plataforma_de(conector)
    if plataforma is None:
        return error_response(*CONECTOR_SIN_PLATAFORMA)
    exito, motivo = probar_conexion(conector, current_user.id)
    add_audit_log(Evento.CONECTOR_PROBADO,
                  status='success' if exito else 'error',
                  module=MODULO_AUDITORIA, target=conector.name,
                  platform_id=plataforma.id, area_id=plataforma.area_id,
                  after={'result': RESULTADO_OK if exito else RESULTADO_ERROR,
                         'motivo': motivo},
                  commit=False)
    db.session.commit()
    if exito:
        return jsonify({'status': 'success', 'result': RESULTADO_OK,
                        'message': MENSAJE_PRUEBA_OK})
    return jsonify({'status': 'success', 'result': RESULTADO_ERROR,
                    'message': MENSAJE_PRUEBA_ERROR})
