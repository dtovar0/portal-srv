"""Dónde están hoy los grupos LDAP de una plataforma (FNC-163).

- `Platform.ldap_group_*_dn` es siempre el DN **original** (bajo
  `LDAP_GROUPS_BASE_DN`). Cuando el grupo está movido a la OU de inactivos
  (`LDAP_GROUPS_INACTIVE_BASE_DN`) su DN actual es esa OU + el mismo RDN.
- Otorgar, revocar y consultar usan el DN **actual**: un acceso se puede quitar
  aunque la plataforma esté inactiva (decisión del orquestador, FNC-163).
- Estado deseado: `inactivos` si la plataforma o su área no están `Activo`.
"""
from app import db
from app.modules.core.models import Area
from app.modules.directory.dn import separar_dn
from app.modules.platforms.models import (UBICACION_ACTIVOS, UBICACION_PARCIAL,
                                          UBICACION_INACTIVOS, TrasladoGrupos)
from app.modules.platforms.tipos import CAMPOS_DN, NIVEL_ADMIN, NIVEL_USUARIO

ESTADO_ACTIVO = 'Activo'
NIVELES = (NIVEL_USUARIO, NIVEL_ADMIN)


def ubicacion_deseada(plataforma):
    """`inactivos` si la plataforma o su área están inactivas; si no, `activos`."""
    # Por id (identidad de la sesión): `plataforma.area` puede estar viejo si
    # el área acaba de cambiar en esta misma transacción.
    area = db.session.get(Area, plataforma.area_id)
    inactiva = (plataforma.status != ESTADO_ACTIVO
                or (area is not None and area.status != ESTADO_ACTIVO))
    return UBICACION_INACTIVOS if inactiva else UBICACION_ACTIVOS


def aplica(plataforma):
    """Solo las plataformas con algún grupo tienen algo que mover (FNC-196:
    todas dan acceso por grupo, con o sin conector)."""
    return any(getattr(plataforma, campo) for campo in CAMPOS_DN.values())


def dn_original(plataforma, nivel):
    return getattr(plataforma, CAMPOS_DN[nivel])


def padre_original(dn):
    """OU donde vive el grupo (para regresarlo sin adivinar); `None` si no hay."""
    partes = separar_dn(dn)
    return partes[1] if partes else None


def dn_en_inactivos(configuracion, dn):
    """DN que tendrá el grupo en la OU de inactivos (mismo RDN)."""
    partes = separar_dn(dn)
    if partes is None or not configuracion.grupos_inactivos_base_dn:
        return None
    return f'{partes[0]},{configuracion.grupos_inactivos_base_dn}'


def ubicacion_actual(plataforma, nivel):
    """`activos` o `inactivos`: dónde está hoy el grupo del nivel."""
    traslado = plataforma.group_move
    return traslado.ubicacion(nivel) if traslado else UBICACION_ACTIVOS


def dn_actual(plataforma, nivel, configuracion):
    """DN donde está hoy el grupo del nivel, o `None` si no tiene grupo."""
    dn = dn_original(plataforma, nivel)
    if not dn:
        return None
    if ubicacion_actual(plataforma, nivel) == UBICACION_INACTIVOS:
        return dn_en_inactivos(configuracion, dn) or dn
    return dn


def resumen(plataforma):
    """(`groups_location`, `groups_move_status`) para la API.

    Ubicación: `activos`, `inactivos` o `parcial` (un grupo movido y otro no);
    estado: `None` sin traslado, o `pendiente`/`hecho`/`fallido`.
    """
    traslado = plataforma.group_move
    if traslado is None:
        return UBICACION_ACTIVOS, None
    niveles = [ubicacion_actual(plataforma, n) for n in NIVELES
               if dn_original(plataforma, n)] or [UBICACION_ACTIVOS]
    if len(set(niveles)) > 1:
        return UBICACION_PARCIAL, traslado.status
    return niveles[0], traslado.status
