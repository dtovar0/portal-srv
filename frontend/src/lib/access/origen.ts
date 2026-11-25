import type { AccessOrigin } from './types';

/** Etiquetas del origen de un acceso (contrato `accesos.md`), un solo lugar para todas las vistas. */
const ETIQUETAS: Record<AccessOrigin, { propio: string; admin: string }> = {
  solicitud: { propio: 'Por solicitud', admin: 'Por solicitud' },
  admin_de_area: { propio: 'Automático: administras el área', admin: 'Automático (admin del área)' },
  migracion: { propio: 'Migración', admin: 'Migración' },
};

/** Orígenes en el orden del filtro del inventario. */
export const ORIGENES: readonly AccessOrigin[] = ['solicitud', 'admin_de_area', 'migracion'];

/**
 * Etiqueta del origen. `propio` = «Mis accesos»; `admin` = inventario y filtro.
 * Un origen que la web aún no conoce se muestra tal cual llega, nunca vacío.
 */
export function etiquetaOrigenAcceso(origin: string, vista: 'propio' | 'admin'): string {
  const etiquetas = (ETIQUETAS as Record<string, { propio: string; admin: string } | undefined>)[origin];
  return etiquetas?.[vista] ?? origin;
}
