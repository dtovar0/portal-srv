'use client';

/**
 * Controles de formulario y modal.
 *
 * Las clases replican el marcado de las plantillas del portal: inputs
 * `h-12 bg-surface-container/30 border border-panel-border rounded-xl`, botones
 * `.nexus-btn`, casillas `.nexus-checkbox` y modales `.nx-modal-glass`.
 */

import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CAMPOS, esVisible, useFocusTrap } from '@/lib/use-focus-trap';
import { useScrollLock } from '@/lib/use-scroll-lock';
import { Icono, type NombreIcono } from './icono';
import { AlertDialog, type AlertDialogProps, type AlertDialogType } from './alert-dialog';
export { Drawer, type DrawerProps } from './drawer';
export { AlertDialog, type AlertDialogProps, type AlertDialogType };

export function Field({
  label,
  hint,
  error,
  errorId,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-wider text-label">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs font-normal text-label/85">{hint}</span>
      ) : null}
      {error ? (
        <span id={errorId} className="block min-h-5 text-xs font-bold text-error-text">
          {error}
        </span>
      ) : null}
    </label>
  );
}

// users.html: el input estándar del portal con estados completos (DIS-059).
const FIELD_BASE =
  'w-full bg-superficie border border-panel-border rounded-xl px-4 ' +
  'text-sm font-semibold text-body-text placeholder:text-placeholder shadow-xs ' +
  'hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ' +
  'aria-invalid:border-error-text aria-invalid:focus:ring-error/20 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-container/20 disabled:text-label/50 ' +
  'read-only:cursor-default read-only:bg-surface-container/10 read-only:border-panel-border/50';

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = '', ...props }, ref) {
    const isInvalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
    return (
      <input
        ref={ref}
        {...props}
        className={`nexus-input h-12 ${FIELD_BASE} ${isInvalid ? 'border-error-text' : ''} ${className}`}
      />
    );
  },
);

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className = '', ...props }, ref) {
    const isInvalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
    return (
      <textarea
        ref={ref}
        {...props}
        className={`nexus-textarea h-auto py-3 ${FIELD_BASE} ${isInvalid ? 'border-error-text' : ''} ${className}`}
      />
    );
  },
);

export { SelectPremium } from './select-premium';
export type { SelectPremiumOption, SelectPremiumProps } from './select-premium';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', ...props }, ref) {
    const isInvalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
    return (
      <select
        ref={ref}
        {...props}
        className={`nexus-select nx-select-premium h-12 ${FIELD_BASE} pr-10 ${isInvalid ? 'border-error-text' : ''} ${className}`}
      />
    );
  },
);

export const Option = React.forwardRef<HTMLOptionElement, React.OptionHTMLAttributes<HTMLOptionElement>>(
  function Option({ className = '', ...props }, ref) {
    return (
      <option
        ref={ref}
        {...props}
        className={`nexus-option bg-input-bg text-input-text font-semibold ${className}`}
      />
    );
  },
);

/** Casilla con su etiqueta; la etiqueta da el área táctil de 48 px (DIS-008). */
export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex min-h-12 items-center gap-3 text-sm font-bold text-body-text cursor-pointer">
      <input type="checkbox" {...props} className="nexus-checkbox cursor-pointer" />
      {label}
    </label>
  );
}

export function FileInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="file"
      {...props}
      className={`min-h-12 text-sm text-label file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-contrast file:cursor-pointer hover:file:opacity-90 ${className}`}
    />
  );
}

