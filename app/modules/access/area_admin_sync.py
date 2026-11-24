"""Acceso automático de los admins a las plataformas de sus áreas (FNC-055,
nivel de grupo por FNC-185).

P6 (dueño, 2026-11-24; reemplaza la de 2026-10-14): cada plataforma tiene su
grupo `-users` y su grupo `-admins`; todos entran en `-users` y quien pasa a
admin de área debe cambiar a `-admins` en las plataformas de sus áreas.
- Admin de área activo: en cada plataforma de sus áreas administradas su acceso
  es de nivel `admin` (origen `admin_de_area`). Si ya tenía uno de nivel
  `usuario` (manual o por solicitud) sube a `admin` con el reemplazo de nivel
  de P5 (`services.otorgar`): el de `usuario` pasa a `revocando` y el de
  `admin` a `en_proceso`, juntos, sin dejar ambos grupos.
- Deja de administrar el área (quita el área o el rol): en esas plataformas su
  acceso automático de nivel `admin` baja a `usuario` (origen `admin_de_area`)
  y lo conserva; si no tenía acceso, queda con uno de `usuario`. Solo si es
  miembro del área de la plataforma (P1); si no, el acceso automático se
  revoca (decisión del orquestador, pendiente de validar con el dueño).
- Plataformas `ldap` sin `ldap_group_admin_dn`: no se puede subir a `admin`;
  queda en `usuario` y se avisa en el log (sin fallar).
- Los accesos de las plataformas de otras áreas no cambian. El superadmin no
  recibe accesos automáticos (acceso por defecto, sin grupos LDAP).

Uso desde otros módulos, **dentro de su transacción** (no hace `commit`):
- `sincronizar_plataforma(plataforma)`: alta, cambio de área o grupos.
- `sincronizar_cuenta(cuenta, areas_nuevas, areas_quitadas)`: áreas
  administradas o rol.
- `ajustar_al_confirmar(acceso)`: manejador del otorgar confirmado.

Reutiliza `services.otorgar`/`services.revocar` (FNC-054): las reglas, la
cola y la auditoría ("sistema dio permisos de acceso a admin X") son esas.

Decisiones del orquestador (pendientes de validar en la prueba de concepto):
- Solo se ajusta ante un evento (alta, área agregada o quitada, cambio de rol,
  de área o de grupos): una revocación manual del superadmin no se deshace
  sola.
- Un cambio de nivel solo parte de un acceso `activo`; uno `en_proceso` o
  `fallido` se ajusta al confirmarse (`ajustar_al_confirmar`).
- Un acceso por solicitud de nivel `admin` no se baja nunca: solo se baja el
  automático.
- Si la cuenta tiene una revocación en curso del nivel que le toca, no se
  otorga otro de ese nivel.
- Plataformas `ldap` sin el grupo del nivel `usuario` (heredadas) no reciben
  accesos: el trabajo fallaría y el acceso `fallido` bloquearía completar los
  grupos. Al completarlos se sincroniza.
- Un admin inactivo no recibe accesos automáticos.
- Al mover la plataforma de área se revocan los automáticos de quien no
  administra la nueva (como antes); los demás cambios de plataforma solo
  ajustan el nivel.
"""
import logging

from app import db
from app.authz import is_admin, is_area_admin, managed_area_ids
from app.modules.access import services
from app.modules.access.consultas import vigentes_de
from app.modules.access.models import PlatformAccessGrant
from app.modules.access.tipos import (ESTADO_ACTIVO, ESTADOS_OCUPANTES,
                                      ESTADOS_VIGENTES, MOTIVO_RETIRO_ADMIN,
                                      ORIGEN_ADMIN_DE_AREA)
from app.modules.core.models import Area, Platform
from app.modules.platforms.tipos import (CAMPOS_DN, NIVEL_ADMIN, NIVEL_USUARIO,
                                         TIPO_LDAP, TIPOS_INTEGRACION)

logger = logging.getLogger(__name__)

