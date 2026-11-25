"""
API v1 — la interfaz que consume el frontend Next.js.

Cada endpoint devuelve JSON y aplica el alcance multitenant de `app.authz`, de
modo que un admin de área solo recibe los datos de las áreas que administra.
"""

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app import db
from app.authz import (any_admin_required, area_admin_required, can_manage_area,
                       can_manage_user, is_admin, is_area_admin, scoped_areas,
                       scoped_platforms, scoped_users)
from app.modules.api.helpers import (CUERPO_INVALIDO, NO_ENCONTRADO,
                                     error_response, is_id_list, json_object)
from app.modules.auth.models import User
from app.modules.core.models import Area, Platform
from app.modules.platforms.validacion import url_segura
from app.modules.users.serializacion import usuario_gestionado

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')


# --------------------------------------------------------------------------- #
# Sesión y Responsiva
# --------------------------------------------------------------------------- #

RUTAS_EXENTAS_RESPONSIVA = {
    'api.me',
    'api.get_responsiva',
    'api.sign_responsiva',
    'api.list_platforms',
}


@api_bp.before_request
def check_responsiva():
    """Defensa en profundidad: bloquea consultas de API si tiene accesos pendientes de firma de responsiva."""
    if not current_user.is_authenticated:
        return None
    if is_admin():
        return None

    from app.modules.access.configuracion import responsiva_por_plataforma

    # En modo global, si ya firmó la responsiva en algún momento de su ciclo de vida, nunca se bloquea
    if not responsiva_por_plataforma() and getattr(current_user, 'responsiva_firmada', False):
        return None

    from app.modules.access.models import PlatformAccessGrant
    from app.modules.access.tipos import ESTADOS_VIGENTES
    pendientes_firma = (PlatformAccessGrant.query
                        .filter(PlatformAccessGrant.user_id == current_user.id,
                                PlatformAccessGrant.status.in_(ESTADOS_VIGENTES),
                                PlatformAccessGrant.responsiva_firmada.is_(False))
                        .count())

    # Solo se bloquea si el usuario tiene plataformas otorgadas/aprobadas pendientes de firma
    if pendientes_firma > 0:
        if request.endpoint not in RUTAS_EXENTAS_RESPONSIVA:
            return jsonify({
                'code': 'responsiva_requerida',
                'message': 'Debes leer y firmar la carta responsiva antes de acceder al sistema.',
            }), 403
    return None


@api_bp.route('/me')
@login_required
def me():
    """Identidad y permisos del usuario actual.

    El frontend usa `permissions` para decidir qué menús y acciones muestra; el
    backend vuelve a comprobarlo en cada endpoint.
    """
    from app.modules.access.configuracion import responsiva_por_plataforma
    from app.modules.access.models import PlatformAccessGrant
    from app.modules.access.tipos import ESTADOS_VIGENTES

    if is_admin():
        firmada = True
    elif not responsiva_por_plataforma() and getattr(current_user, 'responsiva_firmada', False):
        firmada = True
    else:
        # En modo por plataforma (o si es modo global y aún no ha firmado nunca):
        # Solo se exige firma (firmada = False) si ya cuenta con accesos aprobados o pre-asignados.
        # Si tiene 0 accesos pendientes, puede entrar al portal libremente para explorar y solicitar plataformas.
        pendientes_firma = (PlatformAccessGrant.query
                            .filter(PlatformAccessGrant.user_id == current_user.id,
                                    PlatformAccessGrant.status.in_(ESTADOS_VIGENTES),
                                    PlatformAccessGrant.responsiva_firmada.is_(False))
                            .count())
        firmada = (pendientes_firma == 0)

    fecha_firma = getattr(current_user, 'responsiva_firmada_at', None) or (getattr(current_user, 'created_at', None) if firmada else None)

    return jsonify({
        'id': current_user.id,
        'email': current_user.email,
        'name': current_user.nombre or current_user.email,
        'role': current_user.role,
        'auth_source': current_user.auth_source,
        'responsiva_firmada': firmada,
        'responsiva_firmada_at': fecha_firma.isoformat() if fecha_firma else None,
        'responsiva_version': getattr(current_user, 'responsiva_version', '1.0') or '1.0',
        'areas': [{'id': a.id, 'name': a.name} for a in (current_user.areas or [])],
        'managed_areas': [{'id': a.id, 'name': a.name}
                          for a in (current_user.managed_areas or [])],
        'permissions': {
            'is_admin': is_admin(),
            'is_area_admin': is_area_admin(),
            'can_manage_areas': is_admin(),
            'can_manage_system': is_admin(),
        },
        'preferences': {
            'notifications': current_user.pref_notifications,
            'email_notifications': current_user.pref_email_notifications,
            'refresh_interval': current_user.pref_refresh_interval,
            'tour_enabled': current_user.pref_tour_enabled,
            'theme': current_user.pref_theme,
        },
    })


