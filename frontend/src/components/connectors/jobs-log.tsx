'use client';

/**
 * Bitácora de ejecuciones de aprovisionamiento (DIS-022, F-CON-01;
 * `GET /provisioning/jobs`, contrato `conectores-y-ejecuciones.md` 1.1).
 *
 * - Alcance: el superadmin ve todo y el admin sus áreas (lo decide el backend).
 * - Filtros a la página 1; paginación con `ListPager`.
 * - Refresco con `usePolling` (ADR-006) solo mientras la página tenga
 *   ejecuciones transitorias (contrato, "Refresco"); "Recargar" siempre.
 * - Reintentar: superadmin y ejecución fallida, con confirmación; la fila se
 *   actualiza con la respuesta y el resultado se avisa con toast (DIS-091).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { provisioningApi } from '@/lib/access/provisioning';
import type { Job, JobDetail } from '@/lib/access/types';
import { usePolling } from '@/lib/use-polling';
import { ListPager } from '../access/list-pager';
import { listLoadError } from '../access/request-errors';
import { useOpcionesAlcance } from '../access/scope-filters';
import { Button } from '../form';
import { Icono } from '../icono';
import { useSession } from '../session-provider';
import { useToast } from '../toast';
import { ErrorNote, PremiumEmptyState, Spinner } from '../ui';
import { hayTransitorios } from './job-catalog';
import { JobDetailModal } from './job-detail-modal';
import { JobRetryDialog } from './job-retry-dialog';
import {
  FILTROS_EJECUCIONES_INICIALES, FILTRO_ESTADO_ID, type FiltrosEjecuciones, JobsFilters,
  hayFiltrosEjecuciones, parametrosEjecuciones,
} from './jobs-filters';
import { JobsTable, detalleId } from './jobs-table';

const NOMBRE_LISTA = 'las ejecuciones';
export const VACIO_EJECUCIONES = 'Todavía no hay ejecuciones en tu alcance.';
export const VACIO_EJECUCIONES_FILTROS = 'Ninguna ejecución coincide con los filtros.';

export function avisoReintento(job: Job): string {
  const userName = job.user?.name ?? 'el usuario';
  const platformName = job.platform?.name ?? 'la plataforma';
  return `Reintento en curso: ejecución n.º ${job.id} de ${userName} en ${platformName}.`;
}

export function JobsLog() {
  const { session } = useSession();
  const esSuperadmin = session?.permissions.is_admin ?? false;
  const alcance = useOpcionesAlcance();

  const [filtros, setFiltros] = useState<FiltrosEjecuciones>(FILTROS_EJECUCIONES_INICIALES);
  const [page, setPage] = useState(1);
  const [transitorios, setTransitorios] = useState(true);
  /** Ejecuciones reintentadas aquí, con la respuesta del servidor (por `id`). */
  const [reintentadas, setReintentadas] = useState<Record<number, Job>>({});
  const [detalle, setDetalle] = useState<Job | null>(null);
  const [reintentando, setReintentando] = useState<Job | null>(null);
  const disparador = useRef<string | null>(null);
  const { avisar } = useToast();

  const parametros = parametrosEjecuciones(filtros, page);
  const clave = JSON.stringify(parametros);
  const lista = usePolling(
    () => provisioningApi.jobs(parametros)
      .then((r) => {
        setTransitorios(hayTransitorios(r.items));
        setReintentadas({});
        return r;
      })
      .catch((err: unknown) => { throw listLoadError(err, NOMBRE_LISTA); }),
    { intervalSeconds: session?.preferences.refresh_interval, deps: [clave], activo: transitorios },
  );

  const items = useMemo(
    () => (lista.data?.items ?? []).map((job) => reintentadas[job.id] ?? job),
    [lista.data, reintentadas],
  );

  function cambiar(cambio: Partial<FiltrosEjecuciones>) {
    setFiltros((prev) => ({ ...prev, ...cambio }));
    setPage(1);
  }

  /** Foco de vuelta al botón que abrió el diálogo; si ya no existe, al filtro. */
  const devolverFoco = useCallback(() => {
    const id = disparador.current;
    const boton = id ? document.getElementById(id) : null;
    (boton ?? document.getElementById(FILTRO_ESTADO_ID))?.focus();
  }, []);

  const cerrarDetalle = useCallback(() => {
    setDetalle(null);
    devolverFoco();
  }, [devolverFoco]);

  const cerrarReintento = useCallback(() => {
    setReintentando(null);
    devolverFoco();
  }, [devolverFoco]);

  function abrirDetalle(job: Job) {
    disparador.current = detalleId(job.id);
    setDetalle(job);
  }

  function abrirReintento(job: Job) {
    // El botón "Reintentar" desaparece al reintentar: el foco vuelve a "Detalle".
    disparador.current = detalleId(job.id);
    setReintentando(job);
  }

  function reintentada(job: JobDetail) {
    setReintentadas((prev) => ({ ...prev, [job.id]: job }));
    setReintentando(null);
    setTransitorios(true);
    avisar('success', avisoReintento(job), 'Reintento');
    // "Reintentar" desaparece de la fila: el foco vuelve a "Detalle" (o al filtro).
    requestAnimationFrame(devolverFoco);
  }

  const data = lista.data;
  // "Recargando…" solo tras pulsar "Recargar": el refresco automático no se anuncia.
  const [recargaManual, setRecargaManual] = useState(false);
  useEffect(() => {
    if (!lista.loading) setRecargaManual(false);
  }, [lista.loading]);
  const recargando = recargaManual && lista.loading && data !== null;

  function recargar() {
    if (lista.loading) return;
    setRecargaManual(true);
    lista.refresh();
  }

  return (
    <section aria-labelledby="ejecuciones-titulo" className="flex h-full w-full flex-col gap-4 min-h-0">
      {/* Grid de 1 columna y 2 filas (10/90): Fila 1 contenedor con botones, Fila 2 tabla al 100% */}
      <div className="grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-4">
        {/* Fila 1 (N columnas, 1 fila): Barra de botones estandarizada */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
          {/* A LA IZQUIERDA: Filtros tipo barra de botones */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="ejecuciones-titulo" className="sr-only">
              Bitácora de ejecuciones
            </h2>
            <JobsFilters filtros={filtros} alcance={alcance} onChange={cambiar} />
            {data ? (
              <span
                className="text-xs font-bold text-label whitespace-nowrap bg-panel-border/30 px-2.5 py-1 rounded-lg border border-panel-border/60"
                aria-live="polite"
              >
                {recargando
                  ? 'Recargando…'
                  : `${data.total} ${data.total === 1 ? 'ejecución' : 'ejecuciones'}`}
              </span>
            ) : null}
          </div>

          {/* A LA DERECHA: Botones de acción */}
          <div className="flex flex-wrap items-center gap-2">
            {hayFiltrosEjecuciones(filtros) ? (
              <Button
                variant="fila"
                onClick={() => {
                  setFiltros(FILTROS_EJECUCIONES_INICIALES);
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
              className="nx-btn-toolbar !px-2.5 aria-disabled:opacity-deshabilitada focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
            >
              <Icono nombre="actividad" tamano="sm" ariaHidden={true} />
              <span>Recargar</span>
            </Button>
          </div>
        </div>

        {/* Fila 2: La tabla ocupa el 100% de la altura disponible de forma responsiva */}
        <div className="flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden">
          {lista.loading && !data ? <Spinner label="Cargando las ejecuciones…" /> : null}

          {lista.error ? (
            <div className="space-y-3">
              <ErrorNote message={lista.error} />
              <Button variant="secondary" onClick={lista.refresh}>Reintentar</Button>
            </div>
          ) : null}

          {data ? (
            items.length === 0 ? (
              <div role="status" className="flex-1 h-full min-h-0 flex flex-col">
                <PremiumEmptyState
                  icono="ejecuciones"
                  badge={hayFiltrosEjecuciones(filtros) ? 'Filtros activos' : 'Sin ejecuciones'}
                  title={hayFiltrosEjecuciones(filtros) ? 'Sin resultados para la búsqueda' : 'Bitácora sin actividad'}
                  message={hayFiltrosEjecuciones(filtros) ? VACIO_EJECUCIONES_FILTROS : VACIO_EJECUCIONES}
                  className="flex-1 h-full min-h-72"
                  action={
                    hayFiltrosEjecuciones(filtros) ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setFiltros(FILTROS_EJECUCIONES_INICIALES);
                          setPage(1);
                        }}
                      >
                        Restablecer filtros
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={recargar}>
                        Recargar lista
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 h-full w-full overflow-y-auto">
                <JobsTable
                  items={items}
                  esSuperadmin={esSuperadmin}
                  onDetalle={abrirDetalle}
                  onReintentar={abrirReintento}
                  minRows={8}
                  footer={
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-xs font-semibold text-label">
                        Total: {data.total} {data.total === 1 ? 'ejecución' : 'ejecuciones'}
                      </p>
                      <ListPager
                        page={data.page}
                        perPage={data.per_page}
                        total={data.total}
                        label="Páginas de la bitácora de ejecuciones"
                        onChange={setPage}
                      />
                    </div>
                  }
                />
              </div>
            )
          ) : null}
        </div>
      </div>

      {detalle ? <JobDetailModal job={detalle} onClose={cerrarDetalle} /> : null}

      {reintentando ? (
        <JobRetryDialog
          job={reintentando}
          onClose={cerrarReintento}
          onRetried={reintentada}
          onStale={lista.refresh}
        />
      ) : null}
    </section>
  );
}
