'use client';

/**
 * Refresco del catálogo tras firmar la Carta Responsiva (DIS-128).
 *
 * Al firmar, el backend encola el aprovisionamiento de los accesos «en
 * proceso» (el worker tarda unos segundos). `iniciar()` avisa de inmediato y
 * vuelve a avisar cada `INTERVALO_REFRESCO_MS` mientras quede alguno en
 * proceso, con un máximo de `MAX_REFRESCOS` avisos.
 */
import { useCallback, useEffect, useState } from 'react';
import { avisarAccesosCambiados } from '@/lib/access/eventos';
import type { CatalogItem } from '@/lib/access/types';

export const INTERVALO_REFRESCO_MS = 3000;
export const MAX_REFRESCOS = 10;
const ESTADO_EN_PROCESO = 'en_proceso';

export function useRefrescoTrasFirma(items: readonly CatalogItem[]): () => void {
  const [restantes, setRestantes] = useState(0);
  const hayEnProceso = items.some((item) => item.my_access_status === ESTADO_EN_PROCESO);

  useEffect(() => {
    if (restantes <= 0) return undefined;
    // Tras el primer aviso, sin nada en proceso ya no hace falta seguir.
    if (!hayEnProceso && restantes < MAX_REFRESCOS) {
      setRestantes(0);
      return undefined;
    }
    const temporizador = setTimeout(() => {
      avisarAccesosCambiados();
      setRestantes((n) => n - 1);
    }, INTERVALO_REFRESCO_MS);
    return () => clearTimeout(temporizador);
  }, [restantes, hayEnProceso]);

  return useCallback(() => {
    avisarAccesosCambiados();
    setRestantes(MAX_REFRESCOS);
  }, []);
}