@api_bp.route('/responsiva')
@login_required
def get_responsiva():
    """Texto oficial de la responsiva y lista de plataformas/áreas asignadas al usuario."""
    from app.modules.access.models import PlatformAccessGrant
    from app.modules.access.tipos import ESTADOS_VIGENTES, ORIGEN_SOLICITUD

    grants_pendientes = (PlatformAccessGrant.query
                         .filter(PlatformAccessGrant.user_id == current_user.id,
                                 PlatformAccessGrant.status.in_(ESTADOS_VIGENTES),
                                 PlatformAccessGrant.responsiva_firmada.is_(False))
                         .all())
    grants = grants_pendientes if grants_pendientes else (
        PlatformAccessGrant.query
        .filter(PlatformAccessGrant.user_id == current_user.id,
                PlatformAccessGrant.status.in_(ESTADOS_VIGENTES))
        .all()
    )

    plataformas_asignadas = []
    for g in grants:
        if g.platform:
            plataformas_asignadas.append({
                'id': g.platform.id,
                'name': g.platform.name,
                'area_name': g.platform.area.name if g.platform.area else None,
                'level': g.level,
            })

    areas_asignadas = [{'id': a.id, 'name': a.name} for a in (current_user.areas or [])]

    from app.modules.access.configuracion import responsiva_por_plataforma

    # Contexto: ¿es por aprobación de una solicitud o pre-asignación en onboarding?
    es_aprobacion = any(g.origin == ORIGEN_SOLICITUD or g.request_id is not None for g in (grants_pendientes or grants))
    if not es_aprobacion and getattr(current_user, 'responsiva_firmada', False) and responsiva_por_plataforma():
        es_aprobacion = True

    titulo = ('Carta Responsiva: Aprobación de Nuevos Accesos a Plataformas'
              if es_aprobacion
              else 'Carta Responsiva de Uso de Activos de Información y Plataformas Institucionales')

    if is_admin():
        firmada = True
    elif not responsiva_por_plataforma() and getattr(current_user, 'responsiva_firmada', False):
        firmada = True
    else:
        firmada = (len(grants_pendientes) == 0)

    fecha_firma = getattr(current_user, 'responsiva_firmada_at', None) or (getattr(current_user, 'created_at', None) if firmada else None)

    return jsonify({
        'version': getattr(current_user, 'responsiva_version', '1.0') or '1.0',
        'firmada': firmada,
        'firmada_at': fecha_firma.isoformat() if fecha_firma else None,
        'titulo': titulo,
        'es_aprobacion': es_aprobacion,
        'contenido': (
            'Por medio del presente documento, el usuario reconoce y acepta que las cuentas de acceso, '
            'credenciales, plataformas digitales y activos de información asignados o recientemente aprobados son para uso estrictamente laboral '
            'y profesional en el marco de sus funciones en la organización.\n\n'
            'Términos y Compromisos:\n'
            '1. Confidencialidad: El usuario se compromete a salvaguardar sus credenciales de acceso y no divulgarlas ni transferirlas a terceros.\n'
            '2. Uso Autorizado: Las plataformas institucionales deberán utilizarse exclusivamente para los fines legítimos del puesto y área asignada.\n'
            '3. Seguridad de la Información: Queda estrictamente prohibida la extracción, alteración, copia o distribución no autorizada de datos sensibles o confidenciales.\n'
            '4. Notificación Oportuna: El usuario reportará de inmediato al área de TI/Seguridad cualquier anomalía o sospecha de vulneración de credenciales.\n'
            '5. Monitoreo y Revocación: La organización podrá auditar las operaciones realizadas y revocar los accesos en caso de cambio de área, baja laboral o incumplimiento normativo.'
        ),
        'areas': areas_asignadas,
        'plataformas': plataformas_asignadas,
    })


@api_bp.route('/me/firmar-responsiva', methods=['POST'])
@login_required
def sign_responsiva():
    """Firma digital y aceptación formal de la carta responsiva de primer ingreso o accesos aprobados."""
    from app.modules.access.responsiva import registrar_firma

    total = registrar_firma(current_user)
    db.session.commit()
    return jsonify({
        'status': 'success',
        'message': 'Carta responsiva firmada correctamente.',
        'firmada_at': current_user.responsiva_firmada_at.isoformat(),
        'provisioned_grants': total,
    })


