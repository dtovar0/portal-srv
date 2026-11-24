"""Grupo de Authelia según el rol (FNC-170): nombres configurables, sin
valores fijos repetidos, y un fallo del directorio no detiene al portal."""
from types import SimpleNamespace

from app.authz import ROLE_AREA_ADMIN, ROLE_USER
from app.modules.auth.oidc_cuentas import (GRUPO_AREA_ADMIN_POR_DEFECTO,
                                           GRUPO_USER_POR_DEFECTO)
from app.modules.users import grupos_de_rol
from app.modules.directory.errors import Resultado, ResultadoEscritura
from app.modules.users.grupos_de_rol import sincronizar_grupo_de_rol

BASE = 'ou=groups,dc=pruebas,dc=local'
PERSONA = 'uid=ana,ou=users,dc=pruebas,dc=local'


class EscritorFalso:
    def __init__(self, falla=False):
        self.configuracion = SimpleNamespace(grupos_base_dn=BASE)
        self.llamadas = []
        self.falla = falla
        self.alta = Resultado.HECHO
        self.baja = Resultado.HECHO

    def create_group(self, dn):
        self.llamadas.append(('crear', dn))
        return ResultadoEscritura(Resultado.YA_ESTABA, dn)

    def add_member(self, dn, persona):
        if self.falla:
            raise RuntimeError('detalle con datos de la persona')
        self.llamadas.append(('agregar', dn, persona))
        return ResultadoEscritura(self.alta, dn)

    def remove_member(self, dn, persona):
        self.llamadas.append(('quitar', dn, persona))
        return ResultadoEscritura(self.baja, dn)


def _limpiar(monkeypatch):
    for var in ('OIDC_GROUP_AREA_ADMIN', 'OIDC_GROUP_USER',
                'LDAP_APP_ADMINS', 'LDAP_APP_USERS'):
        monkeypatch.delenv(var, raising=False)


def test_usuario_va_al_grupo_de_usuarios_por_omision(monkeypatch):
    _limpiar(monkeypatch)
    escritor = EscritorFalso()

    assert sincronizar_grupo_de_rol(escritor, PERSONA, ROLE_USER)

    dn = f'cn={GRUPO_USER_POR_DEFECTO},{BASE}'
    assert escritor.llamadas == [('crear', dn), ('agregar', dn, PERSONA)]


def test_admin_de_area_cambia_de_grupo(monkeypatch):
    _limpiar(monkeypatch)
    monkeypatch.setenv('OIDC_GROUP_AREA_ADMIN', 'admins-x')
    escritor = EscritorFalso()

    sincronizar_grupo_de_rol(escritor, PERSONA, ROLE_AREA_ADMIN,
                             quitar_del_otro=True)

    assert escritor.llamadas == [
        ('crear', f'cn=admins-x,{BASE}'),
        ('agregar', f'cn=admins-x,{BASE}', PERSONA),
        ('quitar', f'cn={GRUPO_USER_POR_DEFECTO},{BASE}', PERSONA)]


def test_alias_heredado_y_por_omision(monkeypatch):
    _limpiar(monkeypatch)
    monkeypatch.setenv('LDAP_APP_USERS', 'usuarios-heredado')
    assert grupos_de_rol.nombre_grupo_usuarios() == 'usuarios-heredado'
    assert grupos_de_rol.nombre_grupo_admins() == GRUPO_AREA_ADMIN_POR_DEFECTO


def test_fallo_del_directorio_no_se_propaga_ni_registra_el_texto(
        monkeypatch, caplog):
    _limpiar(monkeypatch)

    assert not sincronizar_grupo_de_rol(EscritorFalso(falla=True), PERSONA,
                                        ROLE_USER)
    assert 'detalle con datos' not in caplog.text
    assert 'RuntimeError' in caplog.text


def test_fallo_reportado_como_resultado_no_pasa_por_exito_regresion_fnc_184(
        monkeypatch):
    """El escritor informa fallos como resultado, no como excepción."""
    _limpiar(monkeypatch)
    escritor = EscritorFalso()
    escritor.alta = Resultado.ERROR_PERMANENTE

    assert not sincronizar_grupo_de_rol(escritor, PERSONA, ROLE_USER)


def test_si_no_sale_del_otro_grupo_deshace_la_entrada(monkeypatch):
    _limpiar(monkeypatch)
    escritor = EscritorFalso()
    escritor.baja = Resultado.ERROR_PERMANENTE

    assert not sincronizar_grupo_de_rol(escritor, PERSONA, ROLE_AREA_ADMIN,
                                        quitar_del_otro=True)
    admins = f'cn={GRUPO_AREA_ADMIN_POR_DEFECTO},{BASE}'
    assert escritor.llamadas[-1] == ('quitar', admins, PERSONA)  # deshecho


def test_salir_de_un_grupo_al_que_no_pertenece_es_exito(monkeypatch):
    _limpiar(monkeypatch)
    escritor = EscritorFalso()
    escritor.baja = Resultado.NO_EXISTE

    assert sincronizar_grupo_de_rol(escritor, PERSONA, ROLE_USER,
                                    quitar_del_otro=True)
