'use client';

/**
 * Panel: resumen por rol (DIS-024) encima de la actividad del portal (`/stats`):
 * visitas, gráfica de plataformas por área con tabla alternativa (DIS-003) y
 * más visitadas. Áreas y Plataformas solo se repiten a quien no tiene resumen
 * de totales (DIS-037).
 */

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { homeApi } from '@/lib/access/home';
import type { HomeSummary } from '@/lib/access/types';
import type { Stats } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { useTokenColors } from '@/lib/use-token-colors';
import { ActividadReciente } from './home/actividad-reciente';
import { useSession } from './session-provider';
import { Card, ErrorNote, PanelHeader, PremiumEmptyState, RegionDeAviso, Skeleton, StatTile } from './ui';
import { DataTable } from './data-table';
import { PageHeader } from './page-header';

export function Dashboard() {
  const { session } = useSession();
  const { data: stats, loading, error } = useAsync(() => api.stats(), []);
  const { data: resumen } = useAsync(() => homeApi.summary().catch(() => null), []);
  const administra = Boolean(session?.permissions.is_admin || session?.permissions.is_area_admin);

  return (
    <div className="flex h-full w-full flex-col gap-4 min-h-0">
      <PageHeader title="Dashboard" />

      {error ? (
        <RegionDeAviso minHeight="min-h-0" className="shrink-0">
          <ErrorNote message={error} />
        </RegionDeAviso>
      ) : null}

      {loading ? (
        <Skeleton variant="tarjeta" count={5} ariaLabel="Cargando estadísticas…" />
      ) : stats ? (
        <Estadisticas stats={stats} administra={administra} resumen={resumen} />
      ) : null}
    </div>
  );
}

/** Tokens de la gráfica (DIS-003): todos de tema, medidos en `pares-contraste.ts`. */
const TOKENS_GRAFICA = {
  serie: '--color-primary',
  serieVisitas: '--color-primary-text',
  eje: '--color-label-text',
  rejilla: '--color-panel-border',
  fondo: '--color-panel-fill',
  texto: '--color-body-text',
};

