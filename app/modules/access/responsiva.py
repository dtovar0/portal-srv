"""Firma de la carta responsiva y su efecto en los accesos (FNC-202).

Extraído de `POST /me/firmar-responsiva` para reutilizarlo: la firma en el
portal y el registro por migración (`flask alta migrar-usuario`) hacen lo
mismo; solo cambia el texto de la auditoría y quién actúa. Sin `commit`: lo
hace el llamador (SEC-AUD-06).
"""
from datetime import datetime

from app.modules.access.models import PlatformAccessGrant
from app.modules.access.services import _encolar, registro_manual
from app.modules.access.tipos import ESTADOS_VIGENTES
from app.modules.audit.services import add_audit_log
from app.modules.provisioning.tipos import OPERACION_OTORGAR

ACCION_FIRMA = 'firma_responsiva'
DETALLE_PORTAL = ('Usuario {correo} firmó la carta responsiva v{version}. '
                  'Aprovisionamiento activado para {total} accesos.')
DETALLE_MIGRACION = ('Responsiva v{version} de {correo} registrada como '
                     'firmada por migración (CLI); no la firmó en el portal. '
                     'Aprovisionamiento activado para {total} accesos.')


def accesos_pendientes_de_firma(usuario):
    """Accesos vigentes de `usuario` que esperan su firma."""
    return PlatformAccessGrant.query.filter(
        PlatformAccessGrant.user_id == usuario.id,
        PlatformAccessGrant.status.in_(ESTADOS_VIGENTES),
        PlatformAccessGrant.responsiva_firmada.is_(False),
    ).all()


def firmar_accesos(accesos, momento=None):
    """Marca `accesos` como firmados y encola el aprovisionamiento de los que
    aún no tienen trabajo (salvo plataformas de registro manual)."""
    momento = momento or datetime.utcnow()
    for acceso in accesos:
        acceso.responsiva_firmada = True
        acceso.responsiva_firmada_at = momento
        if acceso.last_job_id is None and not registro_manual(acceso.platform):
            _encolar(acceso, OPERACION_OTORGAR, acceso.platform)
    return len(accesos)


def registrar_firma(usuario, por_migracion=False, actor=None):
    """Firma la responsiva de `usuario` y activa sus accesos pendientes;
    devuelve cuántos. Audita `firma_responsiva`.

    `por_migracion`: la registra el sistema (CLI), no la persona; `actor` es
    el nombre del actor de auditoría en ese caso.
    """
    momento = datetime.utcnow()
    usuario.responsiva_firmada = True
    usuario.responsiva_firmada_at = momento
    total = firmar_accesos(accesos_pendientes_de_firma(usuario), momento)
    plantilla = DETALLE_MIGRACION if por_migracion else DETALLE_PORTAL
    add_audit_log(
        action=ACCION_FIRMA, status='success',
        detail=plantilla.format(
            correo=usuario.email, total=total,
            version=getattr(usuario, 'responsiva_version', '1.0')),
        module='auth', target=usuario.email, target_user_id=usuario.id,
        user_override=actor if por_migracion else None, commit=False)
    return total
