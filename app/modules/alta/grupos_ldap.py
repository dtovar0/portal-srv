"""Lectura de grupos y personas del directorio para `flask alta` (FNC-182).

La lectura con `ldap3` está en `directory/grupos.py`; aquí solo se traducen
sus errores a mensajes de la CLI y se calculan los conjuntos que usa la
migración. Los miembros se resuelven solo bajo `LDAP_USERS_BASE_DN`.
"""
import os

import click

from app.modules.auth.oidc_cuentas import (GRUPO_SUPERADMIN_POR_DEFECTO,
                                           VAR_GRUPO_SUPERADMIN)
from app.modules.directory.grupos import (GrupoRechazado,  # noqa: F401
                                          es_relleno, identificador_de_miembro,
                                          leer_grupo as leer_grupo_directorio,
                                          nombre_de_dn)
from app.modules.directory.ldap_client import ErrorDirectorio

MENSAJE_GRUPO_NO_EXISTE = 'El grupo «{}» no existe en el directorio.'


def leer_grupo(cliente, texto):
    """`Grupo` o `None`; un grupo inválido o ilegible es `ClickException`."""
    try:
        return leer_grupo_directorio(cliente, texto)
    except ErrorDirectorio as exc:
        raise click.ClickException(str(exc)) from None


def grupo_obligatorio(cliente, texto):
    grupo = leer_grupo(cliente, texto)
    if grupo is None:
        raise click.ClickException(MENSAJE_GRUPO_NO_EXISTE.format(texto))
    return grupo


def nombres_de_grupos_de(cliente, persona):
    """`cn` en minúsculas de los grupos de los que `persona` es miembro."""
    return {nombre_de_dn(dn).lower()
            for dn in cliente.grupos_de_usuario(persona)}


def identificadores(cfg, grupo):
    """Identificadores en minúsculas de los miembros de `grupo` (o vacío)."""
    if grupo is None:
        return set()
    encontrados = (identificador_de_miembro(cfg, m) for m in grupo.miembros)
    return {i.lower() for i in encontrados if i}


def nombre_grupo_superadmin():
    return ((os.getenv(VAR_GRUPO_SUPERADMIN) or '').strip()
            or GRUPO_SUPERADMIN_POR_DEFECTO)


def identificadores_de_superadmin(cliente):
    """Quienes están en `OIDC_GROUP_SUPERADMIN`: nunca se importan ni rotan."""
    return identificadores(cliente.configuracion,
                           leer_grupo(cliente, nombre_grupo_superadmin()))
