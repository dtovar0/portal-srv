"""Doble del directorio y de la entrega para las pruebas de `flask alta` (FNC-182)."""
import pytest
from sqlalchemy import text
from ldap3 import ALL_ATTRIBUTES, BASE
from ldap3.core.exceptions import LDAPNoSuchObjectResult

from app import db
from app.modules.alta import rotacion
from app.modules.directory import ldap_client
from tests.directorio_falso import dn_grupo, dn_persona, instalar_directorio
from tests.users.conftest import entrega  # noqa: F401  (fixture)

GRUPO_USUARIOS = 'app-aduana-users'
GRUPO_ADMINS = 'app-aduana-admins'
GRUPO_SUPERADMIN = 'infraestructuraVoIP'
GRUPO_AJENO = 'app-tacacs-user'
CLAVE_INICIAL = 'Clave-Inicial-2026!x'  # ficticia


class Escena:
    """Directorio simulado con personas y grupos fáciles de armar."""

    def __init__(self, directorio):
        self.directorio = directorio

    def persona(self, uid, correo=None, nombre=None):
        return self.directorio.agregar(uid, CLAVE_INICIAL, correo=correo,
                                       nombre=nombre)

    def grupo(self, nombre, miembros):
        self.directorio._agregar(dn_grupo(nombre), objectClass='groupOfNames',
                                 cn=nombre, member=list(miembros))

    def atributos(self, dn):
        with ldap_client.ClienteDirectorio().conexion_servicio() as con:
            try:
                con.search(dn, '(objectClass=*)', BASE,
                           attributes=ALL_ATTRIBUTES)
            except LDAPNoSuchObjectResult:
                return None
            return con.entries[0].entry_attributes_as_dict if con.entries else None

    def clave(self, uid):
        return self.atributos(dn_persona(uid))['userPassword'][0]

    def miembros(self, nombre):
        datos = self.atributos(dn_grupo(nombre))
        return datos.get('member', []) if datos else None


class ServicioDeSendsFalso:
    """Servicio de Sends con login correcto (FNC-205)."""

    verificaciones = 0

    def verificar_acceso(self):
        type(self).verificaciones += 1


@pytest.fixture
def ldap(monkeypatch, app):
    return Escena(instalar_directorio(monkeypatch))


@pytest.fixture
def con_entrega(entrega, monkeypatch):  # noqa: F811
    """Vaultwarden, correo y `BASE_URL` simulados (preflight incluido)."""
    monkeypatch.setattr(rotacion, 'servicio_de_sends',
                        lambda: ServicioDeSendsFalso())
    return entrega


@pytest.fixture
def correr(app):
    def _correr(*argumentos, input=None):
        return app.test_cli_runner().invoke(args=['alta', *argumentos],
                                            input=input)
    return _correr


def volcado_de_la_bd():
    """Texto de todas las tablas: ninguna contraseña puede estar en ellas."""
    partes = []
    for tabla in db.metadata.sorted_tables:
        for fila in db.session.execute(text(f'SELECT * FROM {tabla.name}')):
            partes.append(repr(tuple(fila)))
    return '\n'.join(partes)
