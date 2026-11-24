"""Send con código de acceso y plantilla de onboarding (FNC-190).

- `credential_deliveries.plantilla`: slug de la plantilla del correo de la
  entrega (por omisión `credenciales_iniciales`) para que los reintentos del
  worker usen la misma que el primer intento.
- `credential_deliveries.destinatario`: correo sustituto de la entrega (solo CLI,
  `--enviar-a`); `NULL` = el correo de la cuenta.
- Plantilla nueva `onboarding_aduana` (bienvenida a Aduana, usuario, enlace del
  Send y su código de acceso en un bloque aparte); si el `slug` ya existe no se
  toca.
- `credenciales_iniciales` pasa a mostrar el código en un bloque aparte, pero
  solo si sigue idéntica a la de 0016: una editada desde Ajustes → Plantillas
  no se pisa.
- `downgrade()` quita la columna y la plantilla nueva (solo si sigue idéntica
  a la insertada) y devuelve `credenciales_iniciales` a la de 0016 (solo si
  sigue idéntica a la de esta revisión).

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-24
"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0020'
down_revision: Union[str, Sequence[str], None] = '0019'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Valores fijos de esta revisión (no se importan del código, que puede cambiar).
TABLA = 'credential_deliveries'
TABLA_PLANTILLAS = 'notification_templates'
COLUMNA = 'plantilla'
COLUMNA_DESTINATARIO = 'destinatario'
LARGO_DESTINATARIO = 120
LARGO_PLANTILLA = 60
SLUG_INICIALES = 'credenciales_iniciales'
SLUG_ONBOARDING = 'onboarding_aduana'

# Cuerpo de `credenciales_iniciales` tal como lo dejó la revisión 0016.
CUERPO_INICIALES_0016 = (
    '<p>Hola {nombre}:</p>\n'
    '<p>Se creó tu cuenta <strong>{usuario}</strong> en el portal.</p>\n'
    '<p>Tu contraseña inicial está en un enlace de un solo uso y con '
    'caducidad; ábrelo y cópiala: {enlace}</p>\n'
    '<p>Después entra al portal: {url}</p>\n'
)

# Estilo de los correos del autoservicio (`autoservicio_correo.py`): los
# clientes de correo no admiten variables CSS, por eso van en línea.
ESTILO_CUERPO = ("margin: 0; padding: 0; background-color: #f1f5f9; "
                 "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', "
                 "Roboto, Helvetica, Arial, sans-serif; color: #0f172a;")
ESTILO_TARJETA = ("max-width: 520px; background-color: #ffffff; "
                  "border-radius: 12px; border: 1px solid #e2e8f0; "
                  "overflow: hidden;")
ESTILO_PARRAFO = ("margin: 0 0 16px; font-size: 14px; line-height: 1.6; "
                  "color: #475569;")
ESTILO_TITULO = ("margin: 24px 0 8px; font-size: 15px; font-weight: 700; "
                 "color: #0f172a;")
ESTILO_CODIGO = ("background-color: #f8fafc; border: 2px dashed #0284c7; "
                 "border-radius: 12px; padding: 22px 20px; text-align: center; "
                 "margin: 24px 0;")
ESTILO_NUMERO = ("font-family: 'Courier New', Courier, monospace; "
                 "font-size: 38px; font-weight: 800; letter-spacing: 8px; "
                 "color: #0284c7; display: inline-block;")
ESTILO_ETIQUETA = ("margin: 10px 0 0; font-size: 12px; font-weight: 600; "
                   "color: #64748b; text-transform: uppercase; "
                   "letter-spacing: 0.05em;")
ESTILO_AVISO = ("border-top: 1px solid #e2e8f0; margin-top: 24px; "
                "padding-top: 16px; font-size: 12px; line-height: 1.5; "
                "color: #94a3b8;")


def _p(texto):
    return f'<p style="{ESTILO_PARRAFO}">{texto}</p>\n'


def _bloque_codigo():
    return (f'<div style="{ESTILO_CODIGO}">\n'
            f'<span style="{ESTILO_NUMERO}">{{codigo}}</span>\n'
            f'<p style="{ESTILO_ETIQUETA}">Código para abrir el enlace</p>\n'
            '</div>\n')


def _marco(encabezado, contenido):
    return (
        '<!DOCTYPE html>\n<html lang="es">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        f'</head>\n<body style="{ESTILO_CUERPO}">\n'
        '<table role="presentation" width="100%" cellspacing="0" '
        'cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">\n'
        '<tr><td align="center">\n'
        f'<table role="presentation" width="100%" style="{ESTILO_TARJETA}" '
        'cellspacing="0" cellpadding="0">\n'
        '<tr><td style="padding: 20px 28px; border-bottom: 1px solid #e2e8f0;">\n'
        '<h1 style="margin: 0; font-size: 18px; font-weight: 700; '
        f'color: #0f172a;">{encabezado}</h1>\n'
        '</td></tr>\n<tr><td style="padding: 32px;">\n'
        f'{contenido}'
        '</td></tr>\n</table>\n</td></tr>\n</table>\n</body>\n</html>\n')


CUERPO_ONBOARDING = _marco('Bienvenida a Aduana', (
    _p('Hola <strong>{nombre}</strong>:')
    + _p('Ya tienes cuenta en <strong>Aduana</strong>, el portal único de '
         'acceso a las plataformas de la empresa. Ahí puedes ver tus '
         'plataformas, pedir los accesos que necesites y, si eres '
         'administrador de un área, aprobar las solicitudes de tu equipo.')
    + f'<p style="{ESTILO_TITULO}">Cómo entrar</p>\n'
    + _p('Abre <a href="{url}">{url}</a>, elige <strong>Iniciar sesión con '
         'Authelia</strong> y escribe tu usuario: <strong>{usuario}</strong>.')
    + f'<p style="{ESTILO_TITULO}">Tu contraseña inicial</p>\n'
    + _p('Está en un enlace de un solo uso y con caducidad: '
         '<a href="{enlace}">{enlace}</a>')
    + _p('El enlace pide este código para abrirse:')
    + _bloque_codigo()
    + _p('Cámbiala cuando entres, en <a href="{url}/autoservicio">'
         '{url}/autoservicio</a>.')
    + f'<p style="{ESTILO_AVISO}"><strong>Importante:</strong> nadie de TI '
      'te pedirá tu contraseña ni este código. Si no esperabas este correo, '
      'ignóralo y avisa a TI.</p>\n'))

CUERPO_INICIALES = (
    '<p>Hola {nombre}:</p>\n'
    '<p>Se creó tu cuenta <strong>{usuario}</strong> en el portal.</p>\n'
    '<p>Tu contraseña inicial está en un enlace de un solo uso y con '
    'caducidad; ábrelo y cópiala: {enlace}</p>\n'
    + _bloque_codigo()
    + '<p>El enlace pide ese código para abrirse. Después entra al portal: '
      '{url}</p>\n')

ONBOARDING = {
    'slug': SLUG_ONBOARDING,
    'name': 'Onboarding Aduana',
    'subject': 'Bienvenida a Aduana: tu acceso',
    'body': CUERPO_ONBOARDING,
}


def _plantillas():
    return sa.table(
        TABLA_PLANTILLAS,
        sa.column('slug', sa.String),
        sa.column('name', sa.String),
        sa.column('subject', sa.String),
        sa.column('body', sa.Text),
        sa.column('is_html', sa.Boolean),
        sa.column('updated_at', sa.DateTime),
    )


def _tiene_columna(nombre=COLUMNA):
    return nombre in {c['name'] for c in
                      sa.inspect(op.get_bind()).get_columns(TABLA)}


def upgrade() -> None:
    if not _tiene_columna():
        op.add_column(TABLA, sa.Column(
            COLUMNA, sa.String(LARGO_PLANTILLA), nullable=False,
            server_default=SLUG_INICIALES))

    if not _tiene_columna(COLUMNA_DESTINATARIO):
        op.add_column(TABLA, sa.Column(
            COLUMNA_DESTINATARIO, sa.String(LARGO_DESTINATARIO), nullable=True))

    tabla = _plantillas()
    conexion = op.get_bind()
    existentes = set(conexion.execute(sa.select(tabla.c.slug)).scalars())
    if SLUG_ONBOARDING not in existentes:
        op.bulk_insert(tabla, [dict(ONBOARDING, is_html=True,
                                    updated_at=datetime.now())])
    # Solo si sigue como la dejó 0016: una editada por el administrador no se pisa.
    op.execute(tabla.update()
               .where(tabla.c.slug == SLUG_INICIALES)
               .where(tabla.c.body == CUERPO_INICIALES_0016)
               .values(body=CUERPO_INICIALES, updated_at=datetime.now()))


def downgrade() -> None:
    tabla = _plantillas()
    op.execute(tabla.update()
               .where(tabla.c.slug == SLUG_INICIALES)
               .where(tabla.c.body == CUERPO_INICIALES)
               .values(body=CUERPO_INICIALES_0016, updated_at=datetime.now()))
    op.execute(tabla.delete().where(sa.and_(
        *(tabla.c[campo] == ONBOARDING[campo]
          for campo in ('slug', 'name', 'subject', 'body')))))
    with op.batch_alter_table(TABLA) as lote:
        if _tiene_columna(COLUMNA_DESTINATARIO):
            lote.drop_column(COLUMNA_DESTINATARIO)
        if _tiene_columna():
            lote.drop_column(COLUMNA)
