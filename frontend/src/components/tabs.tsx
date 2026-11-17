'use client';

/**
 * Componente Tabs unificado (DIS-060 / PLAN-FASE-7 §4.4).
 * Cumple WAI-ARIA tablist:
 * - roving tabindex (solo la pestaña activa tiene tabIndex=0)
 * - navegación con teclado (ArrowRight, ArrowLeft, Home, End)
 * - activación automática al navegar por flechas
 * - área táctil mínima (min-h-12 = 48 px)
 * - foco visible con tokens de diseño
 * - indicador seleccionado no cromático (borde-b-2 >= 3:1)
 */

import React, { useRef } from 'react';
import { Icono, type NombreIcono } from './icono';

export function destinoPorTecla(tecla: string, actual: number, total: number): number | null {
  if (total <= 0) return null;
  switch (tecla) {
    case 'ArrowRight':
      return (actual + 1) % total;
    case 'ArrowLeft':
      return (actual - 1 + total) % total;
    case 'Home':
      return 0;
    case 'End':
      return total - 1;
    default:
      return null;
  }
}

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  disabled?: boolean;
  icon?: NombreIcono;
  badge?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  ariaLabelledby?: string;
  getTabId?: (id: T) => string;
  getPanelId?: (id: T) => string;
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  ariaLabelledby,
  getTabId,
  getPanelId,
  className = '',
}: TabsProps<T>) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  const alPulsar = (event: React.KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const destino = destinoPorTecla(event.key, indice, tabs.length);
    if (destino === null) return;
    event.preventDefault();
    const itemDestino = tabs[destino];
    if (itemDestino.disabled) return;
    onChange(itemDestino.id);
    botones.current[destino]?.focus();
  };

  return (
    <div
      className={`inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-panel-border bg-superficie-hundida/70 p-1.5 shadow-inner ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
    >
      {tabs.map((item, indice) => {
        const isSelected = value === item.id;
        const idProp = getTabId ? getTabId(item.id) : `${item.id}-tab`;
        const panelProp = getPanelId ? getPanelId(item.id) : `${item.id}-panel`;

        return (
          <button
            key={item.id}
            ref={(el) => {
              botones.current[indice] = el;
            }}
            id={idProp}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={panelProp}
            tabIndex={isSelected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => !item.disabled && onChange(item.id)}
            onKeyDown={(event) => alPulsar(event, indice)}
            className={`group relative inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-5 py-2.5 text-sm outline-none transition-all duration-corta focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected
                ? 'border border-panel-border/80 border-b-2 border-b-primary bg-superficie font-bold text-primary-text shadow-1 scale-[1.01]'
                : 'border border-transparent text-label font-medium hover:border-panel-border/40 hover:bg-superficie/60 hover:text-body-text'
            } ${item.disabled ? 'estado-deshabilitado pointer-events-none' : ''}`}
          >
            {item.icon ? (
              <Icono
                nombre={item.icon}
                tamano="sm"
                ariaHidden={true}
                className={isSelected ? 'text-primary-text' : 'text-label group-hover:text-body-text'}
              />
            ) : null}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== null ? (
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isSelected
                    ? 'bg-primary/15 text-primary-text'
                    : 'border border-panel-border/60 bg-superficie text-label'
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  tabId: string;
  children: React.ReactNode;
  variant?: 'default' | 'card';
}

export function TabPanel({
  id,
  tabId,
  children,
  variant = 'default',
  className = '',
  ...props
}: TabPanelProps) {
  const baseEstilo =
    variant === 'card'
      ? 'rounded-2xl border border-panel-border bg-superficie p-6 sm:p-8 shadow-1'
      : 'rounded-2xl';

  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={tabId}
      tabIndex={0}
      className={`nx-tab-panel mt-6 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-fondo ${baseEstilo} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
