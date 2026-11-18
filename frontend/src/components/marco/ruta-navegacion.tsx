'use client';

/** Ruta de navegación de la barra superior (DIS-078): «Inicio › <pantalla actual>». */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icono } from '../icono';
import { entradaDeRuta } from './nav-items';

function obtenerAreaDeUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const state = window.history.state as { areaName?: string; area_name?: string } | null;
    if (state?.areaName) return state.areaName;
    if (state?.area_name) return state.area_name;
    const ses = window.sessionStorage?.getItem('portal_selected_area_name');
    if (ses) return ses;
    const sp = new URLSearchParams(window.location.search);
    return sp.get('area_name');
  } catch {
    return null;
  }
}

export function RutaNavegacion() {
  const pathname = usePathname();
  const [areaNombre, setAreaNombre] = useState<string | null>(obtenerAreaDeUrl);

  useEffect(() => {
    function sincronizar() {
      setAreaNombre(obtenerAreaDeUrl());
    }
    sincronizar();
    window.addEventListener('popstate', sincronizar);
    return () => window.removeEventListener('popstate', sincronizar);
  }, [pathname]);

  const entrada = entradaDeRuta(pathname);
  if (!entrada) return null;

  if (areaNombre && (pathname === '/admin/platforms' || pathname === '/platforms')) {
    return (
      <nav aria-label="Ruta" className="hidden items-center whitespace-nowrap text-sm text-texto-secundario lg:flex">
        <span className="inline-flex min-h-11 items-center px-2 font-medium text-texto-secundario">
          {entrada.seccion}
        </span>
        <Icono nombre="chevron-der" tamano="sm" />
        <Link
          href={pathname}
          onClick={() => {
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.removeItem('portal_selected_area_id');
                sessionStorage.removeItem('portal_selected_area_name');
              } catch {}
              window.history.pushState({ areaId: null, areaName: null }, '', pathname);
              window.dispatchEvent(new Event('popstate'));
            }
          }}
          className="inline-flex min-h-12 items-center px-3 font-medium text-texto-secundario hover:text-primary-text transition-colors"
        >
          {entrada.label}
        </Link>
        <Icono nombre="chevron-der" tamano="sm" />
        <span aria-current="page" className="inline-flex min-h-11 items-center px-2 font-semibold text-body-text">{areaNombre}</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Ruta" className="hidden items-center whitespace-nowrap text-sm text-texto-secundario lg:flex">
      <span className="inline-flex min-h-11 items-center px-2 font-medium text-texto-secundario">
        {entrada.seccion}
      </span>
      <Icono nombre="chevron-der" tamano="sm" />
      <span aria-current="page" className="px-2 font-semibold text-body-text">{entrada.label}</span>
    </nav>
  );
}
