'use client';

/**
 * Preferencia de diseño para la vista de plataformas (/platforms):
 * - 'topbar': Lanzador amplio tipo Launchpad sin barra lateral (recomendado para usuarios).
 * - 'sidebar': Diseño de consola con barra lateral corporativa (estilo Admin Board).
 *
 * Se guarda en localStorage y se sincroniza reactivamente mediante el evento
 * `EVENTO_PLATFORMS_LAYOUT`.
 */

import { useEffect, useState } from 'react';

export const PLATFORMS_LAYOUTS = ['topbar', 'sidebar'] as const;
export type PlatformsLayout = (typeof PLATFORMS_LAYOUTS)[number];

export const CLAVE_PLATFORMS_LAYOUT = 'nexus.platforms.layout';
export const EVENTO_PLATFORMS_LAYOUT = 'nexus:platforms-layout';
export const LAYOUT_POR_OMISION: PlatformsLayout = 'topbar';

export function esPlatformsLayout(valor: unknown): valor is PlatformsLayout {
  return typeof valor === 'string' && (PLATFORMS_LAYOUTS as readonly string[]).includes(valor);
}

export function leerPlatformsLayout(): PlatformsLayout {
  if (typeof window === 'undefined') return LAYOUT_POR_OMISION;
  try {
    const guardado = window.localStorage.getItem(CLAVE_PLATFORMS_LAYOUT);
    return esPlatformsLayout(guardado) ? guardado : LAYOUT_POR_OMISION;
  } catch {
    return LAYOUT_POR_OMISION;
  }
}

export function guardarPlatformsLayout(layout: PlatformsLayout): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE_PLATFORMS_LAYOUT, layout);
  } catch {
    /* Si falla el almacenamiento local, rige en memoria durante la sesión */
  }
  window.dispatchEvent(new CustomEvent<PlatformsLayout>(EVENTO_PLATFORMS_LAYOUT, { detail: layout }));
}

export function usePlatformsLayout() {
  const [layout, setLayoutState] = useState<PlatformsLayout>(LAYOUT_POR_OMISION);

  useEffect(() => {
    setLayoutState(leerPlatformsLayout());

    function onCambio(e: Event) {
      const customEvent = e as CustomEvent<PlatformsLayout>;
      if (customEvent.detail && esPlatformsLayout(customEvent.detail)) {
        setLayoutState(customEvent.detail);
      } else {
        setLayoutState(leerPlatformsLayout());
      }
    }

    function onStorage(e: StorageEvent) {
      if (e.key === CLAVE_PLATFORMS_LAYOUT) {
        setLayoutState(leerPlatformsLayout());
      }
    }

    window.addEventListener(EVENTO_PLATFORMS_LAYOUT, onCambio);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENTO_PLATFORMS_LAYOUT, onCambio);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const cambiarLayout = (nuevo: PlatformsLayout) => {
    guardarPlatformsLayout(nuevo);
    setLayoutState(nuevo);
  };

  return {
    layout,
    setLayout: cambiarLayout,
    esTopbar: layout === 'topbar',
  };
}

