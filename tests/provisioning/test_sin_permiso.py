"""Un rechazo de permisos del directorio es error permanente (FNC-206)."""
import ldap3
from ldap3.core import exceptions as exc_ldap

from app.modules.provisioning.saneo import mensaje_de_error
from tests.provisioning.test_ldap_provider import (  # noqa: F401 (fixtures)
    directorio, escenario, operacion)

CODIGO = 'sin_permiso_en_directorio'


def test_el_aprovisionamiento_trata_el_permiso_como_error_permanente(
        escenario, monkeypatch):
    proveedor, plataforma, usuario, *_ = escenario

    def falla(self, *args, **kwargs):
        raise exc_ldap.LDAPInsufficientAccessRightsResult()
    monkeypatch.setattr(ldap3.Connection, 'modify', falla)

    resultado = proveedor.otorgar(operacion(plataforma, usuario))

    assert (resultado.resultado, resultado.motivo) == (
        'error_permanente', CODIGO)      # el ejecutor no lo reintenta
    assert 'no tiene permiso' in mensaje_de_error(
        resultado.resultado, resultado.motivo)
