'use client';

/**
 * Panel Lateral (Drawer / Popup Lateral) para Configuración del Diseño de Tarjetas de Área.
 * Reutiliza estrictamente la arquitectura simétrica, paginador CapsulePager y previsualización
 * en vivo de PlatformCardDesignDrawer (DIS-102, DIS-114).
 */

import React, { useEffect, useState } from 'react';
import { Drawer } from '../drawer';
import { Icono } from '../icono';
import { Button } from '../button';
import { CapsulePager } from '../capsule-pager';
import { TarjetaArea } from '../areas/tarjeta-area';
import {
  type AreaCardDesignVariant,
  AREA_PREVIEW_DEMO,
  PLATAFORMAS_AREA_DEMO,
  guardarForzarDisenoArea,
  leerForzarDisenoArea,
} from './user-view-settings';

export interface AreaCardDesignDrawerProps {
  open: boolean;
  onClose: () => void;
  disenoCardsArea: AreaCardDesignVariant;
  onDisenoCardsAreaChange: (diseno: AreaCardDesignVariant) => void;
  forzarDisenoArea?: boolean;
  onForzarDisenoAreaChange?: (forzar: boolean) => void;
  devolverA?: React.RefObject<HTMLElement | null>;
}

interface VarianteArea {
  id: AreaCardDesignVariant;
  titulo: string;
  ariaLabel: string;
  renderPreview: () => React.ReactNode;
}

