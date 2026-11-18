"""Al quitar a una cuenta de un área se revocan sus accesos en las
plataformas de esa área (FNC-152).

- Lo usan `PUT /areas/<id>/users` y `PUT /users/<id>/areas`, en la misma
  transacción del cambio de áreas (sin `commit`).
- Revoca como el sistema (`actor=None`, motivo `ya_no_pertenece_al_area`):
  la auditoría lo registra igual que cualquier revocación (FNC-055).
- Solo accesos por solicitud: los automáticos de admin de área los resincroniza
  `area_admin_sync`. Con conector o LDAP se revocan los `activo` (trabajo
  `revocar`); en plataformas sin conector (`registro_manual`), también
  `en_proceso` y `fallido`, que pasan directo a `revocado`.
"""
from app.modules.access import services
from app.modules.access.models import PlatformAccessGrant
from app.modules.access.tipos import (ESTADO_ACTIVO, ESTADOS_OCUPANTES,
                                      ORIGEN_ADMIN_DE_AREA)
from app.modules.core.models import Platform

MOTIVO_SALIDA_DE_AREA = 'ya_no_pertenece_al_area'


def revocar_por_salida(usuario_id, area_ids):
    """Revoca los accesos de `usuario_id` en las plataformas de `area_ids`;
    devuelve cuántos."""
    if not area_ids:
        return 0
    accesos = (PlatformAccessGrant.query
               .join(Platform, Platform.id == PlatformAccessGrant.platform_id)
               .filter(PlatformAccessGrant.user_id == usuario_id,
                       Platform.area_id.in_(area_ids),
                       PlatformAccessGrant.origin != ORIGEN_ADMIN_DE_AREA,
                       PlatformAccessGrant.status.in_(ESTADOS_OCUPANTES))
               .all())
    revocados = 0
    for acceso in accesos:
        manual = services.registro_manual(acceso.platform)
        if not manual and acceso.status != ESTADO_ACTIVO:
            continue  # en curso: su trabajo `otorgar` decide; no hay estado que revocar
        services.revocar(acceso, actor=None, motivo=MOTIVO_SALIDA_DE_AREA, manual=manual)
        revocados += 1
    return revocados
