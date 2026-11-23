"""Consultas de solicitudes para otros módulos (FNC-066)."""
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.core.models import Platform


def mias(usuario_id):
    """Query de las solicitudes de la cuenta (`GET /access-requests/mine` y
    el resumen del inicio), sin orden."""
    return (PlatformAccessRequest.query
            .join(Platform, Platform.id == PlatformAccessRequest.platform_id)
            .filter(PlatformAccessRequest.user_id == usuario_id))
