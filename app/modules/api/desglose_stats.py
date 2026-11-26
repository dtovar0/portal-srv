"""Desglose `parte`/`resto` de los contadores de `GET /stats` (FNC-164).

Recibe las mismas consultas que ya filtran cada contador por alcance, así
`parte + resto` siempre es igual al contador. Solo agregados (`count`, `sum`),
nunca listas completas.
"""
from app import db
from app.authz import ROLE_USER
from app.modules.access_requests.catalogo import ESTADO_ACTIVO
from app.modules.access_requests.models import PlatformAccessRequest
from app.modules.access_requests.tipos import ESTADO_PENDIENTE
from app.modules.auth.models import User
from app.modules.core.models import Area, Platform


def _par(parte, total):
    return {'parte': parte, 'resto': total - parte}


def desglose(areas_q, platforms_q, requests_q, users_q=None):
    """Desglose de cada indicador; `users` solo si se pasa `users_q`."""
    areas_activas = areas_q.filter(Area.status == ESTADO_ACTIVO).count()
    plataformas = platforms_q.order_by(None)
    plataformas_activas = plataformas.filter(
        Platform.status == ESTADO_ACTIVO).count()
    visitas = plataformas.with_entities(
        db.func.coalesce(db.func.sum(Platform.visits), 0)).scalar()
    visitas_activas = plataformas.filter(
        Platform.status == ESTADO_ACTIVO).with_entities(
        db.func.coalesce(db.func.sum(Platform.visits), 0)).scalar()
    pendientes = requests_q.filter(
        PlatformAccessRequest.status == ESTADO_PENDIENTE).count()
    resultado = {
        'areas': _par(areas_activas, areas_q.count()),
        'platforms': _par(plataformas_activas, plataformas.count()),
        'requests': {'parte': requests_q.count() - pendientes,
                     'resto': pendientes},
        'visits': _par(int(visitas_activas), int(visitas)),
    }
    if users_q is not None:
        total_usuarios = users_q.count()
        resultado['users'] = _par(
            users_q.filter(User.is_active.is_(True)).count(), total_usuarios)
        # FNC-214: rol usuario frente a administradores (admin de área y superadmin).
        resultado['users_by_role'] = _par(
            users_q.filter(User.role == ROLE_USER).count(), total_usuarios)
    return resultado


def conectores():
    """FNC-214: total de conectores y su desglose asociados / sin asociar
    (solo para el superadmin; quien llama decide)."""
    from app.modules.connectors.models import PlatformConnector
    total = PlatformConnector.query.count()
    asociados = PlatformConnector.query.filter(
        PlatformConnector.platform_id.isnot(None)).count()
    return total, _par(asociados, total)
