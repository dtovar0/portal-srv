"""`sin_permiso_en_directorio` al crear cuentas, entregar y rotar (FNC-206).

El directorio simulado (`MOCK_SYNC`) rechaza la escritura con
`insufficientAccessRights` (código 50): el código del portal debe ser
`sin_permiso_en_directorio` y no `directorio_no_disponible`; la entrega del
worker no se reintenta en bucle.
"""
import ldap3
import pytest
from ldap3.core import exceptions as exc_ldap

from app import db
from app.modules.provisioning.configuracion import cargar_configuracion
from app.modules.users import entrega_credenciales as entrega_mod
from app.modules.users.entrega_credenciales import (SLUG_NO_ENTREGADAS,
                                                    ejecutar_entrega,
                                                    vencidos)
from app.modules.users.models import EntregaCredenciales
from app.modules.secretos.vaultwarden import GestorCaido
from tests.users.test_entrega_credenciales import (  # noqa: F401 (fixtures)
    CONTRASENA, _alta, _entrega, _volver_vencida, cliente_como, directorio,
    escena)
from tests.users.test_rotar_contrasena import (  # noqa: F401 (fixtures)
    _cuenta_sso, _url, _volcado, listo)
from tests.users.test_rotar_contrasena import \
    directorio as directorio_con_ana

CODIGO = 'sin_permiso_en_directorio'


@pytest.fixture
def sin_permiso(monkeypatch):
    """Activar DESPUÉS de armar la escena: el servidor rechaza toda escritura."""
    def activar():
        def falla(self, *args, **kwargs):
            raise exc_ldap.LDAPInsufficientAccessRightsResult()
        for operacion in ('add', 'modify'):
            monkeypatch.setattr(ldap3.Connection, operacion, falla)
    return activar


def test_alta_de_cuenta_sin_permiso_da_503_con_su_propio_codigo(
        escena, directorio, cliente_como, entrega, sin_permiso):
    sin_permiso()

    r = _alta(escena, cliente_como)

    assert r.status_code == 503, r.get_data(as_text=True)
    cuerpo = r.get_json()
    assert cuerpo['code'] == CODIGO
    assert 'no tiene permiso' in cuerpo['message']
    assert 'dc=' not in r.get_data(as_text=True)
    assert CONTRASENA not in r.get_data(as_text=True)
    assert entrega.sends == []


def test_alta_con_el_directorio_caido_sigue_siendo_directorio_no_disponible(
        escena, directorio, cliente_como, entrega, monkeypatch):
    def falla(self, *args, **kwargs):
        raise exc_ldap.LDAPSocketOpenError('sin red')
    monkeypatch.setattr(ldap3.Connection, 'bind', falla)

    r = _alta(escena, cliente_como)

    assert r.status_code == 503
    assert r.get_json()['code'] == 'directorio_no_disponible'


def test_fijar_contrasena_distingue_permiso_de_caida(
        app, directorio_con_ana, sin_permiso):
    sin_permiso()
    assert entrega_mod.fijar_contrasena_en_directorio(
        'ana', 'Valor-Ficticio-9!') == CODIGO
    assert CODIGO == entrega_mod.CODIGO_SIN_PERMISO


def test_el_worker_no_reintenta_en_bucle_un_rechazo_de_permisos(
        escena, directorio, cliente_como, entrega, sin_permiso):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    entrega.error_send = None
    _volver_vencida()
    sin_permiso()

    assert ejecutar_entrega(_entrega().id) == 'pendientes'

    fila = _entrega()
    assert fila.last_error == CODIGO
    assert fila.next_attempt_at is None
    assert fila.attempts_count >= fila.max_attempts
    assert vencidos(cargar_configuracion()) == []       # no se reintenta
    assert entrega.sends == []
    # Es un error que necesita a una persona: se avisa a los superadmins.
    aviso = [c for c in entrega.correos if c['slug'] == SLUG_NO_ENTREGADAS]
    assert len(aviso) == 1


def test_el_worker_si_reintenta_una_caida_del_directorio(
        escena, directorio, cliente_como, entrega):
    entrega.error_send = GestorCaido('caído')
    _alta(escena, cliente_como)
    entrega.error_send = None
    _volver_vencida()
    directorio.error = RuntimeError('ldap caído')

    assert ejecutar_entrega(_entrega().id) == 'pendientes'

    fila = _entrega()
    assert fila.last_error == 'directorio_no_disponible'
    assert fila.attempts_count < fila.max_attempts
    assert fila.next_attempt_at is not None


def test_marcar_pendiente_con_sin_permiso_agota_los_intentos(app):
    cfg = cargar_configuracion()
    from app.modules.provisioning.reloj import ahora
    entrega = EntregaCredenciales(uid='ana', status='pendientes',
                                  attempts_count=1,
                                  max_attempts=cfg.max_intentos)
    assert entrega_mod.marcar_pendiente(entrega, CODIGO, ahora(), cfg) is True
    assert entrega.next_attempt_at is None
    otra = EntregaCredenciales(uid='beto', status='pendientes',
                               attempts_count=1,
                               max_attempts=cfg.max_intentos)
    assert entrega_mod.marcar_pendiente(
        otra, 'directorio_no_disponible', ahora(), cfg) is False
    assert otra.next_attempt_at is not None


def test_rotar_con_permiso_denegado_da_503_y_no_crea_send(
        app, directorio_con_ana, listo, cliente_como, sin_permiso):
    from app.authz import ROLE_ADMIN
    from tests import fabricas
    cuenta = _cuenta_sso()
    actor = fabricas.crear_usuario(ROLE_ADMIN)
    sin_permiso()

    r = cliente_como(actor).post(_url(cuenta))

    assert r.status_code == 503, r.get_data(as_text=True)
    assert r.get_json()['code'] == CODIGO
    assert listo.sends == []
