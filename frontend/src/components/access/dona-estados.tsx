'use client';

/**
 * Dona del porcentaje de solicitudes por estado (DIS-131): recharts `Pie` con `innerRadius`,
 * en formato de KPI desde DIS-141 (dona a la izquierda y leyenda a la derecha, sin «Abrir»);
 * colores semánticos de aviso, éxito y peligro (tokens) y leyenda con cifras y porcentajes en
 * texto (la gráfica es decorativa para el lector de pantalla).
 */

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { InboxStats, RequestStatus } from '@/lib/access/types';
import { useTokenColors } from '@/lib/use-token-colors';
import { porcentaje } from '../dashboard/indicadores';
import { Card, PanelHeader, PremiumEmptyState } from '../ui';

const TOKENS_DONA = {
  pendiente: '--color-indicador-pendientes',
  aprobada: '--color-indicador-aprobadas',
  rechazada: '--color-indicador-rechazadas',
  rejilla: '--color-panel-border',
  fondo: '--color-panel-fill',
  texto: '--color-body-text',
};

const RADIO_INTERIOR = '58%';
const RADIO_EXTERIOR = '88%';
const SEPARACION_GRADOS = 2;

/** Clases literales (el CSS sin uso las busca por nombre completo). */
export const ESTADOS_DONA: { estado: RequestStatus; nombre: string; punto: string }[] = [
  { estado: 'pendiente', nombre: 'Pendientes', punto: 'nx-dona__punto--pendiente' },
  { estado: 'aprobada', nombre: 'Aprobadas', punto: 'nx-dona__punto--aprobada' },
  { estado: 'rechazada', nombre: 'Rechazadas', punto: 'nx-dona__punto--rechazada' },
];

export function DonaEstados({ stats }: { stats: InboxStats }) {
  const colores = useTokenColors(TOKENS_DONA);
  const filas = ESTADOS_DONA.map(({ estado, nombre, punto }) => {
    const cantidad = stats.by_status[estado] ?? 0;
    return { estado, nombre, punto, cantidad, pct: porcentaje({ parte: cantidad, resto: stats.total - cantidad }) };
  });

  return (
    <Card className="!p-0 flex h-full flex-col overflow-hidden shadow-1 border border-panel-border/80">
      <PanelHeader
        title="Solicitudes por estado"
        subtitle={`${stats.total} en total`}
        icon="solicitudes"
        titleTag="h3"
      />
      {stats.total === 0 ? (
        <PremiumEmptyState
          variant="seamless"
          icono="solicitudes"
          title="Sin solicitudes"
          message="Cuando lleguen solicitudes a tus áreas, verás aquí el reparto por estado."
        />
      ) : (
        <div className="flex flex-1 items-center gap-4 p-4">
          <div className="size-28 shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filas}
                  dataKey="cantidad"
                  nameKey="nombre"
                  innerRadius={RADIO_INTERIOR}
                  outerRadius={RADIO_EXTERIOR}
                  paddingAngle={SEPARACION_GRADOS}
                  stroke={colores.fondo}
                >
                  {filas.map((fila) => <Cell key={fila.estado} fill={colores[fila.estado]} />)}
                </Pie>
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
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid min-w-0 flex-1 gap-2" aria-label="Solicitudes por estado">
            {filas.map((fila) => (
              <li key={fila.estado} className="flex items-center gap-2 text-sm text-label">
                <span className={`${fila.punto} size-3 rounded-sm`} aria-hidden="true" />
                <span className="min-w-0 flex-1">{fila.nombre}</span>
                <b className="font-bold tabular-nums text-body-text">{fila.cantidad}</b>
                <span className="w-12 text-right font-semibold tabular-nums text-body-text">{fila.pct} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
