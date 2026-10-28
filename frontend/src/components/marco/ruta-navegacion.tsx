'use client';

/** Ruta de navegación de la barra superior (DIS-078): «Inicio › <pantalla actual>». */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icono } from '../icono';
import { entradaDeRuta } from './nav-items';

export function RutaNavegacion() {
  const entrada = entradaDeRuta(usePathname());
  if (!entrada) return null;
  return (
    <nav aria-label="Ruta" className="hidden items-center whitespace-nowrap text-sm text-texto-secundario lg:flex">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-control px-3 outline-none hover:text-body-text focus-visible:ring-2 focus-visible:ring-primary">
        Inicio
      </Link>
      <Icono nombre="chevron-der" tamano="sm" />
      <span aria-current="page" className="px-1 font-semibold text-body-text">{entrada.label}</span>
    </nav>
  );
}
