'use client';

/**
 * Vista de Plataformas con Barra Lateral (Workspace / Opción 2 - DIS-115).
 * Cumple al 100% con la estética visual del mockup de la Opción B:
 * - Barra lateral izquierda exclusiva (264px):
 *   - MI ESPACIO: Mis Plataformas, Favoritas, Mis Solicitudes con contadores.
 *   - CATÁLOGO POR ÁREA: Todas las áreas y desglose por departamento.
 *   - DOCUMENTOS: Carta Responsiva con indicador de estado (Firmada ✓).
 *   - Menú de usuario al pie con avatar, nombre, rol y acceso a configuración.
 * - Barra superior:
 *   - Migas de pan: Mi Espacio / Mis Plataformas.
 *   - Buscador rápido integrado.
 *   - Si es admin: [ Regresar al Panel Admin ].
 *   - Conmutador directo: [ Vista: Sidebar ].
 *   - Tema y Notificaciones.
 * - Panel principal:
 *   - Título: Mis Herramientas Asignadas.
 *   - Filtros rápidos: [ Todas ] [ Favoritas ].
 *   - Cuadrícula responsiva de 3 columnas de tarjetas de plataformas.
 * - 100% compatible con tokens de diseño (DIS-001, DIS-002, DIS-056, DIS-068, DIS-072).
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccessRequest, CatalogItem } from '@/lib/access/types';
import type { Area, Platform } from '@/lib/types';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { useCatalogoSolicitable, type MisPlataformas } from '../access/use-catalogo-solicitable';
import { RequestFormModal } from '../access/request-form-modal';
import { TarjetaArea } from '../areas/tarjeta-area';
import { Icono } from '../icono';
import { MenuUsuario } from '../marco/menu-usuario';
import { usePlatformsLayout } from '@/lib/platforms-layout';
import { UserResponsivaSection } from './user-responsiva-section';
import { useSession } from '../session-provider';
import { useTema } from '../use-tema';
import { useToast } from '../toast';
import { Button } from '../button';
import { EmptyNote, Skeleton, Spinner } from '../ui';
import { BotonIcono, CLASE_BOTON_ICONO } from '../marco/boton-icono';
import { useIndicadores } from '../marco/use-indicadores';
import { MenuNotificaciones } from './menu-notificaciones';
import { PlatformMockupCard } from './platform-mockup-card';
import { PlatformGhostCard } from './platform-ghost-card';
import { PlatformsWelcomeModal, leerOmitirBienvenida } from './platforms-welcome-modal';
import { UserRequestsTable } from './user-requests-table';
import { UserWidgetConfig } from './user-widget-config';
import { BotonRegresarAdmin } from './modal-transicion-admin';
import {
  UserViewSettings,
  type CardDesignVariant,
  type AreaCardDesignVariant,
  CLAVE_DISENO_CARDS_AREA,
  CLAVE_MOSTRAR_DOCUMENTOS,
  EVENTO_MOSTRAR_DOCUMENTOS,
  guardarMostrarDocumentos,
  leerMostrarDocumentos,
  leerBotonUsuarioCompacto,
  guardarBotonUsuarioCompacto,
} from './user-view-settings';

const CLASES_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2 lg:grid-cols-2',
  3: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3',
  4: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};

const CLASES_ROWS: Record<number, string> = {
  2: 'sm:grid-rows-[repeat(2,minmax(14rem,1fr))]',
  3: 'sm:grid-rows-[repeat(3,minmax(14rem,1fr))]',
};

const CUADRICULAS_PRESETS = [
  { f: 2, c: 2, label: '2×2' },
  { f: 2, c: 3, label: '2×3' },
  { f: 3, c: 2, label: '3×2' },
  { f: 3, c: 3, label: '3×3' },
];

function limpiarUrlParams() {
  if (typeof window !== 'undefined' && window.location.search) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

export function PlatformsSidebarView({
  mias,
  seccionInicial = 'area',
  onSeccionChange,
}: {
  mias?: MisPlataformas;
  seccionInicial?: 'area' | 'favoritas' | 'solicitudes' | 'mias' | 'widget' | 'personalizacion' | 'responsiva';
  onSeccionChange?: (seccion: 'area' | 'favoritas' | 'solicitudes' | 'widget' | 'personalizacion' | 'responsiva') => void;
}) {
  const { session } = useSession();
  const { oscuro, alternar: alternarTema } = useTema();
  const { setLayout } = usePlatformsLayout();
  const esAdmin = session?.permissions.is_admin || session?.permissions.is_area_admin;
  const esSuperadmin = session?.permissions.is_admin ?? false;
  const administradas = useMemo(
    () => new Set((session?.managed_areas ?? []).map((a) => a.id)),
    [session],
  );

  const { noLeidas } = useIndicadores({ esAdmin: Boolean(esAdmin), ruta: '/platforms' });

  // Estados de filtro
  const [seccionActiva, setSeccionActiva] = useState<'area' | 'favoritas' | 'solicitudes' | 'widget' | 'personalizacion' | 'responsiva'>(
    (seccionInicial === 'mias' ? 'area' : seccionInicial) as 'area' | 'favoritas' | 'solicitudes' | 'widget' | 'personalizacion' | 'responsiva',
  );

  useEffect(() => {
    if (seccionInicial && seccionInicial !== 'mias') {
      setSeccionActiva(seccionInicial as 'area' | 'favoritas' | 'solicitudes' | 'widget' | 'personalizacion' | 'responsiva');
    }
  }, [seccionInicial]);

  useEffect(() => {
    onSeccionChange?.(seccionActiva);
  }, [seccionActiva, onSeccionChange]);
  const [areaSeleccionada, setAreaSeleccionada] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo' | 'favorito'>('todos');
  const [termino, setTermino] = useState('');
  const [abierta, setAbierta] = useState<CatalogItem | null>(null);
  const disparador = useRef<HTMLElement | null>(null);
  const { avisar } = useToast();

  const primerNombre = session?.name ? session.name.split(' ')[0] : 'Colaborador';
  const [mostrarModalBienvenida, setMostrarModalBienvenida] = useState<boolean>(() => !leerOmitirBienvenida());

  // Estados de Mi Widget (DIS-116)
  const CLAVE_WIDGET_HABILITADO = 'nexus.platforms.widget_enabled';
  const CLAVE_WIDGET_PLATAFORMAS = 'nexus.platforms.widget_platforms';

  const [widgetHabilitado, setWidgetHabilitado] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = window.localStorage.getItem(CLAVE_WIDGET_HABILITADO);
        return val !== null ? val === 'true' : true;
      } catch {
        return true;
      }
    }
    return true;
  });

  const [plataformasWidget, setPlataformasWidget] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const guardadas = window.localStorage.getItem(CLAVE_WIDGET_PLATAFORMAS);
        if (guardadas) {
          const parsed = JSON.parse(guardadas);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      } catch {
        /* fallback */
      }
    }
    return new Set<number>();
  });

  const toggleWidgetHabilitado = useCallback((nuevo: boolean) => {
    setWidgetHabilitado(nuevo);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CLAVE_WIDGET_HABILITADO, String(nuevo));
      } catch {
        /* noop */
      }
    }
  }, []);

  const togglePlataformaWidget = useCallback((platId: number) => {
    setPlataformasWidget((prev) => {
      const next = new Set(prev);
      if (next.has(platId)) {
        next.delete(platId);
      } else {
        next.add(platId);
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(CLAVE_WIDGET_PLATAFORMAS, JSON.stringify([...next]));
        } catch {
          /* noop */
        }
      }
      return next;
    });
  }, []);

  // Estados de Personalización y Vista (DIS-117)
  const CLAVE_MOSTRAR_BADGES = 'nexus.platforms.show_sidebar_badges';
  const CLAVE_DISENO_CARDS = 'nexus.platforms.card_design';

  const [mostrarDocumentos, setMostrarDocumentos] = useState<boolean>(() => leerMostrarDocumentos());

  useEffect(() => {
    function onDocumentosChange(e: Event) {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setMostrarDocumentos(customEvent.detail);
      } else {
        setMostrarDocumentos(leerMostrarDocumentos());
      }
    }
    window.addEventListener(EVENTO_MOSTRAR_DOCUMENTOS, onDocumentosChange);
    return () => {
      window.removeEventListener(EVENTO_MOSTRAR_DOCUMENTOS, onDocumentosChange);
    };
  }, []);

  const [mostrarBadgesSidebar, setMostrarBadgesSidebar] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = window.localStorage.getItem(CLAVE_MOSTRAR_BADGES);
        return val !== null ? val === 'true' : true;
      } catch {
        return true;
      }
    }
    return true;
  });

  const [disenoCards, setDisenoCards] = useState<CardDesignVariant>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = window.localStorage.getItem(CLAVE_DISENO_CARDS);
        if (
          val === 'compacta' ||
          val === 'horizontal' ||
          val === 'estandar' ||
          val === 'duotono' ||
          val === 'enmarcada' ||
          val === 'evento' ||
          val === 'split' ||
          val === 'glass' ||
          val === 'editorial' ||
          val === 'portada' ||
          val === 'banner' ||
          val === 'flotante'
        ) {
          return val;
        }
      } catch {
        /* fallback */
      }
    }
    return 'estandar';
  });

  const toggleMostrarDocumentos = useCallback((nuevo: boolean) => {
    setMostrarDocumentos(nuevo);
    guardarMostrarDocumentos(nuevo);
  }, []);

  const toggleMostrarBadgesSidebar = useCallback((nuevo: boolean) => {
    setMostrarBadgesSidebar(nuevo);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CLAVE_MOSTRAR_BADGES, String(nuevo));
      } catch {
        /* noop */
      }
    }
  }, []);

  const handleDisenoCardsChange = useCallback((nuevo: CardDesignVariant) => {
    setDisenoCards(nuevo);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CLAVE_DISENO_CARDS, nuevo);
      } catch {
        /* noop */
      }
    }
  }, []);

  const [disenoCardsArea, setDisenoCardsArea] = useState<AreaCardDesignVariant>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = window.localStorage.getItem(CLAVE_DISENO_CARDS_AREA);
        if (
          val === 'split' ||
          val === 'onda' ||
          val === 'directorio' ||
          val === 'bento' ||
          val === 'medallon' ||
          val === 'portada' ||
          val === 'banner' ||
          val === 'estandar'
        ) {
          return val;
        }
      } catch {
        /* fallback */
      }
    }
    return 'estandar';
  });

  const handleDisenoCardsAreaChange = useCallback((nuevo: AreaCardDesignVariant) => {
    setDisenoCardsArea(nuevo);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CLAVE_DISENO_CARDS_AREA, nuevo);
      } catch {
        /* noop */
      }
    }
  }, []);

  const [botonUsuarioCompacto, setBotonUsuarioCompacto] = useState<boolean>(() => leerBotonUsuarioCompacto());

  const toggleBotonUsuarioCompacto = useCallback((nuevo: boolean) => {
    setBotonUsuarioCompacto(nuevo);
    guardarBotonUsuarioCompacto(nuevo);
  }, []);

  // Estado de barra lateral colapsada / restaurada con persistencia local
  const [colapsada, setColapsada] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return window.localStorage.getItem('nexus.platforms.sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const alternarColapsada = useCallback(() => {
    setColapsada((prev) => {
      const nuevo = !prev;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('nexus.platforms.sidebar_collapsed', String(nuevo));
        } catch {
          /* noop */
        }
      }
      return nuevo;
    });
  }, []);

  // Estados de la barra de herramientas premium (DIS-081)
  const estadoRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [menuEstadoAbierto, setMenuEstadoAbierto] = useState(false);
  const [menuGridAbierto, setMenuGridAbierto] = useState(false);
  const [gridFilas, setGridFilas] = useState<number>(2);
  const [gridColumnas, setGridColumnas] = useState<number>(2);

  useEffect(() => {
    function alPulsarFuera(e: MouseEvent) {
      if (estadoRef.current && !estadoRef.current.contains(e.target as Node)) {
        setMenuEstadoAbierto(false);
      }
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setMenuGridAbierto(false);
      }
    }
    function alPresionarEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuEstadoAbierto(false);
        setMenuGridAbierto(false);
      }
    }
    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alPresionarEscape);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alPresionarEscape);
    };
  }, []);

  const { catalogo, items, areas, mias: abribles, marcarSolicitada, marcarFavorito } = useCatalogoSolicitable(mias);
  const areasAsync = useAsync(() => api.areas().catch(() => []), [], 'nexus.platforms.areas');

  // Lista unificada de áreas con datos completos
  const listaAreas: Area[] = useMemo(() => {
    const mapa = new Map<number, Area>();
    if (areasAsync.data && areasAsync.data.length > 0) {
      for (const a of areasAsync.data) {
        mapa.set(a.id, a);
      }
    }
    for (const a of areas) {
      if (!mapa.has(a.id)) {
        mapa.set(a.id, {
          id: a.id,
          name: a.name,
          description: null,
          icon: 'areas',
          color: 'var(--color-primary)',
          status: 'Activo',
          platforms_count: items.filter((i) => i.area.id === a.id).length,
          users_count: 1,
        });
      }
    }
    return [...mapa.values()];
  }, [areasAsync.data, areas, items]);

  const conteoPorArea = useMemo(() => {
    const c: Record<number, number> = {};
    for (const a of listaAreas) {
      const countItems = items.filter((i) => i.area.id === a.id).length;
      c[a.id] = countItems || a.platforms_count || 0;
    }
    return c;
  }, [listaAreas, items]);

  const plataformasPorArea = useMemo(() => {
    const pMap: Record<number, Platform[]> = {};
    for (const a of listaAreas) {
      pMap[a.id] = (mias?.data ?? []).filter((p) => p.area_id === a.id);
    }
    return pMap;
  }, [listaAreas, mias]);

  // Semilla inicial del widget si está vacío (primeras plataformas activas o favoritas, solo una vez)
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && plataformasWidget.size === 0 && items.length > 0) {
      seededRef.current = true;
      const sugeridas = items
        .filter((i) => abribles.get(i.platform.id)?.is_favorite || abribles.has(i.platform.id))
        .slice(0, 3)
        .map((i) => i.platform.id);
      if (sugeridas.length > 0) {
        setPlataformasWidget(new Set(sugeridas));
      }
    }
  }, [items, abribles, plataformasWidget.size]);

  // Modo de visualización: en "Todas las áreas" se listan áreas completas, no plataformas
  const esVistaAreas = seccionActiva === 'area' && areaSeleccionada === null;

  const selectedArea = useMemo(() => {
    if (areaSeleccionada === null) return null;
    return listaAreas.find((a) => a.id === areaSeleccionada) ?? null;
  }, [areaSeleccionada, listaAreas]);

  // Filtrado de áreas para la vista global de áreas
  const areasFiltradas = useMemo(() => {
    return listaAreas.filter((a) => {
      if (termino.trim()) {
        const q = termino.toLowerCase();
        const matchName = a.name.toLowerCase().includes(q);
        const matchDesc = (a.description ?? '').toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      if (filtroEstado === 'activo' && a.status !== 'Activo') return false;
      if (filtroEstado === 'inactivo' && a.status === 'Activo') return false;
      return true;
    });
  }, [listaAreas, termino, filtroEstado]);

  const ghostCountAreas = Math.max(0, gridFilas * gridColumnas - areasFiltradas.length);

  // Contadores para Áreas
  const totalAreas = listaAreas.length;
  const activasAreasCount = useMemo(() => {
    return listaAreas.filter((a) => a.status === 'Activo').length;
  }, [listaAreas]);
  const inactivasAreasCount = useMemo(() => {
    return totalAreas - activasAreasCount;
  }, [totalAreas, activasAreasCount]);

  // Contadores
  const favoritasCount = useMemo(() => {
    return items.filter((item) => abribles.get(item.platform.id)?.is_favorite).length;
  }, [items, abribles]);

  const pendientesCount = useMemo(() => {
    return items.filter((item) => item.pending_request_id !== null).length;
  }, [items]);

  // Plataformas dentro del ámbito actual (área seleccionada, favoritas o todas)
  const itemsEnAmbito = useMemo(() => {
    if (seccionActiva === 'favoritas') {
      return items.filter((i) => Boolean(abribles.get(i.platform.id)?.is_favorite));
    }
    if (seccionActiva === 'area' && areaSeleccionada !== null) {
      return items.filter((i) => i.area.id === areaSeleccionada);
    }
    return items;
  }, [items, seccionActiva, areaSeleccionada, abribles]);

  const totalEnAmbito = itemsEnAmbito.length;

  const activasCount = useMemo(() => {
    return itemsEnAmbito.filter((item) => {
      const plat = abribles.get(item.platform.id);
      return Boolean(plat && (!item.my_access_status || item.my_access_status === 'activo'));
    }).length;
  }, [itemsEnAmbito, abribles]);

  const inactivasCount = useMemo(() => {
    return totalEnAmbito - activasCount;
  }, [totalEnAmbito, activasCount]);

  const favoritasEnAmbitoCount = useMemo(() => {
    return itemsEnAmbito.filter((item) => abribles.get(item.platform.id)?.is_favorite).length;
  }, [itemsEnAmbito, abribles]);

  // Filtrado de ítems
  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      // Búsqueda
      if (termino.trim()) {
        const query = termino.toLowerCase();
        const coincideNombre = item.platform.name.toLowerCase().includes(query);
        const coincideDesc = item.platform.description.toLowerCase().includes(query);
        if (!coincideNombre && !coincideDesc) return false;
      }
      // Sección activa / Área
      if (seccionActiva === 'favoritas') {
        if (!abribles.get(item.platform.id)?.is_favorite) return false;
      } else if (seccionActiva === 'solicitudes') {
        if (item.pending_request_id === null) return false;
      } else if (seccionActiva === 'area' && areaSeleccionada !== null) {
        if (item.area.id !== areaSeleccionada) return false;
      }

      // Filtro de Estado: todos | activo | inactivo | favorito
      const plat = abribles.get(item.platform.id);
      const esActivo = Boolean(plat && (!item.my_access_status || item.my_access_status === 'activo'));
      if (filtroEstado === 'activo' && !esActivo) return false;
      if (filtroEstado === 'inactivo' && esActivo) return false;
      if (filtroEstado === 'favorito' && !plat?.is_favorite) return false;

      return true;
    });
  }, [items, termino, seccionActiva, areaSeleccionada, filtroEstado, abribles]);

  const ghostCount = Math.max(0, gridFilas * gridColumnas - itemsFiltrados.length);

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
    avisar('success', `${abierta.platform.name}. Solicitud enviada.`, 'Solicitud enviada');
    setAbierta(null);
  }

  const responsivaFirmada = session?.responsiva_firmada !== false;

  return (
    <div className="flex h-dvh bg-fondo overflow-hidden">
      {/* 1. BARRA LATERAL IZQUIERDA (264px expandida / 76px colapsada - MOCKUP OPCIÓN B) */}
      <aside
        id="barra-lateral-plataformas"
        aria-label="Barra lateral del usuario"
        data-colapsada={colapsada}
        className={`shrink-0 flex flex-col justify-between border-r border-barra-lateral-borde bg-barra-lateral text-barra-lateral-texto shadow-sm z-20 transition-[width] duration-media motion-reduce:transition-none ${
          colapsada ? 'w-lateral-colapsada' : 'w-lateral'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand */}
          <div
            className={`h-barra-superior border-b border-barra-lateral-borde flex items-center shrink-0 ${
              colapsada ? 'justify-center px-2' : 'px-4'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {colapsada ? (
                <button
                  type="button"
                  onClick={alternarColapsada}
                  aria-label="Expandir barra lateral"
                  title="Expandir barra lateral"
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary p-1 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-7 object-contain" width={28} height={28} />
                </button>
              ) : (
                <>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie shadow-xs p-1 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-7 object-contain" width={28} height={28} />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-base font-bold leading-tight text-barra-lateral-texto">Aduana</span>
                    <span className="truncate text-xs font-semibold text-primary-text uppercase">Vivaro Launchpad</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Navegación por secciones */}
          <div className={`flex-1 overflow-y-auto p-3 ${colapsada ? 'space-y-4' : 'space-y-6'}`}>
            {/* SECCIÓN: MI ESPACIO */}
            <div>
              {colapsada ? null : (
                <div className="px-3 text-xs font-bold text-barra-lateral-secundario uppercase tracking-wider mb-2">
                  Mi Espacio
                </div>
              )}
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => { setSeccionActiva('favoritas'); setAreaSeleccionada(null); setFiltroEstado('todos'); setTermino(''); }}
                  aria-label={`Favoritas, ${favoritasCount} favoritas`}
                  title={colapsada ? `Favoritas (${favoritasCount})` : undefined}
                  className={`group flex min-h-11 w-full items-center rounded-lg text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    colapsada ? 'justify-center px-2 py-2 min-w-11 text-base' : 'justify-between px-3 py-2'
                  } ${
                    seccionActiva === 'favoritas'
                      ? 'bg-primary text-texto-sobre-accion shadow-xs'
                      : 'text-barra-lateral-texto hover:bg-barra-lateral-hover'
                  }`}
                >
                  <span className={`flex items-center ${colapsada ? '' : 'gap-2.5'}`}>
                    <Icono
                      nombre="favorito"
                      tamano="sm"
                      className={`shrink-0 transition-colors ${
                        seccionActiva === 'favoritas' ? 'text-texto-sobre-accion' : 'text-warning-text'
                      }`}
                    />
                    {colapsada ? null : <span>Favoritas</span>}
                  </span>
                  {mostrarBadgesSidebar && !colapsada ? (
                    <span className={`flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                      seccionActiva === 'favoritas'
                        ? 'bg-superficie/20 text-texto-sobre-accion'
                        : 'bg-surface-container text-body-text'
                    }`}>
                      {favoritasCount}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => { setSeccionActiva('solicitudes'); setAreaSeleccionada(null); }}
                  aria-label={`Mis Solicitudes, ${pendientesCount} pendientes`}
                  title={colapsada ? `Mis Solicitudes (${pendientesCount} pendientes)` : undefined}
                  className={`group flex min-h-11 w-full items-center rounded-lg text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary relative ${
                    colapsada ? 'justify-center px-2 py-2 min-w-11 text-base' : 'justify-between px-3 py-2'
                  } ${
                    seccionActiva === 'solicitudes'
                      ? 'bg-primary text-texto-sobre-accion shadow-xs'
                      : 'text-barra-lateral-texto hover:bg-barra-lateral-hover'
                  }`}
                >
                  <span className={`flex items-center ${colapsada ? '' : 'gap-2.5'}`}>
                    <Icono
                      nombre="solicitudes"
                      tamano="sm"
                      className={`shrink-0 transition-colors ${
                        seccionActiva === 'solicitudes'
                          ? 'text-texto-sobre-accion'
                          : 'text-barra-lateral-secundario group-hover:text-barra-lateral-texto'
                      }`}
                    />
                    {colapsada ? null : <span>Mis Solicitudes</span>}
                  </span>
                  {colapsada ? (
                    mostrarBadgesSidebar && pendientesCount > 0 ? (
                      <span className="absolute top-2 right-2 size-2 rounded-pastilla bg-warning" aria-hidden="true" />
                    ) : null
                  ) : (
                    mostrarBadgesSidebar && pendientesCount > 0 ? (
                      <span className="flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-xs font-bold bg-warning text-texto-sobre-aviso shadow-xs tabular-nums">
                        {pendientesCount}
                      </span>
                    ) : null
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setSeccionActiva('widget'); setAreaSeleccionada(null); }}
                  aria-label={`Mi Widget, ${plataformasWidget.size} en widget`}
                  title={colapsada ? `Mi Widget (${plataformasWidget.size})` : undefined}
                  className={`group flex min-h-11 w-full items-center rounded-lg text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary relative ${
                    colapsada ? 'justify-center px-2 py-2 min-w-11 text-base' : 'justify-between px-3 py-2'
                  } ${
                    seccionActiva === 'widget'
                      ? 'bg-primary text-texto-sobre-accion shadow-xs'
                      : 'text-barra-lateral-texto hover:bg-barra-lateral-hover'
                  }`}
                >
                  <span className={`flex items-center ${colapsada ? '' : 'gap-2.5'}`}>
                    <Icono
                      nombre="widget"
                      tamano="sm"
                      className={`shrink-0 transition-colors ${
                        seccionActiva === 'widget'
                          ? 'text-texto-sobre-accion'
                          : 'text-barra-lateral-secundario group-hover:text-barra-lateral-texto'
                      }`}
                    />
                    {colapsada ? null : <span>Mi Widget</span>}
                  </span>
                  {mostrarBadgesSidebar && !colapsada ? (
                    <span className={`flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                      seccionActiva === 'widget'
                        ? 'bg-superficie/20 text-texto-sobre-accion'
                        : 'bg-surface-container text-body-text'
                    }`}>
                      {plataformasWidget.size}
                    </span>
                  ) : null}
                </button>
              </nav>
            </div>

            {/* SECCIÓN: CATÁLOGO POR ÁREA */}
            <div>
              {colapsada ? (
                <hr className="my-2 border-barra-lateral-borde" />
              ) : (
                <div className="px-3 text-xs font-bold text-barra-lateral-secundario uppercase tracking-wider mb-2">
                  Catálogo por Área
                </div>
              )}
              <nav className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setSeccionActiva('area'); setAreaSeleccionada(null); setFiltroEstado('todos'); setTermino(''); }}
                  aria-label={`Todas las áreas, ${listaAreas.length} áreas`}
                  title={colapsada ? `Todas las áreas (${listaAreas.length})` : undefined}
                  className={`group flex min-h-11 w-full items-center rounded-lg text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    colapsada ? 'justify-center px-2 py-2 min-w-11 text-base' : 'justify-between px-3 py-2'
                  } ${
                    seccionActiva === 'area' && areaSeleccionada === null
                      ? 'bg-primary text-texto-sobre-accion shadow-xs'
                      : 'text-barra-lateral-texto hover:bg-barra-lateral-hover'
                  }`}
                >
                  <span className={`flex items-center ${colapsada ? '' : 'gap-2.5'}`}>
                    <Icono
                      nombre="areas"
                      tamano="sm"
                      className={`shrink-0 transition-colors ${
                        seccionActiva === 'area' && areaSeleccionada === null
                          ? 'text-texto-sobre-accion'
                          : 'text-barra-lateral-secundario group-hover:text-barra-lateral-texto'
                      }`}
                    />
                    {colapsada ? null : <span>Todas las áreas</span>}
                  </span>
                  {mostrarBadgesSidebar && !colapsada ? (
                    <span className={`flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                      seccionActiva === 'area' && areaSeleccionada === null
                        ? 'bg-superficie/20 text-texto-sobre-accion'
                        : 'bg-surface-container text-body-text'
                    }`}>
                      {listaAreas.length}
                    </span>
                  ) : null}
                </button>

                {colapsada ? null : listaAreas.map((a) => {
                  const countA = conteoPorArea[a.id] ?? 0;
                  const activa = seccionActiva === 'area' && areaSeleccionada === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setSeccionActiva('area'); setAreaSeleccionada(a.id); setFiltroEstado('todos'); setTermino(''); }}
                      aria-label={`${a.name}, ${countA} plataformas`}
                      className={`group flex min-h-11 w-full items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        activa
                          ? 'bg-primary text-texto-sobre-accion shadow-xs'
                          : 'text-barra-lateral-texto hover:bg-barra-lateral-hover'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate max-w-40 text-left min-w-0">
                        <Icono
                          nombre="areas"
                          tamano="xs"
                          className={`shrink-0 transition-colors ${
                            activa
                              ? 'text-texto-sobre-accion'
                              : 'text-barra-lateral-secundario group-hover:text-barra-lateral-texto'
                          }`}
                        />
                        <span className="truncate">{a.name}</span>
                      </span>
                      {mostrarBadgesSidebar ? (
                        <span className={`flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                          activa
                            ? 'bg-superficie/20 text-texto-sobre-accion'
                            : 'bg-surface-container text-body-text'
                        }`}>
                          {countA}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* SECCIÓN: DOCUMENTOS */}
            {mostrarDocumentos ? (
              <div>
                {colapsada ? (
                  <hr className="my-2 border-barra-lateral-borde" />
                ) : (
                  <div className="px-3 text-xs font-bold text-barra-lateral-secundario uppercase tracking-wider mb-2">
                    Documentos
                  </div>
                )}
                {colapsada ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSeccionActiva('responsiva');
                      setAreaSeleccionada(null);
                    }}
                    className={`flex min-h-11 min-w-11 w-full items-center justify-center rounded-lg text-base relative cursor-pointer outline-none transition-colors ${
                      seccionActiva === 'responsiva' ? 'bg-primary text-texto-sobre-accion shadow-xs' : 'text-barra-lateral-texto hover:bg-barra-lateral-hover'
                    }`}
                    title={`Carta Responsiva: ${responsivaFirmada ? 'Firmada' : 'Pendiente'}`}
                    aria-label={`Carta Responsiva: ${responsivaFirmada ? 'Firmada' : 'Pendiente'}`}
                  >
                    <Icono
                      nombre="documento"
                      tamano="sm"
                      className={`shrink-0 transition-colors ${
                        seccionActiva === 'responsiva' ? 'text-texto-sobre-accion' : 'text-barra-lateral-secundario'
                      }`}
                    />
                    <span
                      className={`absolute bottom-2 right-2 size-2 rounded-pastilla ${
                        responsivaFirmada ? 'bg-success' : 'bg-warning'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSeccionActiva('responsiva');
                      setAreaSeleccionada(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border cursor-pointer outline-none transition-all ${
                      seccionActiva === 'responsiva'
                        ? 'border-primary bg-primary text-texto-sobre-accion shadow-xs'
                        : 'border-barra-lateral-borde bg-barra-lateral-elemento/50 hover:border-primary/50 hover:bg-barra-lateral-elemento text-barra-lateral-texto'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icono
                        nombre="documento"
                        tamano="sm"
                        className={`shrink-0 transition-colors ${
                          seccionActiva === 'responsiva' ? 'text-texto-sobre-accion' : 'text-barra-lateral-secundario'
                        }`}
                      />
                      <span>Carta Responsiva</span>
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-bold ${
                      seccionActiva === 'responsiva'
                        ? 'text-texto-sobre-accion'
                        : responsivaFirmada
                          ? 'text-success-text'
                          : 'text-warning-text'
                    }`}>
                      {responsivaFirmada ? (
                        <>
                          <Icono nombre="exito" tamano="xs" />
                          <span>Firmada</span>
                        </>
                      ) : (
                        <>
                          <Icono nombre="aviso" tamano="xs" />
                          <span>Pendiente</span>
                        </>
                      )}
                    </span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Tarjeta de usuario al pie del sidebar con menú desplegable */}
        {session ? (
          <div className={`border-t border-barra-lateral-borde shrink-0 ${colapsada ? 'p-2 flex justify-center' : 'p-3'}`}>
            <MenuUsuario session={session} colapsada={colapsada} enBarraLateral={true} posicionMenu="arriba" />
          </div>
        ) : null}
      </aside>

      {/* 2. PANE DERECHO: BARRA SUPERIOR + CONTENIDO */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Topbar del workspace */}
        <header className="flex h-barra-superior shrink-0 items-center justify-between gap-3 border-b border-borde bg-header px-4 md:px-6 z-10">
          {/* Botón de alternar barra lateral + Breadcrumb */}
          <div className="flex items-center gap-3">
            <BotonIcono
              icono="menu"
              etiqueta={colapsada ? 'Expandir menú' : 'Colapsar menú'}
              aria-expanded={!colapsada}
              aria-controls="barra-lateral-plataformas"
              onClick={alternarColapsada}
            />
            <div className="flex items-center gap-1.5 text-xs font-medium text-texto-secundario">
              {seccionActiva === 'personalizacion' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      limpiarUrlParams();
                      setSeccionActiva('area');
                      setAreaSeleccionada(null);
                      setFiltroEstado('todos');
                      setTermino('');
                    }}
                    className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Catálogo
                  </button>
                  <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
                  <span className="text-body-text font-semibold px-1">Ajustes de Vista</span>
                </>
              ) : seccionActiva === 'area' ? (
                areaSeleccionada !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        limpiarUrlParams();
                        setAreaSeleccionada(null);
                        setFiltroEstado('todos');
                        setTermino('');
                      }}
                      className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Catálogo
                    </button>
                    <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
                    <span className="text-body-text font-semibold px-1">
                      {selectedArea?.name ?? 'Área'}
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        limpiarUrlParams();
                        setAreaSeleccionada(null);
                        setFiltroEstado('todos');
                        setTermino('');
                      }}
                      className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Catálogo
                    </button>
                    <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
                    <span className="text-body-text font-semibold px-1">Áreas</span>
                  </>
                )
              ) : seccionActiva === 'favoritas' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      limpiarUrlParams();
                      setSeccionActiva('area');
                      setAreaSeleccionada(null);
                      setFiltroEstado('todos');
                      setTermino('');
                    }}
                    className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Catálogo
                  </button>
                  <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
                  <span className="text-body-text font-semibold px-1">Favoritos</span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      limpiarUrlParams();
                      setSeccionActiva('area');
                      setAreaSeleccionada(null);
                      setFiltroEstado('todos');
                      setTermino('');
                    }}
                    className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Catálogo
                  </button>
                  <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
                  <span className="text-body-text font-semibold px-1">
                    {seccionActiva === 'solicitudes'
                      ? 'Mis Solicitudes'
                      : seccionActiva === 'widget'
                        ? 'Mi Widget'
                        : 'Carta Responsiva'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2.5">
            {/* BOTÓN REGRESAR AL PANEL ADMIN (Solo administradores) */}
            {esAdmin ? <BotonRegresarAdmin /> : null}

            {/* Personalización y configuración de vista (DIS-117) */}
            <BotonIcono
              icono="ajustes"
              etiqueta="Configuración y diseño de vista"
              aria-pressed={seccionActiva === 'personalizacion'}
              className={seccionActiva === 'personalizacion' ? '!border-primary !bg-primary/10 !text-primary-text ring-2 ring-primary/20' : ''}
              onClick={() => {
                setSeccionActiva((prev) => (prev === 'personalizacion' ? 'area' : 'personalizacion'));
                setAreaSeleccionada(null);
              }}
            />

            {/* Conmutador de tema */}
            <BotonIcono
              icono={oscuro ? 'sol' : 'luna'}
              etiqueta={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              onClick={() => { void alternarTema(); }}
            />

            {/* Menú de Notificaciones desplegable */}
            <MenuNotificaciones noLeidasInicial={noLeidas} />
          </div>
        </header>

        {/* Contenido principal */}
        <main
          id="contenido"
          tabIndex={-1}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-fondo p-6 outline-none flex flex-col gap-4"
        >
          {seccionActiva === 'personalizacion' ? (
            <UserViewSettings
              layout="sidebar"
              onLayoutChange={(l) => setLayout(l)}
              mostrarDocumentos={mostrarDocumentos}
              onToggleMostrarDocumentos={toggleMostrarDocumentos}
              mostrarBadgesSidebar={mostrarBadgesSidebar}
              onToggleMostrarBadgesSidebar={toggleMostrarBadgesSidebar}
              botonUsuarioCompacto={botonUsuarioCompacto}
              onToggleBotonUsuarioCompacto={toggleBotonUsuarioCompacto}
              disenoCards={disenoCards}
              onDisenoCardsChange={handleDisenoCardsChange}
              disenoCardsArea={disenoCardsArea}
              onDisenoCardsAreaChange={handleDisenoCardsAreaChange}
              onVolver={() => {
                setSeccionActiva('area');
                setAreaSeleccionada(null);
              }}
            />
          ) : seccionActiva === 'solicitudes' ? (
            <UserRequestsTable
              filtroEstadoInicial="pendiente"
              onVolverPlataformas={() => {
                setSeccionActiva('area');
                setAreaSeleccionada(null);
              }}
            />
          ) : seccionActiva === 'widget' ? (
            <UserWidgetConfig
              items={items}
              mias={abribles}
              areas={areas}
              widgetHabilitado={widgetHabilitado}
              onToggleHabilitado={toggleWidgetHabilitado}
              plataformasWidget={plataformasWidget}
              onTogglePlataforma={togglePlataformaWidget}
              onVolver={() => {
                setSeccionActiva('area');
                setAreaSeleccionada(null);
              }}
            />
          ) : seccionActiva === 'responsiva' ? (
            <UserResponsivaSection
              session={session}
              onVolver={() => {
                setSeccionActiva('area');
                setAreaSeleccionada(null);
              }}
            />
          ) : (
            <>
              <h2 className="sr-only">{esVistaAreas ? 'Catálogo de Áreas' : 'Catálogo de Plataformas'}</h2>
              <div className="grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-4">
                {/* BARRA DE HERRAMIENTAS PREMIUM (Idéntica a Áreas / Image 2) */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
                  {/* A la izquierda: Buscador */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
                    <div className="relative w-full">
                      <label htmlFor="buscar-plataformas-workspace" className="sr-only">
                        {esVistaAreas ? 'Buscar áreas' : 'Buscar plataformas'}
                      </label>
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
                        <Icono nombre="buscar" tamano="md" ariaHidden={true} />
                      </div>
                      <input
                        id="buscar-plataformas-workspace"
                        type="search"
                        placeholder={
                          esVistaAreas
                            ? 'Buscar áreas…'
                            : selectedArea
                            ? `Buscar plataformas en ${selectedArea.name}…`
                            : 'Buscar plataformas…'
                        }
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

                  {/* A la derecha: Botones de Estado y Cuadrícula */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Botón 1: Estado / Filtro */}
                    <div ref={estadoRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuEstadoAbierto((prev) => !prev);
                          setMenuGridAbierto(false);
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={menuEstadoAbierto}
                        aria-label={`Filtrar por estado: actual ${
                          esVistaAreas
                            ? filtroEstado === 'activo'
                              ? 'Activas'
                              : filtroEstado === 'inactivo'
                              ? 'Inactivas'
                              : 'Todos'
                            : filtroEstado === 'todos'
                            ? 'Todos'
                            : filtroEstado === 'activo'
                            ? 'Activas'
                            : filtroEstado === 'inactivo'
                            ? 'Inactivas'
                            : 'Favoritas'
                        }`}
                        className={`inline-flex h-12 min-h-12 w-48 min-w-48 items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-semibold shadow-xs transition-all duration-rapida cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          menuEstadoAbierto
                            ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20 shadow-1'
                            : filtroEstado !== 'todos'
                            ? 'border-primary/60 bg-superficie text-primary-text hover:border-primary hover:bg-superficie/80 hover:shadow-1'
                            : 'border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie hover:shadow-1'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icono
                            nombre={!esVistaAreas && filtroEstado === 'favorito' ? 'favorito' : 'inventario'}
                            tamano="sm"
                            ariaHidden={true}
                            className={
                              !esVistaAreas && filtroEstado === 'favorito'
                                ? 'text-warning-text shrink-0'
                                : 'text-primary-text shrink-0'
                            }
                          />
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-label font-medium">Estado:</span>
                            <span className="font-bold text-body-text">
                              {esVistaAreas
                                ? filtroEstado === 'activo'
                                  ? 'Activas'
                                  : filtroEstado === 'inactivo'
                                  ? 'Inactivas'
                                  : 'Todos'
                                : filtroEstado === 'todos'
                                ? 'Todos'
                                : filtroEstado === 'activo'
                                ? 'Activas'
                                : filtroEstado === 'inactivo'
                                ? 'Inactivas'
                                : 'Favoritas'}
                            </span>
                            {filtroEstado === 'activo' ? (
                              <span className="size-2 rounded-full bg-success shrink-0" aria-hidden="true" />
                            ) : filtroEstado === 'inactivo' ? (
                              <span className="size-2 rounded-full bg-warning shrink-0" aria-hidden="true" />
                            ) : !esVistaAreas && filtroEstado === 'favorito' ? (
                              <Icono nombre="favorito" tamano="xs" className="text-warning-text shrink-0" />
                            ) : null}
                          </span>
                        </div>
                        <Icono
                          nombre="chevron-abajo"
                          tamano="xs"
                          ariaHidden={true}
                          className={`shrink-0 transition-transform duration-rapida ${
                            menuEstadoAbierto ? 'rotate-180 text-primary-text' : 'text-label'
                          }`}
                        />
                      </button>

                      {menuEstadoAbierto ? (
                        <div
                          role="listbox"
                          aria-label="Opciones de estado"
                          className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-panel-border bg-panel-fill p-1.5 shadow-2 backdrop-blur-md"
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={filtroEstado === 'todos'}
                            onClick={() => {
                              setFiltroEstado('todos');
                              setMenuEstadoAbierto(false);
                            }}
                            className={`flex w-full min-h-12 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                              filtroEstado === 'todos'
                                ? 'bg-primary/15 text-primary-text font-bold'
                                : 'text-body-text hover:bg-surface-container'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Icono nombre="inventario" tamano="sm" className="text-primary-text" />
                              <span>Todos</span>
                              <span className="text-texto-secundario font-normal">
                                ({esVistaAreas ? totalAreas : totalEnAmbito})
                              </span>
                            </span>
                            {filtroEstado === 'todos' ? <Icono nombre="aprobar" tamano="sm" /> : null}
                          </button>
                          <button
                            type="button"
                            role="option"
                            aria-selected={filtroEstado === 'activo'}
                            onClick={() => {
                              setFiltroEstado('activo');
                              setMenuEstadoAbierto(false);
                            }}
                            className={`flex w-full min-h-12 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                              filtroEstado === 'activo'
                                ? 'bg-primary/15 text-primary-text font-bold'
                                : 'text-body-text hover:bg-surface-container'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-success shrink-0" />
                              <span>Activas</span>
                              <span className="text-texto-secundario font-normal">
                                ({esVistaAreas ? activasAreasCount : activasCount})
                              </span>
                            </span>
                            {filtroEstado === 'activo' ? <Icono nombre="aprobar" tamano="sm" /> : null}
                          </button>
                          <button
                            type="button"
                            role="option"
                            aria-selected={filtroEstado === 'inactivo'}
                            onClick={() => {
                              setFiltroEstado('inactivo');
                              setMenuEstadoAbierto(false);
                            }}
                            className={`flex w-full min-h-12 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                              filtroEstado === 'inactivo'
                                ? 'bg-primary/15 text-primary-text font-bold'
                                : 'text-body-text hover:bg-surface-container'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-warning shrink-0" />
                              <span>Inactivas</span>
                              <span className="text-texto-secundario font-normal">
                                ({esVistaAreas ? inactivasAreasCount : inactivasCount})
                              </span>
                            </span>
                            {filtroEstado === 'inactivo' ? <Icono nombre="aprobar" tamano="sm" /> : null}
                          </button>
                          {!esVistaAreas && seccionActiva !== 'favoritas' ? (
                            <button
                              type="button"
                              role="option"
                              aria-selected={filtroEstado === 'favorito'}
                              onClick={() => {
                                setFiltroEstado('favorito');
                                setMenuEstadoAbierto(false);
                              }}
                              className={`flex w-full min-h-12 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                filtroEstado === 'favorito'
                                  ? 'bg-primary/15 text-primary-text font-bold'
                                  : 'text-body-text hover:bg-surface-container'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Icono nombre="favorito" tamano="sm" className="text-warning-text" />
                                <span>Favoritas</span>
                                <span className="text-texto-secundario font-normal">({favoritasEnAmbitoCount})</span>
                              </span>
                              {filtroEstado === 'favorito' ? <Icono nombre="aprobar" tamano="sm" /> : null}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* Botón 2: Configurar cuadrícula (2x2, 2x3, 3x3) */}
                    <div ref={gridRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuGridAbierto((prev) => !prev);
                          setMenuEstadoAbierto(false);
                        }}
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

                          {/* Combinaciones (filas × columnas) */}
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
                                  className={`flex min-h-12 items-center justify-center px-3 text-xs font-semibold rounded-lg transition-colors ${
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
                </div>

                {/* Fila 2: Body con Grid configurable (idéntico a platform-admin.tsx) */}
                <div className="flex flex-1 min-h-0 flex-col w-full overflow-y-auto p-1">
                  {catalogo.loading && !catalogo.data ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-full min-h-64 gap-3 text-label">
                      <Spinner label="Cargando catálogo…" />
                      <span className="text-sm font-medium">Cargando catálogo…</span>
                    </div>
                  ) : esVistaAreas ? (
                    areasFiltradas.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center h-full">
                        <EmptyNote
                          icono="areas"
                          title="Sin áreas"
                          message={
                            (termino || '').trim() || filtroEstado !== 'todos'
                              ? 'No hay áreas que coincidan con los filtros aplicados.'
                              : 'No hay áreas disponibles.'
                          }
                          action={
                            (termino || '').trim() || filtroEstado !== 'todos' ? (
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setTermino('');
                                  setFiltroEstado('todos');
                                }}
                              >
                                Limpiar filtros
                              </Button>
                            ) : undefined
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col flex-1 w-full justify-between gap-4 h-full">
                        <div
                          role="region"
                          aria-label="Catálogo de áreas"
                          className={`grid grid-cols-1 ${CLASES_COLS[gridColumnas] ?? 'sm:grid-cols-2 lg:grid-cols-2'} ${
                            CLASES_ROWS[gridFilas] ?? 'sm:grid-rows-[repeat(2,minmax(14rem,1fr))]'
                          } gap-4 flex-1 h-full`}
                        >
                          {areasFiltradas.map((area) => (
                            <TarjetaArea
                              key={area.id}
                              area={area}
                              conteo={conteoPorArea[area.id] ?? 0}
                              plataformas={plataformasPorArea[area.id] ?? []}
                              onSelect={(a) => {
                                setAreaSeleccionada(a.id);
                                setFiltroEstado('todos');
                                setTermino('');
                              }}
                              puedeEditar={false}
                              variante={disenoCardsArea}
                            />
                          ))}

                          {/* Huecos que completan la cuadrícula (en escritorio) */}
                          {Array.from({ length: ghostCountAreas }).map((_, idx) => (
                            <PlatformGhostCard
                              key={`ghost-area-${idx}`}
                              icono="areas"
                              texto="Espacio disponible"
                            />
                          ))}
                        </div>
                      </div>
                    )
                  ) : itemsFiltrados.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center h-full">
                      <EmptyNote
                        icono={seccionActiva === 'favoritas' ? 'favorito' : 'plataformas'}
                        title={
                          seccionActiva === 'favoritas'
                            ? (filtroEstado === 'todos' && !termino.trim() ? 'Sin favoritas' : 'Sin resultados')
                            : 'Sin resultados'
                        }
                        message={
                          selectedArea
                            ? `Ninguna plataforma en «${selectedArea.name}» coincide con los filtros aplicados.`
                            : seccionActiva === 'favoritas'
                            ? filtroEstado === 'todos'
                              ? 'Aún no tienes plataformas marcadas como favoritas.'
                              : 'Ninguna plataforma favorita coincide con el filtro aplicado.'
                            : 'Ninguna plataforma coincide con los filtros aplicados.'
                        }
                        action={
                          (termino || '').trim() || filtroEstado !== 'todos' ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setTermino('');
                                setFiltroEstado('todos');
                              }}
                            >
                              Limpiar filtros
                            </Button>
                          ) : undefined
                        }
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1 w-full justify-between gap-4 h-full">
                      <div
                        role="region"
                        aria-label="Catálogo de plataformas"
                        className={`grid grid-cols-1 ${CLASES_COLS[gridColumnas] ?? 'sm:grid-cols-2 lg:grid-cols-2'} ${
                          CLASES_ROWS[gridFilas] ?? 'sm:grid-rows-[repeat(2,minmax(14rem,1fr))]'
                        } gap-4 flex-1 h-full`}
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

                        {/* Huecos que completan la cuadrícula (en escritorio) */}
                        {Array.from({ length: ghostCount }).map((_, idx) => (
                          <PlatformGhostCard
                            key={`ghost-platform-${idx}`}
                            variante={disenoCards}
                            icono="panel"
                            texto="Espacio disponible"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal de solicitud */}
      {abierta ? (
        <RequestFormModal
          item={abierta}
          onClose={cerrarSolicitud}
          onCreated={creadaSolicitud}
        />
      ) : null}

      {/* Modal de bienvenida */}
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
