'use client';

/**
 * Modal preventivo de transición hacia el Panel de Administración (Admin Board) desde el Portal de Usuario.
 * Avisa al administrador que está saliendo de la vista de colaboradores para retornar a la consola de gestión,
 * con opción para omitir el diálogo en visitas posteriores o restaurarlo desde ajustes.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '../form';
import { Icono } from '../icono';
import { CLASE_BOTON_ICONO } from '../marco/boton-icono';

export const CLAVE_OMITIR_MODAL_ADMIN = 'nexus.platforms.omit_admin_redirect_modal';

export function leerOmitirModalAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CLAVE_OMITIR_MODAL_ADMIN) === 'true';
  } catch {
    return false;
  }
}

export function guardarOmitirModalAdmin(omitir: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (omitir) {
      window.localStorage.setItem(CLAVE_OMITIR_MODAL_ADMIN, 'true');
    } else {
      window.localStorage.removeItem(CLAVE_OMITIR_MODAL_ADMIN);
    }
  } catch {
    /* Almacenamiento local bloqueado */
  }
}

export interface ModalTransicionAdminProps {
  abierto: boolean;
  onConfirm: (omitirSiguientes: boolean) => void;
  onCancel: () => void;
}

export function ModalTransicionAdmin({
  abierto,
  onConfirm,
  onCancel,
}: ModalTransicionAdminProps) {
  const [omitir, setOmitir] = useState(false);

  if (!abierto) return null;

  return (
    <Modal
      title="Regresar al Panel de Administración"
      icon="panel"
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
            Ir a admin
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary-text">
          <Icono nombre="panel" tamano="xs" ariaHidden={true} className="shrink-0 text-primary-text" />
          <span>Retorno a Administración</span>
        </div>
        <p className="text-sm text-body-text leading-relaxed">
          Estás por salir del <strong>Portal de Usuario</strong> para volver a la consola del <strong>Panel de Administración</strong>.
        </p>
        <p className="text-xs sm:text-sm text-texto-secundario leading-relaxed">
          En esta consola podrás gestionar plataformas de TI, áreas, auditorías, conectores y usuarios.
        </p>

        <div>
          <div className="rounded-xl border border-panel-border bg-superficie-hundida/70 p-3.5 text-xs text-body-text flex items-start gap-2.5">
            <Icono nombre="info" tamano="sm" ariaHidden={true} className="shrink-0 text-primary-text mt-0.5" />
            <p className="text-texto-secundario leading-normal">
              Podrás regresar en cualquier momento al Portal de Usuario seleccionando la opción <strong>«Portal»</strong> en la barra lateral del Admin Board.
            </p>
          </div>

          <label
            htmlFor="omitir-modal-admin"
            className="inline-flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-medium text-body-text select-none mt-2.5 pl-0.5"
          >
            <input
              id="omitir-modal-admin"
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

function useSafeRouter(): { push: (href: string) => void } | null {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function BotonRegresarAdmin({ className = CLASE_BOTON_ICONO }: { className?: string }) {
  const router = useSafeRouter();
  const [modalAbierto, setModalAbierto] = useState(false);

  const alHacerClicRegresar = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const omitir = leerOmitirModalAdmin();
    if (!omitir) {
      event.preventDefault();
      setModalAbierto(true);
      return;
    }
  };

  const handleConfirmar = (omitirSiguientes: boolean) => {
    if (omitirSiguientes) {
      guardarOmitirModalAdmin(true);
    }
    setModalAbierto(false);
    if (router) {
      router.push('/dashboard');
    } else if (typeof window !== 'undefined') {
      window.location.assign('/dashboard');
    }
  };

  const handleCancelar = () => {
    setModalAbierto(false);
  };

  return (
    <>
      <Link
        href="/dashboard"
        aria-label="Regresar al panel de administración"
        title="Regresar al panel de administración"
        onClick={alHacerClicRegresar}
        className={`min-h-12 min-w-12 ${className}`}
      >
        <Icono nombre="panel" />
      </Link>
      {modalAbierto ? (
        <ModalTransicionAdmin
          abierto={modalAbierto}
          onConfirm={handleConfirmar}
          onCancel={handleCancelar}
        />
      ) : null}
    </>
  );
}
