'use client';

/**
 * Vista de Personalización y Configuración de Visualización del Portal (DIS-117).
 *
 * Permite al usuario configurar:
 * 1. Disposición de interfaz: Vista Barra Lateral (Sidebar) vs Vista Barra Superior (Topbar).
 * 2. Visibilidad de Documentos: Mostrar u ocultar la sección de Carta Responsiva en la barra lateral.
 * 3. Indicadores circulares (Badges): Mostrar u ocultar los contadores numéricos en pastilla circular del sidebar.
 * 4. Variante de diseño de tarjetas: Estándar (Completa con métricas), Compacta (Minimalista) y Horizontal (Lista).
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { PlatformsLayout } from '@/lib/platforms-layout';
import type { CatalogItem } from '@/lib/access/types';
import type { Area, Platform } from '@/lib/types';
import { Button } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import {
  guardarOmitirBienvenida,
  leerOmitirBienvenida,
  PlatformsWelcomeModal,
} from './platforms-welcome-modal';
import { PlatformMockupCard } from './platform-mockup-card';
import { TarjetaArea } from '../areas/tarjeta-area';
import { PremiumEmptyState } from '../premium-message';

export const CLAVE_BOTON_USUARIO_COMPACTO = 'nexus.platforms.compact_user_button';
export const EVENTO_BOTON_USUARIO_COMPACTO = 'nexus:compact-user-button';
export const CLAVE_MOSTRAR_DOCUMENTOS = 'nexus.platforms.show_documents';
export const EVENTO_MOSTRAR_DOCUMENTOS = 'nexus:show-documents';

export function leerMostrarDocumentos(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = window.localStorage.getItem(CLAVE_MOSTRAR_DOCUMENTOS);
    return val !== null ? val === 'true' : true;
  } catch {
    return true;
  }
}

export function guardarMostrarDocumentos(mostrar: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE_MOSTRAR_DOCUMENTOS, String(mostrar));
  } catch {}
  window.dispatchEvent(new CustomEvent<boolean>(EVENTO_MOSTRAR_DOCUMENTOS, { detail: mostrar }));
}

export const ITEM_PREVIEW_DEMO: CatalogItem = {
  platform: {
    id: 999,
    name: 'AWS Cloud Console',
    description: 'Gestión centralizada de infraestructura de nube, servidores EC2, almacenamiento S3 y bases de datos.',
    icon: 'plataformas',
  },
  area: { id: 1, name: 'Tecnología & TI' },
  my_level: 'admin',
  my_access_status: 'activo',
  pending_request_id: null,
  can_request: true,
  requestable_levels: ['admin'],
};

export const PLATAFORMA_MINE_DEMO: Platform = {
  id: 999,
  name: 'AWS Cloud Console',
  description: 'Gestión centralizada de infraestructura de nube, servidores EC2, almacenamiento S3 y bases de datos.',
  area_id: 1,
  area_name: 'Tecnología & TI',
  icon: 'plataformas',
  direct_link: 'https://aws.amazon.com',
  status: 'Activo',
  bg_color: '#1e1b4b',
  text_color: '#ffffff',
  my_access_status: 'activo',
  my_level: 'admin',
  is_favorite: true,
  integration_type: 'conector',
} as unknown as Platform;

export const AREA_PREVIEW_DEMO: Area = {
  id: 1,
  name: 'Tecnología & TI',
  description: 'Dirección General de Sistemas, Redes e Infraestructura de Servidores Corporativos.',
  icon: 'plataformas',
  color: '#2563eb',
  status: 'Activo',
  platforms_count: 6,
  users_count: 28,
} as unknown as Area;

export const PLATAFORMAS_AREA_DEMO: Platform[] = [
  { id: 1, name: 'AWS Cloud', area_id: 1, bg_color: '#1e1b4b' } as unknown as Platform,
  { id: 2, name: 'Slack Enterprise', area_id: 1, bg_color: '#047857' } as unknown as Platform,
  { id: 3, name: 'GitHub Enterprise', area_id: 1, bg_color: '#312e81' } as unknown as Platform,
  { id: 4, name: 'Datadog', area_id: 1, bg_color: '#701a75' } as unknown as Platform,
];

export function leerBotonUsuarioCompacto(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CLAVE_BOTON_USUARIO_COMPACTO) === 'true';
  } catch {
    return false;
  }
}

export function guardarBotonUsuarioCompacto(compacto: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE_BOTON_USUARIO_COMPACTO, String(compacto));
  } catch { }
  window.dispatchEvent(new CustomEvent<boolean>(EVENTO_BOTON_USUARIO_COMPACTO, { detail: compacto }));
}

export type CardDesignVariant =
  | 'duotono'
  | 'enmarcada'
  | 'evento'
  | 'split'
  | 'glass'
  | 'editorial'
  | 'portada'
  | 'estandar'
  | 'compacta'
  | 'horizontal'
  | 'banner'
  | 'flotante';

export type AreaCardDesignVariant =
  | 'split'
  | 'onda'
  | 'directorio'
  | 'bento'
  | 'medallon'
  | 'estandar'
  | 'portada'
  | 'banner'
  | 'glass'
  | 'flotante';

export const CLAVE_DISENO_CARDS = 'nexus.platforms.card_design';
export const CLAVE_DISENO_CARDS_AREA = 'nexus.platforms.area_card_design';
export const CLAVE_FORZAR_DISENO_AREA = 'nexus.platforms.force_area_card_design';
export const EVENTO_FORZAR_DISENO_AREA = 'nexus:force-area-card-design';
export const CLAVE_FORZAR_DISENO_PLATAFORMA = 'nexus.platforms.force_platform_card_design';
export const EVENTO_FORZAR_DISENO_PLATAFORMA = 'nexus:force-platform-card-design';

export function leerForzarDisenoArea(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CLAVE_FORZAR_DISENO_AREA) === 'true';
  } catch {
    return false;
  }
}

export function guardarForzarDisenoArea(forzar: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE_FORZAR_DISENO_AREA, String(forzar));
  } catch {}
  window.dispatchEvent(new CustomEvent<boolean>(EVENTO_FORZAR_DISENO_AREA, { detail: forzar }));
}

export function leerForzarDisenoPlataforma(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CLAVE_FORZAR_DISENO_PLATAFORMA) === 'true';
  } catch {
    return false;
  }
}

export function guardarForzarDisenoPlataforma(forzar: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE_FORZAR_DISENO_PLATAFORMA, String(forzar));
  } catch {}
  window.dispatchEvent(new CustomEvent<boolean>(EVENTO_FORZAR_DISENO_PLATAFORMA, { detail: forzar }));
}

export type SettingsTab = 'general' | 'areas' | 'plataformas';

export interface UserViewSettingsProps {
  layout: PlatformsLayout;
  onLayoutChange: (layout: PlatformsLayout) => void;
  mostrarDocumentos: boolean;
  onToggleMostrarDocumentos: (mostrar: boolean) => void;
  mostrarBadgesSidebar: boolean;
  onToggleMostrarBadgesSidebar: (mostrar: boolean) => void;
  botonUsuarioCompacto?: boolean;
  onToggleBotonUsuarioCompacto?: (compacto: boolean) => void;
  disenoCards: CardDesignVariant;
  onDisenoCardsChange: (diseno: CardDesignVariant) => void;
  disenoCardsArea?: AreaCardDesignVariant;
  onDisenoCardsAreaChange?: (diseno: AreaCardDesignVariant) => void;
  forzarDisenoArea?: boolean;
  forzarDisenoPlataforma?: boolean;
  tabInicial?: SettingsTab | 'diseno';
  onVolver?: () => void;
}

export function UserViewSettings({
  layout,
  onLayoutChange,
  mostrarDocumentos,
  onToggleMostrarDocumentos,
  mostrarBadgesSidebar,
  onToggleMostrarBadgesSidebar,
  botonUsuarioCompacto,
  onToggleBotonUsuarioCompacto,
  disenoCards,
  onDisenoCardsChange,
  disenoCardsArea = 'estandar',
  onDisenoCardsAreaChange,
  forzarDisenoArea: forzarDisenoAreaProp,
  forzarDisenoPlataforma: forzarDisenoPlataformaProp,
  tabInicial = 'general',
}: UserViewSettingsProps) {
  const { avisar } = useToast();
  const [tabActiva, setTabActiva] = useState<SettingsTab>(() => {
    if (tabInicial === 'diseno') return 'plataformas';
    return (tabInicial as SettingsTab) || 'general';
  });
  const [demoFavorite, setDemoFavorite] = useState(true);
  const [omitidoBienvenida, setOmitidoBienvenida] = useState<boolean>(() => leerOmitirBienvenida());
  const [previsualizarBienvenida, setPrevisualizarBienvenida] = useState(false);
  const [compactoLocal, setCompactoLocal] = useState<boolean>(() => leerBotonUsuarioCompacto());
  const [forzarAreaLocal, setForzarAreaLocal] = useState<boolean>(() => leerForzarDisenoArea());
  const [forzarPlatLocal, setForzarPlatLocal] = useState<boolean>(() => leerForzarDisenoPlataforma());

  const esCompacto = botonUsuarioCompacto !== undefined ? botonUsuarioCompacto : compactoLocal;
  const esForzadoArea = forzarDisenoAreaProp !== undefined ? forzarDisenoAreaProp : forzarAreaLocal;
  const esForzadoPlat = forzarDisenoPlataformaProp !== undefined ? forzarDisenoPlataformaProp : forzarPlatLocal;

  useEffect(() => {
    function onForzarAreaChange(e: Event) {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setForzarAreaLocal(customEvent.detail);
      } else {
        setForzarAreaLocal(leerForzarDisenoArea());
      }
    }
    function onForzarPlatChange(e: Event) {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setForzarPlatLocal(customEvent.detail);
      } else {
        setForzarPlatLocal(leerForzarDisenoPlataforma());
      }
    }
    window.addEventListener(EVENTO_FORZAR_DISENO_AREA, onForzarAreaChange);
    window.addEventListener(EVENTO_FORZAR_DISENO_PLATAFORMA, onForzarPlatChange);
    return () => {
      window.removeEventListener(EVENTO_FORZAR_DISENO_AREA, onForzarAreaChange);
      window.removeEventListener(EVENTO_FORZAR_DISENO_PLATAFORMA, onForzarPlatChange);
    };
  }, []);

  const itemPreviewDemo = useMemo(
    () => ({
      ...ITEM_PREVIEW_DEMO,
      platform: {
        ...ITEM_PREVIEW_DEMO.platform,
        is_favorite: demoFavorite,
      },
    }),
    [demoFavorite],
  );

  const minePreviewDemo = useMemo(
    () => ({
      ...PLATAFORMA_MINE_DEMO,
      is_favorite: demoFavorite,
    }),
    [demoFavorite],
  );

  const handleToggleCompacto = (val: boolean) => {
    setCompactoLocal(val);
    guardarBotonUsuarioCompacto(val);
    onToggleBotonUsuarioCompacto?.(val);
    avisar(
      'info',
      val ? 'Botón de usuario colapsado a solo icono.' : 'Botón de usuario expandido con nombre y rol.',
      'Preferencia de usuario',
    );
  };

  const handleToggleBienvenida = (mostrar: boolean) => {
    const nuevoOmitir = !mostrar;
    guardarOmitirBienvenida(nuevoOmitir);
    setOmitidoBienvenida(nuevoOmitir);
    if (mostrar) {
      avisar('success', 'Mensaje de bienvenida restaurado. Se mostrará en tus próximas visitas.', 'Restaurado');
    } else {
      avisar('info', 'Mensaje de bienvenida omitido para las próximas visitas.', 'Omitido');
    }
  };

  // Regla de disponibilidad condicional según el layout del portal:
  // - Badges circulares solo aplican a la barra lateral (deshabilitado en topbar).
  // - Colapsar botón de usuario solo aplica a la barra superior (deshabilitado en sidebar).
  const deshabilitarBadges = layout === 'topbar';
  const deshabilitarBotonCompacto = layout === 'sidebar';

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full gap-4 overflow-y-auto pr-1">
      {/* 1. BARRA DE NAVEGACIÓN POR PESTAÑAS (TABS: GENERAL, ÁREAS, PLATAFORMAS) */}
      <div className="w-full flex items-center gap-4 pb-2 border-b border-borde shrink-0">
        <div
          role="tablist"
          aria-label="Pestañas de configuración visual"
          className="flex items-center gap-2.5 flex-wrap"
        >
          {/* Pestaña: General */}
          <button
            type="button"
            role="tab"
            id="tab-general"
            aria-controls="panel-general"
            aria-selected={tabActiva === 'general'}
            onClick={() => setTabActiva('general')}
            className={`inline-flex h-12 min-h-12 w-36 sm:w-40 shrink-0 items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border shadow-xs transition-all duration-rapida cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tabActiva === 'general'
                ? 'border-primary bg-primary text-texto-sobre-accion shadow-1 ring-2 ring-primary/20'
                : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:text-body-text hover:shadow-1'
            }`}
          >
            <Icono
              nombre="panel"
              tamano="sm"
              ariaHidden={true}
              className={`shrink-0 ${tabActiva === 'general' ? 'text-texto-sobre-accion' : 'text-label'}`}
            />
            <span className="truncate">General</span>
          </button>

          {/* Pestaña: Áreas */}
          <button
            type="button"
            role="tab"
            id="tab-areas"
            aria-controls="panel-areas"
            aria-selected={tabActiva === 'areas'}
            onClick={() => setTabActiva('areas')}
            className={`inline-flex h-12 min-h-12 w-36 sm:w-40 shrink-0 items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border shadow-xs transition-all duration-rapida cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tabActiva === 'areas'
                ? 'border-primary bg-primary text-texto-sobre-accion shadow-1 ring-2 ring-primary/20'
                : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:text-body-text hover:shadow-1'
            }`}
          >
            <Icono
              nombre="areas"
              tamano="sm"
              ariaHidden={true}
              className={`shrink-0 ${tabActiva === 'areas' ? 'text-texto-sobre-accion' : 'text-label'}`}
            />
            <span className="truncate">Áreas</span>
          </button>

          {/* Pestaña: Plataformas */}
          <button
            type="button"
            role="tab"
            id="tab-plataformas"
            aria-controls="panel-plataformas"
            aria-selected={tabActiva === 'plataformas'}
            onClick={() => setTabActiva('plataformas')}
            className={`inline-flex h-12 min-h-12 w-36 sm:w-40 shrink-0 items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border shadow-xs transition-all duration-rapida cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tabActiva === 'plataformas'
                ? 'border-primary bg-primary text-texto-sobre-accion shadow-1 ring-2 ring-primary/20'
                : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:text-body-text hover:shadow-1'
            }`}
          >
            <Icono
              nombre="plataformas"
              tamano="sm"
              ariaHidden={true}
              className={`shrink-0 ${tabActiva === 'plataformas' ? 'text-texto-sobre-accion' : 'text-label'}`}
            />
            <span className="truncate">Plataformas</span>
          </button>
        </div>
      </div>

      {tabActiva === 'general' ? (
        <div id="panel-general" role="tabpanel" aria-labelledby="tab-general" className="flex-1 min-h-0 h-full w-full flex flex-col gap-4">
          {/* Fila 1: Grid de 1 fila y 2 columnas (Disposición Principal a la izquierda, Mensaje de Bienvenida a la derecha) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch shrink-0">
            {/* 1. SECCIÓN: SELECTOR DE DISPOSICIÓN PRINCIPAL (LAYOUT) */}
            <div className="rounded-2xl border border-panel-border bg-panel-fill shadow-1 flex flex-col justify-between h-full overflow-hidden">
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-surface-container border-b border-panel-border flex items-start justify-between gap-3 shrink-0 min-h-[64px]">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-body-text flex items-center gap-2">
                    <Icono nombre="panel" tamano="sm" className="text-primary-text" />
                    <span>Disposición Principal del Portal</span>
                  </h4>
                  <p className="text-xs text-label mt-1">
                    Selecciona la estructura de navegación con la que prefieres interactuar en tu espacio de plataformas.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-fr">
                  {/* Opción A: Barra Lateral (Sidebar) */}
                  <button
                    type="button"
                    onClick={() => onLayoutChange('sidebar')}
                    role="radio"
                    aria-checked={layout === 'sidebar'}
                    aria-label="Seleccionar vista Barra Lateral (Sidebar)"
                    className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer h-full min-h-[96px] outline-none focus-visible:ring-2 focus-visible:ring-primary ${layout === 'sidebar'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-body-text">
                        <Icono nombre="panel" tamano="sm" className="text-primary-text shrink-0" />
                        <span>Vista Barra Lateral (Sidebar)</span>
                      </span>
                      <span
                        className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${layout === 'sidebar'
                            ? 'border-primary bg-primary text-texto-sobre-accion'
                            : 'border-panel-border bg-fondo text-transparent'
                          }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    </div>
                    <p className="text-xs text-texto-secundario leading-relaxed line-clamp-3">
                      Menú vertical permanente con árbol de navegación rápido, desglose por áreas y accesos directos.
                    </p>
                  </button>

                  {/* Opción B: Barra Superior (Topbar) */}
                  <button
                    type="button"
                    onClick={() => onLayoutChange('topbar')}
                    role="radio"
                    aria-checked={layout === 'topbar'}
                    aria-label="Seleccionar vista Barra Superior (Topbar)"
                    className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer h-full min-h-[96px] outline-none focus-visible:ring-2 focus-visible:ring-primary ${layout === 'topbar'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-body-text">
                        <Icono nombre="plataformas" tamano="sm" className="text-primary-text shrink-0" />
                        <span>Vista Barra Superior (Topbar)</span>
                      </span>
                      <span
                        className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${layout === 'topbar'
                            ? 'border-primary bg-primary text-texto-sobre-accion'
                            : 'border-panel-border bg-fondo text-transparent'
                          }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    </div>
                    <p className="text-xs text-texto-secundario leading-relaxed line-clamp-3">
                      Menú horizontal integrado en la cabecera superior. Maximiza el área horizontal útil.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. SECCIÓN: MENSAJE DE BIENVENIDA */}
            <div className="rounded-2xl border border-panel-border bg-panel-fill shadow-1 flex flex-col justify-between h-full overflow-hidden">
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-surface-container border-b border-panel-border flex items-start justify-between gap-3 shrink-0 min-h-[64px]">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-body-text flex items-center gap-2">
                    <Icono nombre="info" tamano="sm" className="text-primary-text" />
                    <span>Mensaje de Bienvenida</span>
                  </h4>
                  <p className="text-xs text-label mt-1">
                    Controla el modal de saludo y resumen al ingresar al portal.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPrevisualizarBienvenida(true)}
                  className="min-h-9 px-3.5 text-xs font-bold shrink-0 self-center"
                  aria-label="Previsualizar mensaje de bienvenida"
                >
                  Previsualizar
                </Button>
              </div>

              {/* Contenedor del toggle con altura y padding exactamente simétricos con los botones de disposición */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div className="flex-1 h-full flex flex-col justify-between p-3.5 rounded-xl border border-panel-border bg-superficie hover:border-panel-border/90 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary-text shrink-0">
                        <Icono nombre="info" tamano="xs" ariaHidden={true} />
                      </span>
                      <label
                        htmlFor="toggle-mensaje-bienvenida"
                        className="text-xs font-bold text-body-text cursor-pointer select-none truncate"
                      >
                        Mostrar mensaje de bienvenida al entrar
                      </label>
                    </div>

                    <button
                      type="button"
                      id="toggle-mensaje-bienvenida"
                      role="switch"
                      aria-checked={!omitidoBienvenida}
                      aria-label="Mostrar mensaje de bienvenida al entrar"
                      onClick={() => handleToggleBienvenida(omitidoBienvenida)}
                      className="inline-flex items-center justify-end p-1 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shrink-0"
                    >
                      <span
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out ${
                          !omitidoBienvenida ? 'bg-primary border-transparent' : 'bg-surface-container border-panel-border'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block size-5 transform rounded-full bg-superficie shadow-md ring-0 transition duration-200 ease-in-out ${
                            !omitidoBienvenida ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>

                  <p className="text-xs text-texto-secundario leading-relaxed line-clamp-3">
                    Desactiva para omitir el modal de saludo automáticamente o activa para restaurar su visualización al ingresar al portal de plataformas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fila 2: Elementos de la Barra Lateral con opciones en filas separadas */}
          <div className="rounded-2xl border border-panel-border bg-panel-fill shadow-1 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-surface-container border-b border-panel-border flex items-start justify-between gap-3 shrink-0 min-h-[60px]">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-body-text flex items-center gap-2">
                  <Icono nombre="inventario" tamano="sm" className="text-primary-text" />
                  <span>Elementos de la Barra Lateral</span>
                </h4>
                <p className="text-xs text-label mt-1">
                  Controla qué componentes informativos y auxiliares se muestran en el menú lateral.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1 min-h-0 flex flex-col justify-between">
              <div className="flex flex-col gap-3 flex-1 justify-between my-auto">
                {/* Opción 1: Mostrar Documentos (Carta Responsiva) */}
                <div className="flex-1 min-h-[56px] flex items-center justify-between gap-4 p-4 rounded-xl border border-panel-border bg-superficie hover:border-panel-border/90 transition-colors">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="toggle-documentos"
                      className="text-xs font-bold text-body-text cursor-pointer select-none block"
                    >
                      Mostrar Sección de Documentos (Carta Responsiva)
                    </label>
                    <p className="text-xs text-texto-secundario mt-0.5 select-none leading-relaxed">
                      Muestra en el menú lateral la caja de estado de tu Carta Responsiva corporativa con su indicador de firma.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="toggle-documentos"
                    role="switch"
                    aria-checked={mostrarDocumentos}
                    aria-label="Mostrar u ocultar sección de documentos"
                    onClick={() => onToggleMostrarDocumentos(!mostrarDocumentos)}
                    className="min-h-12 min-w-12 inline-flex items-center justify-end p-1 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shrink-0"
                  >
                    <span
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out ${mostrarDocumentos ? 'bg-primary border-transparent' : 'bg-surface-container border-panel-border'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-superficie shadow-md ring-0 transition duration-200 ease-in-out ${mostrarDocumentos ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </span>
                  </button>
                </div>

                {/* Opción 2: Mostrar Badges Circulares con Contadores en el Sidebar */}
                <div
                  className={`flex-1 min-h-[56px] flex items-center justify-between gap-4 p-4 rounded-xl border border-panel-border transition-colors ${
                    deshabilitarBadges
                      ? 'bg-surface-container/40 opacity-60 cursor-not-allowed'
                      : 'bg-superficie hover:border-panel-border/90'
                  }`}
                  aria-disabled={deshabilitarBadges}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="toggle-badges"
                        className={`text-xs font-bold text-body-text select-none block ${
                          deshabilitarBadges ? 'cursor-not-allowed text-texto-secundario' : 'cursor-pointer'
                        }`}
                      >
                        Mostrar Badges Circulares con Contadores en el Sidebar
                      </label>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-panel-border bg-surface-container text-texto-secundario uppercase tracking-wide shrink-0">
                        Solo en Sidebar
                      </span>
                    </div>
                    <p className="text-xs text-texto-secundario mt-0.5 select-none leading-relaxed">
                      {deshabilitarBadges
                        ? 'Esta opción solo tiene efecto cuando la vista principal del portal está configurada en Barra Lateral (Sidebar).'
                        : 'Muestra las pastillas circulares simétricas con la cantidad de plataformas en Favoritas, Mi Widget y Áreas.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="toggle-badges"
                    role="switch"
                    disabled={deshabilitarBadges}
                    aria-disabled={deshabilitarBadges}
                    aria-checked={mostrarBadgesSidebar}
                    aria-label="Mostrar u ocultar badges circulares en el sidebar"
                    onClick={() => {
                      if (!deshabilitarBadges) {
                        onToggleMostrarBadgesSidebar(!mostrarBadgesSidebar);
                      }
                    }}
                    className={`min-h-12 min-w-12 inline-flex items-center justify-end p-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shrink-0 ${
                      deshabilitarBadges ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    }`}
                  >
                    <span
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out ${
                        mostrarBadgesSidebar
                          ? deshabilitarBadges
                            ? 'bg-primary/40 border-transparent'
                            : 'bg-primary border-transparent'
                          : 'bg-surface-container border-panel-border'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-superficie shadow-md ring-0 transition duration-200 ease-in-out ${
                          mostrarBadgesSidebar ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </span>
                  </button>
                </div>

                {/* Opción 3: Colapsar Botón de Usuario (Solo Icono) */}
                <div
                  className={`flex-1 min-h-[56px] flex items-center justify-between gap-4 p-4 rounded-xl border border-panel-border transition-colors ${
                    deshabilitarBotonCompacto
                      ? 'bg-surface-container/40 opacity-60 cursor-not-allowed'
                      : 'bg-superficie hover:border-panel-border/90'
                  }`}
                  aria-disabled={deshabilitarBotonCompacto}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="toggle-boton-usuario-compacto"
                        className={`text-xs font-bold text-body-text select-none block ${
                          deshabilitarBotonCompacto ? 'cursor-not-allowed text-texto-secundario' : 'cursor-pointer'
                        }`}
                      >
                        Colapsar botón de usuario (solo mostrar icono)
                      </label>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-panel-border bg-surface-container text-texto-secundario uppercase tracking-wide shrink-0">
                        Solo en Topbar
                      </span>
                    </div>
                    <p className="text-xs text-texto-secundario mt-0.5 select-none leading-relaxed">
                      {deshabilitarBotonCompacto
                        ? 'Esta opción solo tiene efecto cuando la vista principal del portal está configurada en Barra Superior (Topbar).'
                        : 'En la barra superior, reduce el botón de usuario para mostrar únicamente el avatar con tus iniciales.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="toggle-boton-usuario-compacto"
                    role="switch"
                    disabled={deshabilitarBotonCompacto}
                    aria-disabled={deshabilitarBotonCompacto}
                    aria-checked={esCompacto}
                    aria-label="Colapsar botón de usuario para mostrar solo icono"
                    onClick={() => {
                      if (!deshabilitarBotonCompacto) {
                        handleToggleCompacto(!esCompacto);
                      }
                    }}
                    className={`min-h-12 min-w-12 inline-flex items-center justify-end p-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shrink-0 ${
                      deshabilitarBotonCompacto ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    }`}
                  >
                    <span
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ease-in-out ${
                        esCompacto
                          ? deshabilitarBotonCompacto
                            ? 'bg-primary/40 border-transparent'
                            : 'bg-primary border-transparent'
                          : 'bg-surface-container border-panel-border'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-superficie shadow-md ring-0 transition duration-200 ease-in-out ${
                          esCompacto ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : tabActiva === 'areas' ? (
        <div
          id="panel-areas"
          role="tabpanel"
          aria-labelledby="tab-areas"
          className={`flex-1 min-h-0 h-full w-full ${
            esForzadoArea
              ? 'flex flex-col'
              : 'grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 items-stretch'
          }`}
        >
          {esForzadoArea ? (
            <div className="flex-1 min-h-[460px] h-full w-full flex flex-col">
              <PremiumEmptyState
                role="alert"
                icono="areas"
                badge="Bloqueado por Admin"
                badgeTestId="badge-diseno-bloqueado-area"
                title="Diseño de Tarjetas de Área Bloqueado"
                message="El administrador ha forzado el diseño corporativo para las tarjetas de área en todo el portal. Las opciones de personalización individual están deshabilitadas."
                className="w-full h-full flex-1 min-h-[460px] rounded-2xl"
              />
            </div>
          ) : (
            <>
              {/* Columna 1 (Izquierda, md:col-span-7): Selector de Estilos de Tarjeta de Área (10 Opciones) */}
              <div className="md:col-span-7 p-4 sm:p-5 rounded-2xl border border-panel-border bg-panel-fill shadow-1 flex flex-col justify-between h-full min-h-0">
            <div className="mb-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-body-text flex items-center gap-2">
                    <Icono nombre="areas" tamano="sm" className="text-primary-text" />
                    <span>Diseño de Tarjetas de Área Organizativa</span>
                  </h4>
                  <p className="text-xs text-label mt-1">
                    Configura de forma independiente el estilo de las tarjetas departamentales en el portal.
                  </p>
                </div>
                {esForzadoArea ? (
                  <span
                    data-testid="badge-diseno-bloqueado-area"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0"
                  >
                    <Icono nombre="escudo" tamano="xs" ariaHidden={true} />
                    <span>Bloqueado por Admin</span>
                  </span>
                ) : null}
              </div>

              {esForzadoArea ? (
                <div
                  role="alert"
                  className="mt-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5"
                >
                  <Icono nombre="info" tamano="xs" className="text-amber-600 dark:text-amber-400 shrink-0" ariaHidden={true} />
                  <p className="leading-relaxed">
                    El administrador ha forzado el diseño corporativo para las tarjetas de área. Las opciones de personalización individual están deshabilitadas.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-fr my-auto">
              {/* Opción Área 1: Split 50/50 (Harvest Vase) */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('split');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'split'}
                aria-label="Diseño de Área Split 50/50 estilo Harvest Vase"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'split'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Split 50/50</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'split'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg overflow-hidden border border-emerald-500/30 flex mt-auto shrink-0 shadow-2xs">
                  <div className="w-1/2 bg-emerald-500/20 p-1 flex items-center justify-center">
                    <div className="size-4 rounded bg-emerald-600 text-[8px] text-white font-bold flex items-center justify-center">TI</div>
                  </div>
                  <div className="w-1/2 p-1.5 bg-fondo flex flex-col justify-center space-y-1">
                    <div className="h-1.5 w-8 rounded bg-label/40" />
                    <div className="h-2 w-10 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </button>

              {/* Opción Área 2: Onda Curva (SVG) */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('onda');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'onda'}
                aria-label="Diseño de Área Onda Curva Asimétrica"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'onda'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Onda Curva SVG</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'onda'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg overflow-hidden border border-amber-500/30 bg-fondo flex flex-col mt-auto shrink-0 shadow-2xs">
                  <div className="h-5 w-full bg-gradient-to-r from-amber-600 to-orange-500 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
                    <Icono nombre="panel" tamano="xs" className="text-white" />
                  </div>
                  <div className="p-0.5 text-center flex items-center justify-center flex-1">
                    <div className="h-1.5 w-12 rounded-full bg-amber-500" />
                  </div>
                </div>
              </button>

              {/* Opción Área 3: Directorio Corporativo */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('directorio');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'directorio'}
                aria-label="Diseño de Área Directorio Corporativo con avatares"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'directorio'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Directorio de Equipo</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'directorio'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg overflow-hidden border border-purple-500/30 bg-fondo flex flex-col mt-auto shrink-0 shadow-2xs">
                  <div className="h-5 w-full bg-gradient-to-r from-purple-950 to-indigo-950 px-1.5 flex items-center justify-between shrink-0">
                    <div className="flex -space-x-1">
                      <div className="size-2 rounded-full bg-blue-500" />
                      <div className="size-2 rounded-full bg-teal-500" />
                    </div>
                    <div className="size-2 rounded-full bg-purple-400" />
                  </div>
                  <div className="px-1.5 py-0.5 flex items-center justify-between flex-1">
                    <div className="h-1.5 w-10 rounded bg-label/40" />
                    <div className="h-2 w-8 rounded bg-purple-600" />
                  </div>
                </div>
              </button>

              {/* Opción Área 4: Mosaico Bento Grid */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('bento');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'bento'}
                aria-label="Diseño de Área Mosaico Bento Grid"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'bento'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Mosaico Bento Grid</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'bento'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full p-1 rounded-lg border border-panel-border bg-fondo flex flex-col justify-between mt-auto shrink-0 shadow-2xs">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="h-3 rounded bg-primary/10 border border-primary/20 text-[7px] text-center font-bold text-primary-text flex items-center justify-center">28</div>
                    <div className="h-3 rounded bg-superficie border border-panel-border text-[7px] text-center font-bold flex items-center justify-center">4 apps</div>
                  </div>
                  <div className="h-2 w-full rounded bg-superficie-hundida" />
                </div>
              </button>

              {/* Opción Área 5: Tarjeta Medallón Insignia */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('medallon');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'medallon'}
                aria-label="Diseño de Área Tarjeta Medallón Insignia"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'medallon'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Medallón Insignia</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'medallon'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg overflow-hidden border border-panel-border flex flex-col items-center justify-between pb-1 mt-auto shrink-0 bg-fondo shadow-2xs">
                  <div className="h-3.5 w-full bg-primary" />
                  <div className="-mt-2.5 size-4 rounded-full bg-primary border border-white flex items-center justify-center text-[7px] text-white shadow-xs">
                    <Icono nombre="favorito" tamano="xs" relleno={true} className="text-white" />
                  </div>
                  <div className="h-1.5 w-12 rounded bg-label/40" />
                </div>
              </button>

              {/* Opción Área 6: Panel Métrico Ejecutivo (DIS-102) */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('estandar');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'estandar'}
                aria-label="Diseño de Área Panel Métrico Ejecutivo DIS-102"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'estandar'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Métricas Ejecutivas</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'estandar'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full p-1 rounded-lg border border-panel-border/70 bg-fondo flex flex-col justify-between mt-auto shrink-0 shadow-2xs">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="h-3 rounded bg-superficie border border-panel-border/50 text-[7px] text-center font-bold flex items-center justify-center">12</div>
                    <div className="h-3 rounded bg-superficie border border-panel-border/50 text-[7px] text-center font-bold flex items-center justify-center">4</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1">
                      <div className="size-2 rounded-full bg-blue-500" />
                      <div className="size-2 rounded-full bg-purple-500" />
                    </div>
                    <div className="h-1.5 w-8 rounded bg-primary/30" />
                  </div>
                </div>
              </button>

              {/* Opción Área 7: Portada Fotográfica / Hero Paisaje */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('portada');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'portada'}
                aria-label="Diseño de Área con Portada Fotográfica e imagen de fondo"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'portada'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Portada Fotográfica</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'portada'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="relative h-10 w-full rounded-lg overflow-hidden bg-slate-900 border border-white/20 flex flex-col justify-between p-1.5 text-white mt-auto shrink-0 shadow-2xs">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="size-3 rounded bg-white/20 text-[6px] font-bold flex items-center justify-center">TI</span>
                    <span className="h-2 w-7 rounded-full bg-emerald-400/30 text-[5px] text-emerald-300 font-bold flex items-center justify-center">ACTIVA</span>
                  </div>
                  <div className="relative z-10 flex gap-1">
                    <div className="h-1.5 flex-1 rounded bg-white/20" />
                    <div className="h-1.5 flex-1 rounded bg-white/20" />
                  </div>
                </div>
              </button>

              {/* Opción Área 8: Hero Banner Fotográfico */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('banner');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'banner'}
                aria-label="Diseño de Área con Hero Banner Fotográfico e imagen de fondo"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'banner'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Hero Banner Fotográfico</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'banner'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg overflow-hidden border border-panel-border bg-fondo flex flex-col mt-auto shrink-0 shadow-2xs">
                  <div className="h-5 w-full bg-slate-800 relative flex items-center justify-between px-1.5 shrink-0">
                    <div className="size-3 rounded bg-primary text-[6px] text-white flex items-center justify-center font-bold">TI</div>
                    <div className="h-1.5 w-6 rounded-full bg-white/40" />
                  </div>
                  <div className="px-1.5 py-0.5 flex items-center justify-between flex-1">
                    <div className="h-1.5 w-10 rounded bg-label/40" />
                    <div className="h-2 w-8 rounded bg-superficie-hundida" />
                  </div>
                </div>
              </button>

              {/* Opción Área 9: Glassmorphism Neón */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('glass');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'glass'}
                aria-label="Diseño de Área Glassmorphism Neón con halo brillante"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'glass'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Glassmorphism Neón</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'glass'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg border border-primary/40 bg-primary/10 backdrop-blur-xs flex flex-col justify-between p-1.5 mt-auto shrink-0 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="size-3 rounded bg-primary/40" />
                    <div className="size-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="h-2 w-full rounded-md bg-gradient-to-r from-primary to-accent" />
                </div>
              </button>

              {/* Opción Área 10: Flotante Inmersiva */}
              <button
                type="button"
                disabled={esForzadoArea}
                aria-disabled={esForzadoArea}
                onClick={() => {
                  if (!esForzadoArea) onDisenoCardsAreaChange?.('flotante');
                }}
                role="radio"
                aria-checked={disenoCardsArea === 'flotante'}
                aria-label="Diseño de Área Flotante Inmersiva con cristal translúcido"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoArea
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCardsArea === 'flotante'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Flotante Inmersiva</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCardsArea === 'flotante'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="relative h-10 w-full rounded-lg overflow-hidden bg-slate-900 border border-white/20 flex flex-col justify-between p-1.5 text-white mt-auto shrink-0 shadow-2xs">
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="h-1 w-6 rounded-full bg-white/40" />
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="relative z-10 p-0.5 rounded bg-black/70 backdrop-blur-xs border border-white/20 flex items-center justify-between">
                    <span className="size-2 rounded bg-primary text-[5px] text-white font-bold flex items-center justify-center">TI</span>
                    <div className="h-1 w-8 rounded bg-white/70" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Columna 2 (Derecha, md:col-span-5): Previsualización en Vivo de Tarjeta de Área */}
          <div className="md:col-span-5 flex flex-col h-full min-h-0">
            <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 shadow-1 relative overflow-hidden flex flex-col justify-between h-full min-h-0">
              <div className="shrink-0">
                <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-panel-border/80">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Vista Previa en Vivo
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-body-text">Tarjeta de Área Organizativa</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-superficie border border-panel-border text-[11px] font-bold text-primary-text uppercase">
                    {disenoCardsArea}
                  </span>
                </div>
              </div>

              <div className="rounded-xl p-4 bg-fondo border border-panel-border shadow-xs flex-1 flex items-center justify-center my-3 min-h-[300px]">
                <div className="w-full max-w-sm h-full max-h-[340px] flex flex-col justify-center">
                  <TarjetaArea
                    area={AREA_PREVIEW_DEMO}
                    conteo={4}
                    plataformas={PLATAFORMAS_AREA_DEMO}
                    variante={disenoCardsArea}
                    alturaEstandar={true}
                    onSelect={() => avisar('info', 'Demostración: Navegar al catálogo del área.', 'Previsualización')}
                  />
                </div>
              </div>

              <p className="text-[11px] text-label text-center shrink-0">
                Selecciona cualquier estilo en la columna de opciones para ver la transformación al instante.
              </p>
            </div>
          </div>
            </>
          )}
        </div>
      ) : (
        <div
          id="panel-plataformas"
          role="tabpanel"
          aria-labelledby="tab-plataformas"
          className={`flex-1 min-h-0 h-full w-full ${
            esForzadoPlat
              ? 'flex flex-col'
              : 'grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 items-stretch'
          }`}
        >
          {esForzadoPlat ? (
            <div className="flex-1 min-h-[460px] h-full w-full flex flex-col">
              <PremiumEmptyState
                role="alert"
                icono="plataformas"
                badge="Bloqueado por Admin"
                badgeTestId="badge-diseno-bloqueado-plataforma"
                title="Diseño de Tarjetas de Plataforma Bloqueado"
                message="El administrador ha forzado el diseño corporativo para las tarjetas de plataforma en todo el portal. Las opciones de personalización individual están deshabilitadas."
                className="w-full h-full flex-1 min-h-[460px] rounded-2xl"
              />
            </div>
          ) : (
            <>
              {/* Columna 1 (Izquierda, md:col-span-7): Selector de Estilos de Tarjeta de Plataforma (6 por página, 2 columnas x 3 filas) */}
              <div className="md:col-span-7 p-4 sm:p-5 rounded-2xl border border-panel-border bg-panel-fill shadow-1 flex flex-col justify-between h-full min-h-0">
            <div className="mb-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-body-text flex items-center gap-2">
                    <Icono nombre="plataformas" tamano="sm" className="text-primary-text" />
                    <span>Diseño de Tarjetas de Plataformas</span>
                  </h4>
                  <p className="text-xs text-label mt-1">
                    Elige la variante visual para presentar las herramientas individuales según la densidad y estilo que prefieras.
                  </p>
                </div>
                {esForzadoPlat ? (
                  <span
                    data-testid="badge-diseno-bloqueado-plataforma"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0"
                  >
                    <Icono nombre="escudo" tamano="xs" ariaHidden={true} />
                    <span>Bloqueado por Admin</span>
                  </span>
                ) : null}
              </div>

              {esForzadoPlat ? (
                <div
                  role="alert"
                  className="mt-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5"
                >
                  <Icono nombre="info" tamano="xs" className="text-amber-600 dark:text-amber-400 shrink-0" ariaHidden={true} />
                  <p className="leading-relaxed">
                    El administrador ha forzado el diseño corporativo para las tarjetas de plataforma. Las opciones de personalización individual están deshabilitadas.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Cuadrícula de 10 elementos (2 columnas x 5 filas) que distribuye el espacio verticalmente sin paginación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-fr my-auto">
              {/* Opción P1: Duotono a Sangre */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('duotono');
                }}
                role="radio"
                aria-checked={disenoCards === 'duotono'}
                aria-label="Diseño Duotono Oscuro a sangre estilo ciudades"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'duotono'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Duotono a Sangre</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'duotono'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg overflow-hidden border border-purple-500/30 bg-[#0f172a] flex flex-col justify-between p-1.5 mt-auto shrink-0 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="size-3 rounded bg-purple-500" />
                    <div className="h-1.5 w-12 rounded bg-purple-300/40" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 border border-slate-700/50" />
                </div>
              </button>

              {/* Opción P2: Foto Enmarcada Pastel */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('enmarcada');
                }}
                role="radio"
                aria-checked={disenoCards === 'enmarcada'}
                aria-label="Diseño Enmarcada Pastel estilo Heading Here"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'enmarcada'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Foto Enmarcada</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'enmarcada'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between px-2 mt-auto shrink-0 shadow-2xs">
                  <div className="size-5 rounded-md bg-emerald-700/60 flex items-center justify-center">
                    <div className="size-2 rounded bg-white/80" />
                  </div>
                  <div className="h-1.5 w-12 rounded bg-emerald-400/40" />
                  <div className="h-3 w-10 rounded-full bg-slate-900 dark:bg-slate-800" />
                </div>
              </button>

              {/* Opción P3: Split 50/50 Horizontal */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('split');
                }}
                role="radio"
                aria-checked={disenoCards === 'split'}
                aria-label="Diseño Split 50/50 Horizontal"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'split'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Split 50/50 Horizontal</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'split'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg overflow-hidden border border-panel-border flex mt-auto shrink-0 shadow-2xs">
                  <div className="w-1/2 bg-indigo-950 p-1 flex items-center justify-center">
                    <div className="size-4 rounded bg-primary text-[8px] text-white font-bold flex items-center justify-center">AP</div>
                  </div>
                  <div className="w-1/2 p-1.5 bg-fondo flex flex-col justify-center space-y-1">
                    <div className="h-1.5 w-8 rounded bg-label/40" />
                    <div className="h-2 w-full rounded-full bg-primary/70" />
                  </div>
                </div>
              </button>

              {/* Opción P4: Glassmorphism Neón */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('glass');
                }}
                role="radio"
                aria-checked={disenoCards === 'glass'}
                aria-label="Diseño Glassmorphism Neón"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'glass'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Glassmorphism Neón</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'glass'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg border border-primary/40 bg-primary/10 backdrop-blur-xs flex flex-col justify-between p-1.5 mt-auto shrink-0 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="size-3 rounded bg-primary/40" />
                    <div className="size-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="h-2 w-full rounded-md bg-gradient-to-r from-primary to-accent" />
                </div>
              </button>

              {/* Opción P5: Minimalista Editorial */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('editorial');
                }}
                role="radio"
                aria-checked={disenoCards === 'editorial'}
                aria-label="Diseño Minimalista Editorial"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'editorial'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Editorial Suizo</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'editorial'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg border border-panel-border bg-fondo flex flex-col justify-between p-1.5 mt-auto shrink-0 relative shadow-2xs">
                  <span className="absolute top-1 right-2 text-[9px] font-black text-label/25">#01</span>
                  <div className="h-1.5 w-10 rounded bg-body-text" />
                  <div className="flex justify-between items-center pt-0.5 border-t border-panel-border/60">
                    <div className="h-1 w-6 rounded bg-label/40" />
                    <span className="text-[8px] font-bold text-primary-text">→</span>
                  </div>
                </div>
              </button>

              {/* Opción P6: Estándar */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('estandar');
                }}
                role="radio"
                aria-checked={disenoCards === 'estandar'}
                aria-label="Diseño Estándar con métricas y datos completos"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'estandar'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Diseño Estándar</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'estandar'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg border border-panel-border bg-superficie flex flex-col justify-between p-1.5 mt-auto shrink-0 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="h-1.5 w-12 rounded bg-label/40" />
                    <div className="h-1.5 w-6 rounded-full bg-success/60" />
                  </div>
                  <div className="h-2.5 w-full rounded bg-primary/30" />
                </div>
              </button>

              {/* Opción P7: Compacta */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('compacta');
                }}
                role="radio"
                aria-checked={disenoCards === 'compacta'}
                aria-label="Diseño Compacto minimalista"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'compacta'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Diseño Compacto</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'compacta'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg border border-panel-border bg-superficie flex items-center justify-between px-2.5 mt-auto shrink-0 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <div className="size-3 rounded bg-primary/30" />
                    <div className="h-1.5 w-12 rounded bg-label/40" />
                  </div>
                  <div className="size-2 rounded-full bg-primary" />
                </div>
              </button>

              {/* Opción P8: Horizontal */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('horizontal');
                }}
                role="radio"
                aria-checked={disenoCards === 'horizontal'}
                aria-label="Diseño Horizontal en fila"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'horizontal'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Diseño Horizontal</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'horizontal'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg border border-panel-border bg-superficie flex items-center justify-between px-2.5 mt-auto shrink-0 shadow-2xs">
                  <div className="flex gap-1.5 items-center">
                    <div className="size-4 rounded bg-primary text-[7px] text-white flex items-center justify-center font-bold">AW</div>
                    <div className="h-1.5 w-10 rounded bg-label/40" />
                  </div>
                  <div className="h-2.5 w-8 rounded-full bg-primary/50" />
                </div>
              </button>

              {/* Opción P9: Hero Banner Fotográfico */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('banner');
                }}
                role="radio"
                aria-checked={disenoCards === 'banner'}
                aria-label="Diseño Hero Banner Fotográfico con cabecera panorámica"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'banner'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Hero Banner</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'banner'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="h-10 w-full rounded-lg overflow-hidden border border-panel-border bg-fondo flex flex-col mt-auto shrink-0 shadow-2xs">
                  <div className="relative h-5 w-full bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 px-1.5 flex items-center justify-between shrink-0">
                    <div className="size-3 rounded bg-primary text-[6px] text-white font-bold flex items-center justify-center">AW</div>
                    <div className="size-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="px-1.5 py-0.5 flex items-center justify-between flex-1">
                    <div className="h-1.5 w-10 rounded bg-label/40" />
                    <div className="h-2 w-7 rounded bg-primary/70" />
                  </div>
                </div>
              </button>

              {/* Opción P10: Flotante Inmersiva */}
              <button
                type="button"
                disabled={esForzadoPlat}
                aria-disabled={esForzadoPlat}
                onClick={() => {
                  if (!esForzadoPlat) onDisenoCardsChange('flotante');
                }}
                role="radio"
                aria-checked={disenoCards === 'flotante'}
                aria-label="Diseño Flotante Inmersiva con cristal translúcido sobre fotografía de fondo completa"
                className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 h-full min-h-[96px] outline-none ${
                  esForzadoPlat
                    ? 'opacity-60 cursor-not-allowed border-panel-border bg-surface-container/50'
                    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ' +
                      (disenoCards === 'flotante'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-2'
                        : 'border-panel-border bg-superficie hover:border-panel-border/90 hover:bg-surface-container')
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-body-text truncate mr-2">
                    <Icono nombre="diseno" tamano="xs" className="text-primary-text shrink-0" ariaHidden={true} />
                    <span className="truncate">Flotante Inmersiva</span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-xs font-bold shrink-0 ${disenoCards === 'flotante'
                        ? 'border-primary bg-primary text-texto-sobre-accion'
                        : 'border-panel-border bg-fondo text-transparent'
                      }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <div className="relative h-10 w-full rounded-lg overflow-hidden bg-slate-900 border border-white/20 flex flex-col justify-between p-1.5 text-white mt-auto shrink-0 shadow-2xs">
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="h-1 w-6 rounded-full bg-white/40" />
                    <span className="size-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="relative z-10 p-0.5 rounded bg-black/70 backdrop-blur-xs border border-white/20 flex items-center justify-between">
                    <span className="size-2 rounded bg-primary text-[5px] text-white font-bold flex items-center justify-center">AW</span>
                    <div className="h-1 w-8 rounded bg-white/70" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Columna 2 (Derecha, md:col-span-5): Previsualización en Vivo de Tarjeta de Plataforma */}
          <div className="md:col-span-5 flex flex-col h-full min-h-0">
            <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 shadow-1 relative overflow-hidden flex flex-col justify-between h-full min-h-0">
              <div className="shrink-0">
                <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-panel-border/80">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Vista Previa en Vivo
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-body-text">Tarjeta de Plataforma</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-superficie border border-panel-border text-[11px] font-bold text-primary-text uppercase">
                    {disenoCards}
                  </span>
                </div>
              </div>

              <div className="rounded-xl p-4 bg-fondo border border-panel-border shadow-xs flex-1 flex items-center justify-center my-3 min-h-[300px]">
                <div className="w-full max-w-sm h-full max-h-[340px] flex flex-col justify-center">
                  <PlatformMockupCard
                    item={itemPreviewDemo}
                    mine={minePreviewDemo}
                    variante={disenoCards}
                    isDemo={true}
                    onFavoriteChange={(_id, fav) => {
                      setDemoFavorite(fav);
                      avisar(
                        'info',
                        fav ? 'Favorito activado en demostración.' : 'Favorito desactivado en demostración.',
                        'Previsualización',
                      );
                    }}
                    onRequest={() => avisar('info', 'Demostración: Solicitar acceso a plataforma.', 'Previsualización')}
                  />
                </div>
              </div>

              <p className="text-[11px] text-label text-center shrink-0">
                Interactúa con el botón de favorito y de acción en tiempo real sobre la maqueta.
              </p>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {previsualizarBienvenida ? (
        <PlatformsWelcomeModal
          primerNombre="Colaborador"
          activasCount={1}
          pendientesCount={0}
          onClose={() => setPrevisualizarBienvenida(false)}
        />
      ) : null}
    </div>
  );
}

