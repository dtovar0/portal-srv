"""Grupo `flask --app run:app alta` (FNC-182).

Altas por línea de comandos dentro del servidor: áreas, plataformas y
usuarios desde CSV, y migración de personas de LDAP. Cada comando admite
`--dry-run` (no escribe en la BD ni en LDAP; solo lee) y termina con código
distinto de cero si hubo errores o conflictos. Las contraseñas nunca se
imprimen: se entregan por Send de Vaultwarden y correo.
"""
import click
from flask.cli import AppGroup

from app.authz import ROLE_AREA_ADMIN, ROLE_USER
from app.modules.access.tipos import NIVELES
from app.modules.alta import importacion, migracion
from app.modules.alta import migrar_usuario as usuario_unico
from app.modules.alta.csv_carga import leer_csv
from app.modules.directory.writer import PATRON_CORREO
from app.modules.users.entrega_credenciales import (PLANTILLAS_DE_ENTREGA,
                                                    SLUG_ONBOARDING)

alta_cli = AppGroup('alta', help='Altas por CLI: áreas, plataformas y '
                    'usuarios; migración de LDAP (FNC-182).')

CODIGO_FALLO = 1
AYUDA_DRY_RUN = 'Simula: no escribe en la BD ni en LDAP.'
AYUDA_PLANTILLA = ('Plantilla del correo con la contraseña (con '
                   '--rotar-contrasena). Por omisión onboarding_aduana.')
RESPUESTAS_SI = ('s', 'si', 'sí', 'y', 'yes')
ADVERTENCIA_REDIRECCION = (
    'ATENCIÓN: con --rotar-contrasena la contraseña REAL de cada persona en '
    'LDAP cambia (y se sincroniza JumpServer), pero el correo con el enlace y '
    'el código se envía a {correo}, no a la persona.')
ARCHIVO = click.Path(exists=True, dir_okay=False, readable=True)


def _correo_valido(contexto, parametro, valor):
    if valor is not None and not PATRON_CORREO.fullmatch(valor):
        raise click.BadParameter('no es un correo válido.')
    return valor


def _exigir_rotacion(enviar_a, rotar_contrasena):
    if enviar_a and not rotar_contrasena:
        raise click.UsageError('--enviar-a requiere --rotar-contrasena.')


def _exigir_sin_repetidas(plataformas, plataformas_admin):
    """La misma plataforma en --plataforma y --plataforma-admin es un error
    de uso (se detecta antes de tocar nada)."""
    repetidas = ({p.strip().lower() for p in plataformas}
                 & {p.strip().lower() for p in plataformas_admin})
    if repetidas:
        raise click.UsageError(
            'La plataforma «{}» está en --plataforma y en --plataforma-admin: '
            'elige un solo nivel.'.format('», «'.join(sorted(repetidas))))


def _confirmar_redireccion(enviar_a, dry_run, si):
    """Advierte que la contraseña real cambia y pide confirmación (salvo
    `--si` o `--dry-run`, que no escribe)."""
    if not enviar_a:
        return
    click.echo(ADVERTENCIA_REDIRECCION.format(correo=enviar_a))
    if dry_run or si:
        return
    respuesta = click.prompt('¿Continuar? [s/N]', default='n',
                             show_default=False).strip().lower()
    if respuesta not in RESPUESTAS_SI:
        click.echo('Cancelado: no se cambió nada.')
        raise click.exceptions.Exit(CODIGO_FALLO)


def _terminar(resumen, entidad, dry_run):
    resumen.imprimir(dry_run)
    importacion.auditar_corrida(entidad, resumen, dry_run)
    if resumen.hay_fallos:
        raise click.exceptions.Exit(CODIGO_FALLO)


@alta_cli.command('areas')
@click.argument('archivo', type=ARCHIVO)
@click.option('--dry-run', is_flag=True, help=AYUDA_DRY_RUN)
def areas(archivo, dry_run):
    """Da de alta áreas desde un CSV (nombre,descripcion,color,icono)."""
    resumen = importacion.importar_catalogo(
        importacion.ENTIDAD_AREAS, leer_csv(archivo), dry_run)
    _terminar(resumen, importacion.ENTIDAD_AREAS, dry_run)


