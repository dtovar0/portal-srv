/**
 * Catálogo de los cinco indicadores del dashboard (DIS-112): icono, textos y clase de color.
 * Los colores salen de los tokens `--color-indicador-*` (tokens.css) por la clase `nx-ind--*`.
 */
import type { ClaveIndicador, DesgloseIndicador } from '@/lib/types';
import type { NombreIcono } from '../icono';

export interface DefinicionIndicador {
  etiqueta: string;
  icono: NombreIcono;
  /** Nombre de la parte y del resto, en el orden del desglose (`parte`, `resto`). */
  partes: [string, string];
  /** Clase literal (el CSS sin uso la busca por nombre completo). */
  clase: string;
}

export const INDICADORES: Record<ClaveIndicador, DefinicionIndicador> = {
  areas: { etiqueta: 'Áreas', icono: 'areas', partes: ['activas', 'inactivas'], clase: 'nx-ind--areas' },
  platforms: { etiqueta: 'Plataformas', icono: 'plataformas', partes: ['activas', 'inactivas'], clase: 'nx-ind--plataformas' },
  requests: { etiqueta: 'Solicitudes', icono: 'solicitudes', partes: ['resueltas', 'pendientes'], clase: 'nx-ind--solicitudes' },
  visits: { etiqueta: 'Visitas', icono: 'ver', partes: ['de plataformas activas', 'de las demás'], clase: 'nx-ind--visitas' },
  users: { etiqueta: 'Usuarios', icono: 'usuarios', partes: ['activos', 'inactivos'], clase: 'nx-ind--usuarios' },
};

/** Porcentaje entero de la parte sobre el total; total 0 = 0 %. */
export function porcentaje({ parte, resto }: DesgloseIndicador): number {
  const total = parte + resto;
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/** Texto del porcentaje, con espacio antes del signo: «92 %». */
export const textoPorcentaje = (desglose: DesgloseIndicador): string => `${porcentaje(desglose)} %`;

/** El desglose solo se usa si es coherente con el contador (`parte + resto` = valor). */
export function desgloseValido(
  desglose: DesgloseIndicador | undefined,
  valor: number,
): DesgloseIndicador | undefined {
  if (!desglose) return undefined;
  const { parte, resto } = desglose;
  const enteros = Number.isFinite(parte) && Number.isFinite(resto) && parte >= 0 && resto >= 0;
  return enteros && parte + resto === valor ? desglose : undefined;
}

/** Cifra con separador de miles en español. */
export const formatoCifra = (n: number): string => n.toLocaleString('es-MX');
