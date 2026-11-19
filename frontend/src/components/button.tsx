import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'fila' | 'fila-peligro' | 'fila-primario';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  busy?: boolean;
  /**
   * Motivo por el que el botón está deshabilitado (DIS-096). Con `disabled` y un motivo,
   * el botón queda `aria-disabled` (enfocable, sin ejecutar nada) y el motivo se asocia con
   * `aria-describedby` y se muestra al foco o al pasar el puntero. Sin motivo, `disabled` es nativo.
   */
  motivoDeshabilitado?: string;
}

export const CLASES_VARIANTE_BOTON: Record<ButtonVariant, string> = {
  primary: 'nexus-btn-primary',
  secondary: 'nexus-btn-secondary',
  danger: 'nexus-btn-danger',
  fila: 'nexus-btn-fila min-h-12 min-w-12 text-primary-text focus-visible:ring-primary',
  'fila-peligro': 'nexus-btn-fila-peligro min-h-12 min-w-12 text-error-text focus-visible:ring-primary',
  'fila-primario': 'nexus-btn-fila-primario min-h-12 min-w-12 focus-visible:ring-primary',
};

/**
 * Componente Button unificado (DIS-058 / PLAN-FASE-7 §4.3).
 * Soporta variantes estándar (primary, secondary, danger, fila, fila-peligro),
 * tamaños de control, estado busy (aria-busy, aria-disabled y spinner accesible),
 * retención de foco accesible (aria-disabled no despoja el foco a document.body)
 * y foco visible con tokens de diseño.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    busy = false,
    motivoDeshabilitado,
    className = '',
    children,
    disabled,
    onClick,
    ...props
  },
  ref,
) {
  const idMotivo = React.useId();
  const [motivoDescartado, setMotivoDescartado] = React.useState(false);
  const motivo = disabled && motivoDeshabilitado ? motivoDeshabilitado : undefined;
  const ariaDisabled = Boolean(props['aria-disabled']) || busy || Boolean(motivo);
  const isDisabled = Boolean(disabled) && !motivo;
  const describedBy = [props['aria-describedby'], motivo ? idMotivo : undefined].filter(Boolean).join(' ') || undefined;
  const sizeClasses = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : '';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ariaDisabled || isDisabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  const boton = (
    <button
      ref={ref}
      type="button"
      {...props}
      title={motivo ? undefined : props.title}
      aria-describedby={describedBy}
      disabled={isDisabled}
      aria-disabled={ariaDisabled ? 'true' : undefined}
      aria-busy={busy ? 'true' : props['aria-busy']}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (motivo && e.key === 'Escape') setMotivoDescartado(true);
        props.onKeyDown?.(e);
      }}
      onBlur={(e) => {
        setMotivoDescartado(false);
        props.onBlur?.(e);
      }}
      className={`nexus-btn ${CLASES_VARIANTE_BOTON[variant]} ${sizeClasses} ${isDisabled || ariaDisabled ? 'estado-deshabilitado' : ''} ${className}`.trim()}
    >
      {busy ? (
        <span
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );

  if (!motivo) return boton;

  return (
    <span
      className="nexus-btn-con-motivo"
      data-motivo-descartado={motivoDescartado ? 'true' : undefined}
      onMouseLeave={() => setMotivoDescartado(false)}
    >
      {boton}
      <span id={idMotivo} role="tooltip" className="nexus-motivo-boton">
        {motivo}
      </span>
    </span>
  );
});

Button.displayName = 'Button';
