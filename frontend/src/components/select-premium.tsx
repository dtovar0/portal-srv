'use client';

/**
 * Select Premium con opciones estilizadas (DIS-059).
 * Reemplaza el selector nativo del sistema operativo por un menú desplegable
 * accesible, estilizado con tokens de diseño, estados hover interactivos,
 * soporte de tema oscuro y navegación por teclado.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { Icono, type NombreIcono } from './icono';

export interface SelectPremiumOption<T extends string | number = string | number> {
  value: T;
  label: string;
  description?: string | null;
  icon?: NombreIcono;
  disabled?: boolean;
}

export interface SelectPremiumProps<T extends string | number = string | number> {
  id?: string;
  name?: string;
  value?: T | null;
  options: SelectPremiumOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

export function SelectPremium<T extends string | number = string | number>({
  id: propId,
  name,
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opción…',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
}: SelectPremiumProps<T>) {
  const generatedId = useId();
  const id = propId ?? generatedId;
  const listboxId = `${id}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) ?? null;
  const isInvalid = ariaInvalid === true || ariaInvalid === 'true';

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Sincronizar índice resaltado al abrir
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, options, value]);

  function handleSelect(option: SelectPremiumOption<T>) {
    if (option.disabled || disabled) return;
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        const opt = options[highlightedIndex];
        if (opt && !opt.disabled) {
          handleSelect(opt);
        }
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Botón Disparador (Trigger) */}
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        aria-invalid={isInvalid}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`nexus-select-premium flex h-12 w-full items-center justify-between gap-2 rounded-xl border bg-input-bg px-4 text-left text-sm font-semibold transition-all duration-rapida focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isInvalid ? 'border-error-text ring-1 ring-error-text' : 'border-panel-border/80 hover:border-primary/50'
        } ${
          disabled
            ? 'cursor-not-allowed bg-superficie-hundida text-label'
            : 'cursor-pointer hover:bg-superficie/60'
        }`}
      >
        <span className="flex items-center gap-2.5 truncate min-w-0">
          {selectedOption?.icon ? (
            <Icono nombre={selectedOption.icon} tamano="sm" ariaHidden={true} className="text-primary-text" />
          ) : null}
          <span className={selectedOption ? 'text-body-text' : 'text-label font-normal'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <span
          className={`shrink-0 text-label transition-transform duration-rapida ${
            isOpen ? 'rotate-180 text-primary-text' : ''
          }`}
          aria-hidden="true"
        >
          <Icono nombre="chevron-abajo" tamano="sm" />
        </span>
      </button>

      {/* Menú Desplegable Flotante Premium */}
      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-opt-${highlightedIndex}` : undefined
          }
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto rounded-xl border border-panel-border bg-panel-fill p-1.5 shadow-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-label text-center">
              No hay opciones disponibles
            </li>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={String(option.value)}
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-rapida select-none ${
                    option.disabled
                      ? 'cursor-not-allowed text-label'
                      : isSelected
                      ? 'bg-primary/15 text-primary-text font-bold'
                      : isHighlighted
                      ? 'bg-surface-container text-primary-text'
                      : 'text-body-text hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {option.icon ? (
                      <Icono
                        nombre={option.icon}
                        tamano="sm"
                        ariaHidden={true}
                        className={isSelected ? 'text-primary-text' : 'text-label'}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{option.label}</div>
                      {option.description ? (
                        <div className="truncate text-xs text-label">{option.description}</div>
                      ) : null}
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="shrink-0 text-primary-text" aria-hidden="true">
                      <Icono nombre="aprobar" tamano="sm" />
                    </span>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {/* Select nativo oculto para accesibilidad de formularios estándar y pruebas */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          const found = options.find((opt) => String(opt.value) === raw);
          if (found) onChange(found.value);
        }}
        className="sr-only pointer-events-none absolute -bottom-1 left-0 h-0 w-0"
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value} className="nexus-option">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
