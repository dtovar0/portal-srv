'use client';

/**
 * Marco de administración con sesión (DIS-078): barra lateral colapsable, barra superior y área
 * de contenido. Junta el estado compartido (menú colapsado, tema, indicadores) y lo reparte;
 * cada pieza vive en su archivo. Sin buscador global (DIS-101, pedido del dueño).
 */

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { MobileMenu } from '../mobile-menu';
import { useTema } from '../use-tema';
import { useMenuColapsado } from '@/lib/use-menu-colapsado';
import type { Session } from '@/lib/types';
import { BarraLateral } from './barra-lateral';
import { BarraSuperior } from './barra-superior';
import { MenuUsuario } from './menu-usuario';
import { NavPrincipal } from './nav-principal';
import { useIndicadores } from './use-indicadores';

export function Marco({ session, children }: { session: Session; children: React.ReactNode }) {
  const pathname = usePathname();
  const { colapsado: colapsada, alternar } = useMenuColapsado();
  const { oscuro, alternar: alternarTema } = useTema();
  const esAdmin = session.permissions.is_admin || session.permissions.is_area_admin;
  const { noLeidas, pendientes } = useIndicadores({ esAdmin, ruta: pathname });
  const contadores = useMemo(() => ({ '/approvals': pendientes }), [pendientes]);

  return (
    // DIS-044: el marco ocupa la ventana; se desplazan el `<main>` y, si no cabe, la barra lateral.
    <div className="flex h-dvh">
      {/* Primer elemento tabulable: oculto fuera de pantalla hasta recibir foco. */}
      <a
        href="#contenido"
        className="fixed left-4 top-4 z-50 inline-flex min-h-11 -translate-y-20 items-center rounded-control bg-accion px-4 text-sm font-semibold text-texto-sobre-accion outline-none focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Saltar al contenido
      </a>
      <BarraLateral
        colapsada={colapsada}
        contadores={contadores}
        session={session}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <BarraSuperior
          menuMovil={
            <MobileMenu>
              {(close) => (
                <>
                  <NavPrincipal onNavigate={close} contadores={contadores} enBarraLateral={false} />
                  {/* Pie del cajón: la tarjeta de usuario queda a la vista aunque la lista se desplace. */}
                  <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex border-t border-borde bg-panel-fill p-3">
                    <MenuUsuario session={session} enBarraLateral={false} />
                  </div>
                </>
              )}
            </MobileMenu>
          }
          colapsada={colapsada}
          onAlternarMenu={alternar}
          oscuro={oscuro}
          onAlternarTema={() => { void alternarTema(); }}
          noLeidas={noLeidas}
        />

        {/* Contenedor que se desplaza (`useScrollLock` lo bloquea) y destino alterno del foco
            al cerrar un diálogo cuyo disparador ya no existe (`tabIndex={-1}`, DIS-031). */}
        <main
          id="contenido"
          tabIndex={-1}
          data-desplazable=""
          className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-fondo p-6 outline-none flex flex-col"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
