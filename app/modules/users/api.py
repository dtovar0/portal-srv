"""API v1 de cuentas: áreas administradas (FNC-044) y alta en el directorio
(FNC-064).

- `PUT /api/v1/users/<id>/managed-areas`: solo el superadmin asigna las áreas
  que administra un `admin_area` (contrato `docs/contratos/areas-y-roles.md`).
- `POST /api/v1/users/directory`: superadmin y admins (sus áreas) crean la
  cuenta en OpenLDAP y en el portal con su contraseña inicial (contrato
  `docs/contratos/usuarios-directorio.md` v2); la lógica vive en
  `directory_accounts.py` y la entrega por Send en `entrega_credenciales.py`.
- `GET /api/v1/users/password-policy`: política de la contraseña inicial.
- `POST /api/v1/users/<id>/credentials`: retirado (FNC-161, `410`); la
  contraseña se cambia con `PUT /users/<id>`.
- Alta, edición y baja de cuentas y el endpoint retirado de plataformas
  (FNC-029, movidos de `api/crud.py`).
"""

from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from app import db
from app.authz import (ROLE_AREA_ADMIN, admin_required, any_admin_required,
                       can_manage_user, normalized_role, scoped_areas)
from app.modules.api.helpers import (CAMPO_NO_PERMITIDO, NO_ENCONTRADO,
                                     OPERACION_PROPIA, REEMPLAZO_ASIGNACION,
                                     REEMPLAZO_CONTRASENA,
                                     ROL_NO_ADMIN, ROL_RESERVADO,
                                     campos_prohibidos, endpoint_retirado,
                                     error_response, json_object, leer_cuerpo,
                                     validation_error)
from app.modules.audit.services import add_audit_log
from app.modules.auth.acceso_local import (contrasena_local_permitida,
                                           origen_de_alta)
from app.modules.auth.models import User
from app.modules.core.models import Area
from app.modules.users.areas_administradas import (CAMPO_AREAS,
                                                   asignar_areas_administradas,
                                                   validar_area_ids)
from app.modules.users.directory_accounts import (CAMPO_CONTRASENA,
                                                  CAMPOS_PERMITIDOS,
                                                  crear_cuenta_directorio,
                                                  validar_alta)
from app.modules.users.politica_contrasena import cargar_politica
from app.modules.users.restablecer_contrasena import (aplicar_cambio,
                                                      validar_cambio)
from app.modules.users.roles import (CAMPOS_NO_PERMITIDOS, RESERVED_NAMES,
                                     cambiar_rol, es_el_mismo_rol,
                                     rol_asignable)
from app.modules.users.serializacion import usuario_gestionado
from app.utils.naming import sanitize_display_name

users_api_bp = Blueprint('api_users', __name__, url_prefix='/api/v1')


@users_api_bp.route('/users/<int:user_id>/managed-areas', methods=['PUT'])
@login_required
@admin_required
def set_managed_areas(user_id):
    """Reemplaza la lista completa de áreas que administra un `admin_area`."""
    cuenta = db.session.get(User, user_id)
    if cuenta is None:
        return error_response(*NO_ENCONTRADO)

    datos = json_object() or {}
    if set(datos) - {CAMPO_AREAS}:
        return error_response(*CAMPO_NO_PERMITIDO)
    if CAMPO_AREAS not in datos:
        return validation_error({CAMPO_AREAS: 'Es obligatorio.'})
    area_ids, problema = validar_area_ids(datos[CAMPO_AREAS])
    if problema:
        return validation_error({CAMPO_AREAS: problema})

    if normalized_role(cuenta) != ROLE_AREA_ADMIN:
        return error_response(*ROL_NO_ADMIN)

    asignar_areas_administradas(cuenta, area_ids)
    db.session.commit()
    return jsonify({'status': 'success', 'user': usuario_gestionado(cuenta)})


@users_api_bp.route('/users/directory', methods=['POST'])
@login_required
@any_admin_required
def create_directory_account():
    """Crea la cuenta en OpenLDAP (con su contraseña inicial) y en el portal."""
    datos, error = leer_cuerpo(CAMPOS_PERMITIDOS)
    if error is not None:
        return error
    alta, error, campos = validar_alta(datos)
    if error:
        return error_response(*error)
    if campos:
        return validation_error(campos)

    cuenta, error = crear_cuenta_directorio(alta)
    if error and error[1] == 422:  # `ppolicy` del directorio
        return validation_error({CAMPO_CONTRASENA: error[0]})
    if error:
        return error_response(*error)
    return jsonify({'status': 'success',
                    'user': usuario_gestionado(cuenta)}), 201


