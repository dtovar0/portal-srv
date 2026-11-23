'use client';

/**
 * Shell condicional exclusivo para la página /platforms (DIS-115).
 *
 * Permite alternar entre:
 * - 'topbar': Lanzador amplio (Launchpad - Opción A del mockup) con solo barra superior,
 *   banner Hero con degradado, pastillas de filtro y cuadrícula de tarjetas de 4 columnas.
 * - 'sidebar': Espacio de trabajo (Workspace - Opción B del mockup) con barra lateral de 264px,
 *   secciones "Mi Espacio", "Catálogo por Área", "Documentos" y cuadrícula de 3 columnas.
 *
 * En ambos diseños:
 * - Conmutador [ ⚙️ Vista: Topbar / Sidebar ] integrado en la barra superior.
 * - Botón [ ⚙️ Regresar al Panel Admin ] para administradores (sin tocar el panel admin).
 * - Modal de responsiva si el usuario no ha firmado.
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { usePlatformsLayout } from '@/lib/platforms-layout';
import { useCatalogoSolicitable } from '../access/use-catalogo-solicitable';
import { ModalResponsiva } from '../responsiva/modal-responsiva';
import { SessionProvider, useSession } from '../session-provider';
import { ErrorNote, PantallaCarga } from '../ui';
import { PlatformsTopbar } from './platforms-topbar';
import { PlatformsLaunchpadView } from './platforms-launchpad-view';
import { PlatformsSidebarView } from './platforms-sidebar-view';
import { UserResponsivaSection } from './user-responsiva-section';
import { UserWidgetConfig } from './user-widget-config';
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

function PlatformsShellInternal({ children }: { children?: React.ReactNode }) {
  const { session, loading, error, actualizarSesion, recargarSesion } = useSession();
  const { esTopbar, setLayout } = usePlatformsLayout();
  const [searchTerm, setSearchTerm] = useState('');
  const [seccionActiva, setSeccionActiva] = useState<'catalogo' | 'personalizacion' | 'responsiva' | 'widget'>('catalogo');
  const mias = useAsync(() => api.platforms(), [], 'nexus.platforms.mine');

  const esAdmin = session?.permissions.is_admin || session?.permissions.is_area_admin;
  const { items, areas, mias: abribles } = useCatalogoSolicitable(mias);
  const [areaIdLaunchpad, setAreaIdLaunchpad] = useState<number | null>(null);
  const [soloFavoritasLaunchpad, setSoloFavoritasLaunchpad] = useState(false);
  const areaNombreLaunchpad = areaIdLaunchpad !== null ? (areas.find((a) => a.id === areaIdLaunchpad)?.name ?? null) : null;

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const ses = sessionStorage.getItem('nexus.platforms.seccion_inicial');
        if (ses === 'responsiva' || ses === 'widget' || ses === 'personalizacion') {
          sessionStorage.removeItem('nexus.platforms.seccion_inicial');
          setSeccionActiva(ses);
        }
      } catch {}
      const params = new URLSearchParams(window.location.search);
      const queryBuscar = params.get('buscar') || params.get('q') || '';
      if (queryBuscar) {
        setSearchTerm(queryBuscar);
      }
      if (params.get('seccion') === 'responsiva') {
        setSeccionActiva('responsiva');
      } else if (params.get('seccion') === 'widget') {
        setSeccionActiva('widget');
      }
      // Mantener diseño limpio de URLs eliminando query params (?seccion=...)
      if (window.location.search) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Sincronizar URL limpia en cualquier transición de sección
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [seccionActiva]);

  // Preferencias de personalización compartidas
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

  const [botonUsuarioCompacto, setBotonUsuarioCompacto] = useState<boolean>(() => leerBotonUsuarioCompacto());

  const toggleBotonUsuarioCompacto = useCallback((nuevo: boolean) => {
    setBotonUsuarioCompacto(nuevo);
    guardarBotonUsuarioCompacto(nuevo);
  }, []);

  const toggleMostrarDocumentos = useCallback((nuevo: boolean) => {
    setMostrarDocumentos(nuevo);
    guardarMostrarDocumentos(nuevo);
  }, []);

  const toggleMostrarBadgesSidebar = useCallback((nuevo: boolean) => {
    setMostrarBadgesSidebar(nuevo);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(CLAVE_MOSTRAR_BADGES, String(nuevo)); } catch {}
    }
  }, []);

  const handleDisenoCardsChange = useCallback((nuevo: CardDesignVariant) => {
    setDisenoCards(nuevo);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(CLAVE_DISENO_CARDS, nuevo); } catch {}
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
      } catch {}
    }
    return 'estandar';
  });

  const handleDisenoCardsAreaChange = useCallback((nuevo: AreaCardDesignVariant) => {
    setDisenoCardsArea(nuevo);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(CLAVE_DISENO_CARDS_AREA, nuevo); } catch {}
    }
  }, []);

  if (loading) {
    return <PantallaCarga label="Cargando sesión…" subtexto="Preparando tu espacio de trabajo…" />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorNote message={error} />
      </div>
    );
  }

  if (!session) return null;

  const modalResponsiva = mostrarDocumentos && session.responsiva_firmada === false ? (
    <ModalResponsiva
      session={session}
      onFirmado={() => {
        if (actualizarSesion) {
          actualizarSesion({ ...session, responsiva_firmada: true });
        } else if (recargarSesion) {
          void recargarSesion();
        }
      }}
    />
  ) : null;

  // Opción A: Solo barra superior (Launchpad responsivo ancho y alto completo)
  if (esTopbar) {
    return (
      <div className="flex h-dvh flex-col bg-fondo overflow-hidden">
        <a
          href="#contenido"
          className="fixed left-4 top-4 z-50 inline-flex min-h-11 -translate-y-20 items-center rounded-control bg-accion px-4 text-sm font-semibold text-texto-sobre-accion outline-none focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Saltar al contenido
        </a>

        <PlatformsTopbar
          session={session}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          seccionActiva={seccionActiva}
          onToggleAjustes={() => setSeccionActiva((prev) => (prev === 'personalizacion' ? 'catalogo' : 'personalizacion'))}
          onToggleResponsiva={() => setSeccionActiva('responsiva')}
          onToggleWidget={() => setSeccionActiva('widget')}
          onNavigateCatalogo={() => {
            setSeccionActiva('catalogo');
            setAreaIdLaunchpad(null);
            setSoloFavoritasLaunchpad(false);
            if (typeof window !== 'undefined' && window.location.search) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
          mostrarDocumentos={mostrarDocumentos}
          botonUsuarioCompacto={botonUsuarioCompacto}
          areaNombre={areaNombreLaunchpad}
          esFavoritos={soloFavoritasLaunchpad}
        />

        <main
          id="contenido"
          tabIndex={-1}
          data-desplazable=""
          className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-fondo p-4 md:p-6 outline-none flex flex-col"
        >
          <div className="w-full flex-1 flex flex-col min-h-0">
            {seccionActiva === 'personalizacion' ? (
              <UserViewSettings
                layout="topbar"
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
                onVolver={() => setSeccionActiva('catalogo')}
              />
            ) : seccionActiva === 'responsiva' ? (
              <UserResponsivaSection
                session={session}
                onVolver={() => setSeccionActiva('catalogo')}
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
                onVolver={() => setSeccionActiva('catalogo')}
              />
            ) : (
              children ?? (
                <PlatformsLaunchpadView
                  mias={mias}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  disenoCards={disenoCards}
                  areaId={areaIdLaunchpad}
                  onAreaIdChange={(id) => {
                    setAreaIdLaunchpad(id);
                    if (id !== null) setSoloFavoritasLaunchpad(false);
                  }}
                  soloFavoritas={soloFavoritasLaunchpad}
                  onSoloFavoritasChange={(fav) => {
                    setSoloFavoritasLaunchpad(fav);
                    if (fav) setAreaIdLaunchpad(null);
                  }}
                />
              )
            )}
          </div>
        </main>

        {modalResponsiva}
      </div>
    );
  }

  // Opción B: Workspace con barra lateral de 264px
  return (
    <>
      {children ?? (
        <PlatformsSidebarView
          mias={mias}
          seccionInicial={
            seccionActiva === 'personalizacion'
              ? 'personalizacion'
              : seccionActiva === 'responsiva'
                ? 'responsiva'
                : seccionActiva === 'widget'
                  ? 'widget'
                  : 'area'
          }
          onSeccionChange={(sec) => {
            if (sec === 'personalizacion') {
              setSeccionActiva('personalizacion');
            } else if (sec === 'responsiva') {
              setSeccionActiva('responsiva');
            } else if (sec === 'widget') {
              setSeccionActiva('widget');
            } else {
              setSeccionActiva('catalogo');
            }
          }}
        />
      )}
      {modalResponsiva}
    </>
  );
}

export function PlatformsPageShell({ children }: { children?: React.ReactNode }) {
  return (
    <SessionProvider>
      <PlatformsShellInternal>{children}</PlatformsShellInternal>
    </SessionProvider>
  );
}
