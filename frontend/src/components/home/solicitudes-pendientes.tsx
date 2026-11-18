'use client';

/**
 * «Solicitudes pendientes» del Panel (DIS-079): las más recientes de la bandeja
 * (`GET /access-requests/inbox?status=pendiente`) con avatar, plataforma, estado
 * y acciones de solo icono (ver, rechazar y aprobar) con nombre accesible
 * contextual. Aprobar y rechazar reutilizan los diálogos de la bandeja.
 */

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { requestsApi } from '@/lib/access/requests';
import type { AccessRequest } from '@/lib/access/types';
import { usePolling } from '@/lib/use-polling';
import { NIVELES } from '../access/access-status-badge';
import { ApproveDialog } from '../access/approve-dialog';
import { rutaConFiltro } from '../access/filtro-url';
import { RejectDialog } from '../access/reject-dialog';
import { listLoadError } from '../access/request-errors';
import { RequestStatusBadge } from '../access/request-status-badge';
import { avisoDecision } from '../access/approvals-inbox';
import { CeldaUsuario } from '../avatar';
import { Button, ButtonLink } from '../form';
import { DataTable, type DataColumn } from '../data-table';
import { Icono } from '../icono';
import { useSession } from '../session-provider';
import { SuccessNote } from '../ui';

const NOMBRE_LISTA = 'las solicitudes pendientes';
const TITULO_ID = 'panel-pendientes-titulo';
const FILAS = 5;
const RUTA_APROBACIONES = '/approvals';

type Decision = { tipo: 'aprobar' | 'rechazar'; request: AccessRequest };

/** Nombre accesible de una acción: dice qué hace y sobre qué solicitud. */
export function nombreAccion(accion: 'Ver' | 'Rechazar' | 'Aprobar', request: AccessRequest): string {
  const quien = request.requester.name;
  // No existe pantalla de detalle de una solicitud: «Ver» lleva a la lista de Aprobaciones.
  return accion === 'Ver'
    ? `Ver en aprobaciones: solicitud de ${quien}`
    : `${accion} la solicitud de ${quien}`;
}

function Encabezado() {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-superficie text-primary-text shadow-xs"
          aria-hidden="true"
        >
          <Icono nombre="documento" tamano="md" ariaHidden={true} />
        </span>
        <div className="min-w-0">
          <h2 id={TITULO_ID} className="text-sm font-bold tracking-tight text-body-text truncate">
            Solicitudes pendientes
          </h2>
          <p className="text-xs text-label truncate">Bandeja de solicitudes por autorizar</p>
        </div>
      </div>
      <Link
        href={rutaConFiltro(RUTA_APROBACIONES, { status: 'pendiente' })}
        className="inline-flex min-h-12 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold text-primary-text transition-colors hover:bg-surface-container outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span>Ver todas</span>
        <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} />
      </Link>
    </div>
  );
}

export function SolicitudesPendientes() {
  const { session } = useSession();
  const lista = usePolling(
    () => requestsApi.inbox({ status: 'pendiente', per_page: FILAS }).catch((err: unknown) => {
      throw listLoadError(err, NOMBRE_LISTA);
    }),
    { intervalSeconds: session?.preferences.refresh_interval },
  );
  const [decision, setDecision] = useState<Decision | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const disparador = useRef<HTMLElement | null>(null);
  const refrescar = lista.refresh;

  const abrir = (nueva: Decision, trigger: HTMLButtonElement) => {
    disparador.current = trigger;
    setAviso(null);
    setDecision(nueva);
  };
  // Estable: `Modal` reinstala su efecto (y el foco) si cambia `onClose`.
  const cerrar = useCallback(() => {
    setDecision(null);
    if (disparador.current?.isConnected) disparador.current.focus();
  }, []);
  const decidida = (request: AccessRequest) => {
    setAviso(avisoDecision(request));
    setDecision(null);
    refrescar();
  };

  const columnas: DataColumn<AccessRequest>[] = [
    {
      key: 'usuario',
      header: 'Usuario',
      cell: (r) => <CeldaUsuario nombre={r.requester.name} correo={r.requester.email} />,
      cellClassName: 'px-3 py-2',
    },
    {
      key: 'plataforma',
      header: 'Plataforma',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Icono nombre="plataformas" tamano="sm" className="text-label" />
          <span className="whitespace-nowrap">{r.platform.name} · {NIVELES[r.level]}</span>
        </div>
      ),
      cellClassName: 'px-3 py-2',
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (r) => <RequestStatusBadge status={r.status} />,
      cellClassName: 'px-3 py-2',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      headerClassName: 'px-6 py-4 font-black tracking-wider text-primary-text text-right select-none',
      cell: (r) => (
        <div className="inline-flex items-center justify-end gap-2">
          <ButtonLink
            href={rutaConFiltro(RUTA_APROBACIONES, { status: 'pendiente' })}
            variant="fila"
            aria-label={nombreAccion('Ver', r)}
            title="Ver en aprobaciones"
          >
            <Icono nombre="ver" />
          </ButtonLink>
          {r.requester.id === session?.id ? null : (
            <>
              <Button
                variant="fila-peligro"
                aria-label={nombreAccion('Rechazar', r)}
                title="Rechazar"
                onClick={(e) => abrir({ tipo: 'rechazar', request: r }, e.currentTarget)}
              >
                <Icono nombre="rechazar" />
              </Button>
              <Button
                variant="fila-primario"
                aria-label={nombreAccion('Aprobar', r)}
                title="Aprobar"
                onClick={(e) => abrir({ tipo: 'aprobar', request: r }, e.currentTarget)}
              >
                <Icono nombre="aprobar" />
              </Button>
            </>
          )}
        </div>
      ),
      cellClassName: 'whitespace-nowrap px-6 py-3 text-right',
    },
  ];

  return (
    <section aria-labelledby={TITULO_ID} className="min-w-0 space-y-3 xl:col-span-2">
      <div role="status">{aviso ? <SuccessNote>{aviso}</SuccessNote> : null}</div>
      <DataTable
        label="Solicitudes pendientes"
        encabezado={<Encabezado />}
        columns={columnas}
        rows={lista.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={lista.loading && !lista.data}
        error={lista.error}
        filasEsperadas={FILAS}
        claseFilaEsqueleto="min-h-16"
        emptyMessage="No hay solicitudes pendientes."
      />
      {lista.error ? <Button variant="secondary" onClick={refrescar}>Reintentar</Button> : null}
      {decision?.tipo === 'aprobar' ? (
        <ApproveDialog request={decision.request} onClose={cerrar} onDecided={decidida} onStale={refrescar} />
      ) : null}
      {decision?.tipo === 'rechazar' ? (
        <RejectDialog request={decision.request} onClose={cerrar} onDecided={decidida} onStale={refrescar} />
      ) : null}
    </section>
  );
}
