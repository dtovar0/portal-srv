"""Grupo de Authelia que exige el portal, para las personas importadas (FNC-182).

Quien se importa desde un grupo cualquiera debe estar también en
`OIDC_GROUP_USER` o `OIDC_GROUP_AREA_ADMIN` según su rol; si no, Authelia lo
rechaza al entrar. La escritura es de `grupos_de_rol.sincronizar_grupo_de_rol`
(FNC-170); aquí solo se decide si hace falta y se informa el resultado.
"""
from app.authz import ROLE_AREA_ADMIN
from app.modules.alta.grupos_ldap import nombres_de_grupos_de
from app.modules.alta.resumen import ACTUALIZADO, ERROR, OMITIDO, Linea
from app.modules.directory.ldap_client import ErrorDirectorio
from app.modules.directory.writer import EscritorDirectorio
from app.modules.users.grupos_de_rol import (nombre_grupo_admins,
                                             nombre_grupo_usuarios,
                                             sin_permiso_en,
                                             sincronizar_grupo_de_rol)

DETALLE = 'grupo del portal «{nombre}»: {texto}'
TEXTO_AGREGADO = 'agregado'
TEXTO_SIMULADO = 'se agregaría'
TEXTO_YA_ESTABA = 'ya estaba'
TEXTO_ERROR = 'no se pudo agregar'
TEXTO_SIN_PERMISO = 'no se pudo agregar: sin_permiso_en_directorio'
TEXTO_CONSULTA = 'no se pudo consultar'


def grupo_del_rol(rol):
    return nombre_grupo_admins() if rol == ROLE_AREA_ADMIN \
        else nombre_grupo_usuarios()


def asegurar_grupo(cliente, persona, correo, rol, dry_run,
                   quitar_del_otro=False):
    """`Linea` con el estado del grupo del portal de `persona`."""
    nombre = grupo_del_rol(rol)

    def linea(estado, texto):
        return Linea(correo, estado, DETALLE.format(nombre=nombre, texto=texto))

    try:
        ya_esta = nombre.lower() in nombres_de_grupos_de(cliente, persona)
    except ErrorDirectorio:
        return linea(ERROR, TEXTO_CONSULTA)
    if ya_esta and not quitar_del_otro:
        return linea(OMITIDO, TEXTO_YA_ESTABA)
    if dry_run:
        return linea(ACTUALIZADO, TEXTO_SIMULADO)
    try:
        escritor = EscritorDirectorio(cliente)
    except Exception:
        return linea(ERROR, TEXTO_ERROR)
    sincronizacion = sincronizar_grupo_de_rol(
        escritor, persona.dn, rol, quitar_del_otro=quitar_del_otro)
    if not sincronizacion:
        return linea(ERROR, TEXTO_SIN_PERMISO if sin_permiso_en(sincronizacion)
                     else TEXTO_ERROR)
    return linea(OMITIDO if ya_esta else ACTUALIZADO,
                 TEXTO_YA_ESTABA if ya_esta else TEXTO_AGREGADO)
