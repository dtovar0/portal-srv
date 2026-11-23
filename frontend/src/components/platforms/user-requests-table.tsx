'use client';

/**
 * Tabla accesible de solicitudes de acceso del usuario (DIS-115).
 * Permite al usuario revisar el estado de sus peticiones:
 * - Plataforma y Área solicitada.
 * - Nivel de acceso pedido (Lectura, Escritura, Administrador).
 * - Fecha de envío.
 * - Justificación.
 * - Estado (Pendiente, Aprobada, Rechazada).
 * - Resolución y motivo de rechazo si aplica.
 *
 * Utiliza el componente canónico DataTable y tokens semánticos (DIS-068, DIS-071).
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { requestsApi } from '@/lib/access/requests';
import type { AccessLevel, AccessRequest, RequestStatus } from '@/lib/access/types';
import { usePolling } from '@/lib/use-polling';
import { DataTable, type DataColumn } from '../data-table';
import { formatearFecha } from '../access/fecha';
import { Icono } from '../icono';
import { ErrorNote } from '../ui';

const NOMBRES_NIVEL: Record<string, string> = {
  usuario: 'Usuario',
  admin: 'Administrador',
  view: 'Lectura',
  editor: 'Escritura',
};

const PALETA_CHIPS = [
  'bg-primary text-texto-sobre-accion',
  'bg-brand text-texto-sobre-accion',
  'bg-accent text-texto-sobre-accion',
  'bg-accent-sky text-texto-sobre-accion',
  'bg-accent-violet text-texto-sobre-accion',
  'bg-accion text-texto-sobre-accion',
];

function inicialesPlataforma(nombre: string): string {
  const norm = nombre.toLowerCase().trim();
  if (norm.startsWith('slack')) return 'SL';
  if (norm.startsWith('github')) return 'GH';
  if (norm.startsWith('google')) return 'GW';
  if (norm.startsWith('jira')) return 'JR';
  if (norm.startsWith('aws')) return 'AW';
  if (norm.startsWith('vaultwarden')) return 'VW';
  if (norm.startsWith('sap')) return 'SP';
  if (norm.startsWith('datadog')) return 'DD';
  const palabras = nombre.trim().split(/\s+/);
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
}

export function UserRequestsTable({
  filtroEstadoInicial = 'pendiente',
  onVolverPlataformas,
}: {
  filtroEstadoInicial?: RequestStatus | '';
  onVolverPlataformas?: () => void;
}) {
  const [estadoFiltro, setEstadoFiltro] = useState<RequestStatus | ''>(filtroEstadoInicial);
  const [termino, setTermino] = useState('');
  const [pagina, setPagina] = useState(1);
  const limite = 10;
  const [menuEstadoAbierto, setMenuEstadoAbierto] = useState(false);

  const estadoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function manejarClickExterior(e: MouseEvent) {
      if (estadoRef.current && !estadoRef.current.contains(e.target as Node)) {
        setMenuEstadoAbierto(false);
      }
    }
    function manejarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuEstadoAbierto(false);
      }
    }
    document.addEventListener('mousedown', manejarClickExterior);
    document.addEventListener('keydown', manejarTecla);
    return () => {
      document.removeEventListener('mousedown', manejarClickExterior);
      document.removeEventListener('keydown', manejarTecla);
    };
  }, []);

  // Consulta en tiempo real de mis solicitudes con polling
  const { data, loading, error, refresh: reload } = usePolling(
    () => requestsApi.mine({ status: estadoFiltro || undefined, page: pagina, per_page: limite }),
    { deps: [estadoFiltro, pagina, limite] },
  );

  const solicitudes = data?.items ?? [];
  const totalRegistros = data?.total ?? 0;
  const porPagina = data?.per_page ?? limite;
  const totalPaginas = Math.ceil(totalRegistros / porPagina) || 1;

  // Filtrado local adicional por término de búsqueda (nombre de plataforma o área)
  const filtradas = useMemo(() => {
    if (!termino.trim()) return solicitudes;
    const q = termino.toLowerCase();
    return solicitudes.filter((r) => {
      const matchPlat = r.platform.name.toLowerCase().includes(q);
      const matchArea = r.area.name.toLowerCase().includes(q);
      const matchJust = (r.justification || '').toLowerCase().includes(q);
      return matchPlat || matchArea || matchJust;
    });
  }, [solicitudes, termino]);

  // Contadores para pastillas de filtro rápido
  const conteoPendientes = solicitudes.filter((s) => s.status === 'pendiente').length;
  const conteoAprobadas = solicitudes.filter((s) => s.status === 'aprobada').length;
  const conteoRechazadas = solicitudes.filter((s) => s.status === 'rechazada').length;

  const OPCIONES_ESTADO = [
    { valor: '' as const, label: 'Todas', icono: 'inventario' as const, claseIcono: 'text-primary-text', conteo: estadoFiltro === '' ? totalRegistros : undefined },
    { valor: 'pendiente' as const, label: 'Pendientes', icono: 'reloj' as const, claseIcono: 'text-warning-text', conteo: conteoPendientes },
    { valor: 'aprobada' as const, label: 'Aprobadas', icono: 'aprobar' as const, claseIcono: 'text-success-text', conteo: conteoAprobadas },
    { valor: 'rechazada' as const, label: 'Rechazadas', icono: 'rechazar' as const, claseIcono: 'text-error-text', conteo: conteoRechazadas },
  ];

  const opcionSeleccionada = OPCIONES_ESTADO.find((o) => o.valor === estadoFiltro) ?? OPCIONES_ESTADO[0];
  const etiquetaEstado = opcionSeleccionada.label;
  const iconoEstado = opcionSeleccionada.icono;
  const claseIconoEstado = opcionSeleccionada.claseIcono;

  const columnas: DataColumn<AccessRequest>[] = [
    {
      key: 'plataforma',
      header: 'Plataforma',
      cell: (r) => {
        const color = PALETA_CHIPS[r.platform.id % PALETA_CHIPS.length];
        const inits = inicialesPlataforma(r.platform.name);
        return (
          <div className="flex items-center gap-3">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-xs ${color}`}
              aria-hidden="true"
            >
              {inits}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-body-text truncate">{r.platform.name}</span>
              <span className="text-xs text-texto-secundario truncate">{r.area.name}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'nivel',
      header: 'Nivel',
      cell: (r) => (
        <span className="inline-flex items-center rounded-md border border-borde bg-superficie px-2.5 py-1 text-xs font-medium text-body-text">
          {NOMBRES_NIVEL[r.level] || r.level}
        </span>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha de Envío',
      cell: (r) => (
        <span className="text-xs text-texto-secundario whitespace-nowrap">
          {formatearFecha(r.created_at)}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (r) => {
        if (r.status === 'pendiente') {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning-text whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-warning animate-pulse" />
              Pendiente
            </span>
          );
        }
        if (r.status === 'aprobada') {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success-text whitespace-nowrap">
              ✓ Aprobada
            </span>
          );
        }
        if (r.status === 'rechazada') {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2.5 py-1 text-xs font-bold text-error-text whitespace-nowrap">
              ✕ Rechazada
            </span>
          );
        }
        return (
          <span className="inline-flex items-center rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-texto-secundario whitespace-nowrap">
            {r.status}
          </span>
        );
      },
    },
    {
      key: 'justificacion',
      header: 'Justificación / Motivo',
      cell: (r) => {
        const rechazo = r.status === 'rechazada' ? r.rejection_reason : null;
        return (
          <div className="max-w-xs space-y-1">
            {r.justification ? (
              <p className="text-xs text-body-text line-clamp-2" title={r.justification}>
                {r.justification}
              </p>
            ) : (
              <span className="text-xs text-texto-secundario italic">Sin justificación</span>
            )}
            {rechazo ? (
              <p className="text-xs font-semibold text-error-text" title={rechazo}>
                Motivo: {rechazo}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'resolucion',
      header: 'Resolución',
      cell: (r) => {
        if (r.decided_at) {
          return (
            <div className="text-xs text-texto-secundario whitespace-nowrap">
              <span>{formatearFecha(r.decided_at)}</span>
              {r.decided_by ? <span className="block font-medium text-body-text">{r.decided_by.name}</span> : null}
            </div>
          );
        }
        return <span className="text-xs text-texto-secundario italic">En espera de revisión</span>;
      },
    },
  ];

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 w-full">
      <h2 className="sr-only">Mis Solicitudes de Acceso</h2>

      {/* BARRA DE HERRAMIENTAS PREMIUM ENCAPSULADA (Reutiliza el diseño canónico de Plataformas / Áreas) */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
        {/* A la izquierda: Buscador de solicitudes */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
          <div className="relative w-full">
            <label htmlFor="buscar-solicitudes-workspace" className="sr-only">
              Buscar solicitudes
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
              <Icono nombre="buscar" tamano="md" ariaHidden={true} />
            </div>
            <input
              id="buscar-solicitudes-workspace"
              type="search"
              placeholder="Buscar por plataforma o área…"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              className="nx-buscador-toolbar h-12 w-full rounded-xl border border-panel-border bg-fondo pl-11 pr-10 py-3 text-sm text-body-text placeholder:text-placeholder transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {termino ? (
              <button
                type="button"
                onClick={() => setTermino('')}
                className="absolute inset-y-0 right-0 flex items-center justify-center min-h-12 min-w-12 pr-3 text-label hover:text-body-text transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
              </button>
            ) : null}
          </div>
        </div>

        {/* A la derecha: Filtro de Estado */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón 1: Estado / Filtro */}
          <div ref={estadoRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuEstadoAbierto((prev) => !prev);
              }}
              aria-haspopup="listbox"
              aria-expanded={menuEstadoAbierto}
              aria-label={`Filtrar por estado: actual ${etiquetaEstado}`}
              className={`inline-flex h-12 min-h-12 w-48 min-w-48 items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-semibold shadow-xs transition-all duration-rapida cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${menuEstadoAbierto
                ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20 shadow-1'
                : estadoFiltro !== ''
                  ? 'border-primary/60 bg-superficie text-primary-text hover:border-primary hover:bg-superficie/80 hover:shadow-1'
                  : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:shadow-1'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icono
                  nombre={iconoEstado}
                  tamano="sm"
                  ariaHidden={true}
                  className={`${claseIconoEstado} shrink-0`}
                />
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-label font-medium">Estado:</span>
                  <span className="font-bold text-body-text">{etiquetaEstado}</span>
                </span>
              </div>
              <Icono
                nombre="chevron-abajo"
                tamano="xs"
                ariaHidden={true}
                className={`shrink-0 transition-transform duration-rapida ${menuEstadoAbierto ? 'rotate-180 text-primary-text' : 'text-label'
                  }`}
              />
            </button>

            {menuEstadoAbierto ? (
              <div
                role="listbox"
                aria-label="Opciones de estado"
                className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-panel-border bg-panel-fill p-1.5 shadow-2 backdrop-blur-md"
              >
                {OPCIONES_ESTADO.map((opt) => (
                  <button
                    key={opt.valor}
                    type="button"
                    role="option"
                    aria-selected={estadoFiltro === opt.valor}
                    onClick={() => {
                      setEstadoFiltro(opt.valor);
                      setPagina(1);
                      setMenuEstadoAbierto(false);
                    }}
                    className={`flex w-full min-h-12 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${estadoFiltro === opt.valor
                      ? 'bg-primary/15 text-primary-text font-bold'
                      : 'text-body-text hover:bg-surface-container'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icono nombre={opt.icono} tamano="sm" className={opt.claseIcono} />
                      <span>{opt.label}</span>
                      {opt.conteo !== undefined ? (
                        <span className="text-texto-secundario font-normal">({opt.conteo})</span>
                      ) : null}
                    </span>
                    {estadoFiltro === opt.valor ? <Icono nombre="aprobar" tamano="sm" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mensaje de error si falla la consulta */}
      {error ? (
        <div className="space-y-3">
          <ErrorNote message={error} />
          <button
            type="button"
            onClick={() => void reload()}
            className="min-h-11 rounded-lg border border-borde bg-superficie px-4 py-2 text-xs font-semibold text-body-text hover:bg-surface-container"
          >
            Reintentar carga
          </button>
        </div>
      ) : null}

      {/* Tabla Canónica DataTable */}
      <DataTable
        label="Historial de solicitudes de acceso"
        columns={columnas}
        rows={filtradas}
        rowKey={(r) => r.id}
        loading={loading && !data}
        error={null}
        striped
        filasEsperadas={limite}
        emptyMessage="No tienes solicitudes de acceso en este estado."
        page={pagina}
        totalPages={totalPaginas}
        totalRecords={totalRegistros}
        onPageChange={setPagina}
        emptyAction={
          <Link
            href="/platforms"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-texto-sobre-accion hover:bg-primary/90 transition-colors shadow-xs"
          >
            <span>Explorar catálogo de plataformas</span>
          </Link>
        }
      />
    </div>
  );
}

