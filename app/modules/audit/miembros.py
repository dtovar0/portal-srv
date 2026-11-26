"""Auditoría de altas y bajas de miembro en grupos del directorio (FNC-209).

- `auditar_miembro` registra `miembro_agregado` / `miembro_quitado` con el uid,
  el DN del grupo y el resultado (`hecho`, `ya_estaba` o `error` con su motivo).
- Nunca lanza: auditar no debe romper la operación de directorio.
"""
import logging

from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log

logger = logging.getLogger(__name__)

MODULO_AUDITORIA = 'Directorio'
RESULTADOS_OK = ('hecho', 'ya_estaba')
SIN_UID = '?'


def uid_de(persona):
    """Identificador de una persona (objeto de directorio, DN o texto)."""
    identificador = getattr(persona, 'identificador', None)
    if identificador:
        return str(identificador)
    dn = getattr(persona, 'dn', persona)
    if isinstance(dn, str) and '=' in dn:
        return dn.split(',')[0].split('=', 1)[1]
    return str(dn) if dn else SIN_UID


def auditar_miembro(evento, escritura, grupo_dn, persona, *, user_id=None,
                    platform_id=None, area_id=None, commit=False,
                    solo_log=False, as_system=False):
    """Audita el resultado de `add_member` (`Evento.MIEMBRO_AGREGADO`) o
    `remove_member` (`Evento.MIEMBRO_QUITADO`)."""
    try:
        resultado = getattr(getattr(escritura, 'resultado', None), 'value',
                            str(getattr(escritura, 'resultado', 'error')))
        motivo = getattr(escritura, 'motivo', None)
        ok = resultado in RESULTADOS_OK
        uid = uid_de(persona)
        detalle = f'{uid} en {grupo_dn}: {resultado if ok else "error"}'
        if not ok:
            detalle += f' ({resultado}{": " + motivo if motivo else ""})'
        add_audit_log(
            evento, status='success' if ok else 'error', detail=detalle,
            module=MODULO_AUDITORIA, target=uid, target_user_id=user_id,
            platform_id=platform_id, area_id=area_id,
            after={'grupo': grupo_dn, 'resultado': resultado,
                   'motivo': motivo},
            as_system=as_system, commit=commit, solo_log=solo_log)
    except Exception as exc:
        logger.warning('No se auditó la membresía (%s).', type(exc).__name__)
