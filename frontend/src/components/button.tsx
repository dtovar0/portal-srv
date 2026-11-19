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

/** Ancho máximo del motivo (18 rem a 16 px); debe coincidir con `.nexus-motivo-boton` en components.css. */
const ANCHO_MAXIMO_MOTIVO_PX = 288;

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
  const envoltorioRef = React.useRef<HTMLSpanElement>(null);
  const [motivoDescartado, setMotivoDescartado] = React.useState(false);
  const [sobre, setSobre] = React.useState(false);
  const [enfocado, setEnfocado] = React.useState(false);
  const [lado, setLado] = React.useState<'fin' | 'inicio'>('fin');
  const motivo = disabled && motivoDeshabilitado ? motivoDeshabilitado : undefined;
  const motivoVisible = Boolean(motivo) && (sobre || enfocado);

  // Esc descarta el motivo (también con solo el puntero encima) y, mientras estaba visible, no llega
  // al diálogo padre; el siguiente Esc sí (WCAG 1.4.13; DIS-096).
  React.useEffect(() => {
    if (!motivoVisible || motivoDescartado) return undefined;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setMotivoDescartado(true);
    };
    document.addEventListener('keydown', alTeclear, true);
    return () => document.removeEventListener('keydown', alTeclear, true);
  }, [motivoVisible, motivoDescartado]);

  /** Elige el lado desde el que se despliega el motivo para que no salga de la pantalla. */
  const elegirLado = () => {
    const caja = envoltorioRef.current?.getBoundingClientRect();
    if (!caja) return;
    const ancho = Math.min(ANCHO_MAXIMO_MOTIVO_PX, window.innerWidth * 0.8);
    setLado(caja.right >= ancho ? 'fin' : 'inicio');
  };

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
      onFocus={(e) => {
        if (motivo) {
          elegirLado();
          setEnfocado(true);
        }
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setEnfocado(false);
        if (!sobre) setMotivoDescartado(false);
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
      ref={envoltorioRef}
      className="nexus-btn-con-motivo"
      data-lado={lado === 'inicio' ? 'inicio' : undefined}
      data-motivo-descartado={motivoDescartado ? 'true' : undefined}
      onMouseEnter={() => {
        elegirLado();
        setSobre(true);
      }}
      onMouseLeave={() => {
        setSobre(false);
        if (!enfocado) setMotivoDescartado(false);
      }}
    >
      {boton}
      <span id={idMotivo} role="tooltip" className="nexus-motivo-boton">
        {motivo}
      </span>
    </span>
  );
});

Button.displayName = 'Button';
