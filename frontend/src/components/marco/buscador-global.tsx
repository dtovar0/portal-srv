'use client';

/**
 * Buscador global de la barra superior (DIS-078): el campo (escritorio) o un icono (móvil) abren
 * la paleta de comandos; `Ctrl K` / `⌘K` la abre desde cualquier parte. Busca entre las pantallas
 * del menú y las acciones del rol, en el cliente.
 */

import { useEffect, useState } from 'react';
import { Icono } from '../icono';
import { BotonIcono } from './boton-icono';
import { esAtajoBusqueda, textoAtajo, type Comando } from './comandos';
import { PaletaComandos } from './paleta-comandos';

export function BuscadorGlobal({ comandos }: { comandos: readonly Comando[] }) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (!esAtajoBusqueda(evento)) return;
      evento.preventDefault();
      setAbierta(true);
    }
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        aria-label={`Buscar (${textoAtajo()})`}
        className="mx-auto hidden min-h-11 min-w-0 max-w-buscador w-full flex-1 items-center gap-2.5 rounded-base border border-borde bg-entrada-fondo px-3 text-sm text-texto-secundario outline-none transition-colors hover:border-borde-fuerte focus-visible:ring-2 focus-visible:ring-primary md:flex"
      >
        <Icono nombre="buscar" tamano="sm" />
        <span className="min-w-0 flex-1 truncate text-left">Buscar usuarios, plataformas, solicitudes…</span>
        <kbd className="rounded-control border border-borde px-1.5 py-0.5 text-xs">{textoAtajo()}</kbd>
      </button>
      <BotonIcono
        icono="buscar"
        etiqueta="Buscar"
        aria-haspopup="dialog"
        onClick={() => setAbierta(true)}
        className="md:hidden"
      />
      {abierta ? <PaletaComandos comandos={comandos} onCerrar={() => setAbierta(false)} /> : null}
    </>
  );
}