NIVEL_AUTOMATICO = NIVEL_ADMIN  # P6 (2026-11-24): el admin del área es admin
NIVEL_BASE = NIVEL_USUARIO  # al dejar de administrar, y respaldo sin grupo admin


def pertenece(cuenta, plataforma):
    """`True` si la cuenta es miembro del área de la plataforma (P1)."""
    return plataforma.area_id in {a.id for a in (cuenta.areas or [])}


def administra(cuenta, plataforma):
    """`True` si la cuenta activa administra el área de la plataforma."""
    return (cuenta is not None and plataforma is not None
            and bool(cuenta.is_active) and is_area_admin(cuenta)
            and plataforma.area_id in managed_area_ids(cuenta))


def aprovisionable(plataforma, nivel=NIVEL_BASE):
    """Conector, o `ldap` con el grupo del `nivel`."""
    if plataforma.integration_type == TIPO_LDAP:
        return bool(getattr(plataforma, CAMPOS_DN[nivel]))
    return plataforma.integration_type in TIPOS_INTEGRACION


def _automaticos_vigentes(**filtros):
    return (PlatformAccessGrant.query
            .filter_by(origin=ORIGEN_ADMIN_DE_AREA, **filtros)
            .filter(PlatformAccessGrant.status.in_(ESTADOS_VIGENTES))
            .order_by(PlatformAccessGrant.id).all())


def _nivel_objetivo(cuenta, plataforma):
    """Nivel que le toca a la cuenta en la plataforma, o `None` si no puede
    recibir acceso (inactiva, superadmin o plataforma sin grupo/conector)."""
    if not cuenta.is_active or is_admin(cuenta):
        return None
    if not aprovisionable(plataforma, NIVEL_BASE):
        return None  # `ldap` heredada: sin grupo `usuario` no hay accesos
    if administra(cuenta, plataforma):
        if aprovisionable(plataforma, NIVEL_AUTOMATICO):
            return NIVEL_AUTOMATICO
        logger.warning(
            'Accesos automáticos: la plataforma %s (ldap) no tiene grupo de '
            'nivel admin; la cuenta %s queda con nivel usuario.',
            plataforma.id, cuenta.id)
        return NIVEL_BASE
    # Quien ya no administra conserva `usuario` solo si es del área (P1).
    return NIVEL_BASE if pertenece(cuenta, plataforma) else None


# --------------------------------------------------------------------------- #
# Una cuenta en una plataforma
# --------------------------------------------------------------------------- #

def ajustar_nivel(cuenta, plataforma, con_base=False):
    """Deja a la cuenta con el nivel que le toca en la plataforma.

    - Sin acceso vigente: otorga el nivel (el de `usuario` de quien no
      administra solo con `con_base`, al quitarle el área).
    - `usuario` → `admin` (administra): P5, reemplazo en una operación.
    - `admin` automático → `usuario` (ya no administra y es del área, P1):
      revoca el de `admin` y otorga el de `usuario`, juntos; si no es del
      área, se revoca. Cuenta inactiva o superadmin: se revocan.
    Devuelve el acceso otorgado o `None` si no hizo nada.
    """
    objetivo = _nivel_objetivo(cuenta, plataforma)
    if objetivo is None:
        # Superadmin, cuenta inactiva o sin vínculo con el área: no conserva
        # automáticos (un `admin` desactivado no se queda en el grupo admin).
        if not administra(cuenta, plataforma):
            for acceso in _automaticos_vigentes(user_id=cuenta.id,
                                                platform_id=plataforma.id):
                _revocar_automatico(acceso)
        return None
    vigentes = vigentes_de(cuenta.id, plataforma.id)
    ocupante = next((a for a in vigentes if a.status in ESTADOS_OCUPANTES),
                    None)
    if ocupante is None:
        if any(a.level == objetivo for a in vigentes):
            return None  # revocación en curso de ese nivel
        if objetivo == NIVEL_BASE and not (con_base
                                           or administra(cuenta, plataforma)):
            return None
        return services.otorgar(cuenta, plataforma, objetivo,
                                ORIGEN_ADMIN_DE_AREA,
                                regreso_de_admin=not administra(cuenta,
                                                                plataforma))
    if ocupante.level == objetivo or ocupante.status != ESTADO_ACTIVO:
        return None  # lo que esté en curso se ajusta al confirmarse
    if any(a.level == objetivo for a in vigentes):
        return None  # el nivel destino sale aún (revocando/fallo): sin error
    if objetivo == NIVEL_AUTOMATICO:
        return services.otorgar(cuenta, plataforma, objetivo,
                                ORIGEN_ADMIN_DE_AREA)
    if ocupante.origin != ORIGEN_ADMIN_DE_AREA:
        return None  # un admin por solicitud no se baja
    services.revocar(ocupante, motivo=MOTIVO_RETIRO_ADMIN)
    return services.otorgar(cuenta, plataforma, objetivo, ORIGEN_ADMIN_DE_AREA,
                            regreso_de_admin=True)


