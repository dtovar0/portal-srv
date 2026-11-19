/**
 * Entradas del menú del marco (FNC-070, DIS-078): una sola lista para la barra lateral, el
 * cajón móvil, la ruta de navegación y el buscador global. Cada rol ve lo que `requires` permite.
 */

import type { NombreIcono } from '../icono';
import { meetsRequirement, type RoleRequirement } from '../require-role';
import type { Session } from '@/lib/types';

export type SeccionNav = 'General' | 'Gestión' | 'Sistema';

export interface NavItem {
  href: string;
  label: string;
  icono: NombreIcono;
  seccion: SeccionNav;
  /** Permiso mínimo; sin él el enlace no se muestra. */
  requires?: RoleRequirement;
  /** Si es true, el enlace no se muestra en los menús de navegación. */
  oculto?: boolean;
}

/** Entradas mínimas para mostrar la sección «Gestión» (con menos, van en «General»). */
const MIN_ENTRADAS_GESTION = 2;

export const SECCIONES: readonly SeccionNav[] = ['General', 'Gestión', 'Sistema'];

/** Entradas por rol según la tabla de pantallas (REQUERIMIENTOS §4, FNC-070). */
export const NAV: readonly NavItem[] = [
  { href: '/', label: 'Dashboard', icono: 'panel', seccion: 'General', requires: 'any_admin' },
  { href: '/platforms', label: 'Plataformas', icono: 'plataformas', seccion: 'General', oculto: true },
  { href: '/admin/platforms', label: 'Plataformas', icono: 'plataformas', seccion: 'General', requires: 'any_admin' },
  { href: '/requests', label: 'Mis solicitudes', icono: 'solicitudes', seccion: 'General', requires: 'any_admin', oculto: true },
  { href: '/approvals', label: 'Aprobaciones', icono: 'aprobaciones', seccion: 'Gestión', requires: 'any_admin', oculto: true },
  { href: '/areas', label: 'Áreas', icono: 'areas', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/users', label: 'Usuarios', icono: 'usuarios', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/admin/connectors', label: 'Conectores', icono: 'marca', seccion: 'Gestión', requires: 'admin' },
  { href: '/inventory', label: 'Auditoría usuarios', icono: 'inventario', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/settings', label: 'Ajustes', icono: 'ajustes', seccion: 'Sistema', requires: 'any_admin' },
  { href: '/admin/jobs', label: 'Ejecuciones', icono: 'ejecuciones', seccion: 'Sistema', requires: 'any_admin' },
  { href: '/audit', label: 'Auditoría', icono: 'auditoria', seccion: 'Sistema', requires: 'any_admin' },
];

/** Entradas que el rol puede ver, en el orden del menú. */
export function entradasVisibles(permissions: Session['permissions']): NavItem[] {
  const isUser = !permissions.is_admin && !permissions.is_area_admin;
  if (isUser) {
    return NAV.filter((item) => item.href === '/platforms');
  }
  return NAV.filter((item) => !item.oculto && meetsRequirement(item.requires, permissions));
}

/** Entradas visibles agrupadas por sección; una sección sin entradas no aparece. */
export function seccionesVisibles(
  permissions: Session['permissions'],
): { seccion: SeccionNav; entradas: NavItem[] }[] {
  const visibles = entradasVisibles(permissions);
  // «Gestión» solo se muestra con al menos 2 entradas; si no, sus entradas pasan a «General».
  const gestion = visibles.filter((e) => e.seccion === 'Gestión');
  const sueltas = gestion.length < MIN_ENTRADAS_GESTION ? gestion : [];
  return SECCIONES
    .map((seccion) => ({
      seccion,
      entradas: seccion === 'Gestión'
        ? (sueltas.length > 0 ? [] : gestion)
        : [...visibles.filter((e) => e.seccion === seccion), ...(seccion === 'General' ? sueltas : [])],
    }))
    .filter((grupo) => grupo.entradas.length > 0);
}

/** Entrada de la ruta actual: coincidencia exacta o la de prefijo más largo (`/audit/users/3` → Auditoría). */
export function entradaDeRuta(pathname: string | null | undefined): NavItem | null {
  if (!pathname) return null;
  const exacta = NAV.find((item) => item.href === pathname);
  if (exacta) return exacta;
  return NAV
    .filter((item) => item.href !== '/' && pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

/** Nombre visible del rol de la sesión. */
export function etiquetaRol(role: string): string {
  const etiquetas: Record<string, string> = {
    administrador: 'Administrador global',
    admin_area: 'Administrador de área',
    usuario: 'Usuario',
  };
  return etiquetas[role] ?? role;
}

/** Iniciales para el avatar: primeras letras de las dos primeras palabras del nombre. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/[\s._-]+/).filter(Boolean);
  const letras = partes.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  return letras || '?';
}
