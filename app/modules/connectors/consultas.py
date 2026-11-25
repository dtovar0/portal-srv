"""Consultas de la configuración de conectores (FNC-050)."""
from app.modules.connectors.models import PlatformConnector
from app.modules.connectors.registry import obtener_tipo


def configuracion_de(plataforma_id):
    """`PlatformConnector` de la plataforma, o `None`."""
    if not plataforma_id:
        return None
    return PlatformConnector.query.filter_by(platform_id=plataforma_id).first()


def referencias_de_otras(plataforma_id):
    """`credential_ref` de las configuraciones de las demás plataformas."""
    filas = (PlatformConnector.query
             .with_entities(PlatformConnector.credential_ref)
             .filter(PlatformConnector.platform_id != plataforma_id).all())
    return [fila.credential_ref for fila in filas]


def conector_disponible(plataforma):
    """`True` si la plataforma tiene una configuración de conector activa de un
    tipo registrado (lo que el ejecutor puede usar). Desde FNC-196 el conector
    es un paso adicional a los grupos: no depende de `integration_type`."""
    if plataforma is None:
        return False
    configuracion = configuracion_de(getattr(plataforma, 'id', None))
    return bool(configuracion and configuracion.active
                and obtener_tipo(configuracion.type) is not None)
