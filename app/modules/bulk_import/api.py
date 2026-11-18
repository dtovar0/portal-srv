"""API v1 de importación masiva (Bulk Import) para Ajustes.
Exclusivo del superadmin para la provisión rápida de usuarios, áreas y plataformas.
"""

from flask import Blueprint, Response, jsonify, request
from flask_login import login_required

from app.authz import admin_required
from app.modules.api.helpers import error_response, leer_cuerpo
from app.modules.audit.services import add_audit_log
from app.modules.bulk_import.services import ejecutar_importacion_masiva

bulk_import_api_bp = Blueprint('api_bulk_import', __name__, url_prefix='/api/v1')

PLANTILLAS_CSV = {
    'users': (
        "nombre,correo,rol,areas\n"
        "Ana Ruiz,ana.ruiz@ejemplo.com,usuario,Finanzas;TI\n"
        "Carlos Gomez,carlos.gomez@ejemplo.com,admin_area,Finanzas\n"
        "Maria Lopez,maria.lopez@ejemplo.com,usuario,Operaciones\n"
    ),
    'areas': (
        "nombre,descripcion,color,icono\n"
        "Finanzas,Área contable y financiera,#3b82f6,areas\n"
        "TI,Tecnologías de la información,#10b981,ajustes\n"
        "Operaciones,Gestión operativa y logística,#f59e0b,panel\n"
    ),
    'platforms': (
        "nombre,descripcion,area,enlace,icono\n"
        "Jira,Gestión de proyectos y tareas,TI,https://jira.empresa.com,plataformas\n"
        "SAP,ERP empresarial,Finanzas,https://sap.empresa.com,catalogo\n"
        "Slack,Comunicación interna,Operaciones,https://slack.com,usuarios\n"
    ),
}


@bulk_import_api_bp.route('/import/bulk', methods=['POST'])
@login_required
@admin_required
def importar_lote():
    """Ejecuta la validación y creación masiva de registros para una entidad."""
    datos, error = leer_cuerpo(None)
    if error is not None:
        return error

    entidad = datos.get('entity') or datos.get('entidad')
    # Una lista vacía es válida: no se usa `or`, que la confundiría con ausente.
    registros = datos['records'] if 'records' in datos else datos.get('registros')
    dry_run = bool(datos.get('dry_run', False))

    if not entidad:
        return error_response(
            'El campo "entity" es obligatorio (users, areas, platforms).',
            status=400,
            code='campo_obligatorio',
        )

    if registros is None or not isinstance(registros, list):
        return error_response(
            'El campo "records" debe ser una lista de objetos.',
            status=400,
            code='cuerpo_invalido',
        )

    resultado, status_code = ejecutar_importacion_masiva(entidad, registros, dry_run=dry_run)

    # Auditar operación si no fue una simple simulación
    if status_code == 200 and not dry_run:
        accion = f"IMPORTACIÓN MASIVA: {entidad.upper()}"
        detalle = f"{resultado.get('created', 0)} creados de {resultado.get('total', 0)} registros."
        add_audit_log(
            accion,
            module='Ajustes',
            status='success' if not resultado.get('errors') else 'warning',
            detail=detalle,
        )

    return jsonify(resultado), status_code


@bulk_import_api_bp.route('/import/template/<string:entidad>', methods=['GET'])
@login_required
@admin_required
def descargar_plantilla(entidad):
    """Devuelve el archivo CSV de ejemplo para la entidad solicitada."""
    entidad_clean = entidad.lower().strip()
    mapeo = {
        'users': 'users',
        'usuarios': 'users',
        'areas': 'areas',
        'platforms': 'platforms',
        'plataformas': 'platforms',
    }

    clave = mapeo.get(entidad_clean)
    if not clave or clave not in PLANTILLAS_CSV:
        return error_response('Plantilla no disponible para esta entidad.', 404, 'no_encontrado')

    csv_data = PLANTILLAS_CSV[clave]
    nombre_archivo = f"plantilla_{clave}.csv"
    return Response(
        csv_data,
        mimetype='text/csv; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename="{nombre_archivo}"'},
    )