@alta_cli.command('plataformas')
@click.argument('archivo', type=ARCHIVO)
@click.option('--dry-run', is_flag=True, help=AYUDA_DRY_RUN)
def plataformas(archivo, dry_run):
    """Da de alta plataformas desde un CSV (nombre,descripcion,area,enlace,icono)."""
    resumen = importacion.importar_catalogo(
        importacion.ENTIDAD_PLATAFORMAS, leer_csv(archivo), dry_run)
    _terminar(resumen, importacion.ENTIDAD_PLATAFORMAS, dry_run)


@alta_cli.command('usuarios')
@click.argument('archivo', type=ARCHIVO)
@click.option('--dry-run', is_flag=True, help=AYUDA_DRY_RUN)
@click.option('--crear-en-ldap', is_flag=True,
              help='Crea también la entrada en LDAP (contraseña generada y '
                   'entregada por Send y correo).')
@click.option('--omitir-si-existe-en-ldap', is_flag=True,
              help='Si ya está en LDAP, no la crea: solo vincula la cuenta '
                   'del portal como sso. Sin él es un conflicto.')
@click.option('--rotar-contrasena', is_flag=True,
              help='Rota la contraseña de LDAP de las personas que ya '
                   'existían en LDAP (con --omitir-si-existe-en-ldap).')
@click.option('--plantilla', type=click.Choice(PLANTILLAS_DE_ENTREGA),
              default=SLUG_ONBOARDING, show_default=True, help=AYUDA_PLANTILLA)
@click.option('--enviar-a', 'enviar_a', callback=_correo_valido, default=None,
              help='Solo CLI: el correo con el enlace y el código va a este '
                   'buzón y no al de la persona (con --rotar-contrasena).')
@click.option('--si', is_flag=True, help='No pide confirmación con --enviar-a.')
def usuarios(archivo, dry_run, crear_en_ldap, omitir_si_existe_en_ldap,
             rotar_contrasena, plantilla, enviar_a, si):
    """Da de alta usuarios desde un CSV (nombre,correo,rol,areas[,uid,apellido])."""
    _exigir_rotacion(enviar_a, rotar_contrasena)
    _confirmar_redireccion(enviar_a, dry_run, si)
    resumen = importacion.importar_usuarios(
        leer_csv(archivo), dry_run, crear_en_ldap, omitir_si_existe_en_ldap,
        rotar_contrasena, plantilla, enviar_a)
    _terminar(resumen, importacion.ENTIDAD_USUARIOS, dry_run)


@alta_cli.command('migrar-ldap')
@click.option('--dry-run', is_flag=True, help=AYUDA_DRY_RUN)
@click.option('--grupo', 'grupos', multiple=True,
              help='Grupo de LDAP a importar: su cn o su DN completo (bajo '
                   'LDAP_GROUPS_BASE_DN o LDAP_GROUPS_INACTIVE_BASE_DN). Se '
                   'puede repetir. Sin él: OIDC_GROUP_AREA_ADMIN y '
                   'OIDC_GROUP_USER.')
@click.option('--rol', 'rol', type=click.Choice([ROLE_USER, ROLE_AREA_ADMIN]),
              default=None, help='Fuerza el rol de todas las personas.')
@click.option('--actualizar-rol/--omitir-existentes', default=False,
              help='Con una cuenta ya existente en el portal: ajusta su rol '
                   '(y la quita del grupo del otro rol) o, por omisión, la omite.')
@click.option('--sin-grupo-del-portal', is_flag=True,
              help='No agrega a las personas al grupo de Authelia de su rol.')
@click.option('--rotar-contrasena', is_flag=True,
              help='Rota la contraseña de LDAP de todas las personas de la '
                   'corrida y la entrega por Send y correo.')
@click.option('--plantilla', type=click.Choice(PLANTILLAS_DE_ENTREGA),
              default=SLUG_ONBOARDING, show_default=True, help=AYUDA_PLANTILLA)
@click.option('--solo', 'solo', multiple=True,
              help='Limita la corrida a esta persona (su uid); se puede '
                   'repetir. Las demás se reportan omitidas.')
@click.option('--enviar-a', 'enviar_a', callback=_correo_valido, default=None,
              help='Solo CLI: el correo con el enlace y el código va a este '
                   'buzón y no al de la persona (con --rotar-contrasena).')
