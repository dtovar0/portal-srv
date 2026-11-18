'use client';

/**
 * Ayuda de la barra superior (DIS-078): botón que abre un diálogo (`Modal`) con los atajos
 * de teclado del marco. El foco vuelve al botón al cerrar.
 */

import { useRef, useState } from 'react';
import { Button, Modal } from '../form';
import { Icono } from '../icono';
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
        <Modal
          title="Ayuda"
          icon="ayuda"
          onClose={() => setAbierta(false)}
          footer={
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAbierta(false)}
              className="min-h-11 px-4"
            >
              <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
              Entendido
            </Button>
          }
        >
          <p className="text-sm font-medium text-label">Atajos de teclado del portal:</p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-panel-border/80 bg-superficie p-3.5 shadow-xs transition-colors hover:border-primary/40">
              <dt className="font-medium text-body-text">Abrir el buscador de pantallas y acciones</dt>
              <dd><kbd className="rounded-md border border-b-2 border-borde bg-superficie-hundida px-2.5 py-1 font-mono text-xs font-bold text-body-text shadow-xs">{textoAtajo()}</kbd></dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-panel-border/80 bg-superficie p-3.5 shadow-xs transition-colors hover:border-primary/40">
              <dt className="font-medium text-body-text">Cerrar un diálogo o un menú</dt>
              <dd><kbd className="rounded-md border border-b-2 border-borde bg-superficie-hundida px-2.5 py-1 font-mono text-xs font-bold text-body-text shadow-xs">Esc</kbd></dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-panel-border/80 bg-superficie p-3.5 shadow-xs transition-colors hover:border-primary/40">
              <dt className="font-medium text-body-text">Moverse por los resultados y los menús</dt>
              <dd><kbd className="rounded-md border border-b-2 border-borde bg-superficie-hundida px-2.5 py-1 font-mono text-xs font-bold text-body-text shadow-xs">↑ ↓</kbd></dd>
            </div>
          </dl>
        </Modal>
      ) : null}
    </>
  );
}
