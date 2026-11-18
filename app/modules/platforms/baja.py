"""Condiciones y limpieza para dar de baja una plataforma (FNC-144).

- `409 plataforma_con_accesos` si tiene accesos vigentes: borrarla dejaría a
  la gente en los grupos del sistema real sin rastro en el portal
  (`access/models.py`). Primero se retiran los accesos.
- Sin accesos vigentes, `limpiar_historial` retira lo que la FK impide borrar
  (solicitudes y accesos `revocado`) y desliga los trabajos (`platform_id` y
  `access_id` a NULL, como el `ON DELETE SET NULL` de MySQL) y borra el
  conector (sin accesos vigentes, como `DELETE /connector`). El rastro de
  cada otorgamiento, revocación y solicitud queda en la auditoría, y el
  evento de baja guarda los conteos.
"""
from app.modules.access.models import PlatformAccessGrant
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.access_requests.tipos import ESTADO_PENDIENTE
from app.modules.connectors.models import PlatformConnector
from app.modules.platforms.estado import accesos_vigentes
from app.modules.provisioning.models import ProvisioningJob

PLATAFORMA_CON_ACCESOS_VIGENTES = (
    'La plataforma tiene accesos vigentes; retíralos antes de eliminarla.',
    409, 'plataforma_con_accesos')


def conflicto_de_baja(plataforma):
    """Error que impide la baja, o None si se puede borrar."""
    if accesos_vigentes(plataforma) > 0:
        return PLATAFORMA_CON_ACCESOS_VIGENTES
    return None


def limpiar_historial(plataforma):
    """Retira solicitudes y accesos cerrados y desliga los trabajos; devuelve
    los conteos para la auditoría. Sin `commit` (lo hace el llamador)."""
    solicitudes = PlatformAccessRequest.query.filter_by(
        platform_id=plataforma.id)
    accesos = PlatformAccessGrant.query.filter_by(platform_id=plataforma.id)
    trabajos = ProvisioningJob.query.filter_by(platform_id=plataforma.id)
    conteos = {
        'solicitudes_pendientes': solicitudes.filter_by(
            status=ESTADO_PENDIENTE).count(),
        'solicitudes_retiradas': solicitudes.count(),
        'accesos_revocados_retirados': accesos.count(),
        'trabajos_desligados': trabajos.count(),
    }
    trabajos.update({ProvisioningJob.platform_id: None,
                     ProvisioningJob.access_id: None},
                    synchronize_session=False)
    solicitudes.delete(synchronize_session=False)
    accesos.delete(synchronize_session=False)
    # La FK del conector es CASCADE en MySQL; SQLite no la aplica.
    PlatformConnector.query.filter_by(platform_id=plataforma.id).delete(
        synchronize_session=False)
    return conteos
