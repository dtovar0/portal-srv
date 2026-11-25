"""Resumen de la bandeja de solicitudes (FNC-200, contrato `solicitudes.md` 1.3).

Mismo alcance que `approvals.bandeja` (todos los estados) con consultas
agregadas: no se cargan las filas de las solicitudes.
"""
from sqlalchemy import func

from app.modules.access_requests import approvals
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.access_requests.tipos import ESTADOS
from app.modules.core.models import Area, Platform


def _orden(fila):
    """Más solicitudes primero; a igual número, por nombre."""
    return (-fila['count'], fila['nombre'].casefold())


def resumen(actor):
    """Totales de las solicitudes que `actor` puede decidir."""
    alcance = approvals.bandeja(actor).order_by(None)
    cuenta = func.count(PlatformAccessRequest.id)

    por_estado = dict(alcance.with_entities(
        PlatformAccessRequest.status, cuenta)
        .group_by(PlatformAccessRequest.status).all())
    by_status = {estado: int(por_estado.get(estado, 0)) for estado in ESTADOS}

    filas_area = (alcance.join(Area, Area.id == Platform.area_id)
                  .with_entities(Area.id, Area.name, cuenta)
                  .group_by(Area.id, Area.name).all())
    by_area = sorted(
        ({'area_id': i, 'area': nombre, 'count': int(n), 'nombre': nombre}
         for i, nombre, n in filas_area if n > 0), key=_orden)

    filas_plataforma = (alcance.join(Area, Area.id == Platform.area_id)
                        .with_entities(Platform.id, Platform.name, Area.name,
                                       cuenta)
                        .group_by(Platform.id, Platform.name, Area.name).all())
    by_platform = sorted(
        ({'platform_id': i, 'platform': nombre, 'area': area, 'count': int(n),
          'nombre': nombre}
         for i, nombre, area, n in filas_plataforma if n > 0), key=_orden)

    for fila in by_area + by_platform:
        del fila['nombre']
    return {'total': sum(by_status.values()), 'by_status': by_status,
            'by_area': by_area, 'by_platform': by_platform}
