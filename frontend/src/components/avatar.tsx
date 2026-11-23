/**
 * Avatar de iniciales y celda de usuario (DIS-079). El avatar es decorativo
 * (`aria-hidden`): el nombre siempre va como texto a su lado.
 */

import { CLASE_TONO, type TonoCaja } from './ui';

/** Iniciales (máximo 2): de las dos primeras palabras o, con una sola, sus dos primeros caracteres. */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/[\s._@-]+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  const letras = palabras.length === 1
    ? Array.from(palabras[0]).slice(0, 2)
    : [Array.from(palabras[0])[0], Array.from(palabras[1])[0]];
  return letras.join('').toUpperCase();
}

export function Avatar({ nombre, tone = 'activo' }: { nombre: string; tone?: TonoCaja }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${CLASE_TONO[tone]}`}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Columna inicial de una tabla de personas: avatar, nombre y, si hay, correo. */
export function CeldaUsuario({ nombre, correo }: { nombre: string; correo?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar nombre={nombre} />
      <div className="min-w-0 max-w-48">
        <p className="truncate font-medium text-body-text">{nombre}</p>
        {correo ? <p className="truncate text-xs text-label">{correo}</p> : null}
      </div>
    </div>
  );
}
