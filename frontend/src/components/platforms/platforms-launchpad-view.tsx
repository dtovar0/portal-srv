'use client';

/**
 * Vista del Lanzador de Plataformas (Launchpad / Opción 1 - DIS-115).
 * Cumple al 100% con la estética visual del mockup aprobado:
 * - Banner Hero con saludo, mensaje corporativo y métricas en tiempo real.
 * - Barra de pastillas de filtro interactivas (Todas, Favoritas, y por Área con contadores).
 * - Selector de cuadrícula configurable y persistente en navegador (DIS-081).
 * - Acceso directo a solicitudes pendientes de aprobación.
 * - Cuadrícula unificada de tarjetas de plataformas con ghost cards responsivas.
 * - Modal de bienvenida integrado y configurable.
 * - Modal de solicitud de acceso integrado.
 * - 100% compatible con tokens de diseño (DIS-001, DIS-002, DIS-056, DIS-068, DIS-072).
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccessRequest, CatalogItem } from '@/lib/access/types';
import { useCatalogoSolicitable, type MisPlataformas } from '../access/use-catalogo-solicitable';
import { RequestFormModal } from '../access/request-form-modal';
import { Icono } from '../icono';
import {
  CLAVE_GRID_COLUMNAS,
  CLAVE_GRID_FILAS,
  guardarDimGrid,
  leerDimGrid,
} from '../platform-admin';
import { useSession } from '../session-provider';
import { useToast } from '../toast';
import { Button } from '../form';
import { EmptyNote, Skeleton, Spinner } from '../ui';
import { PlatformMockupCard } from './platform-mockup-card';
import { PlatformGhostCard } from './platform-ghost-card';
import {
  CLAVE_OMITIR_BIENVENIDA,
  leerOmitirBienvenida,
  PlatformsWelcomeModal,
} from './platforms-welcome-modal';
import type { CardDesignVariant } from './user-view-settings';

export { CLAVE_OMITIR_BIENVENIDA };

const CUADRICULAS_PRESETS = [
  { f: 2, c: 2, label: '2×2' },
  { f: 2, c: 3, label: '2×3' },
  { f: 3, c: 2, label: '3×2' },
  { f: 3, c: 3, label: '3×3' },
];

const CLASES_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2 lg:grid-cols-2',
  3: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3',
  4: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};

const CLASES_ROWS: Record<number, string> = {
  2: 'sm:grid-rows-2',
  3: 'sm:grid-rows-3',
};

export function PlatformsLaunchpadView({
  mias,
  searchTerm = '',
  onSearchChange,
  disenoCards = 'estandar',
  areaId: propAreaId,
  onAreaIdChange,
  soloFavoritas: propSoloFavoritas,
  onSoloFavoritasChange,
}: {
  mias?: MisPlataformas;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  disenoCards?: CardDesignVariant;
  areaId?: number | null;
  onAreaIdChange?: (id: number | null) => void;
  soloFavoritas?: boolean;
  onSoloFavoritasChange?: (fav: boolean) => void;
}) {
  const { session } = useSession();
  const esSuperadmin = session?.permissions.is_admin ?? false;
  const administradas = useMemo(
    () => new Set((session?.managed_areas ?? []).map((a) => a.id)),
    [session],
  );

  const [internalAreaId, setInternalAreaId] = useState<number | null>(null);
  const [internalSoloFavoritas, setInternalSoloFavoritas] = useState(false);

  const areaId = propAreaId !== undefined ? propAreaId : internalAreaId;
  const setAreaId = (val: number | null) => {
    if (onAreaIdChange) {
      onAreaIdChange(val);
    } else {
      setInternalAreaId(val);
    }
  };

  const soloFavoritas = propSoloFavoritas !== undefined ? propSoloFavoritas : internalSoloFavoritas;
  const setSoloFavoritas = (updater: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof updater === 'function' ? updater(soloFavoritas) : updater;
    if (onSoloFavoritasChange) {
      onSoloFavoritasChange(nextVal);
    } else {
      setInternalSoloFavoritas(nextVal);
    }
  };
  const [abierta, setAbierta] = useState<CatalogItem | null>(null);
  const disparador = useRef<HTMLElement | null>(null);
  const { avisar } = useToast();

  const [mostrarModalBienvenida, setMostrarModalBienvenida] = useState<boolean>(() => !leerOmitirBienvenida());

  // Configuración de dimensiones de Cuadrícula (persistido en navegador con portal_grid_filas y portal_grid_columnas)
  const [gridFilas, setGridFilas] = useState<number>(() => leerDimGrid(CLAVE_GRID_FILAS, 2));
  const [gridColumnas, setGridColumnas] = useState<number>(() => leerDimGrid(CLAVE_GRID_COLUMNAS, 3));
  const [menuGridAbierto, setMenuGridAbierto] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    guardarDimGrid(CLAVE_GRID_FILAS, gridFilas);
  }, [gridFilas]);

  useEffect(() => {
    guardarDimGrid(CLAVE_GRID_COLUMNAS, gridColumnas);
  }, [gridColumnas]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(event.target as Node)) {
        setMenuGridAbierto(false);
      }
    }
    if (menuGridAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuGridAbierto]);

  const { catalogo, items, areas, mias: abribles, marcarSolicitada, marcarFavorito } = useCatalogoSolicitable(mias);

  // Filtrado de plataformas
  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      // Filtro por término de búsqueda
      const terminoLimpio = (searchTerm || '').trim();
      if (terminoLimpio) {
        const query = terminoLimpio.toLowerCase();
        const coincideNombre = item.platform.name.toLowerCase().includes(query);
        const coincideDesc = item.platform.description.toLowerCase().includes(query);
        const coincideArea = item.area.name.toLowerCase().includes(query);
        if (!coincideNombre && !coincideDesc && !coincideArea) return false;
      }
      // Filtro por área
      if (areaId !== null && item.area.id !== areaId) return false;
      // Filtro por favoritas
      if (soloFavoritas) {
        const plat = abribles.get(item.platform.id);
        if (!plat?.is_favorite) return false;
      }
      return true;
    });
  }, [items, searchTerm, areaId, soloFavoritas, abribles]);

  // Contadores métricos
  const activasCount = useMemo(() => {
    return items.filter((item) => {
      const plat = abribles.get(item.platform.id);
      return Boolean(plat) && (!item.my_access_status || item.my_access_status === 'activo');
    }).length;
  }, [items, abribles]);

  const pendientesCount = useMemo(() => {
    return items.filter((item) => item.pending_request_id !== null).length;
  }, [items]);

  const favoritasCount = useMemo(() => {
    return items.filter((item) => abribles.get(item.platform.id)?.is_favorite).length;
  }, [items, abribles]);

  const ghostCount = Math.max(0, gridFilas * gridColumnas - itemsFiltrados.length);

  // Motivo para plataformas que no se pueden solicitar
  function motivo(item: CatalogItem): string {
    if (item.pending_request_id !== null) return 'Espera la decisión del administrador del área.';
    if (esSuperadmin) return 'Como superadmin ya tienes acceso a todas las plataformas.';
    if (administradas.has(item.area.id)) return 'Administras esta área: tienes acceso automático.';
    if (item.my_level === 'admin') return 'Ya tienes el nivel más alto.';
    if (abribles.has(item.platform.id)) return '';
    return 'No disponible para solicitar.';
  }

  function abrirSolicitud(item: CatalogItem, trigger: HTMLButtonElement) {
    disparador.current = trigger;
    setAbierta(item);
  }

  const cerrarSolicitud = useCallback(() => {
    setAbierta(null);
    disparador.current?.focus();
  }, []);

  function creadaSolicitud(request: AccessRequest) {
    if (!abierta) return;
    marcarSolicitada(abierta.platform.id, request.id);
    avisar(
      'success',
      `${abierta.platform.name}. Queda pendiente de aprobación.`,
      'Solicitud enviada',
    );
    setAbierta(null);
  }

  const primerNombre = session?.name ? session.name.split(' ')[0] : 'Colaborador';

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0 gap-5">
      {/* 1. FILTROS POR PASTILLAS Y HERRAMIENTAS (CHIPS SIMÉTRICOS CON ICONOS DE APOYO Y ANCHO UNIFICADO) */}
      <section aria-label="Filtros del catálogo" className="w-full flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-borde shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Todas */}
          <button
            type="button"
            onClick={() => { setAreaId(null); setSoloFavoritas(false); }}
            aria-pressed={areaId === null && !soloFavoritas}
            aria-label={`Todas las plataformas (${items.length})`}
            className={`inline-flex h-12 min-h-12 w-48 sm:w-52 min-w-48 sm:min-w-52 items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border shadow-xs transition-all duration-rapida cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              areaId === null && !soloFavoritas
                ? 'border-primary bg-primary text-texto-sobre-accion shadow-1 ring-2 ring-primary/20'
                : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:text-body-text hover:shadow-1'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icono
                nombre="plataformas"
                tamano="sm"
                ariaHidden={true}
                className={`shrink-0 ${areaId === null && !soloFavoritas ? 'text-texto-sobre-accion' : 'text-label'}`}
              />
              <span className="truncate">Todas</span>
            </div>
            <span
              className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold tabular-nums shrink-0 transition-colors ${
                areaId === null && !soloFavoritas
                  ? 'bg-superficie/20 text-texto-sobre-accion'
                  : 'bg-surface-container text-body-text border border-panel-border/50'
              }`}
            >
              {items.length}
            </span>
          </button>

          {/* Favoritas */}
          <button
            type="button"
            onClick={() => { setSoloFavoritas((prev) => !prev); setAreaId(null); }}
            aria-pressed={soloFavoritas}
            aria-label={`Plataformas favoritas (${favoritasCount})`}
            className={`inline-flex h-12 min-h-12 w-48 sm:w-52 min-w-48 sm:min-w-52 items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border shadow-xs transition-all duration-rapida cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              soloFavoritas
                ? 'border-primary bg-primary text-texto-sobre-accion shadow-1 ring-2 ring-primary/20'
                : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:text-body-text hover:shadow-1'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icono
                nombre="favorito"
                tamano="sm"
                ariaHidden={true}
                className={`shrink-0 ${soloFavoritas ? 'text-texto-sobre-accion' : 'text-warning-text'}`}
              />
              <span className="truncate">Favoritas</span>
            </div>
            <span
              className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold tabular-nums shrink-0 transition-colors ${
                soloFavoritas
                  ? 'bg-superficie/20 text-texto-sobre-accion'
                  : 'bg-surface-container text-body-text border border-panel-border/50'
              }`}
            >
              {favoritasCount}
            </span>
          </button>

          {/* Pastillas dinámicas por Área */}
          {areas.map((a) => {
            const countArea = items.filter((i) => i.area.id === a.id).length;
            const activa = areaId === a.id && !soloFavoritas;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => { setAreaId(a.id); setSoloFavoritas(false); }}
                aria-pressed={activa}
                aria-label={`Área ${a.name} (${countArea})`}
                className={`inline-flex h-12 min-h-12 w-48 sm:w-52 min-w-48 sm:min-w-52 items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border shadow-xs transition-all duration-rapida cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activa
                    ? 'border-primary bg-primary text-texto-sobre-accion shadow-1 ring-2 ring-primary/20'
                    : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:text-body-text hover:shadow-1'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icono
                    nombre="areas"
                    tamano="sm"
                    ariaHidden={true}
                    className={`shrink-0 ${activa ? 'text-texto-sobre-accion' : 'text-label'}`}
                  />
                  <span className="truncate" title={a.name}>{a.name}</span>
                </div>
                <span
                  className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold tabular-nums shrink-0 transition-colors ${
                    activa
                      ? 'bg-superficie/20 text-texto-sobre-accion'
                      : 'bg-surface-container text-body-text border border-panel-border/50'
                  }`}
                >
                  {countArea}
                </span>
              </button>
            );
          })}
        </div>

        {/* Acciones del lado derecho: Solicitudes pendientes de aprobación y Selector de Cuadrícula */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* A la izquierda del botón de cuadrícula: Solicitudes pendientes de aprobación (solo si hay 1 o más) */}
          {pendientesCount > 0 ? (
            <Link
              href="/requests"
              title="Ver mis solicitudes pendientes de aprobación"
              aria-label={`${pendientesCount} ${pendientesCount === 1 ? 'solicitud pendiente de aprobación' : 'solicitudes pendientes de aprobación'}`}
              className="inline-flex min-h-12 items-center gap-2.5 px-3.5 py-2 rounded-xl border border-warning/40 bg-warning/10 text-warning-text hover:bg-warning/20 shadow-xs text-xs font-semibold transition-all duration-rapida outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer select-none"
            >
              <Icono
                nombre="solicitudes"
                tamano="sm"
                ariaHidden={true}
                className="text-warning-text shrink-0"
              />
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold tabular-nums">{pendientesCount}</span>
                <span>{pendientesCount === 1 ? 'pendiente de aprobación' : 'pendientes de aprobación'}</span>
              </span>
            </Link>
          ) : null}

          {/* Botón de cuadrícula para modificar la cuadrícula */}
          <div ref={gridRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuGridAbierto((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={menuGridAbierto}
              aria-label={`Configurar cuadrícula: ${gridFilas} filas por ${gridColumnas} columnas`}
              title="Configurar cuadrícula"
              className={`inline-flex h-12 min-h-12 w-48 min-w-48 items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-semibold shadow-xs transition-all duration-rapida cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                menuGridAbierto
                  ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20 shadow-1'
                  : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:shadow-1'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icono nombre="panel" tamano="sm" ariaHidden={true} className="text-primary-text shrink-0" />
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-label font-medium">Cuadrícula:</span>
                  <span className="font-bold text-body-text tabular-nums">{gridFilas}×{gridColumnas}</span>
                </span>
              </div>
              <Icono
                nombre="chevron-abajo"
                tamano="xs"
                ariaHidden={true}
                className={`shrink-0 transition-transform duration-rapida ${
                  menuGridAbierto ? 'rotate-180 text-primary-text' : 'text-label'
                }`}
              />
            </button>

            {menuGridAbierto ? (
              <div
                role="region"
                aria-label="Configurar cuadrícula"
                className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-panel-border bg-panel-fill p-3 shadow-2 backdrop-blur-md space-y-3"
              >
                <div className="flex items-center justify-between border-b border-panel-border/50 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-label">
                    Cuadrícula
                  </span>
                  <span className="text-xs font-bold text-primary-text tabular-nums">
                    {gridFilas * gridColumnas} slots ({gridFilas}×{gridColumnas})
                  </span>
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CUADRICULAS_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setGridFilas(p.f);
                          setGridColumnas(p.c);
                          setMenuGridAbierto(false);
                        }}
                        className={`flex min-h-12 items-center justify-center px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          gridFilas === p.f && gridColumnas === p.c
                            ? 'bg-primary/20 text-primary-text font-bold'
                            : 'text-label hover:text-body-text hover:bg-superficie-hundida'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 2. CONTENIDO: CUADRÍCULA DE PLATAFORMAS (RESPONSIVA A TODO EL ALTO Y ANCHO) */}
      {catalogo.loading && !catalogo.data ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-64 gap-3 text-label">
          <Spinner label="Cargando catálogo…" />
          <span className="text-sm font-medium">Cargando catálogo…</span>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-64">
          <EmptyNote
            icono="plataformas"
            title="Sin resultados"
            message={
              Boolean((searchTerm || '').trim() || areaId !== null || soloFavoritas)
                ? 'Ninguna plataforma coincide con los filtros aplicados.'
                : 'No hay plataformas disponibles en tu catálogo.'
            }
            action={
              Boolean((searchTerm || '').trim() || areaId !== null || soloFavoritas) ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onSearchChange?.('');
                    setAreaId(null);
                    setSoloFavoritas(false);
                  }}
                >
                  Restablecer filtros
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col w-full h-full min-h-0 p-1">
          <div
            role="region"
            aria-label="Catálogo de plataformas"
            className={`grid grid-cols-1 ${CLASES_COLS[gridColumnas] ?? 'sm:grid-cols-2 lg:grid-cols-2'} ${CLASES_ROWS[gridFilas] ?? 'sm:grid-rows-2'} gap-4 flex-1 h-full min-h-0 auto-rows-fr`}
          >
            {itemsFiltrados.map((item) => (
              <PlatformMockupCard
                key={item.platform.id}
                item={item}
                mine={abribles.get(item.platform.id)}
                reason={motivo(item)}
                onRequest={abrirSolicitud}
                onFavoriteChange={marcarFavorito}
                variante={disenoCards}
              />
            ))}

            {/* Ghost cards para completar la cuadrícula visual configurada y adaptar el alto completo */}
            {ghostCount > 0
              ? Array.from({ length: ghostCount }).map((_, idx) => (
                  <PlatformGhostCard
                    key={`ghost-${idx}`}
                    variante={disenoCards}
                  />
                ))
              : null}
          </div>
        </div>
      )}

      {/* Diálogo modal de solicitud de acceso */}
      {abierta ? (
        <RequestFormModal
          item={abierta}
          onClose={cerrarSolicitud}
          onCreated={creadaSolicitud}
        />
      ) : null}

      {/* Modal popup de bienvenida con opción para omitir la próxima vez */}
      {mostrarModalBienvenida ? (
        <PlatformsWelcomeModal
          primerNombre={primerNombre}
          activasCount={activasCount}
          pendientesCount={pendientesCount}
          onClose={() => setMostrarModalBienvenida(false)}
        />
      ) : null}
    </div>
  );
}