def _revocar_automatico(acceso):
    if acceso.status != ESTADO_ACTIVO:
        return None  # `en_proceso`: `ajustar_al_confirmar`
    return services.revocar(acceso, motivo=MOTIVO_RETIRO_ADMIN)


def ajustar_al_confirmar(acceso):
    """Otorgar confirmado: ajusta el nivel a lo que hoy le toca a la cuenta.

    Lo usa el manejador del otorgar confirmado (`manejadores.py`): un
    automático `admin` de quien ya no administra baja a `usuario`, un
    `usuario` de quien ahora administra sube a `admin` y el de un superadmin
    se revoca. Solo actúa si el acceso es automático o la cuenta administra
    la plataforma.
    """
    if acceso is None or acceso.status != ESTADO_ACTIVO:
        return None
    cuenta, plataforma = acceso.user, acceso.platform
    if acceso.origin != ORIGEN_ADMIN_DE_AREA and not administra(cuenta,
                                                                plataforma):
        return None
    return ajustar_nivel(cuenta, plataforma)


# --------------------------------------------------------------------------- #
# Puntos de entrada
# --------------------------------------------------------------------------- #

def sincronizar_plataforma(plataforma, area_cambio=False):
    """Alta, cambio de área o de grupos de la plataforma.

    - Con `area_cambio`: se revocan los automáticos de quien no administra la
      nueva área (la plataforma salió de la suya).
    - Siempre: ajusta el nivel de los automáticos vigentes y otorga a los
      admins de su área que no tienen acceso (o suben de nivel).
    """
    for acceso in _automaticos_vigentes(platform_id=plataforma.id):
        if area_cambio and not administra(acceso.user, plataforma):
            _revocar_automatico(acceso)
        else:
            ajustar_nivel(acceso.user, plataforma)
    # Por id: la relación `area` no se refresca si el llamador cambió `area_id`.
    area = db.session.get(Area, plataforma.area_id)
    admins = sorted(getattr(area, 'admins', None) or [],
                    key=lambda cuenta: cuenta.id)
    for cuenta in admins:
        ajustar_nivel(cuenta, plataforma)


def sincronizar_cuenta(cuenta, areas_nuevas=(), areas_quitadas=()):
    """Áreas administradas o rol de una cuenta.

    - Ajusta el nivel de sus automáticos vigentes (los de áreas que ya no
      administra bajan a `usuario`).
    - `areas_quitadas`: en sus plataformas queda con acceso de `usuario`
      aunque antes no tuviera.
    - `areas_nuevas`: en sus plataformas pasa a `admin`.
    """
    for acceso in _automaticos_vigentes(user_id=cuenta.id):
        ajustar_nivel(cuenta, acceso.platform)
    for areas, con_base in ((areas_quitadas, True), (areas_nuevas, False)):
        ids = [a.id for a in areas or ()]
        if not ids:
            continue
        plataformas = (Platform.query.filter(Platform.area_id.in_(ids))
                       .order_by(Platform.id).all())
        for plataforma in plataformas:
            ajustar_nivel(cuenta, plataforma, con_base=con_base)
