"""URI de la base de datos a partir de las variables `DB_*`.

La usan `create_app()` y las migraciones de Alembic (`migrations/env.py`),
para que ambas apunten siempre a la misma BD sin repetir la regla.

- `DB_ENGINE` elige el motor: `mysql` (PyMySQL) o `postgresql` (psycopg2)
  (FNC-146). Fuera de desarrollo (`APP_ENV` distinto de `development`,
  incluido vacío) debe ser uno de los dos: si no, no se arranca (FNC-134).
  SQLite solo existe en desarrollo.
- La URI se arma con `URL.create`: usuario y contraseña con caracteres como
  `@`, `:` o `/` quedan escapados.
- `DB_TLS_CA_FILE` (opcional, FNC-151): con una ruta, la conexión exige TLS y
  verifica el certificado del servidor contra esa CA (`sslmode=verify-full`
  en PostgreSQL, `ssl_ca` y verificación de host en MySQL). Si el archivo no
  existe, no se arranca. Vacía: sin TLS, como antes.
"""
import os

from sqlalchemy.engine import URL

# Ruta relativa de SQLite; Flask-SQLAlchemy la resuelve dentro de `instance/`.
SQLITE_URI_POR_DEFECTO = 'sqlite:///nexus.db'
MOTOR_MYSQL = 'mysql'
MOTOR_POSTGRESQL = 'postgresql'
# Motor de `DB_ENGINE` → controlador de SQLAlchemy.
CONTROLADORES = {MOTOR_MYSQL: 'mysql+pymysql',
                 MOTOR_POSTGRESQL: 'postgresql+psycopg2'}
MOTORES_SERVIDOR = tuple(CONTROLADORES)
VAR_MOTOR = 'DB_ENGINE'
VAR_TLS_CA = 'DB_TLS_CA_FILE'
VAR_ENTORNO = 'APP_ENV'
ENTORNO_DESARROLLO = 'development'


class ErrorConfiguracionBD(RuntimeError):
    """`DB_ENGINE` o `DB_PORT` no son válidos (el texto nunca lleva secretos)."""


def _es_desarrollo():
    return (os.getenv(VAR_ENTORNO) or '').strip().lower() == ENTORNO_DESARROLLO


def _motor():
    # Sin espacios ni comillas, igual que `motor_bd_de_env` de deploy/motor_bd.sh.
    return (os.getenv(VAR_MOTOR) or 'sqlite').strip().strip('"\'').strip()


MOTOR_SQLITE = 'sqlite'


def validar_motor_bd():
    """Fuera de desarrollo exige `DB_ENGINE` = `mysql` o `postgresql`; en
    desarrollo admite además `sqlite`, pero no un valor desconocido (antes
    caía en silencio a SQLite, FNC-009)."""
    motor = _motor()
    if motor in MOTORES_SERVIDOR:
        return
    if _es_desarrollo():
        if motor == MOTOR_SQLITE:
            return
        raise ErrorConfiguracionBD(
            f'{VAR_MOTOR} debe ser "{MOTOR_SQLITE}", "{MOTOR_MYSQL}" o '
            f'"{MOTOR_POSTGRESQL}".')
    raise ErrorConfiguracionBD(
        f'{VAR_MOTOR} debe ser "{MOTOR_MYSQL}" o "{MOTOR_POSTGRESQL}" fuera '
        f'de desarrollo ({VAR_ENTORNO} distinto de "{ENTORNO_DESARROLLO}"): '
        f'SQLite solo se permite en desarrollo. Defina {VAR_MOTOR} y las '
        f'variables DB_* en el .env.')


def _puerto():
    valor = (os.getenv('DB_PORT') or '').strip()
    if not valor:
        return None  # el controlador usa el puerto por defecto del motor
    if not valor.isdigit():
        raise ErrorConfiguracionBD('DB_PORT debe ser un número entero.')
    return int(valor)


def _parametros_tls(motor):
    """Parámetros de la URI para TLS verificado, o `{}` sin `DB_TLS_CA_FILE`."""
    ca = (os.getenv(VAR_TLS_CA) or '').strip()
    if not ca:
        return {}
    if not os.path.isfile(ca):
        raise ErrorConfiguracionBD(f'{VAR_TLS_CA} no apunta a un archivo legible.')
    if motor == MOTOR_POSTGRESQL:
        return {'sslmode': 'verify-full', 'sslrootcert': ca}
    return {'ssl_ca': ca, 'ssl_check_hostname': 'true'}


def construir_uri_bd():
    """URI de SQLAlchemy según `DB_ENGINE` (mysql, postgresql o SQLite en dev)."""
    validar_motor_bd()
    controlador = CONTROLADORES.get(_motor())
    if controlador is None:
        return SQLITE_URI_POR_DEFECTO
    return URL.create(
        controlador, username=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'), host=os.getenv('DB_HOST'),
        port=_puerto(), database=os.getenv('DB_NAME'),
        query=_parametros_tls(_motor()),
    ).render_as_string(hide_password=False)
