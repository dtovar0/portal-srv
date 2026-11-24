import React, { useEffect, useState } from 'react';
import { Drawer } from '../drawer';
import { Icono } from '../icono';
import { Button } from '../button';
import { CapsulePager } from '../capsule-pager';
import { PlatformMockupCard } from './platform-mockup-card';
import {
  type CardDesignVariant,
  ITEM_PREVIEW_DEMO,
  PLATAFORMA_MINE_DEMO,
  guardarForzarDisenoPlataforma,
  leerForzarDisenoPlataforma,
} from './user-view-settings';

export interface PlatformCardDesignDrawerProps {
  open: boolean;
  onClose: () => void;
  disenoCards: CardDesignVariant;
  onDisenoCardsChange: (diseno: CardDesignVariant) => void;
  forzarDisenoPlataforma?: boolean;
  onForzarDisenoPlataformaChange?: (forzar: boolean) => void;
  devolverA?: React.RefObject<HTMLElement | null>;
}

interface VariantePlataforma {
  id: CardDesignVariant;
  titulo: string;
  ariaLabel: string;
  renderPreview: () => React.ReactNode;
}

const VARIANTES_PLATAFORMA: VariantePlataforma[] = [
  {
    id: 'duotono',
    titulo: 'Duotono a Sangre',
    ariaLabel: 'Diseño Duotono Oscuro a sangre estilo ciudades',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg overflow-hidden border border-arte-purpura-500/30 bg-arte-pizarra-900 flex flex-col justify-between p-1.5 mt-auto shrink-0 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="size-3 rounded bg-arte-purpura-500" />
          <div className="h-1.5 w-12 rounded bg-arte-purpura-300/40" />
        </div>
        <div className="h-2 w-full rounded-full bg-arte-pizarra-800 border border-arte-pizarra-700/50" />
      </div>
    ),
  },
  {
    id: 'enmarcada',
    titulo: 'Foto Enmarcada',
    ariaLabel: 'Diseño Enmarcada Pastel estilo Heading Here',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg border border-success/30 bg-success/10 flex items-center justify-between px-2 mt-auto shrink-0 shadow-2xs">
        <div className="size-5 rounded-md bg-arte-esmeralda-700/60 flex items-center justify-center">
          <div className="size-2 rounded bg-arte-luz/80" />
        </div>
        <div className="h-1.5 w-12 rounded bg-arte-esmeralda-400/40" />
        <div className="h-3 w-10 rounded-full bg-arte-pizarra-900" />
      </div>
    ),
  },
  {
    id: 'split',
    titulo: 'Split 50/50',
    ariaLabel: 'Diseño Split 50/50 Horizontal',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg overflow-hidden border border-panel-border flex mt-auto shrink-0 shadow-2xs">
        <div className="w-1/2 bg-arte-indigo-950 p-1 flex items-center justify-center">
          <div className="size-4 rounded bg-primary text-xs text-arte-luz font-bold flex items-center justify-center">AP</div>
        </div>
        <div className="w-1/2 p-1.5 bg-fondo flex flex-col justify-center space-y-1">
          <div className="h-1.5 w-8 rounded bg-label/40" />
          <div className="h-2 w-full rounded-full bg-primary/70" />
        </div>
      </div>
    ),
  },
  {
    id: 'glass',
    titulo: 'Glassmorphism Neón',
    ariaLabel: 'Diseño Glassmorphism Neón',
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
    id: 'editorial',
    titulo: 'Editorial Suizo',
    ariaLabel: 'Diseño Minimalista Editorial',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg border border-panel-border bg-fondo flex flex-col justify-between p-1.5 mt-auto shrink-0 relative shadow-2xs">
        <span className="absolute top-1 right-2 text-xs font-black text-label/25">#01</span>
        <div className="h-1.5 w-10 rounded bg-body-text" />
        <div className="flex justify-between items-center pt-0.5 border-t border-panel-border/60">
          <div className="h-1 w-6 rounded bg-label/40" />
          <span className="text-xs font-bold text-primary-text">→</span>
        </div>
      </div>
    ),
  },
  {
    id: 'estandar',
    titulo: 'Diseño Estándar',
    ariaLabel: 'Diseño Estándar con métricas y datos completos',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg border border-panel-border bg-superficie flex flex-col justify-between p-1.5 mt-auto shrink-0 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-12 rounded bg-label/40" />
          <div className="h-1.5 w-6 rounded-full bg-success/60" />
        </div>
        <div className="h-2.5 w-full rounded bg-primary/30" />
      </div>
    ),
  },
  {
    id: 'compacta',
    titulo: 'Diseño Compacto',
    ariaLabel: 'Diseño Compacto minimalista',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg border border-panel-border bg-superficie flex items-center justify-between px-2.5 mt-auto shrink-0 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded bg-primary/30" />
          <div className="h-1.5 w-12 rounded bg-label/40" />
        </div>
        <div className="size-2 rounded-full bg-primary" />
      </div>
    ),
  },
  {
    id: 'horizontal',
    titulo: 'Diseño Horizontal',
    ariaLabel: 'Diseño Horizontal en fila',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg border border-panel-border bg-superficie flex items-center justify-between px-2.5 mt-auto shrink-0 shadow-2xs">
        <div className="flex gap-1.5 items-center">
          <div className="size-4 rounded bg-primary text-xs text-arte-luz flex items-center justify-center font-bold">AW</div>
          <div className="h-1.5 w-10 rounded bg-label/40" />
        </div>
        <div className="h-2.5 w-8 rounded-full bg-primary/50" />
      </div>
    ),
  },
  {
    id: 'banner',
    titulo: 'Hero Banner',
    ariaLabel: 'Diseño Hero Banner Fotográfico con cabecera panorámica',
    renderPreview: () => (
      <div className="h-10 w-full rounded-lg overflow-hidden border border-panel-border bg-fondo flex flex-col mt-auto shrink-0 shadow-2xs">
        <div className="relative h-5 w-full bg-gradient-to-r from-arte-azul-900 via-arte-indigo-950 to-arte-pizarra-900 px-1.5 flex items-center justify-between shrink-0">
          <div className="size-3 rounded bg-primary text-arte-luz font-bold flex items-center justify-center"></div>
          <div className="size-1.5 rounded-full bg-arte-ambar-400" />
        </div>
        <div className="px-1.5 py-0.5 flex items-center justify-between flex-1">
          <div className="h-1.5 w-10 rounded bg-label/40" />
          <div className="h-2 w-7 rounded bg-primary/70" />
        </div>
      </div>
    ),
  },
  {
    id: 'flotante',
    titulo: 'Flotante Inmersiva',
    ariaLabel: 'Diseño Flotante Inmersiva con cristal translúcido sobre fotografía de fondo completa',
    renderPreview: () => (
      <div className="relative h-10 w-full rounded-lg overflow-hidden bg-arte-pizarra-900 border border-arte-luz/20 flex flex-col justify-between p-1.5 text-arte-luz mt-auto shrink-0 shadow-2xs">
        <div className="absolute inset-0 bg-gradient-to-b from-arte-sombra/60 via-arte-sombra/40 to-arte-sombra/80" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="h-1 w-6 rounded-full bg-arte-luz/40" />
          <span className="size-1.5 rounded-full bg-arte-ambar-400" />
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
const TOTAL_PAGINAS = Math.ceil(VARIANTES_PLATAFORMA.length / ITEMS_POR_PAGINA);

export function PlatformCardDesignDrawer({
  open,
  onClose,
  disenoCards,
  onDisenoCardsChange,
  forzarDisenoPlataforma,
  onForzarDisenoPlataformaChange,
  devolverA,
}: PlatformCardDesignDrawerProps) {
  const [forzarLocal, setForzarLocal] = useState<boolean>(() => {
    return forzarDisenoPlataforma ?? leerForzarDisenoPlataforma();
  });
  const [demoFavorite, setDemoFavorite] = useState(true);
  const [pagina, setPagina] = useState<number>(1);

  // Sincronizar estado forzado externo
  useEffect(() => {
    if (forzarDisenoPlataforma !== undefined) {
      setForzarLocal(forzarDisenoPlataforma);
    }
  }, [forzarDisenoPlataforma]);

  // Al abrir o conmutar el diseño, saltar a la página que contiene la variante seleccionada
  useEffect(() => {
    if (open) {
      const idx = VARIANTES_PLATAFORMA.findIndex((v) => v.id === disenoCards);
      if (idx >= 0) {
        setPagina(Math.floor(idx / ITEMS_POR_PAGINA) + 1);
      }
    }
  }, [open, disenoCards]);

  const esForzado = forzarDisenoPlataforma ?? forzarLocal;

  // Modificación silenciosa sin avisos toast para no obstruir los botones de pie
  const handleToggleForzar = (nuevo: boolean) => {
    setForzarLocal(nuevo);
    guardarForzarDisenoPlataforma(nuevo);
    onForzarDisenoPlataformaChange?.(nuevo);
  };

  const handleSeleccionarDiseno = (variante: CardDesignVariant) => {
    onDisenoCardsChange(variante);
  };

  const handleReestablecer = () => {
    onDisenoCardsChange('estandar');
    handleToggleForzar(false);
    setPagina(2); // 'estandar' está en la página 2
  };

  // Cabecera diferenciada cromáticamente (bg-surface-container) con botón X de cierre
  const headerContent = (
    <div className="bg-surface-container border-b border-panel-border px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between gap-4 shrink-0">
      <div className="min-w-0">
        <h3 className="text-base font-bold text-body-text flex items-center gap-2">
          <Icono nombre="diseno" tamano="sm" className="text-primary-text shrink-0" ariaHidden={true} />
          <span>Diseño de Tarjetas de Plataforma</span>
        </h3>
        <p className="text-xs text-label mt-0.5">
          Configura de forma independiente el estilo de las tarjetas de herramientas en el catálogo del portal.
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
  const variantesPaginaActual = VARIANTES_PLATAFORMA.slice(
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
      ariaLabel="Diseño de Tarjetas de Plataforma"
      header={headerContent}
      footer={footerContent}
      sinPadding={true}
      devolverA={devolverA}
      id="drawer-diseno-tarjetas-plataforma"
    >
      <div className="h-full min-h-full flex flex-col justify-between p-4 sm:p-5 gap-3 sm:gap-4">
        {/* Interruptor para Forzar Diseño Institucional en todo el portal (compacto, sin descripción para recuperar espacio) */}
        <div className="rounded-xl border border-panel-border bg-superficie px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 shadow-2xs shrink-0">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <label
              htmlFor="toggle-forzar-diseno-plataforma"
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
            id="toggle-forzar-diseno-plataforma"
            role="switch"
            aria-checked={esForzado}
            aria-label="Forzar diseño de tarjetas de plataforma en todo el portal"
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

        {/* Recuadro de Vista Previa en Vivo de Tarjeta de Plataforma (sin contenedor interior redundante para optimizar espacio) */}
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4 shadow-1 relative flex flex-col shrink-0">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-panel-border/60 shrink-0">
            <h4 className="text-xs font-bold text-body-text">Tarjeta de Plataforma</h4>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-widest uppercase bg-success/20 text-success-text border border-success/30 shrink-0">
              <span className="size-1.5 rounded-full bg-arte-esmeralda-500 animate-pulse" />
              Vista Previa en Vivo
            </span>
          </div>

          <div className="w-full flex justify-center">
            <div className="w-full max-w-sm sm:max-w-md h-60 min-h-60 max-h-60 flex flex-col justify-center">
              <PlatformMockupCard
                item={ITEM_PREVIEW_DEMO}
                mine={{ ...PLATAFORMA_MINE_DEMO, is_favorite: demoFavorite }}
                variante={disenoCards}
                isDemo={true}
                alturaEstandar={true}
                onFavoriteChange={(_id, fav) => {
                  setDemoFavorite(fav);
                }}
                onRequest={() => {}}
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
          />
        </div>

        {/* Cuadrícula de Opciones de Diseño (Exactamente 4 elementos por página en cuadrícula 2x2, adaptable por porcentaje) */}
        <div
          role="radiogroup"
          aria-label="Seleccionar diseño de tarjetas de plataforma"
          className="grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3 flex-1 min-h-55"
        >
          {variantesPaginaActual.map((variante) => {
            const estaSeleccionada = disenoCards === variante.id;
            return (
              <button
                key={variante.id}
                type="button"
                onClick={() => handleSeleccionarDiseno(variante.id)}
                role="radio"
                aria-checked={estaSeleccionada}
                aria-label={variante.ariaLabel}
                className={`flex flex-col justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer h-full min-h-24 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  estaSeleccionada
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                    : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
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
              data-testid="platform-design-ghost-card"
              aria-hidden="true"
              className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border border-dashed border-panel-border/70 bg-panel-fill/20 text-center h-full min-h-24 select-none pointer-events-none opacity-atenuada"
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
