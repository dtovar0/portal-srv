"""Grupo de Authelia (en OpenLDAP) que corresponde al rol del portal (FNC-170).

Authelia está entre el portal y LDAP y decide el rol por estos grupos
(`oidc_cuentas.rol_desde_grupos`): admin de área → grupo de admins; el resto
→ grupo de usuarios. Los nombres salen de `OIDC_GROUP_AREA_ADMIN` y
`OIDC_GROUP_USER` (con los alias heredados `LDAP_APP_ADMINS` y
`LDAP_APP_USERS`) y, si no hay, de los valores por omisión de `oidc_cuentas`.

Un fallo del directorio nunca interrumpe la operación del portal: se registra
solo el tipo de error (el texto puede nombrar a la persona).
"""
import logging
import os

from app.authz import ROLE_AREA_ADMIN
from app.modules.audit.events import Evento
from app.modules.audit.miembros import auditar_miembro
from app.modules.auth.oidc_cuentas import (GRUPO_AREA_ADMIN_POR_DEFECTO,
                                           GRUPO_USER_POR_DEFECTO,
                                           VAR_GRUPO_AREA_ADMIN,
                                           VAR_GRUPO_USER)
from app.modules.directory.errors import MOTIVO_SIN_PERMISO, Resultado
from app.modules.directory.ldap_client import escapar_valor_dn

logger = logging.getLogger(__name__)

# Alias heredados (se leen solo si la variable OIDC no está definida).
VAR_GRUPO_AREA_ADMIN_HEREDADA = 'LDAP_APP_ADMINS'
VAR_GRUPO_USER_HEREDADA = 'LDAP_APP_USERS'


def _leer(variable, heredada, por_defecto):
    return ((os.getenv(variable) or os.getenv(heredada) or '').strip()
            or por_defecto)


def nombre_grupo_admins():
    return _leer(VAR_GRUPO_AREA_ADMIN, VAR_GRUPO_AREA_ADMIN_HEREDADA,
                 GRUPO_AREA_ADMIN_POR_DEFECTO)


def nombre_grupo_usuarios():
    return _leer(VAR_GRUPO_USER, VAR_GRUPO_USER_HEREDADA,
                 GRUPO_USER_POR_DEFECTO)


def _dn(escritor, nombre):
    base = escritor.configuracion.grupos_base_dn
    return f'cn={escapar_valor_dn(nombre)},{base}'


class Sincronizacion:
    """Resultado de `sincronizar_grupo_de_rol`: verdadero si quedó así;
    `sin_permiso` distingue el rechazo de permisos del directorio (FNC-206)."""

    __slots__ = ('ok', 'sin_permiso')

    def __init__(self, ok, sin_permiso=False):
        self.ok = ok
        self.sin_permiso = sin_permiso

    def __bool__(self):
        return self.ok


def sin_permiso_en(sincronizacion):
    """`True` si el resultado (o un doble de prueba) fue por falta de permiso."""
    return bool(getattr(sincronizacion, 'sin_permiso', False))


def _ok(resultado):
    return bool(getattr(resultado, 'exito', False))


def _salida_ok(resultado):
    """Quitar a quien no es miembro, o de un grupo que no existe, es éxito."""
    return _ok(resultado) or getattr(resultado, 'resultado', None) is Resultado.NO_EXISTE


def _auditado(evento, resultado, grupo_dn, persona_dn):
    """Deja la alta o baja en el log de eventos (FNC-209) y devuelve el
    resultado. Solo log: quien llama puede tener cambios sin guardar, y un
    commit aquí los guardaría antes de tiempo."""
    auditar_miembro(evento, resultado, grupo_dn, persona_dn, solo_log=True)
    return resultado


def sincronizar_grupo_de_rol(escritor, persona_dn, rol, quitar_del_otro=False):
    """Agrega `persona_dn` al grupo de su rol (creándolo si falta) y, con
    `quitar_del_otro`, lo quita del grupo del otro rol. Devuelve una
    `Sincronizacion` (verdadera si quedó así).

    FNC-184: revisa cada resultado del directorio (no solo excepciones). Si
    entró al grupo nuevo pero no pudo salir del otro, deshace la entrada para
    no dejarlo en los dos grupos.
    """
    es_admin = rol == ROLE_AREA_ADMIN
    dn_admins = _dn(escritor, nombre_grupo_admins())
    dn_usuarios = _dn(escritor, nombre_grupo_usuarios())
    destino, otro = (dn_admins, dn_usuarios) if es_admin else (dn_usuarios, dn_admins)
    try:
        creacion = escritor.create_group(destino)
        if not _ok(creacion):
            return _fallo('crear el grupo', creacion)
        alta = _auditado(Evento.MIEMBRO_AGREGADO,
                         escritor.add_member(destino, persona_dn),
                         destino, persona_dn)
        if not _ok(alta):
            return _fallo('agregar al grupo', alta)
        if quitar_del_otro:
            baja = _auditado(Evento.MIEMBRO_QUITADO,
                             escritor.remove_member(otro, persona_dn),
                             otro, persona_dn)
            if not _salida_ok(baja):
                if alta.resultado is Resultado.HECHO:  # solo deshace lo que agregó
                    _auditado(Evento.MIEMBRO_QUITADO,
                              escritor.remove_member(destino, persona_dn),
                              destino, persona_dn)
                return _fallo('quitar del otro grupo', baja)
    except Exception as exc:  # el directorio no detiene al portal
        logger.warning('Grupo de rol en LDAP no sincronizado (%s).',
                       type(exc).__name__)
        return Sincronizacion(False)
    return Sincronizacion(True)


def _fallo(paso, resultado=None):
    sin_permiso = getattr(resultado, 'motivo', None) == MOTIVO_SIN_PERMISO
    logger.warning('Grupo de rol en LDAP no sincronizado: no se pudo %s%s.',
                   paso, ' (sin permiso)' if sin_permiso else '')
    return Sincronizacion(False, sin_permiso)
