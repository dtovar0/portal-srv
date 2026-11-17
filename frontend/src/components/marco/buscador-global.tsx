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

  if (!abierta) return null;
  return <PaletaComandos comandos={comandos} onCerrar={() => setAbierta(false)} />;
}
