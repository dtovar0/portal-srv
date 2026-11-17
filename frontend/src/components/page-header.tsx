'use client';

/**
 * Encabezado canónico de pantalla (DIS-070 / PLAN-FASE-7 §4.5).
 *
 * Único componente autorizado para renderizar `<h1>` en el portal (DIS-068).
 * Admite título, descripción opcional, acciones a la derecha, botón volver
 * y ref para foco accesible tras navegación o cambios de vista.
 */

import React from 'react';
import { ButtonLink } from './form';
import { Icono } from './icono';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  h1Ref?: React.Ref<HTMLHeadingElement>;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = 'Volver',
  h1Ref,
  className = '',
}: PageHeaderProps) {
  const tieneHerramientas = Boolean(backHref || actions || description);

  return (
    <header className={tieneHerramientas ? className : `${className} contents`.trim()}>
      {/* DIS-068: H1 único accesible para lectores de pantalla; el título visual está en la BarraSuperior */}
      <h1 ref={h1Ref} tabIndex={-1} className="sr-only">
        {title}
      </h1>

      {tieneHerramientas ? (
        <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {backHref ? (
              <ButtonLink
                href={backHref}
                variant="secondary"
                className="inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-semibold shadow-xs"
              >
                <Icono nombre="chevron-izq" tamano="sm" ariaHidden={true} />
                <span>{backLabel}</span>
              </ButtonLink>
            ) : null}
            {description ? (
              <p className="text-sm font-normal leading-relaxed text-label">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div
              role="toolbar"
              aria-label={typeof title === 'string' ? `Herramientas de ${title}` : 'Herramientas de página'}
              className="flex shrink-0 flex-wrap items-center gap-3"
            >
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
