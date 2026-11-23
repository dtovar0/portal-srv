'use client';

/**
 * Modal preventivo de transición hacia el Portal de Usuario desde el Admin Board.
 * Avisa al administrador que está cambiando de entorno para evitar transiciones bruscas,
 * con opción para omitir el diálogo en visitas posteriores o restaurarlo desde ajustes.
 */

import { useState } from 'react';
import { Button, Modal } from '../form';
import { Icono } from '../icono';

export const CLAVE_OMITIR_MODAL_PORTAL = 'nexus.admin.omit_portal_redirect_modal';

export function leerOmitirModalPortal(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CLAVE_OMITIR_MODAL_PORTAL) === 'true';
  } catch {
    return false;
  }
}

export function guardarOmitirModalPortal(omitir: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (omitir) {
      window.localStorage.setItem(CLAVE_OMITIR_MODAL_PORTAL, 'true');
    } else {
      window.localStorage.removeItem(CLAVE_OMITIR_MODAL_PORTAL);
    }
  } catch {
    /* Almacenamiento local bloqueado */
  }
}

export interface ModalTransicionPortalProps {
  abierto: boolean;
  onConfirm: (omitirSiguientes: boolean) => void;
  onCancel: () => void;
}

export function ModalTransicionPortal({
  abierto,
  onConfirm,
  onCancel,
}: ModalTransicionPortalProps) {
  const [omitir, setOmitir] = useState(false);

  if (!abierto) return null;

  return (
    <Modal
      title="Ir al Portal de Usuario"
      icon="catalogo"
      size="lg"
      onClose={onCancel}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="min-h-11 w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => onConfirm(omitir)}
            className="min-h-11 w-full sm:w-auto"
          >
            Ir al portal
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary-text">
          <Icono nombre="catalogo" tamano="xs" ariaHidden={true} className="shrink-0 text-primary-text" />
          <span>Transición de entorno</span>
        </div>
        <p className="text-sm text-body-text leading-relaxed">
          Estás por salir de la consola de administración técnica para ingresar a la vista del <strong>Portal de Usuario</strong>.
        </p>
        <p className="text-xs sm:text-sm text-texto-secundario leading-relaxed">
          En esta vista visualizarás el catálogo de plataformas tal como lo experimentan los colaboradores de la organización.
        </p>

        <div>
          <div className="rounded-xl border border-panel-border bg-superficie-hundida/70 p-3.5 text-xs text-body-text flex items-start gap-2.5">
            <Icono nombre="info" tamano="sm" ariaHidden={true} className="shrink-0 text-primary-text mt-0.5" />
            <p className="text-texto-secundario leading-normal">
              Podrás regresar en cualquier momento a este panel de administración pulsando el botón <strong>«Regresar al Panel Admin»</strong> en la barra superior del portal.
            </p>
          </div>

          <label
            htmlFor="omitir-modal-portal"
            className="inline-flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-medium text-body-text select-none mt-2.5 pl-0.5"
          >
            <input
              id="omitir-modal-portal"
              type="checkbox"
              checked={omitir}
              onChange={(e) => setOmitir(e.target.checked)}
              className="nexus-checkbox cursor-pointer shrink-0"
            />
            <span>No volver a mostrar este aviso</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}

