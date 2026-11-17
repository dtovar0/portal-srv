import React from 'react';
import { Icono, type NombreIcono } from '../icono';

/**
 * Botón cuadrado de solo icono de la barra superior (DIS-078): 44 px, borde y fondo de superficie,
 * foco visible. Nombre accesible (`etiqueta`) y `title`. Para un enlace con la misma forma, la
 * clase `CLASE_BOTON_ICONO`.
 */
export const CLASE_BOTON_ICONO =
  'relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control border border-borde bg-superficie text-navegacion outline-none transition-colors hover:bg-surface-container hover:text-body-text focus-visible:ring-2 focus-visible:ring-primary';

interface BotonIconoProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  icono: NombreIcono;
  etiqueta: string;
}

export const BotonIcono = React.forwardRef<HTMLButtonElement, BotonIconoProps>(function BotonIcono(
  { icono, etiqueta, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      data-tooltip={etiqueta}
      {...props}
      className={`${CLASE_BOTON_ICONO} ${className}`}
    >
      <Icono nombre={icono} />
      {children}
    </button>
  );
});
