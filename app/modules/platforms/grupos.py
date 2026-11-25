"""Grupos del directorio de una plataforma: validar, derivar y comprobar (FNC-046).

- Todo DN de grupo debe estar debajo de `LDAP_GROUPS_BASE_DN`, comparando RDN
  normalizados (SEC-LDAP-04, `directory/dn.py`).
- Si no llega el DN, se deriva de `LDAP_PLATFORM_GROUP_TEMPLATE` (ADR-004 P3):
  los valores se convierten a un identificador ASCII y se escapan (SEC-LDAP-06).
- La existencia se comprueba con el cliente único (FNC-040). Que el grupo no
  exista o que el directorio no responda no es error: la plataforma se guarda
  con un aviso (los grupos los crea el administrador del directorio en v1).
"""
import os
import re
import unicodedata

from app.modules.audit.events import Evento
from app.modules.audit.services import add_audit_log
from app.modules.directory.configuracion import (ErrorConfiguracionDirectorio,
                                                 cargar_configuracion,
                                                 directorio_activo)
from app.modules.directory.dn import bajo_base, mismo_dn
from app.modules.directory.ldap_client import (ClienteDirectorio,
                                               ErrorDirectorio,
                                               escapar_valor_dn)
from app.modules.platforms.tipos import (CAMPOS_DN, GRUPOS_NO_EXISTE,
                                         GRUPOS_OK, GRUPOS_SIN_VERIFICAR,
                                         NIVEL_ADMIN, NIVEL_USUARIO)

# Avisos de la respuesta (`warnings`).
# Convención de Authelia (FNC-170): nivel en plural inglés (`-users`,
# `-admins`) cuando la plantilla lleva el prefijo `app-` o con la variable.
VAR_GRUPO_PLURAL = 'LDAP_GROUP_PLURAL'
PREFIJO_GRUPO_APP = 'app-'
VALORES_VERDADEROS = ('true', '1', 'yes')
NIVELES_USUARIO = ('usuario', 'user', 'users')
NIVELES_ADMIN = ('admin', 'admins', 'admin_area')
NIVEL_PLURAL_USUARIO = 'users'
NIVEL_PLURAL_ADMIN = 'admins'

AVISO_GRUPO_NO_EXISTE = 'grupo_no_existe'
AVISO_DIRECTORIO_NO_DISPONIBLE = 'directorio_no_disponible'
MENSAJE_GRUPO_NO_EXISTE = 'El grupo de nivel {nivel} no existe en el directorio.'
MENSAJE_DIRECTORIO_NO_DISPONIBLE = ('No se pudo comprobar los grupos en el '
                                    'directorio; se guardaron sin verificar.')

_NO_IDENTIFICADOR = re.compile(r'[^a-z0-9]+')
SEPARADOR_IDENTIFICADOR = '-'


def configuracion_directorio():
    """Configuración validada del directorio, o `None` si está inactivo."""
    if not directorio_activo():
        return None
    try:
        return cargar_configuracion()
    except ErrorConfiguracionDirectorio:
        # Con el directorio activo, `validar_al_arrancar` ya la exigió; aquí
        # solo se protege una configuración cambiada en caliente.
        return None


def identificador(texto):
    """`Contabilidad General` → `contabilidad-general` (ASCII, sin acentos)."""
    plano = unicodedata.normalize('NFKD', texto or '')
    plano = plano.encode('ascii', 'ignore').decode('ascii').lower()
    return _NO_IDENTIFICADOR.sub(SEPARADOR_IDENTIFICADOR, plano).strip(
        SEPARADOR_IDENTIFICADOR)


def _nivel_en_plantilla(plantilla, nivel):
    """`users`/`admins` con la convención plural; si no, el nivel tal cual."""
    plural = (PREFIJO_GRUPO_APP in plantilla
              or (os.getenv(VAR_GRUPO_PLURAL) or '').strip().lower()
              in VALORES_VERDADEROS)
    if not plural:
        return nivel
    texto = str(nivel).lower()
    if texto in NIVELES_USUARIO:
        return NIVEL_PLURAL_USUARIO
    if texto in NIVELES_ADMIN:
        return NIVEL_PLURAL_ADMIN
    return nivel


def derivar_dn(configuracion, nivel, plataforma, area):
    """DN del grupo de `nivel` según la plantilla; `None` si no hay plantilla
    o si el nombre de la plataforma no deja un identificador."""
    plantilla = configuracion.plantilla_grupo
    nombre = identificador(plataforma)
    if not plantilla or not nombre:
        return None

    nivel_texto = _nivel_en_plantilla(plantilla, nivel)

    relativo = plantilla.format(plataforma=escapar_valor_dn(nombre),
                                area=escapar_valor_dn(identificador(area)),
                                nivel=escapar_valor_dn(nivel_texto))
    return f'{relativo},{configuracion.grupos_base_dn}'


