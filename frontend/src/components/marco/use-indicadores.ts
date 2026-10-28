'use client';

/**
 * Indicadores del marco (DIS-078): notificaciones sin leer y aprobaciones pendientes. Se piden
 * al montar y cada vez que cambia la pantalla (p. ej. tras aprobar). Un fallo no rompe el marco:
 * simplemente no se muestra el indicador. Las aprobaciones pendientes salen de `GET /home/summary`
 * (`pending_approvals`) y solo se piden a quien administra.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { homeApi } from '@/lib/access/home';

export function useIndicadores({ esAdmin, ruta }: { esAdmin: boolean; ruta: string | null }) {
  const [noLeidas, setNoLeidas] = useState(0);
  const [pendientes, setPendientes] = useState(0);

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
  }, [esAdmin, ruta]);

  return { noLeidas, pendientes };
}