@users_api_bp.route('/users/password-policy', methods=['GET'])
@login_required
@any_admin_required
def password_policy():
    """Política de la contraseña inicial (la lee el generador del cliente)."""
    return jsonify({'status': 'success',
                    'policy': cargar_politica().publica()})


@users_api_bp.route('/users/<int:user_id>/credentials', methods=['POST'])
@login_required
@admin_required
def resend_credentials(user_id):
    """Retirado (FNC-161): la contraseña se cambia desde «Editar usuario»."""
    return endpoint_retirado(REEMPLAZO_CONTRASENA)


@users_api_bp.route('/users', methods=['POST'])
@login_required
@any_admin_required
def create_user():
    data, error = leer_cuerpo(None)
    if error is not None:
        return error
    email = (data.get('email') or '').strip().lower()
    if not email:
        return error_response('El correo es obligatorio.')
    if email in RESERVED_NAMES:
        return error_response(
            'Ese identificador está reservado por el sistema.', 403)
    if User.query.filter(db.func.lower(User.email) == email).first():
        return error_response('El correo ya está registrado.', 409)
    if campos_prohibidos(data, CAMPOS_NO_PERMITIDOS):
        return error_response(*CAMPO_NO_PERMITIDO)
    # Sin contraseña local: la cuenta nace sin clave (FNC-077, SEG-02); solo
    # se acepta en desarrollo con LOGIN_LOCAL_TODAS_LAS_CUENTAS.
    if data.get('password') and not contrasena_local_permitida():
        return error_response(*CAMPO_NO_PERMITIDO)

    # Solo el superadmin crea admins de área; nadie crea superadmins (RF-04).
    role = data.get('role') or 'usuario'
    if not rol_asignable(role):
        return error_response(*ROL_RESERVADO)

    # Solo áreas dentro del alcance de quien crea.
    allowed = {a.id for a in scoped_areas().all()}
    area_ids = [i for i in (data.get('area_ids') or []) if i in allowed]

    user = User(
        email=email,
        nombre=sanitize_display_name(data.get('name'), fallback=email),
        role=role,
        # Cuenta de directorio salvo en desarrollo con la bandera (FNC-077).
        auth_source=origen_de_alta(),
        is_active=data.get('is_active', True),
    )
    if data.get('password'):
        user.set_password(data['password'])
    # Un admin_area nace sin áreas administradas: se asignan aparte con
    # `PUT /users/<id>/managed-areas` (solo superadmin).
    user.areas = Area.query.filter(Area.id.in_(area_ids)).all()

    db.session.add(user)
    db.session.commit()

    # Sincronizar membresía de grupo OIDC en OpenLDAP si el directorio está activo
    from app.modules.directory.configuracion import directorio_activo
    if directorio_activo():
        try:
            import os
            from app.modules.directory.writer import EscritorDirectorio
            from app.authz import ROLE_AREA_ADMIN
            escritor = EscritorDirectorio()
            persona = escritor.cliente.buscar_por_correo(email)
            if persona is not None:
                if role in (ROLE_AREA_ADMIN, 'admin', 'admin_area', 'administrador'):
                    grupo_oidc = (os.getenv('OIDC_GROUP_AREA_ADMIN') or os.getenv('LDAP_APP_ADMINS') or 'app-aduana-admins').strip()
                else:
                    grupo_oidc = (os.getenv('OIDC_GROUP_USER') or os.getenv('LDAP_APP_USERS') or 'app-aduana-users').strip()
                dn_grupo = f'cn={grupo_oidc},{escritor.configuracion.grupos_base_dn}'
                escritor.create_group(dn_grupo)
                escritor.add_member(dn_grupo, persona.dn)
        except Exception as exc:
            logger.warning('No se pudo sincronizar usuario en grupo OIDC de LDAP: %s', exc)

    add_audit_log(f"CREAR USUARIO: {email}", module='Usuarios', target=email,
                  status='success')
    return jsonify({'status': 'success', 'id': user.id}), 201


