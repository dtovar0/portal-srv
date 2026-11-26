"""Reglas compartidas de las rutas de conectores (FNC-061, FNC-213).

- `estado`: campos auditados de un conector (antes y después de un cambio).
- `auditar_cambio`: evento `conector_configurado` con solo lo que cambió, y
  nada si no cambió (como en plataformas, FNC-046).
- `nombre_para_plataforma`: nombre de un conector creado desde
  `PUT /platforms/<id>/connector`.
- `validar_conector`: cuerpo de `POST` y `PUT /connectors[/<id>]` (nombre más
  la configuración de siempre).
"""
from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log
from app.modules.connectors.consultas import nombre_en_uso, referencias_de_otras
from app.modules.connectors.tipos import LARGO_NOMBRE
from app.modules.connectors.validacion import (MENSAJE_NOMBRE_EN_USO,
                                               validar_configuracion,
                                               validar_nombre)

MODULO_AUDITORIA = 'Conectores'

CAMPOS_CONFIGURACION = ('type', 'host', 'port', 'params', 'credential_ref',
                        'active')
CAMPOS_AUDITADOS = ('name',) + CAMPOS_CONFIGURACION


def estado(conector):
    if conector is None:
        return {}
    return {campo: getattr(conector, campo) for campo in CAMPOS_AUDITADOS}


def auditar_cambio(conector, antes, plataforma, evento=Evento.CONECTOR_CONFIGURADO):
    """Agrega el evento (sin commit) si el estado cambió; devuelve si cambió."""
    despues = estado(conector)
    if antes == despues:
        return False
    add_audit_log(evento, status='success', module=MODULO_AUDITORIA,
                  target=conector.name,
                  platform_id=plataforma.id if plataforma else None,
                  area_id=plataforma.area_id if plataforma else None,
                  before={k: v for k, v in antes.items()
                          if despues.get(k) != v} or None,
                  after={k: v for k, v in despues.items()
                         if antes.get(k) != v},
                  commit=False)
    return True


def nombre_para_plataforma(plataforma):
    """Nombre de la plataforma; si otro conector ya lo tiene,
    `"<plataforma> (<id de la plataforma>)"` (recortado a `LARGO_NOMBRE`) y, si
    también está ocupado, `"... (<id>-<n>)"`."""
    candidato = plataforma.name
    intento = 1
    while nombre_en_uso(candidato):
        sufijo = (f' ({plataforma.id})' if intento == 1
                  else f' ({plataforma.id}-{intento})')
        candidato = plataforma.name[:LARGO_NOMBRE - len(sufijo)] + sufijo
        intento += 1
    return candidato


def validar_conector(datos, conector_id=None):
    """`(limpio, errores)` del cuerpo de `POST`/`PUT /connectors[/<id>]`.

    `limpio` trae `name` más la configuración; los errores son por campo.
    """
    limpio, errores = validar_configuracion(
        datos, referencias_en_uso=referencias_de_otras(conector_id))
    errores = dict(errores)
    nombre, mensaje = validar_nombre(datos.get('name'))
    if mensaje is None and nombre_en_uso(nombre, conector_id):
        mensaje = MENSAJE_NOMBRE_EN_USO
    if mensaje is not None:
        errores['name'] = mensaje
    if errores:
        return None, errores
    return {'name': nombre, **limpio}, {}

