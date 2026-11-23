'use client';

/**
 * Inventario de permisos (DIS-021, F-AUD-02, F-AUD-04; `GET /access/inventory`,
 * contrato `accesos.md` 1.1).
 *
 * - Admin de área: sus áreas; superadmin: todo (lo decide el backend).
 * - Filtros: área (las administradas; el superadmin, `GET /areas`), plataforma,
 *   nivel, origen, estado (`vigente` por defecto) y nombre o correo.
 *   Cualquier cambio de filtro vuelve a la página 1.
 * - Sin refresco periódico (contrato, "Refresco"): botón "Recargar".
 */

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { inventoryApi } from '@/lib/access/inventory';
import type { InventoryParams } from '@/lib/access/types';
import { useAsync } from '@/lib/use-async';
import { rutaHistorialPlataforma } from '../audit/audit-routes';
import { Button, ButtonLink } from '../form';
import { Icono } from '../icono';
import { valorPermitido } from './filtro-url';
import { EmptyNote, ErrorNote, Skeleton } from '../ui';
import {
  FILTROS_INICIALES,
  type FiltrosInventario,
  InventoryFilters,
  hayFiltros,
} from './inventory-filters';
import { InventoryTable } from './inventory-table';
import { ListPager } from './list-pager';
import { listLoadError } from './request-errors';
import { FILTROS } from './my-access';
import { useOpcionesAlcance } from './scope-filters';

const NOMBRE_LISTA = 'los accesos del inventario';

export const VACIO_SIN_FILTROS = 'No hay accesos vigentes en tu alcance.';
export const VACIO_CON_FILTROS = 'Ningún acceso coincide con los filtros.';

/** Filtros de la pantalla → parámetros del contrato (sin los vacíos). */
export function aParametros(filtros: FiltrosInventario, page: number): InventoryParams {
  return {
    status: filtros.status,
    area_id: filtros.areaId ?? undefined,
    platform_id: filtros.platformId ?? undefined,
    level: filtros.level ?? undefined,
    origin: filtros.origin ?? undefined,
    q: filtros.q || undefined,
    page,
  };
}

export function Inventory() {
  // Estado que llega por la URL (DIS-036); lo inválido se ignora.
  const params = useSearchParams();
  const [filtros, setFiltros] = useState<FiltrosInventario>(() => ({
    ...FILTROS_INICIALES,
    status: valorPermitido(params?.get('status'), FILTROS.map((f) => f.valor)) ?? FILTROS_INICIALES.status,
  }));
  const [page, setPage] = useState(1);

  const parametros = aParametros(filtros, page);
  const clave = JSON.stringify(parametros);
  const lista = useAsync(
    () => inventoryApi.list(parametros).catch((err: unknown) => {
      throw listLoadError(err, NOMBRE_LISTA);
    }),
    [clave],
  );

  // Áreas y plataformas del filtro, según el rol (DIS-020: compartido con Auditoría).
  const opciones = useOpcionesAlcance();
  const plataformaElegida = opciones.plataformas.find((p) => p.id === filtros.platformId);

  function cambiar(cambio: Partial<FiltrosInventario>) {
    setFiltros((prev) => ({ ...prev, ...cambio }));
    setPage(1);
  }

  const data = lista.data;
  const recargando = lista.loading && data !== null;

  /** Mientras carga se ignora el clic. */
  function recargar() {
    if (!lista.loading) lista.reload();
  }

  return (
    <section aria-labelledby="inventario-titulo" className="flex h-full w-full flex-col gap-4 min-h-0">
      {/* Grid de 1 columna y 2 filas (10/90): Fila 1 contenedor con botones, Fila 2 tabla al 100% */}
      <div className="grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-4">
        {/* Fila 1 (N columnas, 1 fila): Barra de botones estandarizada */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
          {/* A LA IZQUIERDA: Filtros tipo barra de botones + total */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="inventario-titulo" className="sr-only">
              Inventario de accesos
            </h2>
            <InventoryFilters filtros={filtros} opciones={opciones} onChange={cambiar} />
            {data ? (
              <span
                className="text-xs font-bold text-body-text whitespace-nowrap bg-panel-border/30 px-2.5 py-1 rounded-lg border border-panel-border/60"
                aria-live="polite"
              >
                {recargando
                  ? 'Recargando…'
                  : `${data.total} ${data.total === 1 ? 'acceso' : 'accesos'}`}
              </span>
            ) : null}
          </div>

          {/* A LA DERECHA: Botones de acción */}
          <div className="flex flex-wrap items-center gap-2">
            {/* DIS-020: con una plataforma elegida, su historial en Auditoría. */}
            {plataformaElegida ? (
              <ButtonLink
                href={rutaHistorialPlataforma(plataformaElegida.id)}
                variant="fila"
                aria-label={`Historial de ${plataformaElegida.name} en Auditoría`}
                className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
              >
                <Icono nombre="auditoria" tamano="sm" ariaHidden={true} />
                <span>Historial</span>
              </ButtonLink>
            ) : null}

            {hayFiltros(filtros) ? (
              <Button
                variant="fila"
                onClick={() => {
                  setFiltros(FILTROS_INICIALES);
                  setPage(1);
                }}
                aria-label="Restablecer filtros"
                title="Restablecer filtros"
                className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
              >
                <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
                <span>Limpiar</span>
              </Button>
            ) : null}

            <div className="h-6 w-px bg-panel-border/80 self-center mx-1 shrink-0" aria-hidden="true" />

            <Button
              variant="fila"
              onClick={recargar}
              aria-disabled={lista.loading || undefined}
              className="nx-btn-toolbar !px-2.5 aria-disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
            >
              <Icono nombre="actividad" tamano="sm" ariaHidden={true} />
              <span>Recargar</span>
            </Button>
          </div>
        </div>

        {/* Fila 2: La tabla ocupa el 100% de la altura disponible de forma responsiva */}
        <div className="flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden">
          {lista.loading && !data ? (
            <Skeleton variant="fila" count={5} ariaLabel="Cargando el inventario…" />
          ) : null}

          {lista.error ? (
            <div className="space-y-3">
              <ErrorNote message={lista.error} />
              <Button
                variant="fila"
                onClick={lista.reload}
                className="nx-btn-toolbar !px-2.5"
              >
                <Icono nombre="actividad" tamano="sm" ariaHidden={true} />
                <span>Reintentar</span>
              </Button>
            </div>
          ) : null}

          {data ? (
            data.items.length === 0 ? (
              // Anunciado: el vacío suele llegar tras cambiar un filtro.
              <div role="status" className="flex-1 h-full min-h-0 flex flex-col">
                <EmptyNote
                  message={hayFiltros(filtros) ? VACIO_CON_FILTROS : VACIO_SIN_FILTROS}
                  className="flex-1 h-full min-h-72"
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 h-full w-full overflow-y-auto flex flex-col justify-between">
                <InventoryTable items={data.items} />
                <div className="pt-3">
                  <ListPager
                    page={data.page}
                    perPage={data.per_page}
                    total={data.total}
                    label="Páginas del inventario"
                    onChange={setPage}
                  />
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}
