'use client';

/**
 * Diálogo de alerta y confirmación accesible estilo SweetAlert propio (DIS-074).
 *
 * - Diseñado sobre tokens y los 2 temas, sin librerías externas ni estilos en línea.
 * - `role="alertdialog"`, `aria-labelledby`, `aria-describedby` y `aria-modal="true"`.
 * - Foco inicial en el botón seguro (Cancelar) y retorno de foco al disparador (`useFocusTrap`).
 * - Bloqueo de desplazamiento con `useScrollLock` y canal estable.
 * - Icono destacado según tipo ('exito' | 'error' | 'aviso' | 'info' | 'pregunta').
 * - Botón de confirmación con estado `busy` y `aria-disabled`.
 */

import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';
import { Icono, type NombreIcono } from './icono';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { useScrollLock } from '@/lib/use-scroll-lock';

export type AlertDialogType = 'exito' | 'error' | 'aviso' | 'info' | 'pregunta';

export interface AlertDialogProps {
  open?: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  type?: AlertDialogType;
  role?: 'alertdialog' | 'dialog';
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'secondary';
  onConfirm?: () => void;
  busy?: boolean;
  children?: React.ReactNode;
  devolverA?: React.RefObject<HTMLElement | null>;
  describedBy?: string;
  confirmDisabled?: boolean;
  confirmForm?: string;
  confirmType?: 'button' | 'submit';
  confirmAriaDescribedBy?: string;
}

const TYPE_CONFIG: Record<
  AlertDialogType,
  { icono: NombreIcono; contenedorColor: string; iconoColor: string; defaultVariant: 'primary' | 'danger' }
> = {
  exito: {
    icono: 'exito',
    contenedorColor: 'bg-success/15 border-success/30',
    iconoColor: 'text-success-text',
    defaultVariant: 'primary',
  },
  error: {
    icono: 'error',
    contenedorColor: 'bg-error/15 border-error/30',
    iconoColor: 'text-error-text',
    defaultVariant: 'danger',
  },
  aviso: {
    icono: 'aviso',
    contenedorColor: 'bg-warning/15 border-warning/30',
    iconoColor: 'text-warning-text',
    defaultVariant: 'danger',
  },
  info: {
    icono: 'info',
    contenedorColor: 'bg-primary/15 border-primary/30',
    iconoColor: 'text-primary-text',
    defaultVariant: 'primary',
  },
  pregunta: {
    icono: 'pregunta',
    contenedorColor: 'bg-warning/15 border-warning/30',
    iconoColor: 'text-warning-text',
    defaultVariant: 'danger',
  },
};

