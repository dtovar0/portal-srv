'use client';

/**
 * Botón de favorito de una plataforma (DIS-030):
 * Sincronizado unívocamente con el icono de favoritos del sidebar y el catálogo (Icono nombre="favorito").
 * Área táctil accesible de 48px con foco visible (DIS-008).
 * Estilo de contenedor adaptado a cada variante de tarjeta, compartiendo la iconografía institucional.
 */

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from './toast';
import { Icono } from './icono';
import type { CardDesignVariant } from './platforms/user-view-settings';

export type FavoriteButtonVariant = CardDesignVariant | 'default';

export interface FavoriteButtonProps {
  platformId: number;
  /** Nombre de la plataforma: el nombre accesible es fijo y el estado va en `aria-pressed`. */
  name: string;
  initial: boolean;
  onChange?: (id: number, isFavorite: boolean) => void;
  variante?: FavoriteButtonVariant | string;
  className?: string;
  /** Si es true o platformId >= 900, opera en modo demostración local sin petición de red */
  isDemo?: boolean;
}

export function FavoriteButton({
  platformId,
  name,
  initial,
  onChange,
  variante = 'default',
  className = '',
  isDemo = false,
}: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { avisar } = useToast();

  useEffect(() => {
    setFavorite(initial);
  }, [initial]);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    const previous = favorite;
    const next = !previous;
    setFavorite(next);
    onChange?.(platformId, next);

    if (isDemo || platformId >= 900) {
      return;
    }

    setBusy(true);
    try {
      const result = await api.toggleFavorite(platformId);
      setFavorite(result.is_favorite);
      if (result.is_favorite !== next) {
        onChange?.(platformId, result.is_favorite);
      }
    } catch {
      setFavorite(previous);
      onChange?.(platformId, previous);
      avisar('error', 'No se pudo actualizar el favorito.', 'Favoritos');
    } finally {
      setBusy(false);
    }
  }

  // Variante especial: Horizontal (formato píldora con etiqueta textual integrada)
  if (variante === 'horizontal') {
    return (
      <button
        type="button"
        aria-pressed={favorite}
        disabled={busy}
        aria-disabled={busy}
        onClick={toggle}
        aria-label={`Favorito: ${name}`}
        className={`group relative inline-flex min-h-12 px-3.5 items-center gap-2 rounded-full border transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary hover:scale-102 active:scale-98 shadow-xs cursor-pointer ${
          favorite
            ? 'bg-warning/15 border-warning/50 text-warning-text'
            : 'bg-surface-container/80 border-panel-border hover:border-primary/50 hover:bg-surface-container text-label'
        } ${busy ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        <Icono
          nombre="favorito"
          tamano="md"
          relleno={favorite}
          ariaHidden={true}
          className={`shrink-0 transition-transform group-hover:scale-110 ${
            favorite ? 'text-amber-400' : 'text-label group-hover:text-body-text'
          }`}
        />
        <span className="text-[11px] font-bold tracking-tight uppercase select-none">
          {favorite ? 'Favorita' : 'Guardar'}
        </span>
      </button>
    );
  }

  // Estilos de contenedor adaptados al acabado estético de cada tarjeta:
  let containerStyles = '';

  switch (variante) {
    case 'portada':
    case 'banner':
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-2xl backdrop-blur-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-400 hover:scale-105 active:scale-95 shadow-md cursor-pointer ${
        favorite
          ? 'bg-amber-500/30 border border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
          : 'bg-black/50 border border-white/20 hover:border-white/40 hover:bg-black/70'
      }`;
      break;

    case 'flotante':
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-2xl backdrop-blur-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-400 hover:scale-105 active:scale-95 shadow-xl cursor-pointer ${
        favorite
          ? 'bg-amber-500/35 border border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.5)]'
          : 'bg-black/60 border border-white/30 hover:border-white/50 hover:bg-black/80'
      }`;
      break;

    case 'duotono':
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-2xl backdrop-blur-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-purple-400 hover:scale-105 active:scale-95 shadow-md cursor-pointer ${
        favorite
          ? 'bg-purple-950/80 border border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.4)]'
          : 'bg-black/60 border border-purple-500/40 hover:border-purple-300 hover:bg-black/80'
      }`;
      break;

    case 'split':
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-2xl backdrop-blur-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 hover:scale-105 active:scale-95 shadow-md cursor-pointer ${
        favorite
          ? 'bg-indigo-900/95 border border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.4)]'
          : 'bg-indigo-950/80 border border-indigo-400/40 hover:border-indigo-300 hover:bg-indigo-900/90'
      }`;
      break;

    case 'enmarcada':
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-2xl backdrop-blur-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary hover:scale-105 active:scale-95 shadow-md cursor-pointer ${
        favorite
          ? 'bg-amber-500/20 border border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
          : 'bg-white/20 dark:bg-black/50 border border-panel-border/80 hover:bg-white/30 dark:hover:bg-black/70'
      }`;
      break;

    case 'evento':
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-full backdrop-blur-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-400 hover:scale-105 active:scale-95 shadow-md cursor-pointer ${
        favorite
          ? 'bg-amber-500/25 border-2 border-solid border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
          : 'bg-black/60 border-2 border-dashed border-amber-400/60 hover:border-amber-400 hover:bg-black/80'
      }`;
      break;

    case 'glass':
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-full backdrop-blur-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary hover:scale-110 active:scale-95 shadow-xl cursor-pointer ${
        favorite
          ? 'bg-white/35 border border-amber-300 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
          : 'bg-white/20 dark:bg-white/10 border border-white/50 dark:border-white/30 ring-2 ring-white/25 hover:bg-white/30'
      }`;
      break;

    case 'editorial':
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-xl bg-superficie border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-body-text hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
        favorite
          ? 'bg-body-text border-body-text text-superficie shadow-sm'
          : 'border-panel-border hover:border-body-text text-body-text'
      }`;
      break;

    default: // 'estandar', 'compacta', 'default'
      containerStyles = `group relative inline-flex min-h-12 min-w-12 size-12 shrink-0 items-center justify-center rounded-2xl border transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
        favorite
          ? 'bg-warning/15 border-warning/50 shadow-xs'
          : 'bg-fondo/90 border-panel-border/80 hover:border-primary/50 hover:bg-superficie hover:shadow-sm'
      }`;
      break;
  }

  return (
    <button
      type="button"
      aria-pressed={favorite}
      disabled={busy}
      aria-disabled={busy}
      onClick={toggle}
      aria-label={`Favorito: ${name}`}
      className={`${containerStyles} ${busy ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      <Icono
        nombre="favorito"
        tamano="2xl"
        relleno={favorite}
        ariaHidden={true}
        className={`transition-all duration-200 group-hover:scale-110 ${
          favorite
            ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
            : 'text-zinc-400/80 group-hover:text-amber-300'
        }`}
      />
    </button>
  );
}