export function ColorInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="color"
      {...props}
      className={`h-12 w-20 cursor-pointer rounded-xl border border-panel-border bg-surface-container/30 p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    />
  );
}

export function Radio({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="radio"
      {...props}
      className={`accent-primary cursor-pointer ${className}`}
    />
  );
}

export { FieldErrorNote, FieldHint, describedBy, focusFirstError } from './platforms/field-notes';

export { Button, type ButtonProps, type ButtonVariant } from './button';
export { ButtonLink, type ButtonLinkProps } from './button-link';

/**
 * Diálogo modal, con el cristal del portal (.nx-modal-glass).
 *
 * - DIS-031: foco inicial en el primer campo del cuerpo (o en el panel si no
 *   hay campos), atrapado con Tab y devuelto al cerrar (`useFocusTrap`); el
 *   panel se enfoca solo al abrir, aunque `onClose` cambie en cada render.
 * - `describedBy`: id (o ids separados por espacio) del texto que explica la
 *   acción; va a `aria-describedby` del `role="dialog"`.
 * - DIS-038: velo `bg-overlay` (token `--color-overlay`) y bloqueo del
 *   desplazamiento del fondo (`useScrollLock`).
 * - Se pinta en un portal en `document.body`, fuera de la raíz de la app, que
 *   queda `inert` mientras está abierto (H2). Nombre del diálogo con
 *   `aria-labelledby` al título (H6). Solo se monta tras una acción del
 *   usuario: en el servidor no se pinta.
 */
const ANCHOS_MODAL = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
} as const;

export function Modal({
  title,
  onClose,
  children,
  footer,
  describedBy,
  icon,
  size = 'xl',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  describedBy?: string;
  icon?: NombreIcono;
  size?: keyof typeof ANCHOS_MODAL;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  // Primero el bloqueo: al cerrar, la raíz deja de ser `inert` antes de devolver el foco.
  useScrollLock();
  useFocusTrap(panel, {
    alEscape: onClose,
    focoInicial: () =>
      Array.from(cuerpo.current?.querySelectorAll<HTMLElement>(CAMPOS) ?? []).filter(esVisible),
  });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-overlay backdrop-blur-sm p-4 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`nx-modal-glass flex w-full ${ANCHOS_MODAL[size] ?? 'max-w-xl'} flex-col overflow-hidden rounded-xl border border-panel-border/90 bg-gradient-to-b from-superficie via-superficie to-superficie-hundida shadow-2xl outline-none`}
      >
        {/* HEADER: Opción 1 - Electric Cobalt & Violet */}
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-superficie/10 bg-gradient-to-r from-primary via-brand to-accent px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon ? (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-superficie/25 bg-superficie/15 text-texto-sobre-accion shadow-sm backdrop-blur-xs" aria-hidden="true">
                <Icono nombre={icon} tamano="md" ariaHidden={true} />
              </span>
            ) : null}
            <h2 id={tituloId} className="text-base font-bold tracking-tight text-texto-sobre-accion truncate">
              {title}
            </h2>
          </div>
          {/* DIS-031, DIS-061: área táctil de 48 px con Icono accesible. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-texto-sobre-accion/80 transition-colors hover:bg-superficie/15 hover:text-texto-sobre-accion focus-visible:ring-2 focus-visible:ring-superficie shrink-0"
          >
            <Icono nombre="cerrar" tamano="md" ariaHidden={true} />
          </button>
        </div>

        {/* BODY */}
        <div ref={cuerpo} className="flex-1 min-h-0 space-y-5 overflow-y-auto bg-panel-fill px-6 py-6 text-body-text">
          {children}
        </div>

        {/* FOOTER */}
        {footer ? (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-panel-border/80 bg-superficie-hundida/90 px-6 py-4 shadow-xs [&>*:only-child]:ml-auto">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
  busy = false,
  type = 'aviso',
  role = 'alertdialog',
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  type?: AlertDialogType;
  role?: 'alertdialog' | 'dialog';
}) {
  const confirmText = busy
    ? (confirmLabel === 'Eliminar' ? 'Eliminando…' : `${confirmLabel}…`)
    : confirmLabel;

  return (
    <AlertDialog
      open={true}
      title={title}
      message={message}
      type={type}
      role={role}
      confirmLabel={confirmText}
      cancelLabel="Cancelar"
      confirmVariant="danger"
      onConfirm={onConfirm}
      onClose={onCancel}
      busy={busy}
    />
  );
}

