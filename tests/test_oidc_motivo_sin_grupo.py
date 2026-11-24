"""FNC-194: el rechazo por grupo dice qué grupos llegaron de Authelia."""
from app.modules.auth.oidc_cuentas import motivo_sin_grupo


def test_sin_grupos_lo_dice(monkeypatch):
    for var in ('OIDC_GROUP_SUPERADMIN', 'OIDC_GROUP_AREA_ADMIN', 'OIDC_GROUP_USER'):
        monkeypatch.delenv(var, raising=False)
    motivo = motivo_sin_grupo(())
    assert motivo.startswith('OIDC: sin grupo autorizado. Recibidos: ninguno')
    assert 'app-aduana-users' in motivo


def test_lista_los_recibidos_primero(monkeypatch):
    monkeypatch.setenv('OIDC_GROUP_USER', 'usuarios-x')
    motivo = motivo_sin_grupo(('app-tacacs-users', 'otro'))
    assert 'Recibidos: app-tacacs-users, otro.' in motivo[:200]
    assert 'usuarios-x' in motivo
