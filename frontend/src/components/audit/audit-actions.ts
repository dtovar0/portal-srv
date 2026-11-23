/**
 * Catálogo de eventos y resultados de la auditoría para mostrar en pantalla
 * (DIS-020; contrato `auditoria.md`, "Catálogo de `action`", y `Evento` de FNC-047).
 *
 * Los registros anteriores al catálogo traen `action` en texto libre: se
 * muestra tal cual.
 */

import type { AuditResult } from '@/lib/access/types';
import type { NombreIcono } from '../icono';

type ResultadoVista = { texto: string; tono: 'success' | 'error' | 'warning' | 'slate'; icono: NombreIcono };

export const ACCIONES: Record<string, string> = {
  area_creada: 'Área creada',
  area_editada: 'Área editada',
  area_eliminada: 'Área eliminada',
  admin_asignado: 'Admin asignado',
  admin_retirado: 'Admin retirado',
  rol_cambiado: 'Rol cambiado',
  plataforma_creada: 'Plataforma creada',
  plataforma_editada: 'Plataforma editada',
  solicitud_creada: 'Solicitud creada',
  solicitud_aprobada: 'Solicitud aprobada',
  solicitud_rechazada: 'Solicitud rechazada',
  acceso_otorgado: 'Acceso otorgado',
  acceso_activo: 'Acceso activo',
  acceso_fallido: 'Acceso fallido',
  acceso_revocado: 'Acceso revocado',
  revocacion_fallida: 'Fallo revocación',
  cuenta_directorio_creada: 'Cuenta creada',
  conector_configurado: 'Conector guardado',
  conector_eliminado: 'Conector eliminado',
  conector_probado: 'Conector probado',
  ejecucion_reintentada: 'Reintento',
  ejecucion_cancelada: 'Cancelación',
  notificacion_fallida: 'Fallo aviso',
  credenciales_enviadas: 'Credenciales enviadas',
  credenciales_pendientes: 'Credenciales pendientes',
  credenciales_reenviadas: 'Credenciales reenviadas',
};

const ACCIONES_LEGACY: Record<string, string> = {
  'ELIMINAR PLATAFORMA': 'Baja plataforma',
  'CREAR PLATAFORMA': 'Alta plataforma',
  'EDITAR PLATAFORMA': 'Edición plataforma',
  'CREAR USUARIO': 'Alta usuario',
  'EDITAR USUARIO': 'Edición usuario',
  'ELIMINAR USUARIO': 'Baja usuario',
};

/** Nombre del evento; un valor fuera del catálogo se muestra tal cual. */
export function etiquetaAccion(action: string): string {
  if (Object.hasOwn(ACCIONES, action)) return ACCIONES[action];
  if (Object.hasOwn(ACCIONES_LEGACY, action)) return ACCIONES_LEGACY[action];

  // Acciones históricas con sufijo (ej. 'ELIMINAR PLATAFORMA: Demo Wiki')
  for (const [legacyKey, label] of Object.entries(ACCIONES_LEGACY)) {
    if (action.startsWith(`${legacyKey}:`)) {
      return label;
    }
  }

  return action;
}

export const RESULTADOS: Record<AuditResult, ResultadoVista> = {
  success: { texto: 'Éxito', tono: 'success', icono: 'exito' },
  error: { texto: 'Error', tono: 'error', icono: 'error' },
  warning: { texto: 'Advertencia', tono: 'warning', icono: 'aviso' },
  info: { texto: 'Información', tono: 'slate', icono: 'info' },
};

/** Resultado (`status`) para la insignia; un valor desconocido, tal cual y en gris. */
export function resultado(status: string): ResultadoVista {
  return Object.hasOwn(RESULTADOS, status)
    ? RESULTADOS[status as AuditResult]
    : { texto: status, tono: 'slate', icono: 'info' };
}

/** Quién actuó: el correo del actor o "Sistema" (`actor` null). */
export const ACTOR_SISTEMA = 'Sistema';