/** Contadores, gráfica, más visitadas y actividad en cuadrícula armónica responsiva de 2 filas. */
function Estadisticas({
  stats,
  administra,
  resumen,
}: {
  stats: Stats;
  administra: boolean;
  resumen?: HomeSummary | null;
}) {
  const { loading: cargandoSesion } = useSession();
  const colores = useTokenColors(TOKENS_GRAFICA);
  const byArea = stats.platforms_by_area.filter((row) => row.count > 0);
  const verAreasYPlataformas = !cargandoSesion;

  // Contador de solicitudes: desde stats.requests o desde el resumen de inicio
  const solicitudes = stats.requests ?? (
    resumen?.pending_approvals ?? (
      resumen?.my_requests
        ? Object.values(resumen.my_requests).reduce((acc, n) => acc + n, 0)
        : 0
    )
  );

  return (
    <section aria-label="Actividad del portal" className="flex flex-1 min-h-0 flex-col gap-4">
      <h2 className="sr-only">Actividad del portal</h2>

      {/* Fila 1: Las 5 cards en grid responsivo (shrink-0 para no colapsar) */}
      <div className="grid w-full shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {verAreasYPlataformas ? <StatTile label="Áreas" value={stats.areas} /> : null}
        {verAreasYPlataformas ? <StatTile label="Plataformas" value={stats.platforms} /> : null}
        <StatTile label="Solicitudes" value={solicitudes} />
        <StatTile label="Visitas" value={stats.visits} />
        {stats.users !== undefined ? (
          <StatTile label="Usuarios" value={stats.users} />
        ) : null}
      </div>

      {/* Fila 2: Grid 60/40 de 5 columnas alineado con las cards superiores */}
      <div className="grid w-full flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Primera columna (60%): Grid de 2 filas de gráficas que abarca 3 columnas */}
        <div className={`flex flex-1 min-h-0 flex-col gap-4 ${administra ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
          {/* Fila 1 de Col 1: Gráfica Plataformas por área */}
          <Card className="!p-0 flex flex-1 min-h-0 flex-col overflow-hidden shadow-1 border border-panel-border/80">
            <PanelHeader
              title="Plataformas por área"
              subtitle="Distribución de servicios activos"
              icon="plataformas"
              titleTag="h3"
            />
            {byArea.length === 0 ? (
              <PremiumEmptyState
                variant="seamless"
                icono="plataformas"
                title="Sin plataformas por área"
                message="Aún no hay plataformas activas registradas en las áreas del portal."
              />
            ) : (
              <div className="flex flex-1 min-h-0 flex-col p-3">
                <div className="h-full w-full min-h-0 flex-1" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byArea} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPlataformas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colores.serie} stopOpacity={1} />
                            <stop offset="100%" stopColor={colores.serie} stopOpacity={0.65} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.rejilla} vertical={false} />
                        <XAxis
                          dataKey="area"
                          tick={{ fontSize: 12, fill: colores.eje }}
                          stroke={colores.rejilla}
                          interval={0}
                          height={28}
                        />
                        <YAxis
                          allowDecimals={false}
                          width={32}
                          tick={{ fontSize: 12, fill: colores.eje }}
                          stroke={colores.rejilla}
                        />
                        <Tooltip
                          contentStyle={{
                            background: colores.fondo,
                            border: `1px solid ${colores.rejilla}`,
                            borderRadius: '10px',
                            color: colores.texto,
                            boxShadow: 'var(--sombra-1)',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '6px 10px',
                          }}
                          itemStyle={{ color: colores.texto }}
                          labelStyle={{ color: colores.texto }}
                        />
                        <Bar
                          dataKey="count"
                          name="Plataformas"
                          fill="url(#colorPlataformas)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Alternativa textual de la gráfica: los mismos datos (DIS-003, DIS-071). */}
                  <DataTable
                    srOnly
                    label="Plataformas por área"
                    columns={[
                      { key: 'area', header: 'Área', cell: (row) => row.area },
                      { key: 'count', header: 'Plataformas', cell: (row) => row.count },
                    ]}
                    rows={byArea}
                    rowKey={(row) => row.area}
                    emptyMessage="No hay plataformas por área."
                  />
                </div>
              )}
          </Card>

          {/* Fila 2 de Col 1: Más visitadas (Gráfica de plataformas con mayor concurrencia) */}
          <Card className="!p-0 flex flex-1 min-h-0 flex-col overflow-hidden shadow-1 border border-panel-border/80">
            <PanelHeader
              title="Más visitadas"
              subtitle="Plataformas con mayor concurrencia"
              icon="actividad"
              titleTag="h3"
            />
            {stats.most_visited.length === 0 ? (
              <PremiumEmptyState
                variant="seamless"
                icono="actividad"
                title="Sin visitas registradas"
                message="Las plataformas con mayor concurrencia se mostrarán aquí cuando los usuarios comiencen a visitarlas."
              />
            ) : (
              <div className="flex flex-1 min-h-0 flex-col p-3">
                <div className="h-full w-full min-h-0 flex-1" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.most_visited} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colores.serieVisitas || colores.serie} stopOpacity={1} />
                            <stop offset="100%" stopColor={colores.serieVisitas || colores.serie} stopOpacity={0.65} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colores.rejilla} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: colores.eje }}
                          stroke={colores.rejilla}
                          interval={0}
                          height={28}
                        />
                        <YAxis
                          allowDecimals={false}
                          width={32}
                          tick={{ fontSize: 12, fill: colores.eje }}
                          stroke={colores.rejilla}
                        />
                        <Tooltip
                          contentStyle={{
                            background: colores.fondo,
                            border: `1px solid ${colores.rejilla}`,
                            borderRadius: '10px',
                            color: colores.texto,
                            boxShadow: 'var(--sombra-1)',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '6px 10px',
                          }}
                          itemStyle={{ color: colores.texto }}
                          labelStyle={{ color: colores.texto }}
                        />
                        <Bar
                          dataKey="visits"
                          name="Concurrencia"
                          fill="url(#colorVisitas)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Alternativa textual de la gráfica: los mismos datos (DIS-003, DIS-071). */}
                  <DataTable
                    srOnly
                    label="Plataformas con mayor concurrencia"
                    columns={[
                      { key: 'name', header: 'Plataforma', cell: (row) => row.name },
                      { key: 'visits', header: 'Concurrencia', cell: (row) => row.visits },
                    ]}
                    rows={stats.most_visited}
                    rowKey={(row) => row.id}
                    emptyMessage="No hay visitas registradas."
                  />
                </div>
              )}
          </Card>
        </div>

        {/* Segunda columna (40%): Actividad reciente que abarca 2 columnas */}
        {administra ? (
          <div className="flex flex-1 min-h-0 flex-col h-full lg:col-span-2">
            <ActividadReciente />
          </div>
        ) : null}
      </div>
    </section>
  );
}
