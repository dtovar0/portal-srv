'use client';

/**
 * Barra superior exclusiva para la vista de usuario (/platforms) en modo Topbar (DIS-115).
 * - Cumple al 100% con la estética visual del mockup (Opción A):
 *   - Identidad corporativa Vivaro Launchpad.
 *   - Buscador rápido integrado con atajo de teclado ⌘K.
 *   - Pastillas de navegación directa: [ Plataformas ] [ Mis solicitudes 1 ].
 *   - Botón destacado «Regresar al Panel Admin» (/) para administradores.
 *   - Conmutador directo de diseño: [ ⚙️ Vista: Topbar ].
 *   - Controles de tema, notificaciones y menú de usuario desplegable hacia abajo.
 * - 100% compatible con tokens de diseño (DIS-001, DIS-002, DIS-056, DIS-068, DIS-072).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTema } from '../use-tema';
import { useIndicadores } from '../marco/use-indicadores';
import { BotonIcono, CLASE_BOTON_ICONO } from '../marco/boton-icono';
import { MenuUsuario } from '../marco/menu-usuario';
import { MenuNotificaciones } from './menu-notificaciones';
import { Icono } from '../icono';
import type { Session } from '@/lib/types';
import {
  EVENTO_BOTON_USUARIO_COMPACTO,
  leerBotonUsuarioCompacto,
} from './user-view-settings';
import { BotonRegresarAdmin } from './modal-transicion-admin';
import { APP_TITLE } from '@/lib/branding';

function limpiarUrlParams() {
  if (typeof window !== 'undefined' && window.location.search) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

export function PlatformsTopbar({
  session,
  searchTerm = '',
  onSearchChange,
  pendingCount = 0,
  seccionActiva,
  onToggleAjustes,
  onToggleResponsiva,
  onToggleWidget,
  onNavigateCatalogo,
  mostrarDocumentos = true,
  botonUsuarioCompacto,
  areaNombre,
  esFavoritos,
  esVistaAreas,
}: {
  session: Session;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  pendingCount?: number;
  seccionActiva?: 'catalogo' | 'personalizacion' | 'responsiva' | 'widget';
  onToggleAjustes?: () => void;
  onToggleResponsiva?: () => void;
  onToggleWidget?: () => void;
  onNavigateCatalogo?: () => void;
  mostrarDocumentos?: boolean;
  botonUsuarioCompacto?: boolean;
  areaNombre?: string | null;
  esFavoritos?: boolean;
  esVistaAreas?: boolean;
}) {
  const { oscuro, alternar: alternarTema } = useTema();
  const esAdmin = session.permissions.is_admin || session.permissions.is_area_admin;
  const responsivaFirmada = session?.responsiva_firmada !== false;
  const { noLeidas } = useIndicadores({ esAdmin, ruta: '/platforms' });
  const inputBusqueda = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const esSolicitudes = pathname?.startsWith('/requests');

  const [compactoLocal, setCompactoLocal] = useState<boolean>(() => leerBotonUsuarioCompacto());
  const esCompacto = botonUsuarioCompacto !== undefined ? botonUsuarioCompacto : compactoLocal;

  useEffect(() => {
    function onCambio(e: Event) {
      const ce = e as CustomEvent<boolean>;
      setCompactoLocal(ce.detail !== undefined ? ce.detail : leerBotonUsuarioCompacto());
    }
    window.addEventListener(EVENTO_BOTON_USUARIO_COMPACTO, onCambio);
    window.addEventListener('storage', onCambio);
    return () => {
      window.removeEventListener(EVENTO_BOTON_USUARIO_COMPACTO, onCambio);
      window.removeEventListener('storage', onCambio);
    };
  }, []);

  const etiquetaTema = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  // Solo mostrar el buscador cuando se encuentra en el catálogo de plataformas
  const mostrarBuscador = (!seccionActiva || seccionActiva === 'catalogo') && !esSolicitudes;

  // Atajo de teclado ⌘K / Ctrl+K para enfocar el buscador (solo cuando el buscador está visible)
  useEffect(() => {
    if (!mostrarBuscador) return;
    function alPulsarTeclas(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputBusqueda.current?.focus();
      }
    }
    window.addEventListener('keydown', alPulsarTeclas);
    return () => window.removeEventListener('keydown', alPulsarTeclas);
  }, [mostrarBuscador]);

  return (
    <header className="flex h-barra-superior shrink-0 items-center justify-between gap-3 border-b border-borde bg-header px-4 text-header-text md:px-6 z-20">
      {/* 1. Brand y Título + Location Bar (simétrico con la orilla derecha) */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/platforms"
          onClick={(e) => {
            limpiarUrlParams();
            if (onNavigateCatalogo) {
              e.preventDefault();
              onNavigateCatalogo();
            }
          }}
          className="flex min-h-12 min-w-12 items-center gap-2.5 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie shadow-xs p-1 transition-colors"
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/isotype-aduana.png" alt={APP_TITLE} className="size-7 object-contain" width={28} height={28} />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight text-body-text">{APP_TITLE}</span>
            <span className="text-xs font-extrabold tracking-wider text-primary-text uppercase">Control de Acceso</span>
          </div>
        </Link>

        {/* Separador vertical elegante */}
        <span className="h-6 w-px bg-panel-border/80 hidden lg:block" aria-hidden="true" />

        {/* Location Bar / Breadcrumb de navegación (Ruta) */}
        <nav
          aria-label="Ruta de navegación"
          className="hidden lg:flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm text-texto-secundario select-none"
        >
          {seccionActiva && seccionActiva !== 'catalogo' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  limpiarUrlParams();
                  if (onNavigateCatalogo) {
                    onNavigateCatalogo();
                  } else if (seccionActiva === 'personalizacion') {
                    onToggleAjustes?.();
                  } else if (seccionActiva === 'responsiva') {
                    onToggleResponsiva?.();
                  } else if (seccionActiva === 'widget') {
                    onToggleWidget?.();
                  }
                }}
                className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Catálogo
              </button>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
              <span aria-current="page" className="font-semibold text-body-text px-1">
                {seccionActiva === 'personalizacion'
                  ? 'Ajustes de Vista'
                  : seccionActiva === 'responsiva'
                  ? 'Carta Responsiva'
                  : seccionActiva === 'widget'
                  ? 'Mi Widget'
                  : 'Catálogo'}
              </span>
            </>
          ) : esSolicitudes ? (
            <>
              <Link
                href="/platforms"
                onClick={limpiarUrlParams}
                className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Catálogo
              </Link>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
              <span aria-current="page" className="font-semibold text-body-text px-1">
                Mis Solicitudes
              </span>
            </>
          ) : esFavoritos ? (
            <>
              <button
                type="button"
                onClick={() => {
                  limpiarUrlParams();
                  onNavigateCatalogo?.();
                }}
                className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Catálogo
              </button>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
              <span aria-current="page" className="font-semibold text-body-text px-1">
                Favoritos
              </span>
            </>
          ) : areaNombre ? (
            <>
              <button
                type="button"
                onClick={() => {
                  limpiarUrlParams();
                  onNavigateCatalogo?.();
                }}
                className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Catálogo
              </button>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
              <span aria-current="page" className="font-semibold text-body-text px-1">
                {areaNombre}
              </span>
            </>
          ) : esVistaAreas ? (
            <>
              <button
                type="button"
                onClick={() => {
                  limpiarUrlParams();
                  onNavigateCatalogo?.();
                }}
                className="inline-flex min-h-11 items-center px-1 font-medium text-texto-secundario hover:text-primary-text transition-colors cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Catálogo
              </button>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} className="text-texto-secundario/60 shrink-0" />
              <span aria-current="page" className="font-semibold text-body-text px-1">
                Áreas
              </span>
            </>
          ) : (
            <span aria-current="page" className="font-semibold text-body-text px-1">
              Catálogo
            </span>
          )}
        </nav>
      </div>

      {/* 2. Buscador central (solo visible en catálogo de plataformas) */}
      {mostrarBuscador ? (
        <div className="relative flex-1 max-w-md hidden md:block">
          <div className="relative flex items-center">
            <span className="absolute left-3 flex items-center pointer-events-none text-texto-secundario" aria-hidden="true">
              <Icono nombre="buscar" tamano="sm" />
            </span>
            <input
              ref={inputBusqueda}
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar plataforma..."
              className="w-full h-9 pl-9 pr-12 rounded-lg border border-borde bg-superficie text-xs text-body-text placeholder-texto-secundario focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              aria-label="Buscar plataforma o presiona ⌘K"
            />
            <kbd className="absolute right-2.5 top-2 inline-flex items-center rounded border border-borde bg-surface-container px-1.5 py-0.5 text-xs font-medium text-texto-secundario shadow-xs">
              ⌘K
            </kbd>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* 3. Navegación derecha + Acciones + Perfil */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Navegación por icono con tooltip */}
        <nav aria-label="Navegación del portal" className="flex items-center gap-1.5 sm:gap-2 mr-1">
          {/* BOTÓN REGRESAR AL PANEL ADMIN (Solo administradores) - primero de izquierda a derecha con diseño estándar e icono panel */}
          {esAdmin ? <BotonRegresarAdmin /> : null}

          <Link
            href="/platforms"
            aria-label="Plataformas"
            title="Plataformas"
            onClick={(e) => {
              limpiarUrlParams();
              if (onNavigateCatalogo) {
                e.preventDefault();
                onNavigateCatalogo();
              }
            }}
            className={`${CLASE_BOTON_ICONO} ${
              !esSolicitudes && seccionActiva !== 'personalizacion' && seccionActiva !== 'responsiva' && seccionActiva !== 'widget'
                ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20'
                : ''
            }`}
          >
            <Icono nombre="plataformas" />
          </Link>
          <Link
            href="/requests"
            aria-label={`Mis solicitudes${pendingCount > 0 ? `, ${pendingCount} pendientes` : ''}`}
            title={`Mis solicitudes${pendingCount > 0 ? ` (${pendingCount} pendientes)` : ''}`}
            className={`${CLASE_BOTON_ICONO} ${
              esSolicitudes
                ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20'
                : ''
            }`}
          >
            <Icono nombre="solicitudes" />
            {pendingCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-warning text-texto-sobre-aviso text-xs font-bold shadow-xs tabular-nums"
              >
                {pendingCount}
              </span>
            ) : null}
          </Link>

          {/* Botón de Mi Widget (Configurar accesos rápidos) */}
          {onToggleWidget ? (
            <button
              type="button"
              aria-label="Mi Widget: Configurar accesos rápidos"
              title="Mi Widget: Configurar accesos rápidos"
              onClick={() => {
                limpiarUrlParams();
                if (seccionActiva !== 'widget') {
                  onToggleWidget();
                }
              }}
              className={`${CLASE_BOTON_ICONO} ${
                seccionActiva === 'widget'
                  ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20'
                  : ''
              }`}
            >
              <Icono nombre="widget" />
            </button>
          ) : (
            <Link
              href="/platforms"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try { sessionStorage.setItem('nexus.platforms.seccion_inicial', 'widget'); } catch {}
                }
              }}
              aria-label="Mi Widget: Configurar accesos rápidos"
              title="Mi Widget: Configurar accesos rápidos"
              className={`${CLASE_BOTON_ICONO} ${
                seccionActiva === 'widget'
                  ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20'
                  : ''
              }`}
            >
              <Icono nombre="widget" />
            </Link>
          )}

          {/* Botón de Carta Responsiva */}
          {mostrarDocumentos ? (
            onToggleResponsiva ? (
              <button
                type="button"
                aria-label={`Carta Responsiva: ${responsivaFirmada ? 'Firmada' : 'Pendiente'}`}
                title={`Carta Responsiva: ${responsivaFirmada ? 'Firmada' : 'Pendiente'}`}
                onClick={() => {
                  limpiarUrlParams();
                  if (seccionActiva !== 'responsiva') {
                    onToggleResponsiva();
                  }
                }}
                className={`${CLASE_BOTON_ICONO} ${
                  seccionActiva === 'responsiva'
                    ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20'
                    : ''
                }`}
              >
                <Icono nombre="documento" />
                <span
                  className={`absolute bottom-1.5 right-1.5 size-2 rounded-full border border-superficie ${
                    responsivaFirmada ? 'bg-success' : 'bg-warning'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <Link
                href="/platforms"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    try { sessionStorage.setItem('nexus.platforms.seccion_inicial', 'responsiva'); } catch {}
                  }
                }}
                aria-label={`Carta Responsiva: ${responsivaFirmada ? 'Firmada' : 'Pendiente'}`}
                title={`Carta Responsiva: ${responsivaFirmada ? 'Firmada' : 'Pendiente'}`}
                className={`${CLASE_BOTON_ICONO} ${
                  seccionActiva === 'responsiva'
                    ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/20'
                    : ''
                }`}
              >
                <Icono nombre="documento" />
                <span
                  className={`absolute bottom-1.5 right-1.5 size-2 rounded-full border border-superficie ${
                    responsivaFirmada ? 'bg-success' : 'bg-warning'
                  }`}
                  aria-hidden="true"
                />
              </Link>
            )
          ) : null}
        </nav>

        {/* Separador vertical 1: a la izquierda del engrane */}
        <div data-testid="divisor-topbar-seccion-1" className="h-6 w-px bg-panel-border/80 self-center mx-0.5 sm:mx-1 shrink-0" aria-hidden="true" />

        {/* Conmutador de Ajustes y Personalización de vista */}
        <BotonIcono
          icono="ajustes"
          etiqueta="Configuración y diseño de vista"
          aria-pressed={seccionActiva === 'personalizacion'}
          className={seccionActiva === 'personalizacion' ? '!border-primary !bg-primary/10 !text-primary-text ring-2 ring-primary/20' : ''}
          onClick={() => {
            limpiarUrlParams();
            onToggleAjustes?.();
          }}
        />

        {/* Conmutador de tema */}
        <BotonIcono icono={oscuro ? 'sol' : 'luna'} etiqueta={etiquetaTema} onClick={() => { void alternarTema(); }} />

        {/* Menú de Notificaciones desplegable */}
        <MenuNotificaciones noLeidasInicial={noLeidas} />

        {/* Separador vertical 2: a la derecha de la campana */}
        <div data-testid="divisor-topbar-seccion-2" className="h-6 w-px bg-panel-border/80 self-center mx-0.5 sm:mx-1 shrink-0" aria-hidden="true" />

        {/* Menú de usuario desplegable hacia abajo */}
        <div className="relative">
          <MenuUsuario session={session} enBarraLateral={false} posicionMenu="abajo" colapsada={esCompacto} />
        </div>
      </div>
    </header>
  );
}
