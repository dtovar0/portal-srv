'use client';

/**
 * «Actividad reciente» del Panel (DIS-079): los últimos eventos de la auditoría
 * (`GET /audit`) estructurados como tabla de 8 registros adaptada a todo lo alto,
 * con zebra striping, ghost rows de simetría y footer con paginador integrado.
 */

import { useState } from 'react';
import Link from 'next/link';
import { auditApi } from '@/lib/access/audit';
import type { AuditEntryV1 } from '@/lib/access/types';
import { usePolling } from '@/lib/use-polling';
import { formatearFechaCorta24h } from '../access/fecha';
import { listLoadError } from '../access/request-errors';
import { etiquetaAccion, resultado } from '../audit/audit-actions';
import { RUTA_AUDITORIA } from '../audit/audit-routes';
import { quienActuo } from '../audit/audit-table';
import { Icono, type NombreIcono } from '../icono';
import { useSession } from '../session-provider';
import { Badge, CLASE_TONO, Card, EmptyNote, ErrorNote, PanelHeader, Skeleton, type TonoCaja } from '../ui';

const NOMBRE_LISTA = 'la actividad reciente';
const TITULO_ID = 'panel-actividad-titulo';
const EVENTOS = 8;

const ACCION_ICONO: Record<string, NombreIcono> = {
  // Cuentas / Usuarios / Roles / Administradores
  cuenta_directorio_creada: 'usuarios',
  admin_asignado: 'usuarios',
  admin_retirado: 'usuarios',
  rol_cambiado: 'usuarios',
  'CREAR USUARIO': 'usuarios',
  'EDITAR USUARIO': 'usuarios',
  'ELIMINAR USUARIO': 'usuarios',

  // Plataformas
  plataforma_creada: 'plataformas',
  plataforma_editada: 'plataformas',
  'CREAR PLATAFORMA': 'plataformas',
  'EDITAR PLATAFORMA': 'plataformas',
  'ELIMINAR PLATAFORMA': 'plataformas',

  // Áreas
  area_creada: 'areas',
  area_editada: 'areas',
  area_eliminada: 'areas',

  // Solicitudes
  solicitud_creada: 'reloj',
  solicitud_aprobada: 'solicitudes',
  solicitud_rechazada: 'solicitudes',

  // Accesos / Permisos
  acceso_otorgado: 'inventario',
  acceso_activo: 'inventario',
  acceso_fallido: 'inventario',
  acceso_revocado: 'inventario',
  revocacion_fallida: 'inventario',

  // Conectores / Ejecuciones
  conector_configurado: 'ejecuciones',
  conector_eliminado: 'ejecuciones',
  conector_probado: 'ejecuciones',
  ejecucion_reintentada: 'ejecuciones',
  ejecucion_cancelada: 'ejecuciones',

  // Notificaciones
  notificacion_fallida: 'campana',
  credenciales_enviadas: 'usuarios',
  credenciales_pendientes: 'usuarios',
  credenciales_reenviadas: 'usuarios',
};

const TONO_STATUS: Record<string, TonoCaja> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'activo',
};

function iconoParaAccion(action: string): NombreIcono {
  if (ACCION_ICONO[action]) return ACCION_ICONO[action];

  const lower = action.toLowerCase();
  if (
    lower.includes('cuenta') ||
    lower.includes('usuario') ||
    lower.includes('admin') ||
    lower.includes('rol')
  ) {
    return 'usuarios';
  }
  if (lower.includes('plataforma')) {
    return 'plataformas';
  }
  if (lower.includes('area') || lower.includes('área')) {
    return 'areas';
  }
  if (lower.includes('solicitud')) {
    return 'solicitudes';
  }
  if (lower.includes('acceso') || lower.includes('revocaci')) {
    return 'inventario';
  }
  if (lower.includes('conector') || lower.includes('ejecuci')) {
    return 'ejecuciones';
  }
  if (lower.includes('notificaci') || lower.includes('aviso')) {
    return 'campana';
  }

  return 'actividad';
}

/** Icono de la entidad/tipo de acción y tono según el resultado. */
export function vistaEvento(entry: AuditEntryV1): { icono: NombreIcono; tono: TonoCaja } {
  if (entry.action === 'solicitud_creada') {
    return { icono: 'reloj', tono: 'warning' };
  }
  return {
    icono: iconoParaAccion(entry.action),
    tono: TONO_STATUS[entry.status] ?? 'activo',
  };
}