# --------------------------------------------------------------------------- #
# Áreas
# --------------------------------------------------------------------------- #

@api_bp.route('/areas')
@login_required
def list_areas():
    """Áreas visibles para el usuario."""
    areas = scoped_areas().order_by(Area.name).all()
    return jsonify([{
        **a.to_dict(),
        'platforms_count': len(a.platforms or []),
        'users_count': len(a.area_users or []),
        'admins': [{'id': u.id, 'name': u.nombre or u.email, 'email': u.email}
                   for u in (a.admins or []) if u.is_active and u.role == 'admin_area'],
        'admin_names': [u.nombre or u.email for u in (a.admins or [])
                        if u.is_active and u.role == 'admin_area'],
    } for a in areas])


@api_bp.route('/areas/<int:area_id>')
@login_required
@area_admin_required('area_id')
def get_area(area_id):
    area = Area.query.get_or_404(area_id)
    return jsonify(area.to_dict())


# --------------------------------------------------------------------------- #
# Plataformas (catálogo de enlaces)
# --------------------------------------------------------------------------- #

def _platform_payload(p, favorite_ids, grants_map=None):
    from app.modules.access.configuracion import responsiva_por_plataforma
    acceso = (grants_map or {}).get(p.id)
    if is_admin():
        firmada = True
    elif responsiva_por_plataforma():
        # En modo por plataforma, este acceso en específico debe estar firmado
        firmada = (acceso is None or getattr(acceso, 'responsiva_firmada', True))
    else:
        # En modo global, basta con que el usuario haya firmado o el acceso no esté pendiente
        firmada = bool(getattr(current_user, 'responsiva_firmada', False)) or (acceso is None or getattr(acceso, 'responsiva_firmada', True))
    return {
        'id': p.id,
        'name': p.name,
        'description': p.description,
        'area_id': p.area_id,
        'area_name': p.area.name if p.area else None,
        'area_color': p.area.color if p.area else '#6366f1',
        'area_icon': p.area.icon if p.area else 'box',
        # FNC-046: una URL guardada que no es https sale como null.
        # Bloqueo: si el usuario no ha firmado la responsiva, la URL directa se oculta (null).
        'direct_link': url_segura(p.direct_link) if firmada else None,
        'icon': p.icon,
        'logo_url': url_segura(p.logo_url),
        'bg_color': p.bg_color,
        'text_color': p.text_color,
        'status': p.status,
        'visits': p.visits or 0,
        'is_favorite': p.id in favorite_ids,
    }


@api_bp.route('/platforms')
@login_required
def list_platforms():
    """Catálogo de plataformas visibles, con marca de favorito."""
    from app.modules.access.models import PlatformAccessGrant
    from app.modules.access.tipos import ESTADOS_VIGENTES

    favorite_ids = {p.id for p in (current_user.favorites or [])}
    query = scoped_platforms()

    area_id = request.args.get('area_id', type=int)
    if area_id:
        query = query.filter(Platform.area_id == area_id)
    search = (request.args.get('q') or '').strip()
    if search:
        query = query.filter(Platform.name.ilike(f'%{search}%'))

    platforms = query.order_by(Platform.name).all()
    grants = (PlatformAccessGrant.query
              .filter(PlatformAccessGrant.user_id == current_user.id,
                      PlatformAccessGrant.status.in_(ESTADOS_VIGENTES))
              .all()) if current_user.is_authenticated and not is_admin() else []
    grants_map = {g.platform_id: g for g in grants}
    return jsonify([_platform_payload(p, favorite_ids, grants_map) for p in platforms])


@api_bp.route('/platforms/<int:platform_id>/visit', methods=['POST'])
@login_required
def register_visit(platform_id):
    """Cuenta una visita al abrir el enlace de una plataforma."""
    platform = scoped_platforms().filter(Platform.id == platform_id).first()
    if platform is None:
        return jsonify({'status': 'error', 'message': 'Plataforma no disponible.'}), 404
    platform.visits = (platform.visits or 0) + 1
    db.session.commit()
    return jsonify({'status': 'success', 'visits': platform.visits})


