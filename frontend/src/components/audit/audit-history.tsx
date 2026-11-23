'use client';

/**
 * Lista de auditoría con filtros, paginación y detalle (DIS-020; F-AUD-01,
 * F-AUD-03, F-AUD-04; contrato `auditoria.md`). La usan la pantalla general
 * (`GET /audit`) y los historiales por usuario y por plataforma.
 *
 * - El backend decide el alcance (superadmin todo; admin sus áreas; usuario lo suyo).
 * - Cualquier cambio de filtro vuelve a la página 1.
 * - Sin refresco periódico (contrato, "Refresco"): botón "Recargar".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import type { AuditEntryV1, AuditParams, Paginated } from '@/lib/access/types';
import { useAsync } from '@/lib/use-async';
import { ListPager } from '../access/list-pager';
import { listLoadError } from '../access/request-errors';
import { useOpcionesAlcance } from '../access/scope-filters';
import { Button } from '../form';
import { Icono } from '../icono';
import { useSession } from '../session-provider';
import { EmptyNote, ErrorNote, Spinner } from '../ui';
import { AuditDetailModal } from './audit-detail-modal';
import {
  AuditFilters,
  FILTROS_INICIALES,
  type FiltrosAuditoria,
  aParametros,
  hayFiltros,
} from './audit-filters';
import { AuditTable } from './audit-table';

const NOMBRE_LISTA = 'los registros de auditoría';

export const VACIO_SIN_FILTROS = 'No hay registros dentro de tu alcance.';
export const VACIO_CON_FILTROS = 'Ningún registro coincide con los filtros.';

/** `404` del historial: el usuario o la plataforma no existe o está fuera del alcance. */
export const MENSAJE_NO_ENCONTRADO = 'No existe o está fuera de tu alcance.';

/** Error de carga en español, sin detalles del servidor. */
export function errorDeCarga(err: unknown): Error {
  if (err instanceof ApiError && err.status === 404) {
    return new ApiError(404, MENSAJE_NO_ENCONTRADO);
  }
  return listLoadError(err, NOMBRE_LISTA);
}

export function AuditHistory({
  cargar,
  conAlcance = true,
  onDatos,
}: {
  /** Endpoint del contrato con los parámetros ya armados. */
  cargar: (params: AuditParams) => Promise<Paginated<AuditEntryV1>>;
  /**
   * Filtros de área y plataforma para quien administra. `false` en el
   * historial de una plataforma (ya está fijada).
   */
  conAlcance?: boolean;
  /** Cada página recibida (p. ej. para nombrar al usuario o la plataforma del historial). */
  onDatos?: (items: AuditEntryV1[]) => void;
}) {
  const { session } = useSession();
  const administra = Boolean(session?.permissions.is_admin || session?.permissions.is_area_admin);
  const mostrarAlcance = conAlcance && administra;

  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_INICIALES);
  const [page, setPage] = useState(1);
  const [detalle, setDetalle] = useState<AuditEntryV1 | null>(null);
  const origen = useRef<HTMLButtonElement | null>(null);

  const parametros = aParametros(filtros, page);
  const clave = JSON.stringify(parametros);
  const lista = useAsync(
    () => cargar(parametros).catch((err: unknown) => {
      throw errorDeCarga(err);
    }),
    [clave],
  );

  const opciones = useOpcionesAlcance(mostrarAlcance);

  function cambiar(cambio: Partial<FiltrosAuditoria>) {
    setFiltros((prev) => ({ ...prev, ...cambio }));
    setPage(1);
  }

  function abrir(entry: AuditEntryV1, boton: HTMLButtonElement) {
    origen.current = boton;
    setDetalle(entry);
  }

  // Al cerrar, el foco vuelve al botón "Ver detalle" de la fila.
  const cerrar = useCallback(() => {
    setDetalle(null);
    const boton = origen.current;
    origen.current = null;
    if (boton) requestAnimationFrame(() => boton.focus());
  }, []);

  const data = lista.data;
  useEffect(() => {
    if (data) onDatos?.(data.items);
  }, [data, onDatos]);
  const recargando = lista.loading && data !== null;

  /** Mientras carga se ignora el clic. */
  function recargar() {
    if (!lista.loading) lista.reload();
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 min-h-0">
      {/* Grid de 1 columna y 2 filas (10/90): Fila 1 contenedor con botones, Fila 2 tabla al 100% */}
      <div className="grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-4">
        {/* Fila 1 (N columnas, 1 fila): Barra de botones estandarizada */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
          <h2 className="sr-only">Filtros de auditoría</h2>
          <AuditFilters
            filtros={filtros}
            opciones={opciones}
            conAlcance={mostrarAlcance}
            onChange={cambiar}
            badge={
              data ? (
                <span
                  className="text-xs font-bold text-body-text whitespace-nowrap bg-panel-border/30 px-2.5 py-1 rounded-lg border border-panel-border/60"
                  aria-live="polite"
                >
                  {recargando
                    ? 'Recargando…'
                    : `${data.total} ${data.total === 1 ? 'registro' : 'registros'}`}
                </span>
              ) : null
            }
            acciones={
              <>
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
              </>
            }
          />
        </div>

        {/* Fila 2: La tabla ocupa el 100% de la altura disponible de forma responsiva */}
        <div className="flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden">
          {lista.loading && !data ? <Spinner label="Cargando la auditoría…" /> : null}

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

          {data && !lista.error ? (
            data.items.length === 0 ? (
              <div role="status" className="flex-1 h-full min-h-0 flex flex-col">
                <EmptyNote
                  message={hayFiltros(filtros) ? VACIO_CON_FILTROS : VACIO_SIN_FILTROS}
                  className="flex-1 h-full min-h-72"
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 h-full w-full overflow-y-auto flex flex-col justify-between">
                <AuditTable items={data.items} onDetalle={abrir} />
                <div className="pt-3">
                  <ListPager
                    page={data.page}
                    perPage={data.per_page}
                    total={data.total}
                    label="Páginas de la auditoría"
                    onChange={setPage}
                  />
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>

      {detalle ? <AuditDetailModal entry={detalle} onClose={cerrar} /> : null}
    </div>
  );
}
