"""`flask alta migrar-ldap`: importa a Aduana las personas de grupos de LDAP (FNC-182).

- Grupos: los indicados (`cn` o DN) o, sin ellos, los de Authelia
  (`OIDC_GROUP_AREA_ADMIN` y `OIDC_GROUP_USER`).
- Solo personas bajo `LDAP_USERS_BASE_DN`; sin `mail` se reportan y se omiten.
- Cuenta del portal: `sso`, activa, sin contraseña. Rol: `admin_area` si es
  miembro de `OIDC_GROUP_AREA_ADMIN`; si no, `usuario`; `--rol` lo fuerza.
  Nunca `administrador`: los miembros de `OIDC_GROUP_SUPERADMIN` se omiten
  siempre (ni alta, ni grupo, ni rotación).
- Grupo del portal (FNC-170): cada persona queda también en el grupo que
  Authelia exige según su rol (`--sin-grupo-del-portal` no lo toca).
- Rotación (`--rotar-contrasena`): decisión del operador; rota a todas las
  personas procesables de la corrida, nuevas o ya existentes en el portal;
  el correo usa `--plantilla` (FNC-190, por omisión `onboarding_aduana`) y
  trae el enlace del Send con su código de acceso.
- `--solo UID` (repetible) limita la corrida a esas personas; `--enviar-a
  CORREO` manda el correo de la rotación a ese buzón (FNC-190, solo CLI).
"""
from app import db
from app.authz import ROLE_ADMIN, ROLE_AREA_ADMIN, ROLE_USER, normalized_role
from app.modules.alta import grupo_portal, rotacion
from app.modules.alta.grupos_ldap import (grupo_obligatorio,
                                          identificador_de_miembro,
                                          es_relleno, identificadores,
                                          identificadores_de_superadmin,
                                          leer_grupo)
from app.modules.alta.importacion import (DETALLE_SUPERADMIN,
                                          ESTADO_FILA_VALIDA,
                                          cliente_o_error,
                                          crear_usuarios_en_portal,
                                          exigir_entrega)
from app.modules.alta.resumen import (ACTUALIZADO, CREADO, ERROR, OMITIDO,
                                      ROTADO, Resumen)
from app.modules.auth.models import User
from app.modules.auth.services import ORIGEN_SSO, normalizar_correo
from app.modules.directory.ldap_client import ErrorDirectorio
from app.modules.users.entrega_credenciales import SLUG_ONBOARDING
from app.modules.users.grupos_de_rol import (nombre_grupo_admins,
                                             nombre_grupo_usuarios)
from app.modules.users.roles import cambiar_rol
from app.utils.naming import sanitize_display_name

ROLES_FORZABLES = (ROLE_USER, ROLE_AREA_ADMIN)
DETALLE_SIN_CORREO = 'la persona no tiene mail en LDAP'
DETALLE_FUERA_DE_BASE = 'no es una persona bajo LDAP_USERS_BASE_DN'
DETALLE_NO_ENCONTRADA = 'no está en LDAP_USERS_BASE_DN'
DETALLE_EXISTE = 'ya existe en el portal'
DETALLE_ADMIN_PORTAL = 'es superadmin en el portal; no se modifica'
DETALLE_CREADA = 'cuenta del portal (sso), rol {rol}'
DETALLE_ROL = 'rol {antes} → {despues}'
DETALLE_DIRECTORIO = 'no se pudo consultar a la persona en el directorio'
DETALLE_FUERA_DE_SOLO = 'fuera de --solo'
DETALLE_SOLO_AUSENTE = '--solo: no es miembro de los grupos de la corrida'
DETALLE_SIN_CUENTA = 'sin cuenta en el portal; no se rota'


def _personas(cliente, grupos, resumen):
    """`{identificador en minúsculas: persona}` de los miembros de `grupos`."""
    cfg = cliente.configuracion
    personas = {}
    for grupo in grupos:
        for valor in grupo.miembros:
            if es_relleno(cfg, valor):
                continue
            identificador = identificador_de_miembro(cfg, valor)
            if identificador is None:
                resumen.agregar(valor, OMITIDO, DETALLE_FUERA_DE_BASE)
                continue
            if identificador.lower() in personas:
                continue
            try:
                persona = cliente.buscar_usuario(identificador)
            except ErrorDirectorio:
                resumen.agregar(identificador, ERROR, DETALLE_DIRECTORIO)
                continue
            if persona is None:
                resumen.agregar(identificador, OMITIDO, DETALLE_NO_ENCONTRADA)
                continue
            personas[identificador.lower()] = persona
    return personas


