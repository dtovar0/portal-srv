"""Forma `ManagedUser` de los contratos (`GET /users` y escrituras)."""
# Registra el modelo de entregas: añade `cuenta.credential_delivery`.
from app.modules.users import models as _modelos_de_entrega  # noqa: F401


# Área sin icono ni color guardados: el icono genérico de áreas del catálogo
# de la interfaz y el color por defecto de `Area.color` (core/models.py).
ICONO_AREA_POR_DEFECTO = 'areas'
COLOR_AREA_POR_DEFECTO = '#6366f1'


def _area(area):
    return {'id': area.id, 'name': area.name,
            'icon': getattr(area, 'icon', None) or ICONO_AREA_POR_DEFECTO,
            'color': getattr(area, 'color', None) or COLOR_AREA_POR_DEFECTO}


def _credenciales(cuenta):
    """`(credentials_status, credentials_sent_at)`; `None` sin onboarding."""
    entrega = getattr(cuenta, 'credential_delivery', None)
    if entrega is None:
        return None, None
    enviada = entrega.last_sent_at.isoformat() if entrega.last_sent_at else None
    return entrega.status, enviada


def usuario_gestionado(cuenta):
    """Cuenta administrable tal como la devuelve la API."""
    estado, enviadas = _credenciales(cuenta)
    return {
        'id': cuenta.id,
        'email': cuenta.email,
        'name': cuenta.nombre or cuenta.email,
        'role': cuenta.role,
        'is_active': cuenta.is_active,
        'auth_source': cuenta.auth_source,
        'areas': [_area(a) for a in (cuenta.areas or [])],
        'managed_areas': [_area(a) for a in (cuenta.managed_areas or [])],
        'last_login_at': (cuenta.last_login_at.isoformat()
                          if cuenta.last_login_at else None),
        'credentials_status': estado,
        'credentials_sent_at': enviadas,
    }
