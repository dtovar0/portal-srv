'use client';

import React, { useEffect, useState } from 'react';
import { Icono, type NombreIcono } from '../icono';

/**
 * Botón cuadrado de solo icono de la barra superior (DIS-078): 44 px, borde y fondo de superficie,
 * foco visible. Nombre accesible (`etiqueta`) y `title`. Para un enlace con la misma forma, la
 * clase `CLASE_BOTON_ICONO`. El tooltip se descarta con Esc mientras el puntero o el foco están
 * sobre el botón (WCAG 1.4.13, DIS-085) y vuelve al salir y entrar de nuevo.
 */
export const CLASE_BOTON_ICONO =
  'relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control border border-borde bg-superficie text-navegacion outline-none transition-colors hover:bg-surface-container hover:text-body-text focus-visible:ring-2 focus-visible:ring-primary';

interface BotonIconoProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  icono: NombreIcono;
  etiqueta: string;
}

export const BotonIcono = React.forwardRef<HTMLButtonElement, BotonIconoProps>(function BotonIcono(
  { icono, etiqueta, className = '', children, onMouseEnter, onMouseLeave, onFocus, onBlur, ...props },
  ref,
) {
  const [encima, setEncima] = useState(false);
  const [foco, setFoco] = useState(false);
  const [descartado, setDescartado] = useState(false);
  const visible = encima || foco;

  useEffect(() => {
    if (!visible) {
      setDescartado(false);
      return;
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDescartado(true);
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [visible]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      data-tooltip={etiqueta}
      data-tooltip-descartado={descartado ? 'true' : undefined}
      {...props}
      onMouseEnter={(e) => {
        setEncima(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setEncima(false);
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        setFoco(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFoco(false);
        onBlur?.(e);
      }}
      className={`${CLASE_BOTON_ICONO} ${className}`}
    >
      <Icono nombre={icono} />
      {children}
    </button>
  );
});
