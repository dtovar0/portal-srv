"""`sin_permiso_en_directorio` en las escrituras del directorio (FNC-206)."""
import ldap3
import pytest
from ldap3.core import exceptions as exc_ldap

from app.modules.directory import errors
from app.modules.directory.errors import Resultado
from app.modules.directory.ldap_client import UsuarioDirectorio
from app.modules.directory.writer import DatosCuenta, EscritorDirectorio
from tests.directory.conftest import dn_persona

SIN_PERMISO = exc_ldap.LDAPInsufficientAccessRightsResult


@pytest.fixture
def escritor(directorio):
    return EscritorDirectorio(directorio.cliente)


def _fallar(monkeypatch, operacion, excepcion):
    def falla(self, *args, **kwargs):
        raise excepcion
    monkeypatch.setattr(ldap3.Connection, operacion, falla)


def _usuario(uid):
    return UsuarioDirectorio(dn=dn_persona(uid), identificador=uid)


def _es_sin_permiso(resultado):
    assert resultado.resultado is Resultado.ERROR_PERMANENTE
    assert resultado.reintentable is False
    assert resultado.motivo == errors.MOTIVO_SIN_PERMISO == \
        'sin_permiso_en_directorio'


def test_cambio_de_contrasena_sin_permiso(directorio, escritor, monkeypatch):
    directorio.persona('ana')
    _fallar(monkeypatch, 'modify', SIN_PERMISO())
    _es_sin_permiso(escritor.change_password('ana', 'Valor-Ficticio-1!'))


def test_alta_de_cuenta_sin_permiso(escritor, monkeypatch):
    _fallar(monkeypatch, 'add', SIN_PERMISO())
    _es_sin_permiso(escritor.create_user(
        DatosCuenta('ana', 'Ana', 'Ruiz', 'ana@pruebas.local')))


def test_miembro_de_grupo_sin_permiso(directorio, escritor, monkeypatch):
    directorio.persona('ana')
    grupo = directorio.grupo('conta-usuario', [dn_persona('beto')])
    _fallar(monkeypatch, 'modify', SIN_PERMISO())
    _es_sin_permiso(escritor.add_member(grupo, _usuario('ana')))


def test_crear_grupo_sin_permiso(escritor, monkeypatch):
    _fallar(monkeypatch, 'add', SIN_PERMISO())
    from tests.directory.conftest import GRUPOS_BASE_DN
    _es_sin_permiso(escritor.create_group(f'cn=nuevo,{GRUPOS_BASE_DN}'))


def test_la_caida_de_conexion_sigue_siendo_directorio(directorio, escritor,
                                                      monkeypatch):
    _fallar(monkeypatch, 'bind', exc_ldap.LDAPSocketOpenError('sin red'))
    resultado = escritor.change_password('ana', 'Valor-Ficticio-1!')
    assert resultado.resultado is Resultado.ERROR_TRANSITORIO
    assert resultado.motivo == errors.MOTIVO_DIRECTORIO


def test_otro_fallo_permanente_sigue_siendo_directorio(directorio, escritor,
                                                       monkeypatch):
    directorio.persona('ana')
    _fallar(monkeypatch, 'modify', exc_ldap.LDAPObjectClassViolationResult())
    resultado = escritor.change_password('ana', 'Valor-Ficticio-1!')
    assert resultado.motivo == errors.MOTIVO_DIRECTORIO


def test_el_resultado_no_lleva_dn_en_el_motivo_ni_en_el_mensaje():
    assert 'dc=' not in errors.MENSAJE_SIN_PERMISO
    assert errors.MENSAJE_SIN_PERMISO == (
        'La cuenta de servicio del portal no tiene permiso para esta '
        'operación en el directorio.')