def dn_en_base(configuracion, dn):
    """`True` si `dn` es un DN válido debajo de la base de grupos."""
    return isinstance(dn, str) and bajo_base(dn, configuracion.grupos_base_dn)


def comprobar_grupos(configuracion, dns_por_nivel):
    """(`groups_status`, avisos) tras buscar cada DN en el directorio."""
    cliente = ClienteDirectorio(configuracion)
    avisos = []
    try:
        for nivel, dn in dns_por_nivel.items():
            if not cliente.existe_dn(dn):
                avisos.append({'code': AVISO_GRUPO_NO_EXISTE,
                               'message': MENSAJE_GRUPO_NO_EXISTE.format(
                                   nivel=nivel)})
    except ErrorDirectorio:
        return GRUPOS_SIN_VERIFICAR, [{
            'code': AVISO_DIRECTORIO_NO_DISPONIBLE,
            'message': MENSAJE_DIRECTORIO_NO_DISPONIBLE}]
    return (GRUPOS_NO_EXISTE if avisos else GRUPOS_OK), avisos


# --------------------------------------------------------------------------- #
# Grupos siempre (FNC-196)
# --------------------------------------------------------------------------- #

def dn_del_nivel(plataforma, nivel):
    """DN del grupo del `nivel`: el guardado o, si falta, el derivado de la
    convención; `None` si no hay directorio activo ni forma de derivarlo."""
    guardado = getattr(plataforma, CAMPOS_DN[nivel])
    if guardado:
        return guardado
    configuracion = configuracion_directorio()
    if configuracion is None:
        return None
    area = getattr(plataforma, 'area', None)
    return derivar_dn(configuracion, nivel, plataforma.name,
                      area.name if area is not None else '')


def es_grupo_reservado(configuracion, dn):
    """`True` si `dn` es un grupo de rol del portal (superadmin, admins de área
    o usuarios de Authelia, `OIDC_GROUP_*`): ninguna plataforma puede usarlo,
    o su nombre bastaría para dar o quitar roles (auditor-seguridad, FNC-196)."""
    # Import diferido: estos módulos importan `platforms` al cargarse.
    from app.modules.auth import oidc_cuentas as oc
    from app.modules.users import grupos_de_rol as gr
    nombres = (
        (os.getenv(oc.VAR_GRUPO_SUPERADMIN) or '').strip()
        or oc.GRUPO_SUPERADMIN_POR_DEFECTO,
        gr.nombre_grupo_admins(), gr.nombre_grupo_usuarios())
    return any(mismo_dn(dn, f'cn={escapar_valor_dn(n)},'
                            f'{configuracion.grupos_base_dn}')
               for n in nombres)


def _en_uso_por_otra(plataforma, dn):
    from app.modules.core.models import Platform
    otras = Platform.query.filter(Platform.id != plataforma.id).all()
    return any(mismo_dn(dn, usado) for otra in otras
               for usado in (otra.ldap_group_user_dn, otra.ldap_group_admin_dn)
               if usado)


def completar_dns(plataforma):
    """Guarda en la plataforma los DN de grupo que le faltan, derivados de la
    convención (sin `commit`: va en la transacción del llamador).

    Un DN derivado que ya usa otra plataforma, o que queda fuera de la base o
    igual al del otro nivel, no se guarda (el grupo es de una sola plataforma).
    Devuelve `True` si la plataforma tiene ambos DN al terminar.
    """
    configuracion = configuracion_directorio()
    derivados = {}
    for nivel in (NIVEL_USUARIO, NIVEL_ADMIN):
        campo = CAMPOS_DN[nivel]
        if getattr(plataforma, campo):
            continue
        dn = dn_del_nivel(plataforma, nivel)
        otro = getattr(plataforma, CAMPOS_DN[
            NIVEL_ADMIN if nivel == NIVEL_USUARIO else NIVEL_USUARIO])
        if (not dn or configuracion is None
                or not dn_en_base(configuracion, dn)
                or es_grupo_reservado(configuracion, dn)
                or (otro and mismo_dn(dn, otro))
                or _en_uso_por_otra(plataforma, dn)):
            continue
        setattr(plataforma, campo, dn)
        derivados[campo] = dn
    if derivados:
        add_audit_log(
            Evento.PLATAFORMA_EDITADA, status='success',
            module='Plataformas', target=plataforma.name,
            platform_id=plataforma.id, area_id=plataforma.area_id,
            before={campo: None for campo in derivados}, after=derivados,
            detail='Grupos de acceso derivados de la convención (FNC-196).',
            as_system=True, commit=False)
    return bool(plataforma.ldap_group_user_dn
                and plataforma.ldap_group_admin_dn)
