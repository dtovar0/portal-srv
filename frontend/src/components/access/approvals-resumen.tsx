'use client';

/**
 * Resumen de Solicitudes (DIS-131), con el esquema del dashboard: fila de tarjetas por estado
 * (con «Abrir» a la tabla de cada estado), gráficas por área y por plataforma (3/5) y dona del
 * porcentaje por estado (2/5). Datos de `GET /access-requests/inbox/stats` con `usePolling` y el
 * intervalo de preferencia. La tabla de cada estado es `ApprovalsInbox` (otra sección de la URL).
 */

import type { InboxStats, RequestStatus } from '@/lib/access/types';
import { requestsApi } from '@/lib/access/requests';
import { usePolling } from '@/lib/use-polling';
import { useDisenoTarjetas } from '../dashboard/use-diseno-tarjetas';
import { GraficaBarras } from '../dashboard/grafica-barras';
import { TarjetaIndicador } from '../dashboard/tarjeta-indicador';
import type { ClaveIndicador } from '@/lib/types';
import { Button, ButtonLink } from '../form';
import { useSession } from '../session-provider';
import { ErrorNote, Skeleton } from '../ui';
import { DonaEstados } from './dona-estados';
import { rutaConFiltro } from './filtro-url';
import { listLoadError } from './request-errors';

const NOMBRE_RESUMEN = 'el resumen de solicitudes';
/** Máximo de barras por gráfica (el backend no limita; la web recorta). */
export const MAX_BARRAS = 10;
export const RUTA_SOLICITUDES = '/approvals';

const TARJETAS: { estado: RequestStatus; indicador: ClaveIndicador; abrir: string }[] = [
  { estado: 'pendiente', indicador: 'pendientes', abrir: 'Abrir solicitudes pendientes' },
  { estado: 'aprobada', indicador: 'aprobadas', abrir: 'Abrir solicitudes aprobadas' },
  { estado: 'rechazada', indicador: 'rechazadas', abrir: 'Abrir solicitudes rechazadas' },
];

function Contenido({ stats }: { stats: InboxStats }) {
  const diseno = useDisenoTarjetas();
  const porArea = stats.by_area.slice(0, MAX_BARRAS).map((fila) => (
    { id: fila.area_id, etiqueta: fila.area, cantidad: fila.count }));
  const porPlataforma = stats.by_platform.slice(0, MAX_BARRAS).map((fila) => (
    { id: fila.platform_id, etiqueta: fila.platform, cantidad: fila.count }));

  return (
    <section aria-label="Resumen de solicitudes" className="flex flex-col gap-4">
      <h2 className="sr-only">Resumen de solicitudes</h2>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {TARJETAS.map(({ estado, indicador, abrir }) => {
          const cantidad = stats.by_status[estado] ?? 0;
          return (
            <TarjetaIndicador
              key={estado}
              indicador={indicador}
              valor={cantidad}
              base={stats.total}
              desglose={{ parte: cantidad, resto: stats.total - cantidad }}
              diseno={diseno}
              accion={(
                <ButtonLink
                  href={rutaConFiltro(RUTA_SOLICITUDES, { status: estado })}
                  variant="secondary"
                  aria-label={abrir}
                  className="min-h-9 px-4 text-xs font-semibold"
                >
                  Abrir
                </ButtonLink>
              )}
            />
          );
        })}
      </div>

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <GraficaBarras
            titulo="Solicitudes por área"
            subtitulo={`Las ${MAX_BARRAS} áreas con más solicitudes`}
            icono="areas"
            serie="Solicitudes"
            columna="Área"
            filas={porArea}
            vacioTitulo="Sin solicitudes por área"
            vacioMensaje="Aún no hay solicitudes en las áreas de tu alcance."
          />
          <GraficaBarras
            titulo="Solicitudes por plataforma"
            subtitulo={`Las ${MAX_BARRAS} plataformas con más solicitudes`}
            icono="plataformas"
            serie="Solicitudes"
            columna="Plataforma"
            filas={porPlataforma}
            vacioTitulo="Sin solicitudes por plataforma"
            vacioMensaje="Aún no hay solicitudes para las plataformas de tu alcance."
            alterna
          />
        </div>
        <div className="lg:col-span-2">
          <DonaEstados stats={stats} />
        </div>
      </div>
    </section>
  );
}

export function ApprovalsResumen() {
  const { session } = useSession();
  const resumen = usePolling(
    () => requestsApi.inboxStats().catch((err: unknown) => {
      throw listLoadError(err, NOMBRE_RESUMEN);
    }),
    { intervalSeconds: session?.preferences.refresh_interval },
  );

  if (resumen.data) return <Contenido stats={resumen.data} />;
  if (resumen.error) {
    return (
      <div className="space-y-3">
        <ErrorNote message={resumen.error} />
        <Button variant="secondary" onClick={resumen.refresh}>Reintentar</Button>
      </div>
    );
  }
  return <Skeleton variant="tarjeta" count={3} ariaLabel="Cargando el resumen de solicitudes…" />;
}
