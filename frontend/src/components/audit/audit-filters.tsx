'use client';

/**
 * Filtros de la auditoría (DIS-020; contrato `auditoria.md`, "Parámetros"):
 * búsqueda en actor y destino, fechas, evento, resultado y, para quien
 * administra, área y plataforma.
 *
 * - Los selectores aplican al cambiar; la búsqueda, al enviar (Enter o "Buscar").
 * - Las fechas aplican solo si el rango es válido (`from ≤ to`, ≤ 366 días);
 *   si no, se explica junto a los campos y no se pide nada al servidor (400).
 * - La búsqueda se limpia con `limpiarBusqueda` (sin caracteres de control, ≤ 100).
 */

import { useState } from 'react';
import type { AuditParams, AuditResult } from '@/lib/access/types';
import { BUSQUEDA_MAX, limpiarBusqueda } from '../access/inventory-filters';
import { type OpcionesAlcance, ScopeSelects } from '../access/scope-filters';
import { Button, Field, Option, Select, TextInput } from '../form';
import { Icono } from '../icono';
import { ACCIONES, RESULTADOS } from './audit-actions';

export interface FiltrosAuditoria {
  q: string;
  /** Fechas `AAAA-MM-DD` del campo de fecha; '' = sin límite. */
  from: string;
  to: string;
  action: string | null;
  result: AuditResult | null;
  areaId: number | null;
  platformId: number | null;
}

export const FILTROS_INICIALES: FiltrosAuditoria = {
  q: '',
  from: '',
  to: '',
  action: null,
  result: null,
  areaId: null,
  platformId: null,
};

/** Rango máximo de fechas (contrato: ≤ 366 días; `RANGO_MAX_DIAS` del backend). */
export const RANGO_MAX_DIAS = 366;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export const MENSAJE_FECHAS_INVERTIDAS = 'La fecha inicial debe ser anterior o igual a la final.';
export const MENSAJE_RANGO_LARGO = `El rango máximo es de ${RANGO_MAX_DIAS} días.`;

/** Error del rango de fechas, o `null` si es válido (o incompleto). */
export function validarFechas(from: string, to: string): string | null {
  if (!from || !to) return null;
  const inicio = Date.parse(`${from}T00:00:00Z`);
  const fin = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(inicio) || Number.isNaN(fin)) return null;
  if (inicio > fin) return MENSAJE_FECHAS_INVERTIDAS;
  if ((fin - inicio) / MS_POR_DIA > RANGO_MAX_DIAS) return MENSAJE_RANGO_LARGO;
  return null;
}

/** ¿Hay algún filtro distinto del inicial? */
export function hayFiltros(filtros: FiltrosAuditoria): boolean {
  return (Object.keys(FILTROS_INICIALES) as (keyof FiltrosAuditoria)[])
    .some((clave) => filtros[clave] !== FILTROS_INICIALES[clave]);
}

/** Filtros de la pantalla → parámetros del contrato (sin los vacíos). */
export function aParametros(filtros: FiltrosAuditoria, page: number): AuditParams {
  return {
    q: filtros.q || undefined,
    from: filtros.from || undefined,
    to: filtros.to || undefined,
    action: filtros.action ?? undefined,
    result: filtros.result ?? undefined,
    area_id: filtros.areaId ?? undefined,
    platform_id: filtros.platformId ?? undefined,
    page,
  };
}

const ID_ERROR_FECHAS = 'auditoria-error-fechas';

