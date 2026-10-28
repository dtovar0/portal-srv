'use client';

/**
 * «Actividad reciente» del Panel (DIS-079): los últimos eventos de la auditoría
 * (`GET /audit`) con un icono en círculo del color del resultado. El icono es
 * decorativo: el evento siempre va como texto.
 */

import { auditApi } from '@/lib/access/audit';
import type { AuditEntryV1 } from '@/lib/access/types';
import { usePolling } from '@/lib/use-polling';
import { formatearFecha } from '../access/fecha';
import { listLoadError } from '../access/request-errors';
import { etiquetaAccion, resultado } from '../audit/audit-actions';
import { RUTA_AUDITORIA } from '../audit/audit-routes';
import { quienActuo } from '../audit/audit-table';
import { Icono, type NombreIcono } from '../icono';
import { useSession } from '../session-provider';
import { CLASE_TONO, Card, EmptyNote, ErrorNote, Skeleton, type TonoCaja } from '../ui';
import Link from 'next/link';

const NOMBRE_LISTA = 'la actividad reciente';
const TITULO_ID = 'panel-actividad-titulo';
const EVENTOS = 5;

const VISTA_RESULTADO: Record<string, { icono: NombreIcono; tono: TonoCaja }> = {
  success: { icono: 'aprobar', tono: 'success' },
  error: { icono: 'rechazar', tono: 'error' },
  warning: { icono: 'aviso', tono: 'warning' },
  info: { icono: 'actividad', tono: 'activo' },
};

/** Icono y tono de un evento: la solicitud nueva es «pendiente»; el resto, según su resultado. */
export function vistaEvento(entry: AuditEntryV1): { icono: NombreIcono; tono: TonoCaja } {
  if (entry.action === 'solicitud_creada') return { icono: 'reloj', tono: 'warning' };
  return VISTA_RESULTADO[entry.status] ?? { icono: 'actividad', tono: 'activo' };
}

function Evento({ entry }: { entry: AuditEntryV1 }) {
  const { icono, tono } = vistaEvento(entry);
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${CLASE_TONO[tono]}`}
      >
        <Icono nombre={icono} tamano="sm" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-body-text">{etiquetaAccion(entry.action)}</p>
        <p className="break-words text-xs text-label">
          {quienActuo(entry)} · {formatearFecha(entry.time)} · {resultado(entry.status).texto}
        </p>
      </div>
    </li>
  );
}

export function ActividadReciente() {
  const { session } = useSession();
  const lista = usePolling(
    () => auditApi.list({ per_page: EVENTOS }).catch((err: unknown) => {
      throw listLoadError(err, NOMBRE_LISTA);
    }),
    { intervalSeconds: session?.preferences.refresh_interval },
  );
  const items = lista.data?.items ?? [];

  return (
    <section aria-labelledby={TITULO_ID} className="min-w-0">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icono nombre="actividad" className="text-label" />
            <h2 id={TITULO_ID} className="text-base font-semibold">Actividad reciente</h2>
          </div>
          <Link
            href={RUTA_AUDITORIA}
            className="inline-flex min-h-12 min-w-12 items-center rounded-lg px-2 text-sm font-semibold text-activo-texto outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ver todo
          </Link>
        </div>
        {lista.loading && !lista.data ? (
          <Skeleton variant="fila" count={3} ariaLabel="Cargando la actividad reciente…" />
        ) : null}
        {lista.error ? <ErrorNote message={lista.error} /> : null}
        {lista.data && items.length === 0 ? <EmptyNote message="Todavía no hay actividad." /> : null}
        {items.length > 0 ? (
          <ul role="list" className="space-y-4" aria-label="Actividad reciente">
            {items.map((entry) => <Evento key={entry.id} entry={entry} />)}
          </ul>
        ) : null}
      </Card>
    </section>
  );
}
