import React from 'react';
import { Icono, type NombreIcono } from './icono';

export interface PremiumEmptyStateProps {
  /** Nombre del icono de trazo central. Por defecto 'info'. */
  icono?: NombreIcono;
  /** Pequeña etiqueta superior (eyebrow / badge de estado). */
  badge?: string;
  badgeTestId?: string;
  /** Título principal de impacto visual. */
  title?: string;
  /** Mensaje descriptivo contextual. */
  message: string;
  /** Acción o botones sugeridos (CTA). */
  action?: React.ReactNode;
  /**
   * Variante visual:
   * - 'card': tarjeta completa independiente con borde, radio y sombra.
   * - 'seamless': integrado sin bordes ni fondos repetidos, ocupando el 100% del contenedor padre.
   */
  variant?: 'card' | 'seamless';
  className?: string;
  /**
   * Rol del contenedor (DIS-085). Por defecto 'status' (se anuncia al aparecer); con `null` no
   * lleva rol, para un vacío que ya está en la carga inicial o que otro aviso anuncia.
   */
  role?: 'status' | 'alert' | null;
  /** Nivel del título (2 a 6, por defecto 3) para respetar la jerarquía de encabezados de la página. */
  nivelTitulo?: 2 | 3 | 4 | 5 | 6;
}

/**
 * Componente canónico estandarizado para estados vacíos o tablas solitarias de nivel Premium SaaS.
 * Incorpora atmósfera cromática Cobalt & Violet, halo de iluminación superior, caja de icono
 * con marco doble y tipografía contundente (UI_GUIDE §Estandarización de Mensajes Premium).
 */
export function PremiumEmptyState({
  icono = 'info',
  badge,
  badgeTestId,
  title,
  message,
  action,
  variant = 'card',
  className = '',
  role = 'status',
  nivelTitulo = 3,
}: PremiumEmptyStateProps) {
  const Titulo = `h${nivelTitulo}` as const;
  const estilosVariante =
    variant === 'seamless'
      ? 'border-0 bg-transparent shadow-none rounded-none'
      : 'rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/[0.04] via-panel-fill/95 to-panel-fill shadow-lg backdrop-blur-md';

  return (
    <div
      role={role ?? undefined}
      className={`relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden p-6 sm:p-10 text-center ${estilosVariante} ${className}`}
    >
      {/* Halos de resplandor ambiental multicapa Cobalt & Violet */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 via-brand/10 to-transparent blur-3xl opacity-80"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 right-1/4 size-48 rounded-full bg-accent/10 blur-3xl opacity-50"
        aria-hidden="true"
      />

      {badge ? (
        <div className="mb-4 flex justify-center">
          <span
            data-testid={badgeTestId}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-primary-text shadow-2xs backdrop-blur-xs"
          >
            {badge}
          </span>
        </div>
      ) : null}

      {/* Caja de icono multicapa estilo joya con aro concéntrico */}
      <div className="relative mb-4 flex items-center justify-center" aria-hidden="true">
        <div className="flex size-20 items-center justify-center rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-brand/5 to-accent/10 p-2 shadow-inner ring-1 ring-primary/10">
          <div className="flex size-full items-center justify-center rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/25 via-brand/20 to-accent/25 text-primary-text shadow-md transition-transform duration-300 hover:scale-105">
            <Icono nombre={icono} tamano="lg" ariaHidden={true} />
          </div>
        </div>
        <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary ring-2 ring-panel-fill" />
      </div>

      {/* Bloque envoltorio del texto central con balance tipográfico */}
      <div className="mx-auto flex max-w-xs sm:max-w-md flex-col items-center justify-center text-center">
        {title ? (
          <Titulo className="text-base sm:text-lg font-black tracking-tight text-body-text [text-wrap:balance]">
            {title}
          </Titulo>
        ) : null}
        <p
          className={`text-xs sm:text-sm leading-relaxed [text-wrap:balance] ${
            title ? 'mt-1.5 text-texto-secundario' : 'font-bold text-body-text'
          }`}
        >
          {message}
        </p>
      </div>

      {action ? <div className="mt-5 flex justify-center gap-3">{action}</div> : null}
    </div>
  );
}
