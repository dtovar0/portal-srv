/**
 * Comandos del buscador global (DIS-078): las pantallas del menú del rol y unas pocas acciones.
 * Todo se resuelve en el cliente; buscar datos en la base queda como propuesta FNC.
 */

import type { NombreIcono } from '../icono';
import type { NavItem } from './nav-items';

export interface Comando {
  id: string;
  etiqueta: string;
  tipo: 'Pantalla' | 'Acción';
  icono: NombreIcono;
  /** Destino de navegación; si falta, el comando ejecuta `accion`. */
  href?: string;
  accion?: () => void;
  /** Palabras extra que también encuentran el comando. */
  palabras?: string;
}

/** Minúsculas y sin acentos, para comparar «auditoria» con «Auditoría». */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function comandosDePantallas(entradas: readonly NavItem[]): Comando[] {
  return entradas.map((e) => ({
    id: `ir:${e.href}`,
    etiqueta: e.label,
    tipo: 'Pantalla',
    icono: e.icono,
    href: e.href,
    palabras: `ir a ${e.seccion}`,
  }));
}

/** Los que contienen todas las palabras de la consulta; los que empiezan por ella van primero. */
export function filtrarComandos(comandos: readonly Comando[], consulta: string): Comando[] {
  const q = normalizar(consulta);
  if (!q) return [...comandos];
  const palabras = q.split(/\s+/);
  const encontrados = comandos.filter((c) => {
    const pajar = normalizar(`${c.etiqueta} ${c.palabras ?? ''}`);
    return palabras.every((p) => pajar.includes(p));
  });
  const empieza = (c: Comando) => (normalizar(c.etiqueta).startsWith(q) ? 0 : 1);
  return encontrados
    .map((c, i) => ({ c, i }))
    .sort((a, b) => empieza(a.c) - empieza(b.c) || a.i - b.i)
    .map(({ c }) => c);
}

/** Atajo `Ctrl K` / `⌘K`. */
export function esAtajoBusqueda(evento: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  return (evento.ctrlKey || evento.metaKey) && !evento.altKey && evento.key.toLowerCase() === 'k';
}

/** Texto del atajo según la plataforma. */
export function textoAtajo(): string {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return mac ? '⌘K' : 'Ctrl K';
}
