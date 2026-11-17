/**
 * Componente unificado de tablas y listas de datos (DIS-010, DIS-014, DIS-071, ADR-007).
 *
 * Responsabilidad:
 * - Tabla de datos con desplazamiento horizontal accesible (`DataTable`).
 * - Tabla oculta para lectores de pantalla como alternativa textual (`DataTable srOnly`).
 * - Lista adaptable a móvil y escritorio con matriz de estados (`ResponsiveList` / `ResponsiveRow`).
 * - Etiquetas y listas de datos estructurados (`DataLabel`, `DataList`, `DataListItem`).
 *
 * Estados de fila:
 * - Interactiva (hover / foco accesible).
 * - Seleccionada (`aria-selected="true"`, token de acento y borde de selección).
 * - Error (`border-l-error`, fondo sutil).
 *
 * Solo utiliza tokens de diseño; cumple estrictamente con el sistema 8pt.
 */

import React from 'react';
import { Icono, type NombreIcono } from './icono';
import { Card, EmptyNote, ErrorNote, Skeleton, Spinner } from './ui';

export type DataColumn<T> = {
  /** Identifica la columna (clave del `th`). */
  key: string;
  /** Texto o elemento del encabezado (permite checkboxes u otros controles accesibles). */
  header: React.ReactNode;
  /** Solo para lectores de pantalla (p. ej. la columna de acciones). */
  headerSrOnly?: boolean;
  /** Clases personalizadas para el encabezado th (p. ej. alineación). */
  headerClassName?: string;
  /** Contenido de la celda. */
  cell: (row: T) => React.ReactNode;
  /** Clases de la celda (relleno propio, alineación, ancho). */
  cellClassName?: string;
};

const CELDA = 'px-6 py-1.5';
const ANCHO_MINIMO = 'min-w-full';

export interface DataTableProps<T> {
  /** Nombre accesible de la región o tabla. */
  label: string;
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  /** Texto cuando no hay filas. */
  emptyMessage: string;
  emptyTitle?: string;
  emptyBadge?: string;
  emptyIcon?: NombreIcono;
  emptyAction?: React.ReactNode;
  emptyState?: React.ReactNode;
  tableClassName?: string;
  /** Tabla alternativa oculta para lectores de pantalla (p. ej. datos de gráficas). */
  srOnly?: boolean;
  /** Clave de la fila seleccionada para destacar visualmente y con aria-selected. */
  selectedKey?: string | number;
  /** Conjunto o lista de claves de filas seleccionadas para selección múltiple. */
  selectedKeys?: Set<string | number> | (string | number)[];
  /** Callback al hacer clic en una fila (habilita hover interactivo). */
  onRowClick?: (row: T) => void;
  /**
   * Encabezado de la tarjeta (título y enlace, DIS-079). Con él, la carga, el error y el vacío
   * se muestran dentro de la misma tarjeta y la carga conserva el tamaño de las filas.
   */
  encabezado?: React.ReactNode;
  /** Filas del esqueleto de carga con `encabezado` (por defecto 3); igualarlas a las que se cargarán. */
  filasEsperadas?: number;
  /** Clase de alto de cada fila del esqueleto (por defecto `min-h-12`). */
  claseFilaEsqueleto?: string;
  /** Activa el diseño de filas alternadas (zebra striping). Por defecto `true`. */
  striped?: boolean;
  /** Paginación estandarizada (igual a Actividad reciente) */
  page?: number;
  totalPages?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  cardClassName?: string;
  /** Número objetivo de filas a completar con ghost rows (por defecto 10 si ghostRows está activo). */
  targetRows?: number;
  /** Activar filas fantasma (ghost rows) para completar la cuadrícula de 10 registros. */
  ghostRows?: boolean;
}