const VARIANTES_AREA: VarianteArea[] = [
  {
    id: 'split',
    titulo: 'Split 50/50',
    ariaLabel: 'Diseño de Área Split 50/50 estilo Harvest Vase',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg overflow-hidden border border-success/30 flex mt-auto shrink-0 shadow-2xs">
        <div className="w-1/2 bg-success/20 p-1 flex items-center justify-center">
          <div className="size-4 rounded bg-arte-esmeralda-600 text-xs text-arte-luz font-bold flex items-center justify-center">TI</div>
        </div>
        <div className="w-1/2 p-1.5 bg-fondo flex flex-col justify-center space-y-1">
          <div className="h-1.5 w-8 rounded bg-label/40" />
          <div className="h-2 w-10 rounded-full bg-arte-esmeralda-400" />
        </div>
      </div>
    ),
  },
  {
    id: 'onda',
    titulo: 'Onda Curva SVG',
    ariaLabel: 'Diseño de Área Onda Curva Asimétrica',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg overflow-hidden border border-warning/30 bg-fondo flex flex-col mt-auto shrink-0 shadow-2xs">
        <div className="h-5 w-full bg-gradient-to-r from-arte-ambar-600 to-arte-naranja-500 flex items-center justify-center text-xs text-arte-luz font-bold shrink-0">
          <Icono nombre="panel" tamano="xs" className="text-arte-luz" />
        </div>
        <div className="p-0.5 text-center flex items-center justify-center flex-1">
          <div className="h-1.5 w-12 rounded-full bg-arte-ambar-500" />
        </div>
      </div>
    ),
  },
  {
    id: 'directorio',
    titulo: 'Directorio de Equipo',
    ariaLabel: 'Diseño de Área Directorio Corporativo con avatares',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg overflow-hidden border border-arte-purpura-500/30 bg-fondo flex flex-col mt-auto shrink-0 shadow-2xs">
        <div className="h-5 w-full bg-gradient-to-r from-arte-purpura-950 to-arte-indigo-950 px-1.5 flex items-center justify-between shrink-0">
          <div className="flex -space-x-1">
            <div className="size-2 rounded-full bg-arte-azul-500" />
            <div className="size-2 rounded-full bg-arte-turquesa-500" />
          </div>
          <div className="size-2 rounded-full bg-arte-purpura-400" />
        </div>
        <div className="px-1.5 py-0.5 flex items-center justify-between flex-1">
          <div className="h-1.5 w-10 rounded bg-label/40" />
          <div className="h-2 w-8 rounded bg-arte-purpura-600" />
        </div>
      </div>
    ),
  },
  {
    id: 'bento',
    titulo: 'Mosaico Bento Grid',
    ariaLabel: 'Diseño de Área Mosaico Bento Grid',
    renderPreview: () => (
      <div className="h-10 w-full p-1 rounded-lg border border-panel-border bg-fondo flex flex-col justify-between mt-auto shrink-0 shadow-2xs">
        <div className="grid grid-cols-2 gap-1">
          <div className="h-3 rounded bg-primary/10 border border-primary/20 text-xs text-center font-bold text-primary-text flex items-center justify-center">28</div>
          <div className="h-3 rounded bg-superficie border border-panel-border text-xs text-center font-bold flex items-center justify-center">4 apps</div>
        </div>
        <div className="h-2 w-full rounded bg-superficie-hundida" />
      </div>
    ),
  },
  {
    id: 'medallon',
    titulo: 'Medallón Insignia',
    ariaLabel: 'Diseño de Área Tarjeta Medallón Insignia',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg overflow-hidden border border-panel-border flex flex-col items-center justify-between pb-1 mt-auto shrink-0 bg-fondo shadow-2xs">
        <div className="h-3.5 w-full bg-primary" />
        <div className="-mt-2.5 size-4 rounded-full bg-primary border border-arte-luz flex items-center justify-center text-xs text-arte-luz shadow-xs">
          <Icono nombre="favorito" tamano="xs" relleno={true} className="text-arte-luz" />
        </div>
        <div className="h-1.5 w-12 rounded bg-label/40" />
      </div>
    ),
  },
  {
    id: 'estandar',
    titulo: 'Métricas Ejecutivas',
    ariaLabel: 'Diseño de Área Panel Métrico Ejecutivo',
    renderPreview: () => (
      <div className="h-10 w-full p-1 rounded-lg border border-panel-border/70 bg-fondo flex flex-col justify-between mt-auto shrink-0 shadow-2xs">
        <div className="grid grid-cols-2 gap-1">
          <div className="h-3 rounded bg-superficie border border-panel-border/50 text-xs text-center font-bold flex items-center justify-center">12</div>
          <div className="h-3 rounded bg-superficie border border-panel-border/50 text-xs text-center font-bold flex items-center justify-center">4</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1">
            <div className="size-2 rounded-full bg-arte-azul-500" />
            <div className="size-2 rounded-full bg-arte-purpura-500" />
          </div>
          <div className="h-1.5 w-8 rounded bg-primary/30" />
        </div>
      </div>
    ),
  },
  {
    id: 'portada',
    titulo: 'Portada Fotográfica',
    ariaLabel: 'Diseño de Área con Portada Fotográfica',
    renderPreview: () => (
      <div className="relative h-10 w-full rounded-lg overflow-hidden bg-arte-pizarra-900 border border-arte-luz/20 flex flex-col justify-between p-1.5 text-arte-luz mt-auto shrink-0 shadow-2xs">
        <div className="absolute inset-0 bg-gradient-to-t from-arte-sombra/90 via-arte-sombra/50 to-arte-sombra/20" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="size-3 rounded bg-arte-luz/20 font-bold flex items-center justify-center"></span>
          <span className="h-2 w-7 rounded-full bg-arte-esmeralda-400/30 text-arte-esmeralda-300 font-bold flex items-center justify-center"></span>
        </div>
        <div className="relative z-10 flex gap-1">
          <div className="h-1.5 flex-1 rounded bg-arte-luz/20" />
          <div className="h-1.5 flex-1 rounded bg-arte-luz/20" />
        </div>
      </div>
    ),
  },
  {
    id: 'banner',
    titulo: 'Hero Banner Fotográfico',
    ariaLabel: 'Diseño de Área con Hero Banner Fotográfico',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg overflow-hidden border border-panel-border bg-fondo flex flex-col mt-auto shrink-0 shadow-2xs">
        <div className="h-5 w-full bg-arte-pizarra-800 relative flex items-center justify-between px-1.5 shrink-0">
          <div className="size-3 rounded bg-primary text-arte-luz flex items-center justify-center font-bold"></div>
          <div className="h-1.5 w-6 rounded-full bg-arte-luz/40" />
        </div>
        <div className="px-1.5 py-0.5 flex items-center justify-between flex-1">
          <div className="h-1.5 w-10 rounded bg-label/40" />
          <div className="h-2 w-8 rounded bg-superficie-hundida" />
        </div>
      </div>
    ),
  },
  {
    id: 'glass',
    titulo: 'Glassmorphism Neón',
    ariaLabel: 'Diseño de Área Glassmorphism Neón',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg border border-primary/40 bg-primary/10 backdrop-blur-xs flex flex-col justify-between p-1.5 mt-auto shrink-0 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="size-3 rounded bg-primary/40" />
          <div className="size-1.5 rounded-full bg-arte-esmeralda-400" />
        </div>
        <div className="h-2 w-full rounded-md bg-gradient-to-r from-primary to-accent" />
      </div>
    ),
  },
  {
    id: 'flotante',
    titulo: 'Flotante Inmersiva',
    ariaLabel: 'Diseño de Área Flotante Inmersiva',
    renderPreview: () => (
      <div className="relative h-10 w-full rounded-lg overflow-hidden bg-arte-pizarra-900 border border-arte-luz/20 flex flex-col justify-between p-1.5 text-arte-luz mt-auto shrink-0 shadow-2xs">
        <div className="absolute inset-0 bg-gradient-to-b from-arte-sombra/60 via-arte-sombra/40 to-arte-sombra/80" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="h-1 w-6 rounded-full bg-arte-luz/40" />
          <span className="size-1.5 rounded-full bg-arte-esmeralda-400" />
        </div>
        <div className="relative z-10 p-0.5 rounded bg-arte-sombra/70 backdrop-blur-xs border border-arte-luz/20 flex items-center justify-between">
          <span className="size-2 rounded bg-primary text-arte-luz font-bold flex items-center justify-center"></span>
          <div className="h-1 w-8 rounded bg-arte-luz/70" />
        </div>
      </div>
    ),
  },
];

