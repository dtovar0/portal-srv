"""Comando `flask --app run:app cuentas superadmin` (FNC-003, SEG-02/03).

Reemplaza la cuenta automática `admin`/`admin123`: el primer superadmin (la
cuenta local de emergencia) se crea a mano con la contraseña que elige quien
instala.

- Sin superadmin: crea `--correo` con rol `administrador` y origen `local`.
- Con superadmin: no crea otro (un solo superadmin, FNC-013). Con
  `--restablecer` cambia la contraseña de esa cuenta si es local (p. ej. para
  retirar la `admin123` de una instalación anterior).
- Contraseña: en una terminal se pide dos veces sin mostrarla; con
  `--password-desde-stdin` se lee una línea. Política: 16 caracteres o más,
  con mayúsculas, minúsculas, números y símbolos (la del alta de cuentas).
"""
import sys

import click
from flask.cli import AppGroup

from app import db
from app.authz import ROLE_ADMIN
from app.modules.audit.services import add_audit_log
from app.modules.auth.models import User
from app.modules.users.roles import ORIGEN_LOCAL

cuentas_cli = AppGroup('cuentas', help='Cuenta local de emergencia (FNC-003).')

LARGO_MINIMO = 16
MENSAJE_POLITICA = (f'La contraseña debe tener {LARGO_MINIMO} caracteres o más, con '
                    'mayúsculas, minúsculas, números y símbolos.')
MENSAJE_SIN_STDIN = 'No llegó ninguna contraseña por la entrada estándar.'
MENSAJE_YA_EXISTE = ('Ya existe un superadmin ({}); no se crea otro. Para cambiar su '
                     'contraseña usa --restablecer.')
MENSAJE_NO_LOCAL = ('El superadmin {} no es una cuenta local: su contraseña se cambia '
                    'en el directorio.')


def cumple_politica(texto):
    return (len(texto) >= LARGO_MINIMO
            and any(c.isupper() for c in texto)
            and any(c.islower() for c in texto)
            and any(c.isdigit() for c in texto)
            and any(not c.isalnum() for c in texto))


def _contrasena(desde_stdin):
    if desde_stdin:
        texto = sys.stdin.readline().rstrip('\r\n')
        if not texto:
            raise click.ClickException(MENSAJE_SIN_STDIN)
    else:
        texto = click.prompt('Contraseña', hide_input=True, confirmation_prompt=True)
    if not cumple_politica(texto):
        raise click.ClickException(MENSAJE_POLITICA)
    return texto


@cuentas_cli.command('superadmin')
@click.option('--correo', default='admin', show_default=True,
              help='Identificador de la cuenta local de emergencia.')
@click.option('--restablecer', is_flag=True,
              help='Cambia la contraseña del superadmin local existente.')
@click.option('--password-desde-stdin', 'desde_stdin', is_flag=True,
              help='Lee la contraseña de la entrada estándar (una línea).')
def superadmin(correo, restablecer, desde_stdin):
    """Crea el primer superadmin o restablece su contraseña."""
    correo = correo.strip().lower()
    existente = User.query.filter_by(role=ROLE_ADMIN).first()
    if existente is not None and not restablecer:
        raise click.ClickException(MENSAJE_YA_EXISTE.format(existente.email))
    if existente is not None and (existente.auth_source or ORIGEN_LOCAL) != ORIGEN_LOCAL:
        raise click.ClickException(MENSAJE_NO_LOCAL.format(existente.email))
    contrasena = _contrasena(desde_stdin)
    if existente is None:
        existente = User(email=correo, nombre=correo, role=ROLE_ADMIN,
                         auth_source=ORIGEN_LOCAL, is_active=True)
        db.session.add(existente)
        accion, texto = 'CREAR SUPERADMIN', f'Superadmin {correo} creado.'
    else:
        accion, texto = 'RESTABLECER SUPERADMIN', f'Contraseña de {existente.email} cambiada.'
    existente.set_password(contrasena)
    add_audit_log(accion, status='warning', target=existente.email,
                  detail='Comando cuentas superadmin', as_system=True, commit=False)
    db.session.commit()
    click.echo(texto)