export function AuditFilters({
  filtros,
  opciones,
  conAlcance,
  onChange,
  acciones,
}: {
  filtros: FiltrosAuditoria;
  opciones: OpcionesAlcance;
  /** Área y plataforma: solo para quien administra (y no en el historial de una plataforma). */
  conAlcance: boolean;
  onChange: (cambio: Partial<FiltrosAuditoria>) => void;
  acciones?: React.ReactNode;
}) {
  const [borrador, setBorrador] = useState(filtros.q);
  const [fechas, setFechas] = useState({ from: filtros.from, to: filtros.to });
  const errorFechas = validarFechas(fechas.from, fechas.to);

  function buscar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = limpiarBusqueda(borrador);
    setBorrador(q);
    onChange({ q });
  }

  function cambiarFecha(campo: 'from' | 'to', valor: string) {
    const siguientes = { ...fechas, [campo]: valor };
    setFechas(siguientes);
    if (!validarFechas(siguientes.from, siguientes.to)) onChange(siguientes);
  }

  const describe = errorFechas ? ID_ERROR_FECHAS : undefined;

  return (
    <div role="search" aria-label="Filtros de la auditoría" className="w-full flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Controles de filtro a la izquierda */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <form onSubmit={buscar} className="flex items-center gap-2">
            <div className="relative w-full sm:w-80 md:w-96 max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
                <Icono nombre="buscar" tamano="md" ariaHidden={true} />
              </div>
              <input
                type="search"
                value={borrador}
                maxLength={BUSQUEDA_MAX}
                onChange={(event) => setBorrador(event.target.value)}
                placeholder="Quién actuó o sobre qué…"
                aria-label="Buscar en la auditoría por quién actuó o sobre qué"
                className="nx-buscador-toolbar h-12 w-full rounded-xl border border-panel-border bg-fondo pl-11 pr-10 py-3 text-sm text-body-text placeholder:text-placeholder transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {borrador ? (
                <button
                  type="button"
                  onClick={() => setBorrador('')}
                  className="absolute inset-y-0 right-0 flex items-center justify-center min-h-12 min-w-12 pr-3 text-label hover:text-body-text transition-colors"
                  aria-label="Limpiar búsqueda"
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

          {/* Rango de fechas */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <label htmlFor="auditoria-filtro-desde" className="sr-only">Desde</label>
              <input
                id="auditoria-filtro-desde"
                aria-label="Desde"
                type="date"
                value={fechas.from}
                max={fechas.to || undefined}
                aria-invalid={errorFechas ? true : undefined}
                aria-describedby={describe}
                onChange={(event) => cambiarFecha('from', event.target.value)}
                className="h-12 !w-auto min-w-32 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <span className="text-xs text-label font-bold" aria-hidden="true">—</span>
            <div className="relative">
              <label htmlFor="auditoria-filtro-hasta" className="sr-only">Hasta</label>
              <input
                id="auditoria-filtro-hasta"
                aria-label="Hasta"
                type="date"
                value={fechas.to}
                min={fechas.from || undefined}
                aria-invalid={errorFechas ? true : undefined}
                aria-describedby={describe}
                onChange={(event) => cambiarFecha('to', event.target.value)}
                className="h-12 !w-auto min-w-32 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Evento */}
          <div className="relative">
            <label htmlFor="auditoria-filtro-evento" className="sr-only">Evento</label>
            <Select
              id="auditoria-filtro-evento"
              aria-label="Evento"
              value={filtros.action ?? ''}
              onChange={(event) => onChange({ action: event.target.value || null })}
              className="h-12 !w-auto min-w-36 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Option value="">Todos los eventos</Option>
              {Object.entries(ACCIONES).map(([valor, texto]) => (
                <Option key={valor} value={valor}>{texto}</Option>
              ))}
            </Select>
          </div>

          {/* Resultado */}
          <div className="relative">
            <label htmlFor="auditoria-filtro-resultado" className="sr-only">Resultado</label>
            <Select
              id="auditoria-filtro-resultado"
              aria-label="Resultado"
              value={filtros.result ?? ''}
              onChange={(event) =>
                onChange({ result: (event.target.value || null) as AuditResult | null })}
              className="h-12 !w-auto min-w-36 rounded-xl border border-panel-border bg-fondo px-3 py-2 text-xs font-semibold text-body-text transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Option value="">Todos los resultados</Option>
              {(Object.keys(RESULTADOS) as AuditResult[]).map((valor) => (
                <Option key={valor} value={valor}>{RESULTADOS[valor].texto}</Option>
              ))}
            </Select>
          </div>

          {/* ScopeSelects inline */}
          {conAlcance ? (
            <ScopeSelects
              areaId={filtros.areaId}
              platformId={filtros.platformId}
              opciones={opciones}
              variant="inline"
              onChange={onChange}
            />
          ) : null}
        </div>

        {/* Acciones a la derecha */}
        {acciones ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {acciones}
          </div>
        ) : null}
      </div>

      {errorFechas ? (
        <div className="w-full min-h-5">
          <p id={ID_ERROR_FECHAS} role="alert" className="text-xs font-bold text-error-text">
            {errorFechas}
          </p>
        </div>
      ) : null}
    </div>
  );
}
