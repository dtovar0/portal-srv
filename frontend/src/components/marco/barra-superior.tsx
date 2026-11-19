'use client';

/**
 * Barra superior del marco (DIS-078), 64 px: botón de menú, ruta de navegación (sin buscador
 * global desde DIS-101),
 * tema claro/oscuro, notificaciones con indicador y ayuda (el menú de usuario va en el pie de la
 * barra lateral, DIS-080). Bajo `md` el botón
 * de menú abre el cajón (`MobileMenu`).
 */

import Link from 'next/link';
import { Icono } from '../icono';
import { AyudaMarco } from './ayuda-marco';
import { ID_BARRA_LATERAL } from './barra-lateral';
import { BotonIcono, CLASE_BOTON_ICONO } from './boton-icono';
import { RutaNavegacion } from './ruta-navegacion';

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
        <Link
          href="/platforms"
          aria-label="Catálogo de plataformas"
          title="Catálogo de plataformas"
          className={CLASE_BOTON_ICONO}
        >
          <Icono nombre="plataformas" />
        </Link>
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