export function AlertDialog({
  open = true,
  onClose,
  title,
  message,
  type = 'pregunta',
  role = 'alertdialog',
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  confirmVariant,
  onConfirm,
  busy = false,
  children,
  devolverA,
  describedBy,
  confirmDisabled = false,
  confirmForm,
  confirmType,
  confirmAriaDescribedBy,
}: AlertDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const titleId = useId();
  const descId = useId();

  useScrollLock(open);
  useFocusTrap(panelRef, {
    activo: open,
    alEscape: onClose,
    devolverA,
    focoInicial: () => {
      // Foco seguro en Cancelar; si no existe botón cancelar, foco en Confirmar
      return [cancelButtonRef.current ?? confirmButtonRef.current].filter(
        Boolean,
      ) as HTMLElement[];
    },
  });

  if (!open) return null;

  const config = TYPE_CONFIG[type];
  const botonVariante = confirmVariant ?? config.defaultVariant;
  const encabezadoAviso = botonVariante !== 'danger' && (type === 'aviso' || type === 'pregunta');
  const headerGradient =
    botonVariante === 'danger'
      ? 'bg-gradient-to-r from-error-solid/95 via-error-solid to-error-solid'
      : encabezadoAviso
      ? 'bg-gradient-to-r from-warning/95 via-warning to-warning'
      : 'bg-gradient-to-r from-primary via-brand to-accent';
  // Texto del encabezado: oscuro sobre ámbar (el blanco da 2,15:1), blanco sobre error y marca (DIS-097).
  const textoEncabezado = encabezadoAviso ? 'text-texto-sobre-aviso' : 'text-texto-sobre-accion';
  const cerrarEncabezado = encabezadoAviso
    ? 'text-texto-sobre-aviso/80 hover:text-texto-sobre-aviso'
    : 'text-texto-sobre-accion/80 hover:text-texto-sobre-accion';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-overlay/70 backdrop-blur-md p-4 transition-all duration-300"
      onClick={(e) => {
        // Clic en el fondo no confirma; si no está ocupado permite cerrar
        if (e.target === e.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy ?? (message ? descId : undefined)}
        tabIndex={-1}
        className="nx-modal-glass flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-panel-border/90 bg-gradient-to-b from-superficie via-superficie to-superficie-hundida shadow-2xl outline-none"
      >
        {/* HEADER: Estandarizado con degradado y badge */}
        <div className={`flex h-18 shrink-0 items-center justify-between border-b border-superficie/10 ${headerGradient} px-6 py-4`}>
          <div className="flex items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-superficie/25 bg-superficie/15 ${textoEncabezado} shadow-sm backdrop-blur-xs`} aria-hidden="true">
              <Icono nombre={config.icono} tamano="md" ariaHidden={true} />
            </span>
            <h2 id={titleId} className={`text-base font-bold tracking-tight ${textoEncabezado} truncate`}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
            className={`flex min-h-12 min-w-12 items-center justify-center rounded-xl ${cerrarEncabezado} transition-colors hover:bg-superficie/15 focus-visible:ring-2 focus-visible:ring-superficie`}
          >
            <Icono nombre="cerrar" tamano="md" ariaHidden={true} />
          </button>
        </div>

        {/* BODY: Con flex-1 y scroll accesible */}
        <div className="flex-1 min-h-0 space-y-5 overflow-y-auto bg-panel-fill px-6 py-6 text-body-text flex flex-col justify-center items-center text-center">
          {/* Ícono grande centrado con relieve y halo */}
          <div className="mx-auto flex size-20 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-brand/10 to-accent/10 shadow-lg p-1">
            <div
              className={`flex size-14 items-center justify-center rounded-lg border shadow-xs ${config.contenedorColor} ${config.iconoColor}`}
            >
              <Icono nombre={config.icono} tamano="lg" ariaHidden={true} />
            </div>
          </div>

          {/* Mensaje descriptivo */}
          {message ? (
            <div className="max-w-md mx-auto space-y-3">
              <p id={descId} className="text-base font-semibold text-body-text leading-relaxed">
                {message}
              </p>
              {botonVariante === 'danger' || type === 'error' || type === 'aviso' ? (
                <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-xs text-error-text font-medium flex items-center justify-center gap-2">
                  <Icono nombre="aviso" tamano="sm" ariaHidden={true} />
                  <span>Esta acción no se puede deshacer y los datos se eliminarán permanentemente.</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Contenido / formulario opcional */}
          {children ? <div className="mt-2 text-left w-full space-y-4">{children}</div> : null}
        </div>

        {/* FOOTER: Estandarizado con distribución entre extremos (Cancelar izq, Confirmar der) */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-panel-border/80 bg-superficie-hundida/90 px-6 py-4 shadow-xs [&>*:only-child]:ml-auto">
          {cancelLabel ? (
            <Button
              ref={cancelButtonRef}
              variant="secondary"
              disabled={busy}
              onClick={onClose}
              className="min-h-12 min-w-28 text-xs font-bold"
            >
              <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            ref={confirmButtonRef}
            variant={botonVariante}
            busy={busy}
            disabled={confirmDisabled}
            form={confirmForm}
            type={confirmType ?? (confirmForm ? 'submit' : 'button')}
            aria-describedby={confirmAriaDescribedBy}
            aria-disabled={busy || undefined}
            onClick={() => {
              if (busy) return;
              if (confirmForm && confirmType === 'submit') return;
              if (onConfirm) onConfirm();
              else onClose();
            }}
            className="min-h-12 min-w-28 text-xs font-bold shadow-xs"
          >
            <Icono
              nombre={botonVariante === 'danger' ? 'eliminar' : 'aprobar'}
              tamano="sm"
              ariaHidden={true}
              className="mr-1.5"
            />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
