'use client';

/**
 * Marco de la aplicación: carga la sesión y pinta el marco de administración (DIS-078:
 * barra lateral colapsable y barra superior; cajón móvil de DIS-025). El menú por rol vive en
 * `marco/nav-items.ts`.
 */

import { Marco } from './marco/marco';
import { PantallaResponsiva } from './responsiva/pantalla-responsiva';
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

  // Si el usuario no ha firmado la responsiva, bloquea todo el portal y muestra la responsiva
  if (session.responsiva_firmada === false) {
    return (
      <PantallaResponsiva
        session={session}
        onFirmado={() => {
          if (actualizarSesion) {
            actualizarSesion({ ...session, responsiva_firmada: true });
          } else if (recargarSesion) {
            void recargarSesion();
          }
        }}
      />
    );
  }

  return <Marco session={session}>{children}</Marco>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Frame>{children}</Frame>
    </SessionProvider>
  );
}
