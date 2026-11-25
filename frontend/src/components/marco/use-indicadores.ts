'use client';

/**
 * Indicadores del marco (DIS-078): notificaciones sin leer y aprobaciones pendientes. Se piden
 * al montar, cada vez que cambia la pantalla (p. ej. tras aprobar) y cada `refresh_interval`
 * (DIS-129). Un fallo no rompe el marco:
 * simplemente no se muestra el indicador. Las aprobaciones pendientes salen de `GET /home/summary`
 * (`pending_approvals`) y solo se piden a quien administra.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { homeApi } from '@/lib/access/home';
import { useRecargaPeriodica } from '@/lib/use-recarga-periodica';

export function useIndicadores({ esAdmin, ruta, intervaloS }: {
  esAdmin: boolean;
  ruta: string | null;
  /** DIS-129: `refresh_interval` de las preferencias; también se piden cada ese tiempo. */
  intervaloS?: number | null;
}) {
  const [noLeidas, setNoLeidas] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [vuelta, setVuelta] = useState(0);
  const siguienteVuelta = useCallback(() => setVuelta((n) => n + 1), []);
  useRecargaPeriodica(siguienteVuelta, intervaloS);

  useEffect(() => {
    let activo = true;
    Promise.resolve()
      .then(() => api.notifications())
      .then((lista) => { if (activo) setNoLeidas(lista.filter((n) => !n.is_read).length); })
      .catch(() => { /* sin indicador */ });
    if (esAdmin) {
      Promise.resolve()
        .then(() => homeApi.summary())
        .then((resumen) => { if (activo) setPendientes(resumen.pending_approvals ?? 0); })
        .catch(() => { /* sin contador */ });
    }
    return () => { activo = false; };
  }, [esAdmin, ruta, vuelta]);

  return { noLeidas, pendientes };
}
