'use client';

/**
 * Vista de configuración de «Mi Widget» (Widget Flotante de Acceso Rápido) (DIS-116).
 *
 * Permite al usuario:
 * - Habilitar / deshabilitar el widget flotante global.
 * - Visualizar todas las plataformas del catálogo.
 * - Conmutar mediante un Toggle accesible qué plataformas aparecen en el widget.
 * - Ver un lanzador flotante interactivo en tiempo real con sus plataformas seleccionadas.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogItem } from '@/lib/access/types';
import type { Platform } from '@/lib/types';
import { Button } from '../button';
import { Icono, type NombreIcono } from '../icono';
import { EmptyNote } from '../note';

const COLORES_CHIP_TOKENS = [
  'bg-primary text-texto-sobre-accion',
  'bg-brand text-texto-sobre-accion',
  'bg-accent text-texto-sobre-accion',
  'bg-accent-sky text-texto-sobre-accion',
  'bg-accent-violet text-texto-sobre-accion',
  'bg-accion text-texto-sobre-accion',
  'bg-barra-lateral text-barra-lateral-texto',
];

function obtenerColorIniciales(id: number): string {
  return COLORES_CHIP_TOKENS[id % COLORES_CHIP_TOKENS.length];
}

function obtenerIniciales(nombre: string): string {
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

export interface UserWidgetConfigProps {
  items: CatalogItem[];
  mias?: Map<number, Platform>;
  areas?: Array<{ id: number; name: string }>;
  widgetHabilitado: boolean;
  onToggleHabilitado: (habilitado: boolean) => void;
  plataformasWidget: Set<number>;
  onTogglePlataforma: (plataformaId: number) => void;
  onVolver?: () => void;
}

export function UserWidgetConfig({
  items,
  mias = new Map(),
  widgetHabilitado,
  onToggleHabilitado,
  plataformasWidget,
  onTogglePlataforma,
}: UserWidgetConfigProps) {
  const [termino, setTermino] = useState('');
  const [filtroWidget, setFiltroWidget] = useState<'todas' | 'en_widget' | 'fuera_widget'>('todas');
  const [menuFiltroAbierto, setMenuFiltroAbierto] = useState(false);
  const [widgetExpandido, setWidgetExpandido] = useState(false);
  const menuFiltroRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown al hacer clic fuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuFiltroRef.current && !menuFiltroRef.current.contains(event.target as Node)) {
        setMenuFiltroAbierto(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuFiltroAbierto(false);
      }
    }
    if (menuFiltroAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [menuFiltroAbierto]);

  // Filtrado de plataformas
  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      if (termino.trim()) {
        const q = termino.toLowerCase();
        const matchName = item.platform.name.toLowerCase().includes(q);
        const matchDesc = item.platform.description.toLowerCase().includes(q);
        const matchArea = item.area.name.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchArea) return false;
      }
      const estaEnWidget = plataformasWidget.has(item.platform.id);
      if (filtroWidget === 'en_widget' && !estaEnWidget) return false;
      if (filtroWidget === 'fuera_widget' && estaEnWidget) return false;
      return true;
    });
  }, [items, termino, filtroWidget, plataformasWidget]);

  const totalEnWidget = plataformasWidget.size;
  const totalFueraWidget = Math.max(0, items.length - totalEnWidget);

  const OPCIONES_FILTRO_WIDGET: Array<{
    valor: 'todas' | 'en_widget' | 'fuera_widget';
    label: string;
    icono: NombreIcono;
    claseIcono: string;
    conteo: number;
  }> = [
    {
      valor: 'todas',
      label: 'Todas',
      icono: 'inventario',
      claseIcono: 'text-primary-text',
      conteo: items.length,
    },
    {
      valor: 'en_widget',
      label: 'En el Widget',
      icono: 'aprobar',
      claseIcono: 'text-success-text',
      conteo: totalEnWidget,
    },
    {
      valor: 'fuera_widget',
      label: 'Fuera',
      icono: 'rechazar',
      claseIcono: 'text-error-text',
      conteo: totalFueraWidget,
    },
  ];

  const opcionFiltroSeleccionada =
    OPCIONES_FILTRO_WIDGET.find((o) => o.valor === filtroWidget) ?? OPCIONES_FILTRO_WIDGET[0];
  const etiquetaFiltroWidget = opcionFiltroSeleccionada.label;
  const iconoFiltroWidget = opcionFiltroSeleccionada.icono;
  const claseIconoFiltroWidget = opcionFiltroSeleccionada.claseIcono;

  const plataformasActivas = useMemo(() => {
    return items.filter((i) => plataformasWidget.has(i.platform.id));
  }, [items, plataformasWidget]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full gap-4">
      {/* BARRA DE HERRAMIENTAS DE PLATAFORMAS PARA EL WIDGET */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
          <div className="relative w-full">
            <label htmlFor="buscar-plataformas-widget" className="sr-only">
              Buscar plataformas para el widget
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
              <Icono nombre="buscar" tamano="md" ariaHidden={true} />
            </div>
            <input
              id="buscar-plataformas-widget"
              type="search"
              placeholder="Buscar plataforma para agregar al widget…"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              className="w-full h-12 min-h-12 pl-10 pr-9 rounded-xl border border-panel-border bg-fondo text-xs font-medium text-body-text placeholder:text-label shadow-xs transition-colors focus:border-primary focus:bg-superficie focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {termino ? (
              <button
                type="button"
                onClick={() => setTermino('')}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-label hover:text-body-text min-h-12 min-w-12 justify-center cursor-pointer"
              >
                <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Acciones derechas: Filtro desplegable + Toggle Maestro del Widget */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
          {/* Filtro desplegable premium de inclusión en el widget */}
          <div ref={menuFiltroRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuFiltroAbierto((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={menuFiltroAbierto}
              aria-label={`Filtrar plataformas del widget: actual ${etiquetaFiltroWidget}`}
              className={`inline-flex h-12 min-h-12 w-48 sm:w-52 min-w-48 sm:min-w-52 items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-semibold shadow-xs transition-all duration-rapida cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                menuFiltroAbierto
                  ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20 shadow-1'
                  : filtroWidget !== 'todas'
                    ? 'border-primary/60 bg-superficie text-primary-text hover:border-primary hover:bg-superficie/80 hover:shadow-1'
                    : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:shadow-1'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icono
                  nombre={iconoFiltroWidget}
                  tamano="sm"
                  ariaHidden={true}
                  className={`${claseIconoFiltroWidget} shrink-0`}
                />
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-label font-medium">Mostrar:</span>
                  <span className="font-bold text-body-text">{etiquetaFiltroWidget}</span>
                </span>
              </div>
              <Icono
                nombre="chevron-abajo"
                tamano="xs"
                ariaHidden={true}
                className={`shrink-0 transition-transform duration-rapida ${
                  menuFiltroAbierto ? 'rotate-180 text-primary-text' : 'text-label'
                }`}
              />
            </button>

            {menuFiltroAbierto ? (
              <div
                role="listbox"
                aria-label="Opciones de filtro de plataformas del widget"
                className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-panel-border bg-panel-fill p-1.5 shadow-2 backdrop-blur-md"
              >
                {OPCIONES_FILTRO_WIDGET.map((opt) => (
                  <button
                    key={opt.valor}
                    type="button"
                    role="option"
                    aria-selected={filtroWidget === opt.valor}
                    onClick={() => {
                      setFiltroWidget(opt.valor);
                      setMenuFiltroAbierto(false);
                    }}
                    className={`flex w-full min-h-12 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      filtroWidget === opt.valor
                        ? 'bg-primary/15 text-primary-text font-bold'
                        : 'text-body-text hover:bg-surface-container'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icono nombre={opt.icono} tamano="sm" className={opt.claseIcono} />
                      <span>{opt.label}</span>
                      <span className="text-texto-secundario font-normal">({opt.conteo})</span>
                    </span>
                    {filtroWidget === opt.valor ? (
                      <Icono nombre="aprobar" tamano="sm" className="text-primary-text" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Separador vertical */}
          <div className="hidden sm:block h-6 w-px bg-panel-border/80 self-center shrink-0" aria-hidden="true" />

          {/* Conmutador maestro del widget flotante (reubicado a la derecha del filtro) */}
          <div
            className="flex items-center gap-2.5 h-12 min-h-12 px-3.5 rounded-xl border border-panel-border bg-fondo text-xs font-semibold shadow-xs shrink-0"
            title="Widget Flotante de Acceso Rápido"
          >
            <span className="sr-only">Widget Flotante de Acceso Rápido</span>
            <span className="flex items-center gap-2 text-body-text">
              <span
                className={`size-2 rounded-full ${
                  widgetHabilitado ? 'bg-success animate-pulse' : 'bg-label'
                }`}
              />
              <span className="font-bold whitespace-nowrap">
                {widgetHabilitado ? 'Widget Encendido' : 'Widget Apagado'}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={widgetHabilitado}
              aria-label="Activar o desactivar widget flotante"
              onClick={() => onToggleHabilitado(!widgetHabilitado)}
              className="min-h-12 min-w-12 inline-flex items-center justify-center p-1 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            >
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out ${
                  widgetHabilitado ? 'bg-primary border-transparent' : 'bg-surface-container border-panel-border'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-superficie shadow-sm ring-0 transition duration-200 ease-in-out ${
                    widgetHabilitado ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. LISTADO / CUADRÍCULA DE PLATAFORMAS CON TOGGLE */}
      <div className="flex flex-1 min-h-0 flex-col w-full overflow-y-auto">
        {itemsFiltrados.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <EmptyNote
              icono="panel"
              title="Sin plataformas"
              message={
                termino.trim() || filtroWidget !== 'todas'
                  ? 'Ninguna plataforma coincide con los filtros aplicados.'
                  : 'No hay plataformas disponibles para configurar en el widget.'
              }
              action={
                termino.trim() || filtroWidget !== 'todas' ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setTermino('');
                      setFiltroWidget('todas');
                    }}
                  >
                    Restablecer filtros
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 auto-rows-fr">
            {itemsFiltrados.map((item) => {
              const { platform, area } = item;
              const estaEnWidget = plataformasWidget.has(platform.id);
              const platMine = mias.get(platform.id);
              const esActivo = Boolean(platMine && (!item.my_access_status || item.my_access_status === 'activo'));

              return (
                <div
                  key={platform.id}
                  className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 shadow-1 ${
                    estaEnWidget
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03]'
                      : 'border-panel-border bg-panel-fill hover:border-panel-border/90'
                  }`}
                >
                  {/* Encabezado */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`grid size-11 shrink-0 place-items-center rounded-xl font-bold text-xs shadow-xs ${obtenerColorIniciales(
                          platform.id,
                        )}`}
                      >
                        {obtenerIniciales(platform.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-body-text truncate">{platform.name}</h4>
                          {estaEnWidget ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary-text border border-primary/20">
                              En widget
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-label font-medium truncate mt-0.5">{area.name}</p>
                      </div>
                    </div>

                    {/* Acceso Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                        esActivo
                          ? 'bg-success/10 text-success-text border border-success/30'
                          : 'bg-warning/15 text-warning-text border border-warning/30'
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${esActivo ? 'bg-success' : 'bg-warning'}`} />
                      {esActivo ? 'Activa' : 'Sin acceso'}
                    </span>
                  </div>

                  {/* Descripción */}
                  <p className="text-xs text-texto-secundario mt-3 line-clamp-2 leading-relaxed">
                    {platform.description || 'Sin descripción adicional para esta plataforma.'}
                  </p>

                  {/* Pie con Toggle Switch de Inclusión */}
                  <div className="mt-4 pt-3 border-t border-panel-border/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-body-text">
                      <Icono nombre="widget" tamano="xs" ariaHidden={true} className="text-label" />
                      <span>Mostrar en widget</span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={estaEnWidget}
                      aria-label={`${estaEnWidget ? 'Quitar' : 'Agregar'} ${platform.name} ${
                        estaEnWidget ? 'del' : 'al'
                      } widget flotante`}
                      onClick={() => onTogglePlataforma(platform.id)}
                      className="min-h-12 min-w-12 inline-flex items-center justify-end p-1 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                    >
                      <span
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out ${
                          estaEnWidget ? 'bg-primary border-transparent' : 'bg-surface-container border-panel-border'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block size-5 transform rounded-full bg-superficie shadow-md ring-0 transition duration-200 ease-in-out ${
                            estaEnWidget ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. PREVISUALIZACIÓN FLOTANTE INTERACTIVA EN PANTALLA */}
      {widgetHabilitado && (
        <aside
          aria-label="Previsualización del widget flotante de acceso rápido"
          className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2"
        >
          {widgetExpandido && (
            <div
              role="region"
              aria-label="Accesos rápidos del widget flotante"
              className="w-72 max-w-xs sm:max-w-sm p-3 rounded-2xl border border-panel-border bg-superficie shadow-3 backdrop-blur-md mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-panel-border">
                <div className="flex items-center gap-2">
                  <Icono nombre="widget" tamano="sm" className="text-primary-text" />
                  <span className="text-xs font-bold text-body-text">Mis Accesos Rápidos</span>
                </div>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary-text">
                  {plataformasActivas.length}
                </span>
              </div>

              {plataformasActivas.length === 0 ? (
                <p className="text-xs text-label text-center py-4">
                  No has activado plataformas para tu widget aún. Activa alguna con el toggle superior.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {plataformasActivas.map((p) => (
                    <div
                      key={p.platform.id}
                      className="flex items-center justify-between p-2 rounded-xl border border-panel-border/60 bg-superficie-hundida hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${obtenerColorIniciales(
                            p.platform.id,
                          )}`}
                        >
                          {obtenerIniciales(p.platform.name)}
                        </div>
                        <span className="text-xs font-semibold text-body-text truncate">{p.platform.name}</span>
                      </div>
                      <span className="text-xs text-label shrink-0">{p.area.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botón flotante disparador */}
          <button
            type="button"
            onClick={() => setWidgetExpandido((prev) => !prev)}
            aria-expanded={widgetExpandido}
            aria-label={`Widget flotante de acceso rápido: ${plataformasActivas.length} plataformas`}
            title={`Widget de acceso rápido (${plataformasActivas.length} plataformas)`}
            className="group relative inline-flex min-h-12 min-w-12 h-14 w-14 items-center justify-center rounded-full bg-primary text-texto-sobre-accion shadow-3 hover:scale-105 active:scale-95 transition-all outline-none focus-visible:ring-4 focus-visible:ring-primary/30 cursor-pointer"
          >
            <Icono nombre="widget" tamano="md" ariaHidden={true} />
            {plataformasActivas.length > 0 ? (
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-warning text-texto-sobre-aviso text-xs font-extrabold shadow-sm tabular-nums">
                {plataformasActivas.length}
              </span>
            ) : null}
          </button>
        </aside>
      )}
    </div>
  );
}
