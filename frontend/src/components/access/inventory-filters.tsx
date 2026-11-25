'use client';

/**
 * Filtros del inventario de permisos (DIS-021, `GET /access/inventory`,
 * contrato `accesos.md` 1.1): área, plataforma, nivel, origen, estado y
 * búsqueda por nombre o correo del usuario.
 *
 * - Los selectores aplican al cambiar; la búsqueda, al enviar (Enter o "Buscar").
 * - El texto se limpia antes de enviarlo: sin caracteres de control (el
 *   servidor responde 400) y como máximo `BUSQUEDA_MAX` caracteres.
 * - Integrado en la barra de herramientas estandarizada de tres secciones.
 */

import { useState } from 'react';
import { ORIGENES, etiquetaOrigenAcceso } from '@/lib/access/origen';
import type { AccessLevel, AccessOrigin, InventoryParams } from '@/lib/access/types';
import { Button, Option, Select, TextInput } from '../form';
import { Icono } from '../icono';
import { NIVELES } from './access-status-badge';
import { FILTROS } from './my-access';
import { type OpcionesAlcance, ScopeSelects } from './scope-filters';

export type { PlataformaFiltro } from './scope-filters';

export type FiltroEstado = NonNullable<InventoryParams['status']>;

export interface FiltrosInventario {
  areaId: number | null;
  platformId: number | null;
  level: AccessLevel | null;
  origin: AccessOrigin | null;
  status: FiltroEstado;
  q: string;
}

export const FILTROS_INICIALES: FiltrosInventario = {
  areaId: null,
  platformId: null,
  level: null,
  origin: null,
  status: 'vigente',
  q: '',
};

/** Máximo de `q` (contrato `accesos.md`: texto ≤ 100). */
export const BUSQUEDA_MAX = 100;

export const FILTRO_AREA_ID = 'inventario-filtro-area';

// Caracteres de control (categoría Unicode Cc: C0, DEL y C1): el servidor
// rechaza `q` con ellos (400, SEG-FNC059-01).
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

/** Texto de búsqueda listo para enviar. */
export function limpiarBusqueda(texto: string): string {
  return texto.replace(CONTROL, '').trim().slice(0, BUSQUEDA_MAX);
}

/** ¿Hay algún filtro distinto del inicial? */
export function hayFiltros(filtros: FiltrosInventario): boolean {
  return (Object.keys(FILTROS_INICIALES) as (keyof FiltrosInventario)[])
    .some((clave) => filtros[clave] !== FILTROS_INICIALES[clave]);
}

export function InventoryFilters({
  filtros,
  opciones,
  onChange,
}: {
  filtros: FiltrosInventario;
  /** Áreas y plataformas del alcance (`useOpcionesAlcance`). */
  opciones: OpcionesAlcance;
  onChange: (cambio: Partial<FiltrosInventario>) => void;
}) {
  const [borrador, setBorrador] = useState(filtros.q);

  function buscar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = limpiarBusqueda(borrador);
    setBorrador(q);
    onChange({ q });
  }

  return (
    <div role="search" aria-label="Filtros del inventario" className="flex flex-wrap items-center gap-2">
      <form onSubmit={buscar} className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
        <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none md:w-80 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
            <Icono nombre="buscar" tamano="md" ariaHidden={true} />
          </div>
          <TextInput
            type="search"
            value={borrador}
            maxLength={BUSQUEDA_MAX}
            onChange={(event) => setBorrador(event.target.value)}
            placeholder="Nombre o correo del usuario…"
            aria-label="Buscar en el inventario por nombre o correo del usuario"
            className="h-12 w-full rounded-xl border border-panel-border bg-fondo pl-11 pr-12 text-sm font-semibold text-body-text placeholder:text-placeholder transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {borrador ? (
            <button
              type="button"
              onClick={() => {
                setBorrador('');
                onChange({ q: '' });
              }}
              aria-label="Borrar término de búsqueda"
              className="min-h-12 min-w-12 absolute inset-y-0 right-0 flex items-center justify-center text-label hover:text-body-text transition-colors"
            >
              <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
            </button>
          ) : null}
        </div>
        <Button type="submit" variant="fila" className="nx-btn-toolbar !px-3 shadow-xs">
          <Icono nombre="buscar" tamano="sm" ariaHidden={true} />
          <span>Buscar</span>
        </Button>
      </form>

      <ScopeSelects
        areaId={filtros.areaId}
        platformId={filtros.platformId}
        opciones={opciones}
        areaSelectId={FILTRO_AREA_ID}
        variant="inline"
        onChange={onChange}
      />

      {/* Estado */}
      <div className="relative">
        <label htmlFor="inventario-filtro-estado" className="sr-only">Estado</label>
        <Select
          id="inventario-filtro-estado"
          aria-label="Estado"
          value={filtros.status}
          onChange={(event) => onChange({ status: event.target.value as FiltroEstado })}
          className="h-12 !w-auto min-w-36 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {FILTROS.map((filtro) => (
            <Option key={filtro.valor} value={filtro.valor}>{filtro.texto}</Option>
          ))}
        </Select>
      </div>

      {/* Nivel */}
      <div className="relative">
        <label htmlFor="inventario-filtro-nivel" className="sr-only">Nivel</label>
        <Select
          id="inventario-filtro-nivel"
          aria-label="Nivel"
          value={filtros.level ?? ''}
          onChange={(event) =>
            onChange({ level: (event.target.value || null) as AccessLevel | null })}
          className="h-12 !w-auto min-w-36 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Option value="">Todos los niveles</Option>
          {(Object.keys(NIVELES) as AccessLevel[]).map((nivel) => (
            <Option key={nivel} value={nivel}>{NIVELES[nivel]}</Option>
          ))}
        </Select>
      </div>

      {/* Origen */}
      <div className="relative">
        <label htmlFor="inventario-filtro-origen" className="sr-only">Origen</label>
        <Select
          id="inventario-filtro-origen"
          aria-label="Origen"
          value={filtros.origin ?? ''}
          onChange={(event) =>
            onChange({ origin: (event.target.value || null) as AccessOrigin | null })}
          className="h-12 !w-auto min-w-36 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Option value="">Todos los orígenes</Option>
          {ORIGENES.map((origen) => (
            <Option key={origen} value={origen}>{etiquetaOrigenAcceso(origen, 'admin')}</Option>
          ))}
        </Select>
      </div>
    </div>
  );
}
