'use client';

/**
 * Sesión compartida por toda la app.
 *
 * Se pide una sola vez a /api/v1/me y de ahí sale tanto la identidad como los
 * permisos que deciden qué se muestra. Ocultar algo en la interfaz no lo
 * protege: cada endpoint vuelve a comprobar el permiso en el backend.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { Session } from '@/lib/types';

interface SessionState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  actualizarSesion?: (nueva: Session) => void;
  recargarSesion?: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  error: null,
  actualizarSesion: () => {},
  recargarSesion: async () => {},
});

/** Pantalla de acceso. Flask sigue emitiendo la sesión, pero la interfaz
 *  de login vive ya en el frontend. */
const LOGIN_URL = '/login';

/** Caché en memoria para evitar parpadeos y re-peticiones de sesión entre cambios de página. */
let cachedSession: Session | null = null;

export function limpiarSesionCache() {
  cachedSession = null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(() => ({
    session: cachedSession,
    loading: !cachedSession,
    error: null,
  }));

  function actualizarSesion(nueva: Session) {
    cachedSession = nueva;
    setState((prev) => ({ ...prev, session: nueva }));
  }

  async function recargarSesion() {
    try {
      const session = await api.session();
      cachedSession = session;
      setState({ session, loading: false, error: null });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let active = true;

    api.session()
      .then((session) => {
        cachedSession = session;
        if (active) setState({ session, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        // Sin sesión válida, a la pantalla de acceso.
        if (error instanceof ApiError && error.isUnauthenticated) {
          cachedSession = null;
          window.location.href = LOGIN_URL;
          return;
        }
        setState({
          session: cachedSession,
          loading: false,
          error: error instanceof Error ? error.message : 'Error de sesión',
        });
      });

    return () => { active = false; };
  }, []);

  return (
    <SessionContext.Provider value={{ ...state, actualizarSesion, recargarSesion }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