@api_bp.route('/platforms/<int:platform_id>/favorite', methods=['POST'])
@login_required
def toggle_favorite(platform_id):
    platform = scoped_platforms().filter(Platform.id == platform_id).first()
    if platform is None:
        return jsonify({'status': 'error', 'message': 'Plataforma no disponible.'}), 404
    if platform in current_user.favorites:
        current_user.favorites.remove(platform)
        is_favorite = False
    else:
        current_user.favorites.append(platform)
        is_favorite = True
    db.session.commit()
    return jsonify({'status': 'success', 'is_favorite': is_favorite})


@api_bp.route('/favorites')
@login_required
def list_favorites():
    """Favoritos del usuario, limitados a lo que aún puede ver."""
    visible_ids = {p.id for p in scoped_platforms().all()}
    favorites = [p for p in (current_user.favorites or []) if p.id in visible_ids]
    return jsonify([_platform_payload(p, visible_ids & {p.id}) for p in favorites])


# --------------------------------------------------------------------------- #
# Usuarios
# --------------------------------------------------------------------------- #

@api_bp.route('/users')
@login_required
@any_admin_required
def list_users():
    """Usuarios que el solicitante puede administrar."""
    users = scoped_users().order_by(User.email).all()
    return jsonify([usuario_gestionado(u) for u in users])


@api_bp.route('/users/<int:user_id>/areas', methods=['PUT'])
@login_required
@any_admin_required
def set_user_areas(user_id):
    """Reasigna las áreas de un usuario, dentro del alcance del solicitante."""
    target = User.query.get_or_404(user_id)
    if not can_manage_user(target):
        return error_response(*NO_ENCONTRADO)

    requested = json_object()
    area_ids = (requested or {}).get('area_ids') or []
    if requested is None or not is_id_list(area_ids):
        return error_response(*CUERPO_INVALIDO)

    # Solo áreas que el solicitante administra
    allowed = {a.id for a in scoped_areas().all()}
    rejected = [i for i in area_ids if i not in allowed]
    if rejected:
        return jsonify({'status': 'error',
                        'message': 'Hay áreas fuera de tu alcance.',
                        'rejected': rejected}), 403

    # Conserva las áreas del usuario que el solicitante no administra
    antes = {a.id for a in (target.areas or [])}
    kept = [a for a in (target.areas or []) if a.id not in allowed]
    target.areas = kept + Area.query.filter(Area.id.in_(area_ids)).all()
    # Las áreas que pierde se llevan sus accesos en esas plataformas (FNC-152).
    from app.modules.access.salida_de_area import revocar_por_salida
    revocar_por_salida(target.id, sorted(antes - {a.id for a in target.areas}))
    db.session.commit()
    return jsonify({'status': 'success',
                    'areas': [{'id': a.id, 'name': a.name} for a in target.areas]})


# --------------------------------------------------------------------------- #
# Panel (la auditoría está en `audit/api.py`, FNC-060)
# --------------------------------------------------------------------------- #

@api_bp.route('/stats')
@login_required
def stats():
    """Contadores del panel, ya filtrados por alcance, con su `desglose` (FNC-164)."""
    areas_q = scoped_areas()
    platforms_q = scoped_platforms()

    # MySQL no soporta NULLS LAST: coalesce a 0 para ordenar de forma portable.
    top = (platforms_q.order_by(db.func.coalesce(Platform.visits, 0).desc())
           .limit(5).all())

    payload = {
        'areas': areas_q.count(),
        'platforms': platforms_q.count(),
        'visits': sum((p.visits or 0) for p in platforms_q.all()),
        'most_visited': [{'id': p.id, 'name': p.name, 'visits': p.visits or 0}
                         for p in top],
        'platforms_by_area': [
            {'area': a.name, 'color': a.color,
             'count': sum(1 for p in (a.platforms or []))}
            for a in areas_q.all()
        ],
    }
    from app.modules.access_requests.approvals import bandeja
    from app.modules.access_requests.models import PlatformAccessRequest
    from app.modules.api.desglose_stats import desglose
    if is_admin():
        requests_q = (PlatformAccessRequest.query
                      .join(Platform, Platform.id == PlatformAccessRequest.platform_id))
    elif is_area_admin():
        requests_q = bandeja(current_user)
    else:
        requests_q = (PlatformAccessRequest.query
                      .join(Platform, Platform.id == PlatformAccessRequest.platform_id)
                      .filter(PlatformAccessRequest.user_id == current_user.id))
    payload['requests'] = requests_q.count()

    users_q = scoped_users() if (is_admin() or is_area_admin()) else None
    if users_q is not None:
        payload['users'] = users_q.count()
    payload['desglose'] = desglose(areas_q, platforms_q, requests_q, users_q)
    return jsonify(payload)
