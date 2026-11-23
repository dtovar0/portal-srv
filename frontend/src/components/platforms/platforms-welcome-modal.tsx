'use client';

/**
 * Modal emergente de bienvenida para el portal de plataformas corporativas (DIS-115).
 * Disponible de manera homogénea tanto para la vista de Barra Superior (Topbar / Launchpad)
 * como para la vista de Barra Lateral (Sidebar / Workspace).
 *
 * Permite al usuario consultar su resumen de herramientas y solicitudes, con la opción
 * de omitir el diálogo para futuras sesiones o restaurarlo desde la configuración de vista.
 */

import { useState } from 'react';
import { Button, Checkbox, Modal } from '../form';

export const CLAVE_OMITIR_BIENVENIDA = 'nexus.platforms.omit_welcome_modal';

export function leerOmitirBienvenida(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CLAVE_OMITIR_BIENVENIDA) === 'true';
  } catch {
    return false;
  }
}

export function guardarOmitirBienvenida(omitir: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (omitir) {
      window.localStorage.setItem(CLAVE_OMITIR_BIENVENIDA, 'true');
    } else {
      window.localStorage.removeItem(CLAVE_OMITIR_BIENVENIDA);
    }
  } catch {
    /* Almacenamiento local bloqueado o no disponible */
  }
}

export interface PlatformsWelcomeModalProps {
  primerNombre: string;
  activasCount: number;
  pendientesCount: number;
  onClose: () => void;
}

export function PlatformsWelcomeModal({
  primerNombre,
  activasCount,
  pendientesCount,
  onClose,
}: PlatformsWelcomeModalProps) {
  const [omitirProximaVez, setOmitirProximaVez] = useState(false);

  const handleCerrar = () => {
    if (omitirProximaVez) {
      guardarOmitirBienvenida(true);
    }
    onClose();
  };

  return (
    <Modal
      title={`¡Hola, ${primerNombre}! 👋`}
      icon="marca"
      size="xl"
      onClose={handleCerrar}
      footer={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
          <Checkbox
            id="omitir-modal-bienvenida"
            label="Omitir la próxima vez"
            checked={omitirProximaVez}
            onChange={(e) => setOmitirProximaVez(e.target.checked)}
          />
          <Button
            type="button"
            variant="primary"
            onClick={handleCerrar}
            className="min-h-12 w-full sm:w-auto"
          >
            Entendido
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary-text">
          <span>✨ Bienvenido a tu espacio de trabajo</span>
        </div>
        <p className="text-xs sm:text-sm text-texto-secundario leading-relaxed">
          Aquí tienes todas las herramientas asignadas a tu cuenta y el catálogo completo para solicitar acceso a nuevas plataformas corporativas.
        </p>

        {/* Tarjetas métricas */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-xl border border-panel-border bg-panel-fill p-4 text-center shadow-xs">
            <div className="text-2xl sm:text-3xl font-extrabold text-body-text">{activasCount}</div>
            <div className="text-xs font-medium text-texto-secundario uppercase tracking-wider mt-1">
              {activasCount === 1 ? 'Plataforma Activa' : 'Plataformas Activas'}
            </div>
          </div>
          <div className="rounded-xl border border-panel-border bg-panel-fill p-4 text-center shadow-xs">
            <div className="text-2xl sm:text-3xl font-extrabold text-warning-text">{pendientesCount}</div>
            <div className="text-xs font-medium text-warning-text uppercase tracking-wider mt-1">
              {pendientesCount === 1 ? 'Solicitud en Proceso' : 'Solicitudes en Proceso'}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

