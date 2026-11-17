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
              const url = new URL(window.location.href);
              url.searchParams.delete('area');
              url.searchParams.delete('area_name');
              window.history.pushState({}, '', url.pathname);
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
