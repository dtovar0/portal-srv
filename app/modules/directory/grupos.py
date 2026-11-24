"""Lectura de grupos y de sus miembros (FNC-182).

Solo lectura, con `ClienteDirectorio`. Un grupo se indica por su `cn` (bajo
`LDAP_GROUPS_BASE_DN`) o por su DN completo, que debe estar bajo esa base o
bajo `LDAP_GROUPS_INACTIVE_BASE_DN`. Vive aquí porque solo este paquete
importa `ldap3` (SEC-LDAP-01).
"""
from dataclasses import dataclass, field

from ldap3 import BASE, SUBTREE
from ldap3.core.exceptions import LDAPException, LDAPNoSuchObjectResult
from ldap3.utils.dn import parse_dn

from app.modules.directory.dn import bajo_base, mismo_dn
from app.modules.directory.ldap_client import (
    ATRIBUTOS_MIEMBRO_POR_IDENTIFICADOR, ErrorDirectorio, escapar_filtro)

MENSAJE_GRUPO_FUERA_DE_BASE = ('El grupo «{}» no está bajo LDAP_GROUPS_BASE_DN '
                               'ni LDAP_GROUPS_INACTIVE_BASE_DN.')
MENSAJE_GRUPO_AMBIGUO = 'El nombre «{}» corresponde a más de un grupo; usa el DN.'
MENSAJE_LECTURA = 'No se pudo leer el grupo «{}» del directorio.'


class GrupoRechazado(ErrorDirectorio):
    """El grupo pedido no es válido (fuera de las bases o ambiguo)."""


@dataclass
class Grupo:
    dn: str
    nombre: str
    # Valor de cada miembro tal cual está en el grupo.
    miembros: list = field(default_factory=list)


def _es_dn(texto):
    try:
        parse_dn(texto)
    except Exception:
        return False
    return ',' in texto


def nombre_de_dn(dn):
    try:
        return parse_dn(dn)[0][1]
    except Exception:
        return dn


def _miembros(entrada, atributo):
    if atributo not in entrada:
        return []
    return [str(v) for v in entrada[atributo].values]


def leer_grupo(cliente, texto):
    """`Grupo` por `cn` o DN, o `None` si no existe. `GrupoRechazado` si el DN
    está fuera de las bases permitidas o el nombre es ambiguo."""
    cfg = cliente.configuracion
    atributos = [cfg.atributo_miembro, 'cn']
    try:
        with cliente.conexion_servicio() as conexion:
            if _es_dn(texto):
                bases = [b for b in (cfg.grupos_base_dn,
                                     cfg.grupos_inactivos_base_dn) if b]
                if not any(bajo_base(texto, base) for base in bases):
                    raise GrupoRechazado(
                        MENSAJE_GRUPO_FUERA_DE_BASE.format(texto))
                try:
                    conexion.search(texto, '(objectClass=*)', BASE,
                                    attributes=atributos)
                except LDAPNoSuchObjectResult:
                    return None
            else:
                filtro = (f'(&(objectClass={cfg.clase_grupo})'
                          f'(cn={escapar_filtro(texto)}))')
                conexion.search(cfg.grupos_base_dn, filtro, SUBTREE,
                                attributes=atributos)
            entradas = list(conexion.entries)
    except LDAPException:
        raise ErrorDirectorio(MENSAJE_LECTURA.format(texto)) from None
    if not entradas:
        return None
    if len(entradas) > 1:
        raise GrupoRechazado(MENSAJE_GRUPO_AMBIGUO.format(texto))
    entrada = entradas[0]
    return Grupo(dn=entrada.entry_dn, nombre=nombre_de_dn(entrada.entry_dn),
                 miembros=_miembros(entrada, cfg.atributo_miembro))


def identificador_de_miembro(cfg, valor):
    """Identificador (`LDAP_USER_ATTR`) del miembro, o `None` si es un DN
    fuera de `LDAP_USERS_BASE_DN` o de otro tipo de entrada."""
    if cfg.atributo_miembro.lower() in ATRIBUTOS_MIEMBRO_POR_IDENTIFICADOR:
        return valor.strip() or None
    if cfg.miembro_relleno and mismo_dn(valor, cfg.miembro_relleno):
        return None
    if not bajo_base(valor, cfg.usuarios_base_dn):
        return None
    try:
        atributo, identificador, _ = parse_dn(valor)[0]
    except Exception:
        return None
    if atributo.lower() != cfg.atributo_usuario.lower():
        return None
    return identificador


def es_relleno(cfg, valor):
    return bool(cfg.miembro_relleno and mismo_dn(valor, cfg.miembro_relleno))


