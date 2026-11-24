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
from app.modules.auth.oidc_cuentas import (GRUPO_AREA_ADMIN_POR_DEFECTO,
                                           GRUPO_USER_POR_DEFECTO,
                                           VAR_GRUPO_AREA_ADMIN,
                                           VAR_GRUPO_USER)
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


def sincronizar_grupo_de_rol(escritor, persona_dn, rol, quitar_del_otro=False):
    """Agrega `persona_dn` al grupo de su rol (creándolo si falta) y, con
    `quitar_del_otro`, lo quita del grupo del otro rol. `True` si no falló."""
    es_admin = rol == ROLE_AREA_ADMIN
    dn_admins = _dn(escritor, nombre_grupo_admins())
    dn_usuarios = _dn(escritor, nombre_grupo_usuarios())
    destino, otro = (dn_admins, dn_usuarios) if es_admin else (dn_usuarios, dn_admins)
    try:
        escritor.create_group(destino)
        escritor.add_member(destino, persona_dn)
        if quitar_del_otro:
            escritor.remove_member(otro, persona_dn)
    except Exception as exc:  # el directorio no detiene al portal
        logger.warning('Grupo de rol en LDAP no sincronizado (%s).',
                       type(exc).__name__)
        return False
    return True
