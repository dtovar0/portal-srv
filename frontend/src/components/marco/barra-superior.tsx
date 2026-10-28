'use client';

/**
 * Barra superior del marco (DIS-078), 64 px: botón de menú, ruta de navegación, buscador global,
 * tema claro/oscuro, notificaciones con indicador, ayuda y menú de usuario. Bajo `md` el botón
 * de menú abre el cajón (`MobileMenu`) y el buscador se reduce a un icono.
 */

import Link from 'next/link';
import { Icono } from '../icono';
import type { Session } from '@/lib/types';
import { AyudaMarco } from './ayuda-marco';
import { BotonIcono, CLASE_BOTON_ICONO } from './boton-icono';
import { BuscadorGlobal } from './buscador-global';
import type { Comando } from './comandos';
import { MenuUsuario } from './menu-usuario';
import { RutaNavegacion } from './ruta-navegacion';

export function BarraSuperior({
  session,
  menuMovil,
  colapsada,
  onAlternarMenu,
  comandos,
  oscuro,
  segunSistema,
  onAlternarTema,
  onTemaSistema,
  noLeidas,
}: {
  session: Session;
  /** Botón del cajón móvil (`MobileMenu`). */
  menuMovil: React.ReactNode;
  colapsada: boolean;
  onAlternarMenu: () => void;
  comandos: readonly Comando[];
  oscuro: boolean;
  segunSistema: boolean;
  onAlternarTema: () => void;
  onTemaSistema: () => void;
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
        onClick={onAlternarMenu}
        className="hidden md:inline-flex"
      />
      <RutaNavegacion />
      <BuscadorGlobal comandos={comandos} />
      <div className="ml-auto flex min-w-0 items-center gap-2 md:ml-0">
        <BotonIcono icono={oscuro ? 'sol' : 'luna'} etiqueta={etiquetaTema} onClick={onAlternarTema} />
        <Link href="/notifications" aria-label={etiquetaNotificaciones} title="Notificaciones" className={CLASE_BOTON_ICONO}>
          <Icono nombre="campana" />
          {noLeidas > 0 ? (
            <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2.5 rounded-pastilla border-2 border-superficie bg-error-solid" />
          ) : null}
        </Link>
        <AyudaMarco />
        <span aria-hidden="true" className="mx-1 hidden h-7 w-px bg-borde sm:block" />
        <MenuUsuario session={session} segunSistema={segunSistema} onSegunSistema={onTemaSistema} />
      </div>
    </header>
  );
}
