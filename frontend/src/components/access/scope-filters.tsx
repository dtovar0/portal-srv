'use client';

/**
 * Filtros de alcance por área y plataforma (DIS-021, reutilizado en DIS-020):
 * las opciones según el rol y los dos selectores encadenados.
 *
 * - Áreas: las administradas; el superadmin, todas (`GET /areas`).
 * - Plataformas: las de las áreas del alcance; se acotan al área elegida.
 * - Cambiar de área quita la plataforma que no le pertenece.
 */

import { useMemo } from 'react';
import { api } from '@/lib/api';
import type { AreaRef } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { Field, Option, Select } from '../form';
import { useSession } from '../session-provider';

/** Plataforma del filtro: solo lo que el filtro necesita de `Platform`. */
export interface PlataformaFiltro {
  id: number;
  name: string;
  area_id: number;
}

export interface OpcionesAlcance {
  esSuperadmin: boolean;
  areas: AreaRef[];
  plataformas: PlataformaFiltro[];
}

/**
 * Áreas y plataformas del alcance de quien administra. Con `activo` en
 * `false` no se pide nada (p. ej. un usuario sin rol de administrador).
 */
export function useOpcionesAlcance(activo = true): OpcionesAlcance {
  const { session } = useSession();
  const esSuperadmin = session?.permissions.is_admin ?? false;

  const todas = useAsync<AreaRef[]>(
    () => (activo && esSuperadmin ? api.areas() : Promise.resolve([])),
    [activo, esSuperadmin],
  );
  const areas = useMemo<AreaRef[]>(() => {
    if (!activo) return [];
    return esSuperadmin ? (todas.data ?? []) : (session?.managed_areas ?? []);
  }, [activo, esSuperadmin, todas.data, session]);

  const catalogo = useAsync(
    () => (activo ? api.platforms() : Promise.resolve([])),
    [activo],
  );
  const plataformas = useMemo<PlataformaFiltro[]>(() => {
    const ids = new Set(areas.map((a) => a.id));
    return (catalogo.data ?? [])
      .filter((p) => esSuperadmin || ids.has(p.area_id))
      .map(({ id, name, area_id }) => ({ id, name, area_id }));
  }, [catalogo.data, areas, esSuperadmin]);

  return { esSuperadmin, areas, plataformas };
}

export interface CambioAlcance {
  areaId?: number | null;
  platformId?: number | null;
}

/** Selectores de área y plataforma. */
export function ScopeSelects({
  areaId,
  platformId,
  opciones,
  areaSelectId,
  variant = 'field',
  onChange,
}: {
  areaId: number | null;
  platformId: number | null;
  opciones: OpcionesAlcance;
  /** `id` del selector de área (para llevarle el foco desde fuera). */
  areaSelectId?: string;
  variant?: 'field' | 'inline';
  onChange: (cambio: CambioAlcance) => void;
}) {
  const { areas, plataformas, esSuperadmin } = opciones;
  const visibles = areaId === null
    ? plataformas
    : plataformas.filter((p) => p.area_id === areaId);

  if (variant === 'inline') {
    return (
      <>
        <div className="relative">
          <label htmlFor={areaSelectId ?? 'scope-filtro-area'} className="sr-only">Área</label>
          <Select
            id={areaSelectId ?? 'scope-filtro-area'}
            aria-label="Área"
            value={areaId ?? ''}
            onChange={(event) => {
              const nueva = event.target.value ? Number(event.target.value) : null;
              const sigue = plataformas.some(
                (p) => p.id === platformId && (nueva === null || p.area_id === nueva));
              onChange({ areaId: nueva, platformId: sigue ? platformId : null });
            }}
            className="h-12 !w-auto min-w-36 text-xs font-semibold rounded-xl border border-panel-border bg-fondo px-3 py-2 text-body-text shadow-inner-soft transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Option value="">{esSuperadmin ? 'Todas las áreas' : 'Todas mis áreas'}</Option>
            {areas.map((area) => (
              <Option key={area.id} value={area.id}>{area.name}</Option>
            ))}
          </Select>
        </div>
        <div className="relative">
          <label htmlFor="scope-filtro-plataforma" className="sr-only">Plataforma</label>
          <Select
            id="scope-filtro-plataforma"
            aria-label="Plataforma"
            value={platformId ?? ''}
            onChange={(event) =>
              onChange({ platformId: event.target.value ? Number(event.target.value) : null })}
            className="h-12 !w-auto min-w-36 text-xs font-semibold rounded-xl border border-panel-border bg-fondo px-3 py-2 text-body-text shadow-inner-soft transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Option value="">Todas las plataformas</Option>
            {visibles.map((plataforma) => (
              <Option key={plataforma.id} value={plataforma.id}>{plataforma.name}</Option>
            ))}
          </Select>
        </div>
      </>
    );
  }

  return (
    <>
      <Field label="Área">
        <Select
          id={areaSelectId}
          value={areaId ?? ''}
          onChange={(event) => {
            const nueva = event.target.value ? Number(event.target.value) : null;
            const sigue = plataformas.some(
              (p) => p.id === platformId && (nueva === null || p.area_id === nueva));
            onChange({ areaId: nueva, platformId: sigue ? platformId : null });
          }}
        >
          <Option value="">{esSuperadmin ? 'Todas las áreas' : 'Todas mis áreas'}</Option>
          {areas.map((area) => (
            <Option key={area.id} value={area.id}>{area.name}</Option>
          ))}
        </Select>
      </Field>
      <Field label="Plataforma">
        <Select
          value={platformId ?? ''}
          onChange={(event) =>
            onChange({ platformId: event.target.value ? Number(event.target.value) : null })}
        >
          <Option value="">Todas las plataformas</Option>
          {visibles.map((plataforma) => (
            <Option key={plataforma.id} value={plataforma.id}>{plataforma.name}</Option>
          ))}
        </Select>
      </Field>
    </>
  );
}