def _limitar_a(personas, solo, resumen):
    """Deja solo a las personas de `--solo`; las demás se reportan omitidas."""
    pedidos = {uid.strip().lower() for uid in solo}
    for clave, persona in sorted(personas.items()):
        if clave not in pedidos:
            resumen.agregar(persona.identificador, OMITIDO, DETALLE_FUERA_DE_SOLO)
    for uid in sorted(pedidos - set(personas)):
        resumen.agregar(uid, ERROR, DETALLE_SOLO_AUSENTE)
    return {c: p for c, p in personas.items() if c in pedidos}


def migrar(dry_run, rotar, nombres_de_grupo, rol_forzado, actualizar_rol,
           sin_grupo_portal, plantilla=SLUG_ONBOARDING, solo=(),
           enviar_a=None):
    cliente = cliente_o_error()
    if rotar:
        exigir_entrega()
    cfg = cliente.configuracion
    resumen = Resumen()

    pedidos = list(nombres_de_grupo) or [nombre_grupo_admins(),
                                         nombre_grupo_usuarios()]
    grupos = []
    for texto in pedidos:
        # Con los grupos por omisión, uno ausente se ignora; uno pedido, no.
        grupos.append(grupo_obligatorio(cliente, texto) if nombres_de_grupo
                      else leer_grupo(cliente, texto))
    grupos = [g for g in grupos if g is not None]
    superadmins = identificadores_de_superadmin(cliente)
    admins = identificadores(cfg, leer_grupo(cliente, nombre_grupo_admins()))

    personas = _personas(cliente, grupos, resumen)
    if solo:
        personas = _limitar_a(personas, solo, resumen)
    nuevas, procesables = [], []   # procesables: (persona, correo, rol)
    for clave, persona in sorted(personas.items()):
        correo = normalizar_correo(persona.correo)
        if clave in superadmins:
            resumen.agregar(correo or persona.identificador, OMITIDO,
                            DETALLE_SUPERADMIN)
            continue
        if not correo:
            resumen.agregar(persona.identificador, OMITIDO, DETALLE_SIN_CORREO)
            continue
        rol = rol_forzado or (ROLE_AREA_ADMIN if clave in admins else ROLE_USER)
        cuenta = User.query.filter(db.func.lower(User.email) == correo).first()
        if cuenta is None:
            nuevas.append((persona, correo, rol))
            continue
        if normalized_role(cuenta) == ROLE_ADMIN:
            resumen.agregar(correo, OMITIDO, DETALLE_ADMIN_PORTAL)
            continue
        if actualizar_rol and cuenta.role != rol:
            antes = cuenta.role
            if not dry_run:
                cambiar_rol(cuenta, rol)
                db.session.commit()
            resumen.agregar(correo, ACTUALIZADO,
                            DETALLE_ROL.format(antes=antes, despues=rol))
        else:
            resumen.agregar(correo, OMITIDO, DETALLE_EXISTE)
            rol = cuenta.role if not actualizar_rol else rol
        procesables.append((persona, correo, rol))

    registros = [{'nombre': sanitize_display_name(p.nombre, fallback=c),
                  'correo': c, 'rol': rol} for p, c, rol in nuevas]
    resultado, error = crear_usuarios_en_portal(registros, dry_run,
                                                auth_source=ORIGEN_SSO)
    if error:
        resumen.agregar('lote', ERROR, error)
    else:
        por_correo = {i['email']: i for i in resultado['items']}
        for persona, correo, rol in nuevas:
            item = por_correo.get(correo, {})
            if item.get('status') == ESTADO_FILA_VALIDA:
                resumen.agregar(correo, CREADO, DETALLE_CREADA.format(rol=rol))
                procesables.append((persona, correo, rol))
            else:
                resumen.agregar(correo, ERROR, item.get('error') or '')

    for persona, correo, rol in procesables:
        if not sin_grupo_portal:
            resumen.lineas.append(grupo_portal.asegurar_grupo(
                cliente, persona, correo, rol, dry_run,
                quitar_del_otro=actualizar_rol))
        if not rotar:
            continue
        if dry_run:
            resumen.agregar(correo, ROTADO, rotacion.detalle_dry_run(enviar_a))
            continue
        cuenta = User.query.filter(db.func.lower(User.email) == correo).first()
        if cuenta is None:
            resumen.agregar(correo, ERROR, DETALLE_SIN_CUENTA)
            continue
        resumen.lineas.append(rotacion.rotar(cuenta, persona.identificador,
                                             plantilla, enviar_a))
    return resumen