const ITEMS_POR_PAGINA = 4;
const TOTAL_PAGINAS = Math.ceil(VARIANTES_AREA.length / ITEMS_POR_PAGINA);

export function AreaCardDesignDrawer({
  open,
  onClose,
  disenoCardsArea,
  onDisenoCardsAreaChange,
  forzarDisenoArea,
  onForzarDisenoAreaChange,
  devolverA,
}: AreaCardDesignDrawerProps) {
  const [forzarLocal, setForzarLocal] = useState<boolean>(() => {
    return forzarDisenoArea ?? leerForzarDisenoArea();
  });
  const [pagina, setPagina] = useState<number>(1);

  // Sincronizar estado forzado externo
  useEffect(() => {
    if (forzarDisenoArea !== undefined) {
      setForzarLocal(forzarDisenoArea);
    }
  }, [forzarDisenoArea]);

  // Al abrir o conmutar el diseño, saltar a la página que contiene la variante seleccionada
  useEffect(() => {
    if (open) {
      const idx = VARIANTES_AREA.findIndex((v) => v.id === disenoCardsArea);
      if (idx >= 0) {
        setPagina(Math.floor(idx / ITEMS_POR_PAGINA) + 1);
      }
    }
  }, [open, disenoCardsArea]);

  const esForzado = forzarDisenoArea ?? forzarLocal;

  // Modificación silenciosa sin avisos toast para no obstruir los botones de pie
  const handleToggleForzar = (nuevo: boolean) => {
    setForzarLocal(nuevo);
    guardarForzarDisenoArea(nuevo);
    onForzarDisenoAreaChange?.(nuevo);
  };

  const handleSeleccionarDiseno = (variante: AreaCardDesignVariant) => {
    onDisenoCardsAreaChange(variante);
  };

  const handleReestablecer = () => {
    onDisenoCardsAreaChange('estandar');
    handleToggleForzar(false);
    setPagina(2); // 'estandar' está en la página 2
  };

  // Cabecera diferenciada cromáticamente (bg-surface-container) con botón X de cierre
  const headerContent = (
    <div className="bg-surface-container border-b border-panel-border px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between gap-4 shrink-0">
      <div className="min-w-0">
        <h3 className="text-base font-bold text-body-text flex items-center gap-2">
          <Icono nombre="diseno" tamano="sm" className="text-primary-text shrink-0" ariaHidden={true} />
          <span>Diseño de Tarjetas de Área</span>
        </h3>
        <p className="text-xs text-label mt-0.5">
          Configura de forma independiente el estilo de las tarjetas departamentales en el catálogo del portal.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        title="Cerrar panel de diseño"
        className="min-w-12 inline-flex size-10 min-h-12 min-w-10 items-center justify-center rounded-xl border border-panel-border bg-superficie text-label hover:border-primary/50 hover:bg-surface-container hover:text-body-text transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
      >
        <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
      </button>
    </div>
  );

  // Pie del modal lateral: Botón Cerrar a la izquierda, Reestablecer a la derecha con simetría dimensional estricta
  const footerContent = (
    <div className="bg-surface-container border-t border-panel-border px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between gap-3 shrink-0">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="h-12 min-h-12 w-mitad-canal sm:w-48 sm:min-w-48 !px-3 font-semibold text-body-text hover:bg-superficie focus-visible:ring-2 focus-visible:ring-primary justify-center text-center"
      >
        Cerrar
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={handleReestablecer}
        className="h-12 min-h-12 w-mitad-canal sm:w-48 sm:min-w-48 !px-3 font-semibold text-body-text hover:bg-superficie focus-visible:ring-2 focus-visible:ring-primary justify-center text-center"
      >
        Reestablecer
      </Button>
    </div>
  );

  // Paginación: 4 tarjetas por página (cuadrícula 2x2) para eliminar el scroll vertical
  const variantesPaginaActual = VARIANTES_AREA.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA,
  );
  const ghostCardsNecesarias = Math.max(0, ITEMS_POR_PAGINA - variantesPaginaActual.length);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      position="right"
      width="w-full sm:w-140 md:w-160 max-w-full"
      ariaLabel="Diseño de Tarjetas de Área"
      header={headerContent}
      footer={footerContent}
      sinPadding={true}
      devolverA={devolverA}
      id="drawer-diseno-tarjetas-area"
    >
      <div className="h-full min-h-full flex flex-col justify-between p-4 sm:p-5 gap-2.5 sm:gap-3">
        {/* Interruptor para Forzar Diseño Institucional en todo el portal (compacto, sin descripción para recuperar espacio) */}
        <div className="rounded-xl border border-panel-border bg-superficie px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 shadow-2xs shrink-0">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <label
              htmlFor="toggle-forzar-diseno-area"
              className="text-xs font-bold text-body-text cursor-pointer select-none block"
            >
              Forzar diseño en todo el portal
            </label>
            {esForzado ? (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary-text uppercase tracking-wide shrink-0">
                Activo
              </span>
            ) : (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded border border-panel-border bg-surface-container text-label uppercase tracking-wide shrink-0">
                Inactivo
              </span>
            )}
          </div>

          <button
            type="button"
            id="toggle-forzar-diseno-area"
            role="switch"
            aria-checked={esForzado}
            aria-label="Forzar diseño de tarjetas de área en todo el portal"
            onClick={() => handleToggleForzar(!esForzado)}
            className="min-w-12 min-h-12 min-w-10 inline-flex items-center justify-end p-1 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shrink-0"
          >
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out ${
                esForzado ? 'bg-primary border-transparent' : 'bg-surface-container border-panel-border'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-superficie shadow-md ring-0 transition duration-200 ease-in-out ${
                  esForzado ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>

        {/* Recuadro de Vista Previa en Vivo de Tarjeta de Área (sin contenedor interior redundante para optimizar espacio) */}
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4 shadow-1 relative flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-panel-border/60 shrink-0">
            <h4 className="text-xs font-bold text-body-text">Tarjeta de Área</h4>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-widest uppercase bg-success/20 text-success-text border border-success/30 shrink-0">
              <span className="size-1.5 rounded-full bg-arte-esmeralda-500 animate-pulse" />
              Vista Previa en Vivo
            </span>
          </div>

          <div className="w-full flex justify-center items-center overflow-hidden">
            <div className="w-full max-w-sm sm:max-w-md h-60 min-h-60 max-h-60 flex flex-col justify-center overflow-hidden">
              <TarjetaArea
                area={AREA_PREVIEW_DEMO}
                conteo={AREA_PREVIEW_DEMO.platforms_count ?? 6}
                plataformas={PLATAFORMAS_AREA_DEMO}
                variante={disenoCardsArea}
                alturaEstandar={true}
                onSelect={() => {}}
              />
            </div>
          </div>
        </div>

        {/* Cabecera de Variantes de Diseño con Paginador CapsulePager (1/3) */}
        <div className="flex items-center justify-between w-full shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-label flex items-center gap-2">
            <Icono nombre="panel" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
            <span>Variantes de Diseño Disponibles</span>
          </h4>

          <CapsulePager
            page={pagina}
            totalPages={TOTAL_PAGINAS}
            onChange={setPagina}
            label="Variantes de diseño disponibles"
            ariaLabelAnterior="Página anterior"
            ariaLabelSiguiente="Página siguiente"
            tamano="sm"
          />
        </div>

        {/* Cuadrícula de Opciones de Diseño (Exactamente 4 elementos por página en cuadrícula 2x2, adaptable por porcentaje) */}
        <div
          role="radiogroup"
          aria-label="Seleccionar diseño de tarjetas de área"
          className="grid grid-cols-2 grid-rows-2 gap-2 sm:gap-2.5 flex-1 min-h-47.5"
        >
          {variantesPaginaActual.map((variante) => {
            const estaSeleccionada = disenoCardsArea === variante.id;
            return (
              <button
                key={variante.id}
                type="button"
                onClick={() => handleSeleccionarDiseno(variante.id)}
                role="radio"
                aria-checked={estaSeleccionada}
                aria-label={variante.ariaLabel}
                className={`min-w-12 flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer h-full min-h-22 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  estaSeleccionada
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                    : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">{variante.titulo}</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${
                      estaSeleccionada
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                {variante.renderPreview()}
              </button>
            );
          })}

          {/* Ghost cards para completar la cuadrícula 2x2 en la última página y preservar simetría estricta */}
          {Array.from({ length: ghostCardsNecesarias }).map((_, index) => (
            <div
              key={`ghost-card-${index}`}
              data-testid="area-design-ghost-card"
              aria-hidden="true"
              className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border border-dashed border-panel-border/70 bg-panel-fill/20 text-center h-full min-h-22 select-none pointer-events-none opacity-atenuada"
            >
              <div className="size-6 rounded-lg bg-superficie-hundida flex items-center justify-center text-label/40 mb-1.5 shrink-0">
                <Icono nombre="panel" tamano="xs" ariaHidden={true} />
              </div>
              <span className="text-xs font-medium text-label/60">Espacio disponible</span>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
