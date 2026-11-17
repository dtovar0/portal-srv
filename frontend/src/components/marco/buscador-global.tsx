'use client';

/**
 * Buscador global de la barra superior (DIS-078): un botón de icono «Buscar», visible en todos los
 * tamaños, abre la paleta de comandos; `Ctrl K` / `⌘K` la abre también desde cualquier parte. Busca
 * entre las pantallas del menú y las acciones del rol, en el cliente.
 */

import { useEffect, useState } from 'react';
import { BotonIcono } from './boton-icono';
import { esAtajoBusqueda, type Comando } from './comandos';
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
      <BotonIcono
        icono="buscar"
        etiqueta="Buscar"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setAbierta(true)}
      />
      {abierta ? <PaletaComandos comandos={comandos} onCerrar={() => setAbierta(false)} /> : null}
    </>
  );
}
