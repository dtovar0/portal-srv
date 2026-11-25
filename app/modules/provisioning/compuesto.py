"""Proveedor de grupos con conector como paso adicional (FNC-196).

Toda plataforma da acceso por su grupo de nivel (`app-{plataforma}-{nivel}`):
ese paso lo hace `ProveedorLdap`. Si la plataforma además tiene un conector
disponible (p. ej. Zabbix con LDAP como autenticación, donde el usuario se
crea por API), después se ejecuta su operación de alta o de baja.

- Un solo trabajo por operación: conserva la cola, los reintentos y los
  estados del ejecutor. Los dos pasos son idempotentes, así que un reintento
  repite el grupo (`sin_cambios`) y vuelve a intentar el conector.
- Orden: otorgar y revocar empiezan por el grupo. Si el grupo falla, el
  conector no se toca. Si el conector falla, el trabajo falla con su error pero
  la pertenencia al grupo NO se revierte (decisión del dueño: el grupo es la
  fuente del acceso y el reintento repite ambos pasos). Riesgo residual: un
  otorgar que agota sus intentos deja a la persona en el grupo con el acceso
  `fallido`; el superadmin debe reintentar o revocar.
- Plataforma heredada sin grupo guardado del nivel (directorio sin configurar)
  pero con conector: solo se ejecuta el conector, como antes.
- Al revocar, «sin grupo», «grupo inexistente» y «persona inexistente en el
  directorio» cuentan como «ya no es miembro» y el conector igual da de baja.
- Cambio de nivel (P5): solo cambia el grupo; el conector no se ejecuta en la
  baja del nivel reemplazado ni en el alta del que lo reemplaza (FNC-198).
- `consultar` solo mira el grupo (el conector puede no soportarlo).
- El proveedor `conector` se toma del registro (`providers.obtener_proveedor`),
  no se importa: el módulo no depende de `connectors/`.
"""
from app import db
from app.modules.core.models import Platform
from app.modules.directory.errors import (MOTIVO_GRUPO_INEXISTENTE,
                                          MOTIVO_USUARIO_INEXISTENTE)
from app.modules.platforms.tipos import CAMPOS_DN
from app.modules.provisioning.ldap_provider import ProveedorLdap
from app.modules.provisioning.saneo import MOTIVO_GRUPO_NO_CONFIGURADO
from app.modules.provisioning.providers import (Provisioner,
                                                ResultadoProveedor,
                                                obtener_proveedor)
from app.modules.provisioning.tipos import (OPERACION_REVOCAR,
                                            PROVEEDOR_CONECTOR,
                                            RESULTADO_EXITOSO,
                                            RESULTADO_SIN_CAMBIOS)


def _plataforma(operacion):
    return (db.session.get(Platform, operacion.plataforma_id)
            if operacion.plataforma_id else None)


def _conector_disponible(plataforma):
    """Proveedor `conector` si la plataforma tiene uno configurado y activo."""
    # Import diferido: `connectors` importa `provisioning.providers`.
    from app.modules.connectors.consultas import conector_disponible
    if not conector_disponible(plataforma):
        return None
    return obtener_proveedor(PROVEEDOR_CONECTOR)


def _resultado_final(grupo, conector):
    """`exitoso` si algún paso cambió algo; si no, `sin_cambios`."""
    if (grupo.resultado == RESULTADO_EXITOSO
            or conector.resultado == RESULTADO_EXITOSO):
        return ResultadoProveedor(RESULTADO_EXITOSO)
    return ResultadoProveedor(RESULTADO_SIN_CAMBIOS)


# En una revocación estos fallos del grupo significan «ya no es miembro»: no
# deben impedir la baja por conector (auditor-seguridad, FNC-196).
MOTIVOS_SIN_MEMBRESIA = (MOTIVO_GRUPO_NO_CONFIGURADO, MOTIVO_GRUPO_INEXISTENTE,
                         MOTIVO_USUARIO_INEXISTENTE)


def _cambio_de_nivel(operacion):
    """`True` si el trabajo es parte de subir o bajar de nivel (P5): la baja del
    acceso reemplazado o el alta del que lo reemplaza. Ahí solo cambia el grupo
    (el rol vía conector queda para FNC-198)."""
    # Import diferido: `access` importa `provisioning` al cargarse.
    from app.modules.access.models import PlatformAccessGrant
    from app.modules.access.tipos import MOTIVO_REEMPLAZO
    acceso = (db.session.get(PlatformAccessGrant, operacion.acceso_id)
              if operacion.acceso_id else None)
    if acceso is None:
        return False
    if operacion.operacion == OPERACION_REVOCAR:
        return acceso.revoke_reason == MOTIVO_REEMPLAZO
    # Otorgar: el acceso inmediatamente anterior de la cuenta en la plataforma
    # fue reemplazado por este (nivel distinto).
    anterior = (PlatformAccessGrant.query
                .filter(PlatformAccessGrant.user_id == acceso.user_id,
                        PlatformAccessGrant.platform_id == acceso.platform_id,
                        PlatformAccessGrant.id < acceso.id)
                .order_by(PlatformAccessGrant.id.desc()).first())
    return (anterior is not None and anterior.level != acceso.level
            and anterior.revoke_reason == MOTIVO_REEMPLAZO)


class ProveedorGrupoYConector(Provisioner):

    def __init__(self, grupos=None):
        self._grupos = grupos or ProveedorLdap()

    def _con_conector(self, operacion, accion):
        plataforma = _plataforma(operacion)
        conector = _conector_disponible(plataforma)
        if conector is not None and _cambio_de_nivel(operacion):
            conector = None
        if (conector is not None and plataforma is not None
                and operacion.nivel in CAMPOS_DN
                and not getattr(plataforma, CAMPOS_DN[operacion.nivel])):
            # Plataforma heredada sin grupo ni forma de derivarlo (directorio
            # sin configurar): solo conector, como antes de FNC-196.
            return getattr(conector, accion)(operacion)
        grupo = getattr(self._grupos, accion)(operacion)
        if (not grupo.exito and accion == 'revocar' and conector is not None
                and grupo.motivo in MOTIVOS_SIN_MEMBRESIA):
            grupo = ResultadoProveedor(RESULTADO_SIN_CAMBIOS)
        if not grupo.exito or conector is None:
            return grupo
        resultado = getattr(conector, accion)(operacion)
        if not resultado.exito:
            return resultado
        return _resultado_final(grupo, resultado)

    def otorgar(self, operacion):
        return self._con_conector(operacion, 'otorgar')

    def revocar(self, operacion):
        return self._con_conector(operacion, 'revocar')

    def consultar(self, operacion):
        return self._grupos.consultar(operacion)
