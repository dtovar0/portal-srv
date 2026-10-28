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
}

export const SECCIONES: readonly SeccionNav[] = ['General', 'Gestión', 'Sistema'];

/** Entradas por rol según la tabla de pantallas (REQUERIMIENTOS §4, FNC-070). */
export const NAV: readonly NavItem[] = [
  { href: '/', label: 'Panel', icono: 'panel', seccion: 'General' },
  { href: '/platforms', label: 'Catálogo', icono: 'catalogo', seccion: 'General' },
  { href: '/requests', label: 'Mis solicitudes', icono: 'solicitudes', seccion: 'General', requires: 'requester' },
  { href: '/favorites', label: 'Favoritos', icono: 'favorito', seccion: 'General' },
  { href: '/notifications', label: 'Notificaciones', icono: 'campana', seccion: 'General' },
  { href: '/approvals', label: 'Aprobaciones', icono: 'aprobaciones', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/admin/platforms', label: 'Administrar plataformas', icono: 'plataformas', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/admin/connectors', label: 'Conectores', icono: 'marca', seccion: 'Gestión', requires: 'admin' },
  { href: '/areas', label: 'Áreas', icono: 'areas', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/users', label: 'Usuarios', icono: 'usuarios', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/inventory', label: 'Inventario', icono: 'inventario', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/admin/jobs', label: 'Ejecuciones', icono: 'ejecuciones', seccion: 'Gestión', requires: 'any_admin' },
  { href: '/audit', label: 'Auditoría', icono: 'auditoria', seccion: 'Gestión' },
  { href: '/settings', label: 'Ajustes', icono: 'ajustes', seccion: 'Sistema' },
];

/** Entradas que el rol puede ver, en el orden del menú. */
export function entradasVisibles(permissions: Session['permissions']): NavItem[] {
  return NAV.filter((item) => meetsRequirement(item.requires, permissions));
}

/** Entradas visibles agrupadas por sección; una sección sin entradas no aparece. */
export function seccionesVisibles(
  permissions: Session['permissions'],
): { seccion: SeccionNav; entradas: NavItem[] }[] {
  const visibles = entradasVisibles(permissions);
  return SECCIONES
    .map((seccion) => ({ seccion, entradas: visibles.filter((e) => e.seccion === seccion) }))
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
