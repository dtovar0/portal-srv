'use client';

/**
 * Ayuda de la barra superior (DIS-078): botón que abre un diálogo (`Modal`) con los atajos
 * de teclado del marco. El foco vuelve al botón al cerrar.
 */

import { useRef, useState } from 'react';
import { Modal } from '../form';
import { BotonIcono } from './boton-icono';
import { textoAtajo } from './comandos';

export function AyudaMarco() {
  const [abierta, setAbierta] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  return (
    <>
      <BotonIcono
        ref={boton}
        icono="ayuda"
        etiqueta="Ayuda"
        aria-haspopup="dialog"
        onClick={() => setAbierta(true)}
        className="hidden sm:inline-flex"
      />
      {abierta ? (
        <Modal title="Ayuda" onClose={() => setAbierta(false)}>
          <p className="text-sm text-label">Atajos de teclado del portal:</p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt>Abrir el buscador de pantallas y acciones</dt>
              <dd><kbd className="rounded-control border border-borde px-1.5 py-0.5 text-xs">{textoAtajo()}</kbd></dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Cerrar un diálogo o un menú</dt>
              <dd><kbd className="rounded-control border border-borde px-1.5 py-0.5 text-xs">Esc</kbd></dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Moverse por los resultados y los menús</dt>
              <dd><kbd className="rounded-control border border-borde px-1.5 py-0.5 text-xs">↑ ↓</kbd></dd>
            </div>
          </dl>
        </Modal>
      ) : null}
    </>
  );
}
