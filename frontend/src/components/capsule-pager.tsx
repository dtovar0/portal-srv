'use client';

import React from 'react';
import { Icono } from './icono';

export interface CapsulePagerProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
  ariaLabelAnterior?: string;
  ariaLabelSiguiente?: string;
  className?: string;
  showWhenSinglePage?: boolean;
  tamano?: 'sm' | 'md';
}

/**
 * Paginador compacto en cápsula (CapsulePager).
 * Provee navegación anterior/siguiente con indicador central numérico (e.g. 1/5)
 * y variantes de tamaño táctil ('md' de 48px conforme al sistema 8pt o 'sm' compacto
 * para barras secundarias y paneles laterales sin desbordar el diseño).
 */
export function CapsulePager({
  page,
  totalPages,
  onChange,
  label = 'Paginación',
  ariaLabelAnterior = 'Página anterior',
  ariaLabelSiguiente = 'Página siguiente',
  className = '',
  showWhenSinglePage = false,
  tamano = 'md',
}: CapsulePagerProps) {
  if (totalPages <= 1 && !showWhenSinglePage) return null;

  const esSm = tamano === 'sm';

  const navClases = esSm
    ? `flex items-center gap-0.5 rounded-lg border border-panel-border/80 bg-superficie/90 p-0.5 shadow-xs ${className}`
    : `flex items-center gap-1 rounded-xl border border-panel-border/80 bg-superficie/90 p-0.5 shadow-xs ${className}`;

  const botonClases = esSm
    ? 'flex size-7 min-h-7 min-w-7 items-center justify-center rounded-md text-primary-text transition-all hover:bg-surface-container active:scale-95 disabled:pointer-events-none disabled:text-label outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer'
    : 'flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary-text transition-all hover:bg-surface-container active:scale-95 disabled:pointer-events-none disabled:text-label outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer';

  const textoClases = esSm
    ? 'px-2 py-0.5 text-xs font-black tabular-nums tracking-wide text-body-text select-none'
    : 'px-2.5 py-0.5 text-xs font-black tabular-nums tracking-wide text-body-text select-none';

  const iconoTamano = esSm ? 'xs' : 'sm';

  return (
    <nav
      aria-label={label}
      className={navClases}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className={botonClases}
        aria-label={ariaLabelAnterior}
        title={ariaLabelAnterior}
      >
        <Icono nombre="chevron-izq" tamano={iconoTamano} ariaHidden={true} />
      </button>

      <span
        className={textoClases}
        aria-current="page"
      >
        <span className="sr-only">Pág. {page} de {totalPages}</span>
        <span aria-hidden="true">{page}/{totalPages}</span>
      </span>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className={botonClases}
        aria-label={ariaLabelSiguiente}
        title={ariaLabelSiguiente}
      >
        <Icono nombre="chevron-der" tamano={iconoTamano} ariaHidden={true} />
      </button>
    </nav>
  );
}