function Evento({ entry, striped }: { entry: AuditEntryV1; striped: boolean }) {
  const { icono, tono } = vistaEvento(entry);
  const estado = resultado(entry.status);
  const accion = etiquetaAccion(entry.action);
  const usuario = quienActuo(entry);
  const fecha = formatearFechaCorta24h(entry.time);

  return (
    <li
      className={`flex flex-1 min-h-11 sm:min-h-0 items-center justify-between border-b border-panel-border/30 px-3 py-1.5 text-xs transition-colors hover:bg-primary/[0.04] sm:grid sm:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-3 sm:px-4 sm:py-0 ${
        striped ? 'bg-fondo/75' : 'bg-panel-fill'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2 sm:pr-0">
        <span
          aria-hidden="true"
          className={`flex size-7 shrink-0 items-center justify-center rounded-full shadow-xs ${CLASE_TONO[tono]}`}
        >
          <Icono nombre={icono} tamano="sm" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-body-text" title={accion}>
            {accion}
          </span>
          <span className="block truncate text-xs text-label sm:hidden">
            {usuario} · {fecha}
          </span>
        </div>
      </div>
      <div className="hidden sm:block truncate font-medium text-label" title={usuario}>
        {usuario}
      </div>
      <div className="hidden sm:block tabular-nums font-medium text-label whitespace-nowrap">
        {fecha}
      </div>
      <div className="shrink-0 flex items-center justify-end sm:text-right">
        <Badge
          tone={estado.tono}
          icon={estado.icono}
          title={estado.texto}
          className="!p-0 !size-7 !min-w-7 !justify-center rounded-full"
        >
          <span className="sr-only">{estado.texto}</span>
        </Badge>
      </div>
    </li>
  );
}

export function ActividadReciente() {
  const { session } = useSession();
  const [page, setPage] = useState(1);

  const lista = usePolling(
    () => auditApi.list({ page, per_page: EVENTOS }).catch((err: unknown) => {
      throw listLoadError(err, NOMBRE_LISTA);
    }),
    { intervalSeconds: session?.preferences.refresh_interval, deps: [page] },
  );

  const items = lista.data?.items ?? [];
  const totalApi = lista.data?.total ?? items.length;
  const total = Math.min(totalApi, 40);
  const paginas = Math.max(1, Math.ceil(total / EVENTOS));
  const ghostCount = Math.max(0, EVENTOS - items.length);

  return (
    <section aria-labelledby={TITULO_ID} className="flex flex-1 min-h-0 flex-col h-full min-w-0">
      <Card className="!p-0 flex flex-1 min-h-0 flex-col overflow-hidden shadow-1 border border-panel-border/80">
        {/* Cabecera del panel unificada con PanelHeader */}
        <PanelHeader
          title="Actividad reciente"
          subtitle="Últimos eventos del sistema"
          icon="actividad"
          titleId={TITULO_ID}
          titleTag="h2"
          actions={
            <Link
              href={RUTA_AUDITORIA}
              className="inline-flex min-h-12 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold text-primary-text transition-colors hover:bg-surface-container outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Ver todo</span>
              <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} />
            </Link>
          }
        />

        {/* Cabecera de la tabla */}
        <div
          className="hidden shrink-0 border-b-2 border-primary/35 bg-gradient-to-r from-primary/15 via-brand/10 to-accent/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-primary-text sm:grid sm:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-3"
          aria-hidden="true"
        >
          <span>Evento</span>
          <span>Usuario</span>
          <span>Fecha</span>
          <span className="text-right">Resultado</span>
        </div>

        {/* Cuerpo de la tabla */}
        <div className="flex flex-1 min-h-0 flex-col overflow-x-auto overflow-y-hidden">
          {lista.loading && !lista.data ? (
            <div className="p-4 space-y-3">
              <Skeleton variant="fila" count={4} ariaLabel="Cargando la actividad reciente…" />
            </div>
          ) : null}

          {lista.error ? (
            <div className="p-4">
              <ErrorNote message={lista.error} />
            </div>
          ) : null}

          {lista.data && items.length === 0 ? (
            <div className="flex flex-1 min-h-0 flex-col h-full w-full">
              <EmptyNote variant="seamless" message="Todavía no hay actividad." className="h-full min-h-72" />
            </div>
          ) : null}

          {items.length > 0 ? (
            <ul role="list" aria-label="Actividad reciente" className="flex flex-1 min-h-0 flex-col h-full justify-between">
              {items.map((entry, index) => (
                <Evento key={entry.id} entry={entry} striped={index % 2 === 1} />
              ))}

              {/* Ghost rows para completar 8 filas y mantener simetría a toda altura */}
              {Array.from({ length: ghostCount }).map((_, idx) => {
                const filaIdx = items.length + idx;
                const isStriped = filaIdx % 2 === 1;
                return (
                  <li
                    key={`ghost-${idx}`}
                    aria-hidden="true"
                    className={`hidden sm:grid sm:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center sm:gap-3 sm:px-4 flex-1 min-h-0 border-b border-panel-border/20 opacity-20 select-none pointer-events-none ${
                      isStriped ? 'bg-fondo/75' : 'bg-panel-fill'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="size-7 rounded-full bg-panel-border/60" />
                      <span className="h-3 w-28 rounded bg-panel-border/60" />
                    </div>
                    <div className="h-3 w-20 rounded bg-panel-border/60" />
                    <div className="h-3 w-16 rounded bg-panel-border/60" />
                    <div className="flex justify-end">
                      <span className="size-7 rounded-full bg-panel-border/60" />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {/* Footer de la tabla con contador "N de total" y paginación premium < N/TOTAL > a la derecha */}
        <div className="flex shrink-0 items-center justify-between border-t border-panel-border/80 bg-superficie-hundida/50 px-4 py-2.5 text-xs">
          <span className="flex items-center gap-2 font-semibold tabular-nums text-label">
            <span className="inline-block size-2 rounded-full bg-primary/70 animate-pulse" />
            <span>{items.length} de {total} registros</span>
          </span>

          {paginas > 1 ? (
            <nav
              aria-label="Paginación de actividad reciente"
              className="flex items-center gap-1 rounded-xl border border-panel-border/80 bg-superficie/90 p-0.5 shadow-xs"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary-text transition-all hover:bg-surface-container active:scale-95 disabled:opacity-30 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Página anterior de actividad reciente"
                title="Página anterior"
              >
                <Icono nombre="chevron-izq" tamano="sm" ariaHidden={true} />
              </button>

              <span
                className="px-2.5 py-0.5 text-xs font-black tabular-nums tracking-wide text-body-text select-none"
                aria-current="page"
              >
                {page}/{paginas}
              </span>

              <button
                type="button"
                disabled={page >= paginas}
                onClick={() => setPage((p) => Math.min(paginas, p + 1))}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary-text transition-all hover:bg-surface-container active:scale-95 disabled:opacity-30 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Página siguiente de actividad reciente"
                title="Página siguiente"
              >
                <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} />
              </button>
            </nav>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
