'use client';

/**
 * Marco de la aplicación: carga la sesión y pinta el marco de administración (DIS-078:
 * barra lateral colapsable y barra superior; cajón móvil de DIS-025). El menú por rol vive en
 * `marco/nav-items.ts`.
 */

import { Marco } from './marco/marco';
import { ModalResponsiva } from './responsiva/modal-responsiva';
import { SessionProvider, useSession } from './session-provider';
import { ErrorNote, Spinner } from './ui';

function Frame({ children }: { children: React.ReactNode }) {
  const { session, loading, error, actualizarSesion, recargarSesion } = useSession();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Cargando sesión…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorNote message={error} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <Marco session={session}>
      {children}
      {session.responsiva_firmada === false ? (
        <ModalResponsiva
          session={session}
          onFirmado={() => {
            if (actualizarSesion) {
              actualizarSesion({ ...session, responsiva_firmada: true });
            } else if (recargarSesion) {
              void recargarSesion();
            }
          }}
        />
      ) : null}
    </Marco>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Frame>{children}</Frame>
    </SessionProvider>
  );
}
