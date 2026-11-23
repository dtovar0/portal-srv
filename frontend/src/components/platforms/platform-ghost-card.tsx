'use client';

import { Icono, type NombreIcono } from '@/components/icono';
import type { CardDesignVariant } from './user-view-settings';

export interface PlatformGhostCardProps {
  /** Texto descriptivo (por omisión: 'Espacio disponible') */
  texto?: string;
  /** Nombre del icono a mostrar (por omisión: 'panel') */
  icono?: NombreIcono;
  /** Variante de diseño de tarjeta para sincronizar dimensiones mínimas */
  variante?: CardDesignVariant | string;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Tarjeta fantasma (Ghost Card) estandarizada para completar la cuadrícula visual de tarjetas
 * en el catálogo de plataformas y áreas (tanto en vista Topbar como Sidebar).
 */
export function PlatformGhostCard({
  texto = 'Espacio disponible',
  icono = 'panel',
  variante = 'estandar',
  className = '',
}: PlatformGhostCardProps) {
  const minAltura =
    variante === 'compacta'
      ? 'min-h-44'
      : variante === 'horizontal'
      ? 'min-h-24'
      : variante === 'duotono' || variante === 'enmarcada' || variante === 'evento' || variante === 'split' || variante === 'glass' || variante === 'editorial'
      ? 'min-h-64'
      : 'min-h-56';

  return (
    <div
      aria-hidden="true"
      className={`hidden sm:flex flex-col justify-center items-center h-full ${minAltura} rounded-2xl border-2 border-dashed border-panel-border/40 bg-panel-fill/20 p-6 text-center select-none pointer-events-none ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-superficie-hundida flex items-center justify-center text-label/40 mb-2 shrink-0">
        <Icono nombre={icono} tamano="sm" ariaHidden={true} />
      </div>
      <p className="text-xs font-medium text-label/60">{texto}</p>
    </div>
  );
}