@users_api_bp.route('/users/<int:user_id>', methods=['PUT'])
@login_required
@any_admin_required
def update_user(user_id):
    target = User.query.get_or_404(user_id)
    # Fuera de alcance (otra área, otro admin o el superadmin): 404 (SEC-AUTHZ-04).
    if not can_manage_user(target):
        return error_response(*NO_ENCONTRADO)

    data, error = leer_cuerpo(None)
    if error is not None:
        return error
    if campos_prohibidos(data, CAMPOS_NO_PERMITIDOS):
        return error_response(*CAMPO_NO_PERMITIDO)

    # Enviar el rol que ya tiene no es una asignación: se ignora.
    new_role = data.get('role')
    change_role = 'role' in data and not es_el_mismo_rol(target, new_role)
    if change_role:
        if target.id == current_user.id:
            return error_response(*OPERACION_PROPIA)
        if not rol_asignable(new_role):
            return error_response(*ROL_RESERVADO)

    # Contraseña (FNC-161): según el origen de la cuenta, en la BD (local) o
    # en el directorio (ldap, solo superadmin); nunca del SSO (SEG-05).
    contrasena = data.get('password')
    if contrasena:
        error = validar_cambio(target, contrasena)
        if error:
            return error_response(*error)

    if change_role:
        cambiar_rol(target, new_role)
        from app.modules.directory.configuracion import directorio_activo
        if directorio_activo():
            try:
                import os
                from app.modules.directory.writer import EscritorDirectorio
                from app.authz import ROLE_AREA_ADMIN
                escritor = EscritorDirectorio()
                persona = escritor.cliente.buscar_por_correo(target.email)
                if persona is not None:
                    grupo_admins = (os.getenv('OIDC_GROUP_AREA_ADMIN') or os.getenv('LDAP_APP_ADMINS') or 'app-aduana-admins').strip()
                    grupo_users = (os.getenv('OIDC_GROUP_USER') or os.getenv('LDAP_APP_USERS') or 'app-aduana-users').strip()
                    dn_admins = f'cn={grupo_admins},{escritor.configuracion.grupos_base_dn}'
                    dn_users = f'cn={grupo_users},{escritor.configuracion.grupos_base_dn}'
                    if new_role == ROLE_AREA_ADMIN:
                        escritor.create_group(dn_admins)
                        escritor.add_member(dn_admins, persona.dn)
                        escritor.remove_member(dn_users, persona.dn)
                    else:
                        escritor.create_group(dn_users)
                        escritor.add_member(dn_users, persona.dn)
                        escritor.remove_member(dn_admins, persona.dn)
            except Exception as exc:
                logger.warning('No se pudo actualizar grupo OIDC en LDAP tras cambio de rol: %s', exc)
    if 'name' in data:
        target.nombre = sanitize_display_name(data['name'], fallback=target.email)
    if 'is_active' in data:
        target.is_active = bool(data['is_active'])
    if contrasena:
        error = aplicar_cambio(target, contrasena)
        if error:
            db.session.rollback()
            return error_response(*error)

    db.session.commit()
    add_audit_log(f"EDITAR USUARIO: {target.email}", module='Usuarios',
                  target=target.email, status='success')
    return jsonify({'status': 'success'})


@users_api_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
@any_admin_required
def delete_user(user_id):
    target = User.query.get_or_404(user_id)
    if not can_manage_user(target):
        return error_response(*NO_ENCONTRADO)
    if target.id == current_user.id:
        return error_response('No puedes eliminar tu propia cuenta.', 409)
    if target.email in RESERVED_NAMES:
        return error_response('La cuenta maestra no se puede eliminar.', 403)

    email = target.email
    db.session.delete(target)
    db.session.commit()
    add_audit_log(f"ELIMINAR USUARIO: {email}", module='Usuarios', target=email,
                  status='warning')
    return jsonify({'status': 'success'})


@users_api_bp.route('/users/<int:user_id>/platforms', methods=['PUT'])
@login_required
@any_admin_required
def set_user_platforms(user_id):
    """Retirado (FNC-065): `user_platforms` es obsoleta; ahora se otorga por
    solicitud (`POST /access-requests`)."""
    return endpoint_retirado(REEMPLAZO_ASIGNACION)
