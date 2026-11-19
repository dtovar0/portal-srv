'use client';

/**
 * Tarjeta de área del catálogo de administración (DIS-102).
 *
 * Encabezado: icono del área (degradado de su color) + nombre y descripción. Cuerpo: dos
 * recuadros con las personas y las plataformas del área. Pie: logos de las primeras 3
 * plataformas, «+N» y «Ver plataformas». Ocupa toda la celda de la rejilla: el cuerpo se
 * reparte el alto sobrante (las cifras quedan centradas, sin hueco vacío). El color del área es un dato: viaja como `--area-color` y `.nx-area-card*`
 * (components.css) lo consume; el texto sale de tokens.
 */

import { atributoTexto, textoLegible, variablesChipPlataforma } from '@/lib/color-legible';
import { enlaceSeguro } from '@/lib/enlace-seguro';
import type { Area, Platform } from '@/lib/types';
import { variablesCss } from '@/lib/variables-css';
import { Icono, type NombreIcono } from '../icono';
import { Badge } from '../ui';

/** Logos que se muestran en el pie; el resto va como «+N». */
export const LOGOS_VISIBLES = 3;

/** El backend solo devuelve `logo_url` `https://` (url_segura); aquí se repite la defensa (SEG-24). */
const logoSeguro = enlaceSeguro;

function LogoPlataforma({ plataforma }: { plataforma: Platform }) {
  const logo = logoSeguro(plataforma.logo_url);
  const base =
    'grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-panel-fill text-xs font-bold shadow-1 -ml-2 first:ml-0';
  if (logo) {
    return (
      <span className={`${base} bg-superficie-hundida`} title={plataforma.name}>
        {/* logo externo https: next/image no lo optimiza (mismo motivo que portal-tab.tsx) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="size-full object-contain" />
      </span>
    );
  }
  return (
    <span
      className={`${base} nx-chip-solid`}
      data-texto={atributoTexto(plataforma.bg_color)}
      style={variablesCss(variablesChipPlataforma(plataforma.bg_color))}
      title={plataforma.name}
    >
      {plataforma.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function Cifra({ icono, valor, etiqueta }: { icono: NombreIcono; valor: number; etiqueta: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-panel-border bg-superficie-hundida p-3">
      <span className="nx-area-card__mini grid size-8 shrink-0 place-items-center rounded-lg" aria-hidden="true">
        <Icono nombre={icono} tamano="sm" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-extrabold leading-none tabular-nums text-body-text">{valor}</p>
        <p className="mt-1 truncate text-xs font-semibold uppercase tracking-wide text-label">{etiqueta}</p>
      </div>
    </div>
  );
}

export function TarjetaArea({
  area,
  conteo,
  plataformas,
  onSelect,
}: {
  area: Area;
  /** Plataformas del área dentro del alcance de quien mira (ya calculado por la pantalla). */
  conteo: number;
  /** Plataformas del área en el mismo alcance; de aquí salen los logos del pie. */
  plataformas: Platform[];
  onSelect: (area: Area) => void;
}) {
  const inactiva = area.status === 'Inactivo';
  const personas = area.users_count ?? 0;
  const color = !inactiva && textoLegible(area.color) ? area.color.trim() : undefined;
  const restantes = conteo - LOGOS_VISIBLES;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(area)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(area);
        }
      }}
      aria-label={`Área ${area.name}${inactiva ? ' (Inactiva)' : ''}, ${conteo} ${conteo === 1 ? 'plataforma' : 'plataformas'}. Ver plataformas.`}
      data-state={inactiva ? 'inactiva' : 'activa'}
      style={variablesCss({ '--area-color': color })}
      className="nx-area-card foco-visible group relative flex h-full min-h-56 min-w-12 cursor-pointer select-none flex-col overflow-hidden rounded-xl border border-panel-border bg-panel-fill text-left shadow-1"
    >
      <div className="nx-area-card__cabecera relative flex items-center gap-3 p-5 pb-4">
        <span
          aria-hidden="true"
          data-texto={color ? atributoTexto(color) : undefined}
          className="nx-area-card__icono relative grid size-12 shrink-0 place-items-center rounded-xl shadow-1"
        >
          <Icono nombre={(area.icon as NombreIcono) || 'areas'} tamano="lg" />
        </span>
        <div className="relative min-w-0 flex-1">
          <h3 className="truncate text-base font-bold tracking-tight text-body-text" title={area.name}>
            {area.name}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-label" title={area.description ?? ''}>
            {area.description || 'Área organizativa del sistema.'}
          </p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 content-center gap-2.5 px-5 pb-4">
        <Cifra icono="usuarios" valor={personas} etiqueta={personas === 1 ? 'Persona' : 'Personas'} />
        <Cifra icono="plataformas" valor={conteo} etiqueta={conteo === 1 ? 'Plataforma' : 'Plataformas'} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-panel-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {inactiva ? (
            <Badge tone="warning" dot>
              Inactiva
            </Badge>
          ) : null}
          {plataformas.length > 0 ? (
            <div className="flex items-center" aria-hidden="true">
              {plataformas.slice(0, LOGOS_VISIBLES).map((p) => (
                <LogoPlataforma key={p.id} plataforma={p} />
              ))}
              {restantes > 0 ? (
                <span className="-ml-2 grid size-8 shrink-0 place-items-center rounded-lg border-2 border-panel-fill bg-superficie-hundida text-xs font-bold text-label shadow-1">
                  +{restantes}
                </span>
              ) : null}
            </div>
          ) : inactiva ? null : (
            <span className="text-xs text-label">Sin plataformas</span>
          )}
        </div>
        <span className="nx-area-card__ir inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-bold">
          Ver plataformas
          <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} className="nx-area-card__flecha" />
        </span>
      </div>
    </div>
  );
}
