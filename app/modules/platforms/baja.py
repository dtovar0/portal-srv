"""Condiciones y limpieza para dar de baja una plataforma (FNC-144).

- `409 plataforma_con_accesos` si tiene accesos vigentes: borrarla dejaría a
  la gente en los grupos del sistema real sin rastro en el portal
  (`access/models.py`). Primero se retiran los accesos.
- Sin accesos vigentes, `limpiar_historial` retira lo que la FK impide borrar
  (solicitudes y accesos `revocado`) y desliga los trabajos (`platform_id` y
  `access_id` a NULL, como el `ON DELETE SET NULL` de MySQL) y **desasocia**
  el conector (FNC-213: se conserva con `platform_id` nulo, como el `ON DELETE
  SET NULL` de la FK). El rastro de
  cada otorgamiento, revocación y solicitud queda en la auditoría, y el
  evento de baja guarda los conteos.
"""
from app.modules.access.models import PlatformAccessGrant
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.access_requests.tipos import ESTADO_PENDIENTE
from app.modules.connectors.models import PlatformConnector
from app.modules.connectors.servicio import MODULO_AUDITORIA as MODULO_CONECTORES
from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log
from app.modules.platforms import estado
from app.modules.provisioning.models import ProvisioningJob

# Campo del vínculo en la auditoría, como en `connectors.api_independientes`.
CAMPO_PLATAFORMA = 'platform_id'

PLATAFORMA_CON_ACCESOS_VIGENTES = (
    'La plataforma tiene accesos vigentes; retíralos antes de eliminarla.',
    409, 'plataforma_con_accesos')


def conflicto_de_baja(plataforma):
    """Error que impide la baja, o None si se puede borrar."""
    estado.bloquear_plataforma(plataforma.id)  # FNC-215
    if estado.accesos_vigentes(plataforma) > 0:
        return PLATAFORMA_CON_ACCESOS_VIGENTES
    return None


def limpiar_historial(plataforma):
    """Retira solicitudes y accesos cerrados y desliga los trabajos; devuelve
    los conteos para la auditoría. Sin `commit` (lo hace el llamador)."""
    solicitudes = PlatformAccessRequest.query.filter_by(
        platform_id=plataforma.id)
    accesos = PlatformAccessGrant.query.filter_by(platform_id=plataforma.id)
    trabajos = ProvisioningJob.query.filter_by(platform_id=plataforma.id)
    conectores = PlatformConnector.query.filter_by(platform_id=plataforma.id)
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
    # FNC-215: cada conector que queda libre deja su `conector_desasociado`.
    for conector in conectores.all():
        add_audit_log(Evento.CONECTOR_DESASOCIADO, status='success',
                      module=MODULO_CONECTORES, target=conector.name,
                      platform_id=plataforma.id, area_id=plataforma.area_id,
                      before={CAMPO_PLATAFORMA: plataforma.id},
                      after={CAMPO_PLATAFORMA: None}, commit=False)
    # La FK del conector es SET NULL en MySQL y PostgreSQL; SQLite no la aplica.
    conectores.update({PlatformConnector.platform_id: None},
                      synchronize_session=False)
    return conteos