@click.option('--si', is_flag=True, help='No pide confirmación con --enviar-a.')
def migrar_ldap(dry_run, grupos, rol, actualizar_rol, sin_grupo_del_portal,
                rotar_contrasena, plantilla, solo, enviar_a, si):
    """Importa a Aduana las personas de uno o más grupos de LDAP."""
    _exigir_rotacion(enviar_a, rotar_contrasena)
    _confirmar_redireccion(enviar_a, dry_run, si)
    resumen = migracion.migrar(dry_run, rotar_contrasena, grupos, rol,
                               actualizar_rol, sin_grupo_del_portal, plantilla,
                               solo, enviar_a)
    _terminar(resumen, 'migrar-ldap', dry_run)


@alta_cli.command('migrar-usuario')
@click.argument('uid')
@click.option('--area', 'areas', multiple=True,
              help='Área de la persona (por nombre); repetible. Obligatoria salvo '
                   'que se use --admin-area (que también la hace miembro).')
@click.option('--plataforma', 'plataformas', multiple=True,
              help='Plataforma a la que se le otorga acceso (por nombre, de '
                   'una de sus áreas); repetible.')
@click.option('--plataforma-admin', '--platform-admin', 'plataformas_admin',
              multiple=True,
              help='Plataforma a la que se le otorga acceso de nivel admin '
                   '(mismas reglas que --plataforma); repetible. Reemplaza '
                   'el nivel usuario si ya lo tenía. No puede repetirse en '
                   '--plataforma.')
@click.option('--admin-area', 'areas_admin', multiple=True,
              help='Hace a la persona administradora de esta área (rol '
                   'admin_area, grupo de Authelia y accesos automáticos, como '
                   'en el portal); suma a las que ya administraba; también la hace '
                   'miembro del área (no hace falta --area); repetible.')
@click.option('--nivel', type=click.Choice(NIVELES), default=NIVELES[0],
              show_default=True,
              help='Nivel de los accesos de --plataforma (no de '
                   '--plataforma-admin, que siempre es admin).')
@click.option('--responsiva-firmada', 'responsiva_firmada', is_flag=True,
              help='Registra la carta responsiva como firmada y activa el '
                   'aprovisionamiento de sus accesos.')
@click.option('--notificar', is_flag=True,
              help='Envía a la persona el correo de «solicitud aprobada» por '
                   'cada plataforma otorgada en la corrida (respeta '
                   'ENABLE_NOTIFICATIONS, NOTIFY_ACCESS_EVENTS y su '
                   'preferencia). Con --enviar-a no se redirige.')
@click.option('--rotar-contrasena', is_flag=True,
              help='Rota la contraseña de LDAP al final (solo si no hubo '
                   'errores) y la entrega por Send y correo.')
@click.option('--plantilla', type=click.Choice(PLANTILLAS_DE_ENTREGA),
              default=SLUG_ONBOARDING, show_default=True, help=AYUDA_PLANTILLA)
@click.option('--enviar-a', 'enviar_a', callback=_correo_valido, default=None,
              help='Solo CLI: el correo con el enlace y el código va a este '
                   'buzón y no al de la persona (con --rotar-contrasena).')
@click.option('--si', is_flag=True, help='No pide confirmación con --enviar-a.')
@click.option('--dry-run', is_flag=True, help=AYUDA_DRY_RUN)
def migrar_usuario(uid, areas, plataformas, plataformas_admin, areas_admin,
                   nivel, responsiva_firmada, notificar, rotar_contrasena,
                   plantilla, enviar_a, si, dry_run):
    """Migra a UNA persona de LDAP: cuenta, áreas, responsiva, accesos y contraseña."""
    _exigir_sin_repetidas(plataformas, plataformas_admin)
    _exigir_rotacion(enviar_a, rotar_contrasena)
    _confirmar_redireccion(enviar_a, dry_run, si)
    resumen = usuario_unico.migrar_usuario(
        uid, areas, plataformas, nivel, responsiva_firmada, dry_run,
        rotar_contrasena, plantilla, enviar_a, notificar, plataformas_admin,
        areas_admin)
    _terminar(resumen, 'migrar-usuario', dry_run)