export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  loading,
  error,
  emptyMessage,
  emptyTitle,
  emptyBadge,
  emptyIcon,
  emptyAction,
  emptyState,
  tableClassName = ANCHO_MINIMO,
  srOnly = false,
  selectedKey,
  selectedKeys,
  onRowClick,
  encabezado,
  filasEsperadas = 3,
  claseFilaEsqueleto,
  striped = true,
  page,
  totalPages,
  totalRecords,
  onPageChange,
  cardClassName = '',
  targetRows,
  ghostRows,
}: DataTableProps<T>) {
  if (encabezado && !srOnly && (loading || error || rows.length === 0)) {
    return (
      <Card className={`!p-0 flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden shadow-1 border border-panel-border/80 ${cardClassName}`}>
        <div className="flex min-h-16 shrink-0 items-center border-b border-primary/20 bg-gradient-to-r from-primary/10 via-brand/10 to-accent/10 px-4 py-2 font-semibold">{encabezado}</div>
        {loading ? (
          <div className="space-y-3 p-5 flex-1 min-h-0 overflow-auto">
            <Skeleton variant="fila" count={Math.max(filasEsperadas, 2)} className={claseFilaEsqueleto} ariaLabel={`Cargando ${label.toLowerCase()}…`} />
          </div>
        ) : null}
        {!loading && error ? (
          <div className="p-5 flex-1 min-h-0 overflow-auto">
            <ErrorNote message={error} />
          </div>
        ) : null}
        {!loading && !error ? (
          emptyState ? (
            <>{emptyState}</>
          ) : (
            <EmptyNote
              variant="seamless"
              message={emptyMessage}
              title={emptyTitle}
              badge={emptyBadge}
              icono={emptyIcon}
              action={emptyAction}
            />
          )
        ) : null}
      </Card>
    );
  }
  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (rows.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <EmptyNote
        message={emptyMessage}
        title={emptyTitle}
        badge={emptyBadge}
        icono={emptyIcon}
        action={emptyAction}
      />
    );
  }

  if (srOnly) {
    return (
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col, idx) =>
                idx === 0 ? (
                  <th key={col.key} scope="row">
                    {col.cell(row)}
                  </th>
                ) : (
                  <td key={col.key}>{col.cell(row)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const estaActivoGhost = ghostRows ?? (targetRows !== undefined);
  const metaFilas = targetRows ?? 8;
  const ghostCount = estaActivoGhost ? Math.max(0, metaFilas - rows.length) : 0;

  const tienePie = rows.length > 0 && (totalPages !== undefined || totalRecords !== undefined || page !== undefined);

  return (
    <Card className={`!p-0 flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden shadow-1 border border-panel-border/80 ${cardClassName}`}>
      {encabezado ? <div className="flex min-h-16 shrink-0 items-center border-b border-primary/20 bg-gradient-to-r from-primary/10 via-brand/10 to-accent/10 px-4 py-2 font-semibold">{encabezado}</div> : null}
      {/* Región con nombre y foco visible para quien usa teclado (DIS-008). */}
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className="flex-1 min-h-0 h-full w-full overflow-x-auto overflow-y-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary flex flex-col"
      >
        <table className={`w-full text-sm h-full flex-1 table-fixed border-collapse ${tableClassName}`}>
          <thead className="sticky top-0 z-10 border-b-2 border-primary/40 bg-superficie bg-gradient-to-r from-primary/15 via-brand/10 to-accent/10 backdrop-blur-md text-left text-xs font-black uppercase tracking-wider text-primary-text shadow-xs shrink-0">
            <tr className="nx-table-row-header">
              {columns.map((col) => (
                <th key={col.key} scope="col" className={col.headerClassName ?? 'px-6 py-2 font-black tracking-wider text-primary-text select-none'}>
                  {col.headerSrOnly ? <span className="sr-only">{typeof col.header === 'string' ? col.header : 'Columna'}</span> : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border/70 nx-table-body">
            {rows.map((row) => {
              const clave = rowKey(row);
              const seleccionada = (selectedKeys && (selectedKeys instanceof Set ? selectedKeys.has(clave) : selectedKeys.includes(clave))) || (selectedKey !== undefined && selectedKey === clave);
              const interactiva = Boolean(onRowClick);
              const fondoZebra = striped ? 'even:bg-fondo/75 odd:bg-panel-fill' : 'bg-panel-fill';

              const claseFila = seleccionada
                ? 'bg-primary/10 font-medium'
                : interactiva
                  ? `${fondoZebra} hover:bg-primary/[0.06] cursor-pointer transition-colors`
                  : `${fondoZebra} hover:bg-primary/[0.03] transition-colors`;

              return (
                <tr
                  key={clave}
                  aria-selected={seleccionada ? 'true' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${claseFila} nx-table-row-item`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.cellClassName ?? CELDA}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {ghostCount > 0
              ? Array.from({ length: ghostCount }).map((_, idx) => {
                  const fondoZebra = striped ? 'even:bg-fondo/75 odd:bg-panel-fill' : 'bg-panel-fill';
                  return (
                    <tr
                      key={`ghost-row-${idx}`}
                      aria-hidden="true"
                      className={`nx-table-row-item opacity-70 select-none pointer-events-none border-b border-panel-border/20 ${fondoZebra}`}
                    >
                      {columns.map((col) => (
                        <td key={`ghost-cell-${col.key}-${idx}`} className={col.cellClassName ?? CELDA}>
                          &nbsp;
                        </td>
                      ))}
                    </tr>
                  );
                })
              : null}
          </tbody>
          {tienePie ? (
            <tfoot className="border-t border-panel-border/80 bg-superficie-hundida/50 shrink-0">
              <tr className="nx-table-row-footer">
                <td colSpan={columns.length} className="px-6 py-1.5 text-xs font-bold text-label">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="inline-block size-2 rounded-full bg-primary/70 animate-pulse" />
                      {totalRecords !== undefined
                        ? `${rows.length} de ${totalRecords} registros`
                        : `${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}`}
                    </span>

                    {totalPages && totalPages > 1 && onPageChange ? (
                      <nav
                        aria-label={`Paginación de ${label.toLowerCase()}`}
                        className="flex items-center gap-1 rounded-xl border border-panel-border/80 bg-superficie/90 p-0.5 shadow-xs"
                      >
                        <button
                          type="button"
                          disabled={(page ?? 1) <= 1}
                          onClick={() => onPageChange(Math.max(1, (page ?? 1) - 1))}
                          className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary-text transition-all hover:bg-surface-container active:scale-95 disabled:opacity-30 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Página anterior de ${label.toLowerCase()}`}
                          title="Página anterior"
                        >
                          <Icono nombre="chevron-izq" tamano="sm" ariaHidden={true} />
                        </button>

                        <span
                          className="px-2.5 py-0.5 text-xs font-black tabular-nums tracking-wide text-body-text select-none"
                          aria-current="page"
                        >
                          {page ?? 1}/{totalPages}
                        </span>

                        <button
                          type="button"
                          disabled={(page ?? 1) >= totalPages}
                          onClick={() => onPageChange(Math.min(totalPages, (page ?? 1) + 1))}
                          className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary-text transition-all hover:bg-surface-container active:scale-95 disabled:opacity-30 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Página siguiente de ${label.toLowerCase()}`}
                          title="Página siguiente"
                        >
                          <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} />
                        </button>
                      </nav>
                    ) : null}
                  </div>
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </Card>
  );
}

/** Clase de la etiqueta (`dt`) de cada celda en vista móvil. */
export const ETIQUETA_CELDA = 'text-xs font-medium uppercase tracking-wide text-label md:sr-only';

/**
 * Tabla en escritorio y lista en móvil con el mismo marcado (DIS-014, DIS-071):
 * `Card` con una cabecera de columnas con color de distinción y una `ul` de filas.
 */
export function ResponsiveList({
  columns,
  headers,
  label,
  children,
  className = '',
  footer,
}: {
  /** Plantilla de columnas en `md` (p. ej. `md:grid-cols-[...]`). */
  columns: string;
  headers: string[];
  /** Nombre accesible de la lista. */
  label: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <Card className={`!p-0 overflow-hidden shadow-1 border border-panel-border/80 ${className}`}>
      <div
        aria-hidden="true"
        className={`hidden border-b-2 border-primary/35 bg-gradient-to-r from-primary/15 via-brand/10 to-accent/10 px-6 py-4 text-xs font-black uppercase tracking-wider text-primary-text md:grid md:gap-4 ${columns}`}
      >
        {headers.map((header) => (
          <span key={header} className="select-none">{header}</span>
        ))}
      </div>
      <ul className="divide-y divide-panel-border/70" aria-label={label}>
        {children}
      </ul>
      {footer ? (
        <div className="border-t border-panel-border/80 bg-superficie-hundida/50 px-6 py-3.5">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Fila adaptable (`li` con un `dl` en cuadrícula de columnas) con matriz de estados
 * y soporte de diseño Zebra alternado (`striped`).
 */
export function ResponsiveRow({
  columns,
  label,
  children,
  className = '',
  interactive = false,
  selected = false,
  error = false,
  striped,
  onClick,
}: {
  columns: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  selected?: boolean;
  error?: boolean;
  striped?: boolean;
  onClick?: () => void;
}) {
  const fondoBase =
    striped === true
      ? 'bg-fondo/75'
      : striped === false
        ? 'bg-panel-fill'
        : 'even:bg-fondo/75 odd:bg-panel-fill';

  const estadoClass = selected
    ? 'bg-primary/10 border-l-4 border-l-primary font-medium'
    : error
      ? 'bg-error/5 border-l-4 border-l-error'
      : interactive
        ? `${fondoBase} hover:bg-primary/[0.06] transition-colors cursor-pointer hover:border-l-4 hover:border-l-primary/60 focus-within:ring-2 focus-within:ring-primary`
        : `${fondoBase} hover:bg-primary/[0.03] transition-colors`;

  return (
    <li
      className={`p-4 md:px-6 ${estadoClass} ${className}`}
      aria-label={label}
      data-selected={selected ? 'true' : undefined}
      onClick={onClick}
    >
      <dl className={`grid gap-3 md:items-start md:gap-4 ${columns}`}>{children}</dl>
    </li>
  );
}

/**
 * Par etiqueta-valor accesible (`dt`, `dd`) para detalles, inspecciones y tarjetas.
 */
export function DataLabel({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-label">{label}</dt>
      <dd className="break-words text-sm font-semibold text-body-text">{children}</dd>
    </div>
  );
}

/** Componente retrocompatible para pares etiqueta/valor en modales. */
export function Dato({
  etiqueta,
  valor,
  label,
  children,
  className = '',
}: {
  etiqueta?: string;
  valor?: React.ReactNode;
  label?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <DataLabel label={label ?? etiqueta ?? ''} className={className}>
      {children ?? valor}
    </DataLabel>
  );
}

/**
 * Lista de datos estructurada con borde y separación tokenizada para paneles de detalle.
 */
export function DataList({
  children,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  return (
    <ul
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={`divide-y divide-panel-border rounded-xl border border-panel-border ${className}`}
    >
      {children}
    </ul>
  );
}

/**
 * Elemento de `DataList` con estados interactivo, seleccionado o error opcionales.
 */
export function DataListItem({
  children,
  className = '',
  interactive = false,
  selected = false,
  error = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  selected?: boolean;
  error?: boolean;
  onClick?: () => void;
}) {
  const estadoClass = selected
    ? 'bg-primary/10 border-l-4 border-l-primary'
    : error
      ? 'bg-error/5 border-l-4 border-l-error'
      : interactive
        ? 'hover:bg-surface-container/30 transition-colors cursor-pointer'
        : '';

  return (
    <li onClick={onClick} className={`space-y-1 p-3 ${estadoClass} ${className}`}>
      {children}
    </li>
  );
}
