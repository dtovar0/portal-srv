"""URI de la base de datos a partir de las variables `DB_*`.

La usan `create_app()` y las migraciones de Alembic (`migrations/env.py`),
para que ambas apunten siempre a la misma BD sin repetir la regla.

Fuera de desarrollo (`APP_ENV` distinto de `development`, incluido vacío) la
BD debe ser MySQL: sin `DB_ENGINE=mysql` no se arranca (FNC-134). SQLite solo
existe en desarrollo.
"""
import os

# Ruta relativa de SQLite; Flask-SQLAlchemy la resuelve dentro de `instance/`.
SQLITE_URI_POR_DEFECTO = 'sqlite:///nexus.db'
MOTOR_MYSQL = 'mysql'
VAR_MOTOR = 'DB_ENGINE'
VAR_ENTORNO = 'APP_ENV'
ENTORNO_DESARROLLO = 'development'


class ErrorConfiguracionBD(RuntimeError):
    """`DB_ENGINE` no es válido para el entorno (el texto nunca lleva secretos)."""


def _es_desarrollo():
    return (os.getenv(VAR_ENTORNO) or '').strip().lower() == ENTORNO_DESARROLLO


def validar_motor_bd():
    """Fuera de desarrollo exige `DB_ENGINE=mysql`; si no, detiene el arranque."""
    if _es_desarrollo() or os.getenv(VAR_MOTOR) == MOTOR_MYSQL:
        return
    raise ErrorConfiguracionBD(
        f'{VAR_MOTOR} debe ser "{MOTOR_MYSQL}" fuera de desarrollo '
        f'({VAR_ENTORNO} distinto de "{ENTORNO_DESARROLLO}"): SQLite solo se '
        f'permite en desarrollo. Defina {VAR_MOTOR}={MOTOR_MYSQL} y las '
        f'variables DB_* en el .env.')


def construir_uri_bd():
    """Devuelve la URI de SQLAlchemy según `DB_ENGINE` (mysql o SQLite en dev)."""
    validar_motor_bd()
    if os.getenv(VAR_MOTOR, 'sqlite') == MOTOR_MYSQL:
        return (f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASS')}"
                f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}"
                f"/{os.getenv('DB_NAME')}")
    return SQLITE_URI_POR_DEFECTO
