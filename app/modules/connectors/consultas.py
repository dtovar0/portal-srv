"""Consultas de la configuración de conectores (FNC-050, FNC-213)."""
from app.modules.connectors.models import PlatformConnector
from app.modules.connectors.registry import obtener_tipo


def configuracion_de(plataforma_id):
    """`PlatformConnector` de la plataforma, o `None`."""
    if not plataforma_id:
        return None
    return PlatformConnector.query.filter_by(platform_id=plataforma_id).first()


def referencias_de_otras(conector_id):
    """`credential_ref` de los demás conectores, asociados o no.

    Se excluye por id de conector: con `platform_id` nulo, `!=` no devuelve la
    fila (FNC-213). `conector_id=None` (conector nuevo) las devuelve todas.
    """
    consulta = PlatformConnector.query.with_entities(
        PlatformConnector.credential_ref)
    if conector_id is not None:
        consulta = consulta.filter(PlatformConnector.id != conector_id)
    return [fila.credential_ref for fila in consulta.all()]


def nombre_en_uso(nombre, excepto_id=None):
    """`True` si otro conector tiene ese nombre (sin distinguir mayúsculas)."""
    consulta = PlatformConnector.query.filter_by(
        name_norm=PlatformConnector.clave_de(nombre))
    if excepto_id is not None:
        consulta = consulta.filter(PlatformConnector.id != excepto_id)
    return consulta.first() is not None


def conector_disponible(plataforma):
    """`True` si la plataforma tiene una configuración de conector activa de un
    tipo registrado (lo que el ejecutor puede usar). Desde FNC-196 el conector
    es un paso adicional a los grupos: no depende de `integration_type`."""
    if plataforma is None:
        return False
    configuracion = configuracion_de(getattr(plataforma, 'id', None))
    return bool(configuracion and configuracion.active
                and obtener_tipo(configuracion.type) is not None)
