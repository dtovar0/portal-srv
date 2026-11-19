'use client';

/**
 * Filtros de la bitácora de ejecuciones (DIS-022, `GET /provisioning/jobs`,
 * contrato 1.1): estado, operación, proveedor, área y plataforma. Aplican al
 * cambiar; la lista vuelve a la página 1.
 */

import type { Job, JobOperation, JobParams, JobStatus } from '@/lib/access/types';
import { FilterBar, FilterBarGrid } from '../filter-bar';
import { Field, Option, Select } from '../form';
import { type OpcionesAlcance, ScopeSelects } from '../access/scope-filters';
import { ESTADOS_EJECUCION, OPERACIONES, PROVEEDORES } from './job-catalog';

export interface FiltrosEjecuciones {
  status: JobStatus | null;
  operation: JobOperation | null;
  provider: Job['provider'] | null;
  areaId: number | null;
  platformId: number | null;
}

export const FILTROS_EJECUCIONES_INICIALES: FiltrosEjecuciones = {
  status: null, operation: null, provider: null, areaId: null, platformId: null,
};

export const FILTRO_ESTADO_ID = 'ejecuciones-filtro-estado';

export function hayFiltrosEjecuciones(filtros: FiltrosEjecuciones): boolean {
  return (Object.keys(FILTROS_EJECUCIONES_INICIALES) as (keyof FiltrosEjecuciones)[])
    .some((clave) => filtros[clave] !== FILTROS_EJECUCIONES_INICIALES[clave]);
}

/** Filtros → parámetros del contrato (sin los vacíos). */
export function parametrosEjecuciones(filtros: FiltrosEjecuciones, page: number): JobParams {
  return {
    status: filtros.status ?? undefined,
    operation: filtros.operation ?? undefined,
    provider: filtros.provider ?? undefined,
    area_id: filtros.areaId ?? undefined,
    platform_id: filtros.platformId ?? undefined,
    page,
  };
}

function opciones<K extends string>(mapa: Record<K, string>) {
  return (Object.keys(mapa) as K[]).map((valor) => (
    <Option key={valor} value={valor}>{mapa[valor]}</Option>
  ));
}

const TEXTO_ESTADOS = Object.fromEntries(
  Object.entries(ESTADOS_EJECUCION).map(([estado, { texto }]) => [estado, texto]),
) as Record<JobStatus, string>;

export function JobsFilters({
  filtros,
  alcance,
  onChange,
}: {
  filtros: FiltrosEjecuciones;
  alcance: OpcionesAlcance;
  onChange: (cambio: Partial<FiltrosEjecuciones>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <label htmlFor={FILTRO_ESTADO_ID} className="sr-only">Estado</label>
        <Select
          id={FILTRO_ESTADO_ID}
          aria-label="Estado"
          value={filtros.status ?? ''}
          onChange={(event) => onChange({ status: (event.target.value || null) as JobStatus | null })}
          className="h-12 !w-auto min-w-36 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Option value="">Todos los estados</Option>
          {opciones(TEXTO_ESTADOS)}
        </Select>
      </div>

      <div className="relative">
        <label htmlFor="ejecuciones-filtro-operacion" className="sr-only">Operación</label>
        <Select
          id="ejecuciones-filtro-operacion"
          aria-label="Operación"
          value={filtros.operation ?? ''}
          onChange={(event) => onChange({ operation: (event.target.value || null) as JobOperation | null })}
          className="h-12 !w-auto min-w-36 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Option value="">Todas las operaciones</Option>
          {opciones(OPERACIONES)}
        </Select>
      </div>

      <div className="relative">
        <label htmlFor="ejecuciones-filtro-proveedor" className="sr-only">Proveedor</label>
        <Select
          id="ejecuciones-filtro-proveedor"
          aria-label="Proveedor"
          value={filtros.provider ?? ''}
          onChange={(event) => onChange({ provider: (event.target.value || null) as Job['provider'] | null })}
          className="h-12 !w-auto min-w-36 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Option value="">Todos los proveedores</Option>
          {opciones(PROVEEDORES)}
        </Select>
      </div>

      <ScopeSelects
        areaId={filtros.areaId}
        platformId={filtros.platformId}
        opciones={alcance}
        variant="inline"
        onChange={onChange}
      />
    </div>
  );
}
