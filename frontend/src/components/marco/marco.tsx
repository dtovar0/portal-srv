'use client';

/**
 * Marco de administración con sesión (DIS-078): barra lateral colapsable, barra superior y área
 * de contenido. Junta el estado compartido (menú colapsado, tema, indicadores, comandos del
 * buscador) y lo reparte; cada pieza vive en su archivo.
 */

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { MobileMenu } from '../mobile-menu';
import { useTema } from '../use-tema';
import { useMenuColapsado } from '@/lib/use-menu-colapsado';
import type { Session } from '@/lib/types';
import { BarraLateral } from './barra-lateral';
import { BarraSuperior } from './barra-superior';
import { comandosDePantallas, type Comando } from './comandos';
import { entradasVisibles } from './nav-items';
import { NavPrincipal } from './nav-principal';
import { useIndicadores } from './use-indicadores';

export function Marco({ session, children }: { session: Session; children: React.ReactNode }) {
  const pathname = usePathname();
  const { colapsado: colapsada, alternar } = useMenuColapsado();
  const { tema, oscuro, elegir, alternar: alternarTema } = useTema();
  const esAdmin = session.permissions.is_admin || session.permissions.is_area_admin;
  const { noLeidas, pendientes } = useIndicadores({ esAdmin, ruta: pathname });
  const contadores = useMemo(() => ({ '/approvals': pendientes }), [pendientes]);

  const comandos = useMemo<Comando[]>(() => [
    ...comandosDePantallas(entradasVisibles(session.permissions)),
    { id: 'accion:tema', etiqueta: oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro', tipo: 'Acción', icono: oscuro ? 'sol' : 'luna', palabras: 'tema claro oscuro', accion: () => { void alternarTema(); } },
    { id: 'accion:menu', etiqueta: colapsada ? 'Expandir menú lateral' : 'Colapsar menú lateral', tipo: 'Acción', icono: 'colapsar', palabras: 'barra lateral', accion: alternar },
    { id: 'accion:salir', etiqueta: 'Cerrar sesión', tipo: 'Acción', icono: 'cerrar', palabras: 'salir', href: '/logout' },
  ], [session.permissions, oscuro, colapsada, alternarTema, alternar]);

  return (
    // DIS-044: el marco ocupa la ventana; se desplazan el `<main>` y, si no cabe, la barra lateral.
    <div className="flex h-dvh">
      <BarraLateral colapsada={colapsada} onAlternar={alternar} contadores={contadores} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <BarraSuperior
          session={session}
          menuMovil={<MobileMenu>{(close) => <NavPrincipal onNavigate={close} contadores={contadores} />}</MobileMenu>}
          colapsada={colapsada}
          onAlternarMenu={alternar}
          comandos={comandos}
          oscuro={oscuro}
          segunSistema={tema === 'sistema'}
          onAlternarTema={() => { void alternarTema(); }}
          onTemaSistema={() => { void elegir('sistema'); }}
          noLeidas={noLeidas}
        />

        {/* Contenedor que se desplaza (`useScrollLock` lo bloquea) y destino alterno del foco
            al cerrar un diálogo cuyo disparador ya no existe (`tabIndex={-1}`, DIS-031). */}
        <main
          tabIndex={-1}
          data-desplazable=""
          className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
