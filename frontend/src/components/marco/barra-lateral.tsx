'use client';

/**
 * Barra lateral de escritorio (DIS-078): logo y nombre, navegación por secciones y, al pie, solo el
 * menú de usuario (DIS-080); no tiene botón de colapsar (DIS-081): se colapsa con el ☰ de la barra
 * superior. 264 px expandida y 76 px colapsada (tokens `--marco-lateral-*`);
 * el ancho solo depende del estado, así que nada salta al cargar. Bajo `md` no se muestra:
 * el cajón móvil la sustituye.
 */

import type { Session } from '@/lib/types';
import { MenuUsuario } from './menu-usuario';
import { NavPrincipal } from './nav-principal';
import { APP_TITLE } from '@/lib/branding';

/** `id` del `<aside>`: lo referencia el ☰ de la barra superior (`aria-controls`). */
export const ID_BARRA_LATERAL = 'barra-lateral';

export function BarraLateral({
  colapsada,
  contadores,
  session,
}: {
  colapsada: boolean;
  contadores?: Readonly<Record<string, number>>;
  session: Session;
}) {
  return (
    <aside
      id={ID_BARRA_LATERAL}
      aria-label="Menú lateral"
      data-colapsada={colapsada}
      className={`hidden shrink-0 flex-col border-r border-barra-lateral-borde bg-barra-lateral transition-[width] duration-media motion-reduce:transition-none md:flex ${
        colapsada ? 'w-lateral-colapsada' : 'w-lateral'
      }`}
    >
      <div className="flex h-barra-superior shrink-0 items-center gap-3 border-b border-barra-lateral-borde px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie shadow-xs p-1 transition-colors">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/isotype-aduana.png" alt={APP_TITLE} className="size-7 object-contain" width={28} height={28} />
        </span>
        {colapsada ? null : (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-bold leading-tight text-barra-lateral-texto">{APP_TITLE}</span>
            <span className="truncate text-xs text-barra-lateral-secundario">Control Centralizado</span>
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <NavPrincipal colapsada={colapsada} contadores={contadores} />
      </div>

      <div
        className={`flex shrink-0 items-center border-t border-barra-lateral-borde p-3 ${colapsada ? 'justify-center' : ''}`}
      >
        <MenuUsuario session={session} colapsada={colapsada} />
      </div>
    </aside>
  );
}
