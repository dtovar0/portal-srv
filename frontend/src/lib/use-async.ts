'use client';

import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const asyncMemoryCache = new Map<string, unknown>();

export function clearAsyncCache(key?: string) {
  if (key) asyncMemoryCache.delete(key);
  else asyncMemoryCache.clear();
}

/**
 * Carga datos de la API y expone estado de carga y error.
 *
 * Si se especifica `cacheKey`, implementa Stale-While-Revalidate: si ya existen
 * datos en memoria, los devuelve al instante (`loading: false`) y revalida en
 * segundo plano evitando parpadeos de carga ("Cargando…").
 *
 * `deps` controla cuándo se recarga; `reload` fuerza una recarga manual tras
 * una mutación.
 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>(() => {
    const cached = cacheKey ? (asyncMemoryCache.get(cacheKey) as T | undefined) : undefined;
    return {
      data: cached ?? null,
      loading: cached === undefined,
      error: null,
    };
  });
  const [nonce, setNonce] = useState(0);

  // `load` se recrea en cada render; las dependencias declaradas por quien
  // llama son las que deciden la recarga. La regla no puede analizar `deps`
  // porque llega como parámetro; es intencional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runner = useCallback(load, deps);

  useEffect(() => {
    let active = true;
    setState((prev) => ({
      ...prev,
      loading: prev.data === null,
      error: null,
    }));

    runner()
      .then((data) => {
        if (cacheKey) asyncMemoryCache.set(cacheKey, data);
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState((prev) => ({
          data: prev.data,
          loading: false,
          error: error instanceof Error ? error.message : 'Error al cargar',
        }));
      });

    return () => { active = false; };
  }, [runner, nonce, cacheKey]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
