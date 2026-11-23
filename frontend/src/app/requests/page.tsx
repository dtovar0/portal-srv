'use client';

/**
 * Página de Mis Solicitudes de Acceso (DIS-115).
 *
 * Mantiene la experiencia completa del portal de usuario sin redirigir al panel
 * de administración (Admin Board):
 * - En modo Topbar (Launchpad): Barra superior de plataformas + Tabla completa de solicitudes
 *   con buscador, filtros por estado (Todas, Pendientes, Aprobadas, Rechazadas) y paginación.
 * - En modo Sidebar (Workspace): Barra lateral con "Mis Solicitudes" activa + Tabla de solicitudes.
 * - Si el usuario es administrador, la barra superior ofrece el botón [ ⚙️ Regresar al Panel Admin ]
 *   para volver a la consola de administración en cualquier momento.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { usePlatformsLayout } from '@/lib/platforms-layout';
import { PlatformsTopbar } from '@/components/platforms/platforms-topbar';
import { PlatformsSidebarView } from '@/components/platforms/platforms-sidebar-view';
import { UserRequestsTable } from '@/components/platforms/user-requests-table';
import { SessionProvider, useSession } from '@/components/session-provider';
import { ModalResponsiva } from '@/components/responsiva/modal-responsiva';
import { ErrorNote, PantallaCarga } from '@/components/ui';
import { EVENTO_MOSTRAR_DOCUMENTOS, leerMostrarDocumentos } from '@/components/platforms/user-view-settings';

function RequestsPageContent() {
  const { session, loading, error, actualizarSesion, recargarSesion } = useSession();
  const { esTopbar } = usePlatformsLayout();
  const mias = useAsync(() => api.platforms(), [], 'nexus.platforms.mine');
  const [mostrarDocumentos, setMostrarDocumentos] = useState<boolean>(() => leerMostrarDocumentos());

  useEffect(() => {
    function onDocumentosChange(e: Event) {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setMostrarDocumentos(customEvent.detail);
      } else {
        setMostrarDocumentos(leerMostrarDocumentos());
      }
    }
    window.addEventListener(EVENTO_MOSTRAR_DOCUMENTOS, onDocumentosChange);
    return () => {
      window.removeEventListener(EVENTO_MOSTRAR_DOCUMENTOS, onDocumentosChange);
    };
  }, []);

  if (loading) {
    return <PantallaCarga label="Cargando solicitudes…" subtexto="Sincronizando trámites y aprobaciones…" />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorNote message={error} />
      </div>
    );
  }

  if (!session) return null;

  const modalResponsiva =
    mostrarDocumentos && session.responsiva_firmada === false ? (
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
    ) : null;

  // Opción A: Solo barra superior
  if (esTopbar) {
    return (
      <div className="flex h-dvh flex-col bg-fondo">
        <a
          href="#contenido"
          className="fixed left-4 top-4 z-50 inline-flex min-h-11 -translate-y-20 items-center rounded-control bg-accion px-4 text-sm font-semibold text-texto-sobre-accion outline-none focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Saltar al contenido
        </a>

        <PlatformsTopbar session={session} mostrarDocumentos={mostrarDocumentos} />

        <main
          id="contenido"
          tabIndex={-1}
          data-desplazable=""
          className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-fondo p-4 md:p-6 outline-none flex flex-col"
        >
          <div className="w-full flex-1 flex flex-col min-h-0">
            <UserRequestsTable />
          </div>
        </main>

        {modalResponsiva}
      </div>
    );
  }

  // Opción B: Workspace con barra lateral
  return (
    <>
      <PlatformsSidebarView mias={mias} seccionInicial="solicitudes" />
      {modalResponsiva}
    </>
  );
}

export default function Page() {
  return (
    <SessionProvider>
      <RequestsPageContent />
    </SessionProvider>
  );
}
