'use client';

/**
 * Recarga periódica liviana (DIS-129): llama `recargar` cada `intervaloS`
 * segundos (la preferencia `refresh_interval` del usuario, normalizada como en
 * `use-polling.ts`: 15 s a 1 h, 60 s por omisión) solo mientras la pestaña
 * está visible; al volver a ser visible recarga de inmediato. Mismo criterio
 * de ADR-006: polling HTTP, sin SSE ni webhooks.
 */
import { useEffect, useRef } from 'react';
import { normalizarIntervalo } from '@/lib/use-polling';

const MS_POR_SEGUNDO = 1000;

function visible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

export function useRecargaPeriodica(
  recargar: () => void,
  intervaloS: number | null | undefined,
  activo = true,
): void {
  const ultima = useRef(recargar);
  ultima.current = recargar;
  const ms = normalizarIntervalo(intervaloS) * MS_POR_SEGUNDO;

  useEffect(() => {
    if (!activo) return undefined;
    const temporizador = setInterval(() => {
      if (visible()) ultima.current();
    }, ms);
    function alCambiarVisibilidad() {
      if (visible()) ultima.current();
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, [ms, activo]);
}
