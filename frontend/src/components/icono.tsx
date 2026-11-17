import React from 'react';
import { TRAZOS, type NombreIcono } from './icono-trazos';

export type { NombreIcono };

export type TamanoIcono = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface IconoProps {
  nombre: NombreIcono;
  tamano?: TamanoIcono;
  className?: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

const DIMENSIONES: Record<TamanoIcono, { width: number; height: number; clase: string }> = {
  xs: { width: 14, height: 14, clase: 'w-3.5 h-3.5' },
  sm: { width: 16, height: 16, clase: 'w-4 h-4' },
  md: { width: 20, height: 20, clase: 'w-5 h-5' },
  lg: { width: 24, height: 24, clase: 'w-6 h-6' },
  // xl (22 px) no está en la escala de Tailwind: lo fijan los atributos width/height
  xl: { width: 22, height: 22, clase: '' },
};

/** Único punto de entrada de iconos de trazo. El color sale de `currentColor`. */
export const Icono: React.FC<IconoProps> = ({
  nombre,
  tamano = 'md',
  className = '',
  ariaLabel,
  ariaHidden,
}) => {
  const dim = DIMENSIONES[tamano] ?? DIMENSIONES.md;
  const oculto = ariaHidden ?? !ariaLabel;
  const trazos: readonly string[] = TRAZOS[nombre] ?? [];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={dim.width}
      height={dim.height}
      className={`inline-block shrink-0 ${dim.clase} ${className}`}
      aria-hidden={oculto}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      {trazos.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
};
