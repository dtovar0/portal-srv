"""La CLI de alta informa `sin_permiso_en_directorio` (FNC-206)."""
import ldap3
from ldap3.core import exceptions as exc_ldap

from tests.alta.conftest import CLAVE_INICIAL
from tests.alta.test_migrar_ldap import base  # noqa: F401 (fixture)

CODIGO = 'sin_permiso_en_directorio'


def _denegar(monkeypatch):
    def falla(self, *args, **kwargs):
        raise exc_ldap.LDAPInsufficientAccessRightsResult()
    for operacion in ('add', 'modify'):
        monkeypatch.setattr(ldap3.Connection, operacion, falla)


def test_rotar_sin_permiso_informa_el_codigo_y_no_cambia_nada(
        base, correr, con_entrega, monkeypatch):  # noqa: F811
    _denegar(monkeypatch)

    r = correr('migrar-ldap', '--rotar-contrasena', '--solo', 'ana')

    assert CODIGO in r.output
    assert 'directorio_no_disponible' not in r.output
    assert base.clave('ana') == CLAVE_INICIAL
    assert con_entrega.sends == []


def test_grupo_del_portal_sin_permiso_lo_dice(
        base, correr, monkeypatch):  # noqa: F811
    _denegar(monkeypatch)

    r = correr('migrar-ldap', '--solo', 'eli')

    assert CODIGO in r.output
