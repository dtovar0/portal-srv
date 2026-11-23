'use client';

/**
 * Barra superior del marco (DIS-078), 64 px: botón de menú, ruta de navegación, tema
 * claro/oscuro, notificaciones con indicador, ayuda y, solo en el dashboard, el diseño de las
 * tarjetas (DIS-113). Sin buscador global (DIS-101). El menú
 * de usuario va en el pie de la barra lateral (DIS-080). Bajo `md` el botón de menú abre el
 * cajón (`MobileMenu`).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlatformsLayout } from '@/lib/platforms-layout';
import { guardarDisenoTarjetas } from '../dashboard/diseno-tarjetas';
import { SelectorDisenoTarjetas } from '../dashboard/selector-diseno-tarjetas';
import { useDisenoTarjetas } from '../dashboard/use-diseno-tarjetas';
import { Icono } from '../icono';
import { AyudaMarco } from './ayuda-marco';
import { ID_BARRA_LATERAL } from './barra-lateral';
import { BotonIcono, CLASE_BOTON_ICONO } from './boton-icono';
import { RutaNavegacion } from './ruta-navegacion';

/** Ruta del dashboard, la única donde se ve el botón «Diseño de tarjetas» (DIS-113). */
const RUTA_DASHBOARD = '/dashboard';

function DisenoTarjetasEnBarra() {
  const diseno = useDisenoTarjetas();
  return <SelectorDisenoTarjetas actual={diseno} onAplicar={guardarDisenoTarjetas} />;
}

export function BarraSuperior({
  menuMovil,
  colapsada,
  onAlternarMenu,
  oscuro,
  onAlternarTema,
  noLeidas,
}: {
  /** Botón del cajón móvil (`MobileMenu`). */
  menuMovil: React.ReactNode;
  colapsada: boolean;
  onAlternarMenu: () => void;
  oscuro: boolean;
  onAlternarTema: () => void;
  noLeidas: number;
}) {
  const pathname = usePathname();
  const enDashboard = pathname === RUTA_DASHBOARD;
  const enPlataformas = pathname === '/platforms';
  const { layout, setLayout } = usePlatformsLayout();
  const etiquetaMenu = colapsada ? 'Expandir menú' : 'Colapsar menú';
  const etiquetaTema = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  const etiquetaNotificaciones = noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones';

  return (
    <header className="flex h-barra-superior shrink-0 items-center gap-2 sm:gap-4 border-b border-borde bg-header px-4 text-header-text md:px-6">
      {menuMovil}
      <BotonIcono
        icono="menu"
        etiqueta={etiquetaMenu}
        aria-expanded={!colapsada}
        aria-controls={ID_BARRA_LATERAL}
        onClick={onAlternarMenu}
        className="hidden md:inline-flex"
      />
      <RutaNavegacion />
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {enPlataformas ? (
          <button
            type="button"
            onClick={() => setLayout(layout === 'topbar' ? 'sidebar' : 'topbar')}
            title={layout === 'topbar' ? 'Cambiar a diseño con barra lateral' : 'Cambiar a diseño solo barra superior'}
            aria-label={layout === 'topbar' ? 'Cambiar a diseño con barra lateral' : 'Cambiar a diseño solo barra superior'}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-borde bg-superficie px-3 py-1 text-xs font-medium text-navegacion hover:bg-surface-container hover:text-body-text focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            <Icono nombre="ajustes" tamano="sm" />
            <span className="hidden md:inline">
              {layout === 'topbar' ? 'Vista: Topbar' : 'Vista: Sidebar'}
            </span>
          </button>
        ) : null}
        {enDashboard ? <DisenoTarjetasEnBarra /> : null}
        <BotonIcono icono={oscuro ? 'sol' : 'luna'} etiqueta={etiquetaTema} onClick={onAlternarTema} />
        <Link href="/notifications" aria-label={etiquetaNotificaciones} title="Notificaciones" className={CLASE_BOTON_ICONO}>
          <Icono nombre="campana" />
          {noLeidas > 0 ? (
            <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2.5 rounded-pastilla border-2 border-superficie bg-error-solid" />
          ) : null}
        </Link>
        <AyudaMarco />
      </div>
    </header>
  );
}
