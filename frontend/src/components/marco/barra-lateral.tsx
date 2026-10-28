'use client';

/**
 * Barra lateral de escritorio (DIS-078): logo y nombre, navegación por secciones y botón
 * «Colapsar menú» abajo. 264 px expandida y 76 px colapsada (tokens `--marco-lateral-*`);
 * el ancho solo depende del estado, así que nada salta al cargar. Bajo `md` no se muestra:
 * el cajón móvil la sustituye.
 */

import { Icono } from '../icono';
import { NavPrincipal } from './nav-principal';

export function BarraLateral({
  colapsada,
  onAlternar,
  contadores,
}: {
  colapsada: boolean;
  onAlternar: () => void;
  contadores?: Readonly<Record<string, number>>;
}) {
  const etiqueta = colapsada ? 'Expandir menú' : 'Colapsar menú';
  return (
    <aside
      aria-label="Menú lateral"
      data-colapsada={colapsada}
      className={`hidden shrink-0 flex-col border-r border-borde bg-barra-lateral transition-[width] duration-media motion-reduce:transition-none md:flex ${
        colapsada ? 'w-lateral-colapsada' : 'w-lateral'
      }`}
    >
      <div className="flex h-barra-superior shrink-0 items-center gap-3 border-b border-borde px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-base bg-accion text-texto-sobre-accion">
          <Icono nombre="escudo-ok" />
        </span>
        {colapsada ? null : (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-bold leading-tight text-body-text">Nexus</span>
            <span className="truncate text-xs text-texto-secundario">Portal de accesos</span>
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <NavPrincipal colapsada={colapsada} contadores={contadores} />
      </div>

      <div className="shrink-0 border-t border-borde p-3">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={!colapsada}
          aria-label={etiqueta}
          title={colapsada ? etiqueta : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-control border border-borde bg-superficie px-3.5 text-sm font-medium text-navegacion outline-none transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary ${
            colapsada ? 'justify-center' : ''
          }`}
        >
          <Icono nombre="colapsar" className={colapsada ? 'rotate-180' : ''} />
          {colapsada ? null : <span>Colapsar menú</span>}
        </button>
      </div>
    </aside>
  );
}
