'use client';

/**
 * Áreas: consulta y administración (DIS-016, F-ARE-01).
 * Estandarizado con el mismo diseño premium que Usuarios y Conectores:
 * - Fila 1: Barra superior con buscador con fondo suave y botones de acción unificados.
 * - Fila 2: Contenedor con DataTable (selección por filas sin selección por defecto,
 *   zebra striping, ghost rows, paginación estandarizada) y EmptyNote centrado.
 */

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import type { Area } from '@/lib/types';
import { variablesCss } from '@/lib/variables-css';
import { AreaAdminsPanel } from './areas/area-admins-panel';
import { mensajeDeError } from './areas/area-errors';
import { AreaForm } from './areas/area-form';
import { DataTable, type DataColumn } from './data-table';
import { Button, ConfirmDialog } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { RequireRole, meetsRequirement } from './require-role';
import { useSession } from './session-provider';
import { useToast } from './toast';
import { Badge, EmptyNote, ErrorNote, RegionDeAviso, Spinner } from './ui';

/** Sin rol de administración muestra el estado "sin permiso" y no llama a la API. */
export function AreasList() {
  return (
    <RequireRole requires="any_admin">
      <AreasScreen />
    </RequireRole>
  );
}

function AreasScreen() {
  const { session } = useSession();
  const { avisar } = useToast();
  const { data, loading, error, reload } = useAsync(() => api.areas(), []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [removing, setRemoving] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Area | null>(null);
  // `/me` se pide una vez: las áreas creadas en esta visita aún no están en
  // `session.managed_areas`, pero el admin de área ya las administra.
  const [created, setCreated] = useState<number[]>([]);

  const isAdmin = session?.permissions.is_admin ?? false;
  // `can_manage_areas` de `/me` sigue siendo solo del superadmin (FNC-045);
  // el alta se decide por rol: superadmin o admin de área.
  const canCreate = session ? meetsRequirement('any_admin', session.permissions) : false;
  const managedIds = useMemo(
    () => new Set([...(session?.managed_areas ?? []).map((a) => a.id), ...created]),
    [session?.managed_areas, created],
  );

  async function remove() {
    if (!removing) return;
    const nombre = removing.name;
    setBusy(true);
    setProblem(null);
    try {
      await api.deleteArea(removing.id);
      avisar('success', `"${nombre}" fue retirada.`, 'Área eliminada');
      setRemoving(null);
      reload();
    } catch (err) {
      setRemoving(null);
      const msg = mensajeDeError(err, 'No se pudo eliminar');
      setProblem(msg);
      avisar('error', msg, 'Error');
    } finally {
      setBusy(false);
    }
  }

  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const areasFiltradas = useMemo(() => {
    if (!data) return [];
    if (!busqueda.trim()) return data;
    const q = busqueda.toLowerCase().trim();
    return data.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q)),
    );
  }, [data, busqueda]);

  const totalAreas = areasFiltradas.length;
  const totalPages = Math.max(1, Math.ceil(totalAreas / PAGE_SIZE));
  const displayAreas = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return areasFiltradas.slice(start, start + PAGE_SIZE);
  }, [areasFiltradas, page]);

  // Selección sin selección por default (exactamente igual que Usuarios)
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<number>>(new Set());

  const allDisplayIds = useMemo(() => displayAreas.map((a) => a.id), [displayAreas]);
  const activeSelectedIds = useMemo(
    () => new Set(Array.from(selectedAreaIds).filter((id) => allDisplayIds.includes(id))),
    [selectedAreaIds, allDisplayIds],
  );

  const allSelected = allDisplayIds.length > 0 && allDisplayIds.every((id) => activeSelectedIds.has(id));
  const someSelected = allDisplayIds.some((id) => activeSelectedIds.has(id)) && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedAreaIds((prev) => {
        const next = new Set(prev);
        allDisplayIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedAreaIds((prev) => {
        const next = new Set(prev);
        allDisplayIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleArea(id: number) {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isSingleSelected = activeSelectedIds.size === 1;
  const singleSelectedId = isSingleSelected ? Array.from(activeSelectedIds)[0] : null;
  const effectiveSelectedArea = singleSelectedId
    ? displayAreas.find((a) => a.id === singleSelectedId) ?? null
    : null;

  const columnas = useMemo<DataColumn<Area>[]>(
    () => [
      {
        key: 'seleccion',
        header: (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleSelectAll}
              aria-label="Seleccionar todas las áreas"
              className="nexus-checkbox cursor-pointer"
            />
          </div>
        ),
        headerClassName: 'w-12 px-4 py-2 select-none text-center',
        cellClassName: 'w-12 px-4 py-1.5 text-center',
        cell: (area) => {
          const isSelected = activeSelectedIds.has(area.id);
          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleArea(area.id)}
                aria-label={`Seleccionar ${area.name}`}
                className="nexus-checkbox cursor-pointer"
              />
            </div>
          );
        },
      },
      {
        key: 'area',
        header: 'Área',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
        cellClassName: 'px-6 py-1.5',
        cell: (area) => (
          <div className="flex items-center gap-3">
            <span
              className="nx-chip-tint grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold shadow-xs"
              style={variablesCss({ '--chip-color': area.color })}
              aria-hidden="true"
            >
              {area.icon ? (
                <Icono nombre={area.icon as any} tamano="sm" ariaHidden={true} />
              ) : (
                area.name.slice(0, 2).toUpperCase()
              )}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate font-bold text-xs text-body-text leading-tight">{area.name}</span>
              {!isAdmin && managedIds.has(area.id) ? (
                <Badge tone="success" dot className="!px-2 !py-0.5 text-xs">Administras</Badge>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: 'descripcion',
        header: 'Descripción',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
        cellClassName: 'px-6 py-1.5 max-w-xs',
        cell: (area) => (
          <p className="truncate text-xs text-label leading-tight" title={area.description || 'Sin descripción.'}>
            {area.description || <span className="italic">Sin descripción.</span>}
          </p>
        ),
      },
      {
        key: 'plataformas',
        header: 'Plataformas',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none text-center',
        cellClassName: 'px-6 py-1.5 text-center',
        cell: (area) => (
          <span className="inline-flex h-8 items-center gap-2 font-bold text-xs text-body-text bg-surface-container px-3 rounded-lg border border-panel-border/60 shadow-2xs">
            <Icono nombre="plataformas" tamano="sm" ariaHidden={true} className="text-primary" />
            <span>{area.platforms_count}</span>
          </span>
        ),
      },
      {
        key: 'usuarios',
        header: 'Usuarios',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none text-center',
        cellClassName: 'px-6 py-1.5 text-center',
        cell: (area) => (
          <span className="inline-flex h-8 items-center gap-2 font-bold text-xs text-body-text bg-surface-container px-3 rounded-lg border border-panel-border/60 shadow-2xs">
            <Icono nombre="usuarios" tamano="sm" ariaHidden={true} className="text-primary" />
            <span>{area.users_count}</span>
          </span>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
        cellClassName: 'px-6 py-1.5',
        cell: (area) => (
          <div className="flex items-center gap-1.5">
            <Badge
              tone={area.status === 'Activo' ? 'success' : 'warning'}
              dot
              className="!h-8 !px-3 inline-flex items-center text-xs font-semibold rounded-lg"
            >
              {area.status}
            </Badge>
          </div>
        ),
      },
    ],
    [isAdmin, managedIds, activeSelectedIds, allSelected, someSelected, allDisplayIds],
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 min-h-0">
      <PageHeader
        title="Áreas"
        className="sr-only"
      />

      {problem ? (
        <RegionDeAviso minHeight="min-h-0" className="shrink-0">
          <ErrorNote message={problem} />
        </RegionDeAviso>
      ) : null}

      {/* Grid de 1 columna y 2 filas (10/90): Fila 1 contenedor con botones, Fila 2 tabla al 100% */}
      <div className="grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-4">
        {/* Fila 1: Buscador a la izquierda y botones estandarizados a la derecha (idéntico a Conectores y Usuarios) */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
          {/* A LA IZQUIERDA: Buscador y contador de selección */}
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-2xl">
            <div className="relative w-full max-w-md">
              <label htmlFor="buscar-areas" className="sr-only">Buscar áreas</label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
                <Icono nombre="buscar" tamano="md" ariaHidden={true} />
              </div>
              <input
                id="buscar-areas"
                type="search"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar áreas…"
                className="nx-buscador-toolbar h-12 w-full rounded-xl border border-panel-border/80 bg-fondo pl-11 pr-10 py-3 text-sm text-body-text placeholder:text-label/60 shadow-inner-soft transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {busqueda ? (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('');
                    setPage(1);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center justify-center min-h-12 min-w-12 pr-3 text-label hover:text-body-text transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
                </button>
              ) : null}
            </div>
            {activeSelectedIds.size > 1 ? (
              <span className="text-xs font-bold text-body-text whitespace-nowrap bg-panel-border/30 px-2.5 py-1 rounded-lg border border-panel-border/60">
                {activeSelectedIds.size} áreas seleccionadas
              </span>
            ) : activeSelectedIds.size === 0 ? (
              <span className="sr-only">Acciones de áreas</span>
            ) : null}
          </div>

          {/* A LA DERECHA: Botones estandarizados (idéntico a Usuarios) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Administradores (superadmin) */}
            {isAdmin ? (
              <Button
                variant="fila"
                disabled={!isSingleSelected}
                onClick={() => effectiveSelectedArea && setAssigning(effectiveSelectedArea)}
                aria-label={effectiveSelectedArea ? `Administradores de ${effectiveSelectedArea.name}` : 'Administradores del área'}
                title={
                  isSingleSelected
                    ? `Administradores de ${effectiveSelectedArea?.name}`
                    : activeSelectedIds.size > 1
                    ? 'Solo se puede ver administradores de 1 área a la vez'
                    : 'Selecciona 1 área para ver administradores'
                }
                className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
              >
                <Icono nombre="usuarios" tamano="sm" ariaHidden={true} />
                <span>Admins</span>
              </Button>
            ) : null}

            {/* Botón Editar */}
            <Button
              variant="fila"
              disabled={!isSingleSelected || (!isAdmin && !managedIds.has(effectiveSelectedArea?.id ?? -1))}
              onClick={() => effectiveSelectedArea && setEditing(effectiveSelectedArea)}
              aria-label={effectiveSelectedArea ? `Editar ${effectiveSelectedArea.name}` : 'Editar'}
              title={
                isSingleSelected
                  ? `Editar ${effectiveSelectedArea?.name}`
                  : activeSelectedIds.size > 1
                  ? 'Solo se puede editar 1 área a la vez'
                  : 'Selecciona 1 área para editar'
              }
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="editar" tamano="sm" ariaHidden={true} />
              <span>Editar</span>
            </Button>

            {/* Botón Eliminar */}
            <Button
              variant="fila-peligro"
              disabled={!isSingleSelected || (!isAdmin && !managedIds.has(effectiveSelectedArea?.id ?? -1))}
              onClick={() => effectiveSelectedArea && setRemoving(effectiveSelectedArea)}
              aria-label={effectiveSelectedArea ? `Eliminar ${effectiveSelectedArea.name}` : 'Eliminar'}
              title={
                isSingleSelected
                  ? `Eliminar ${effectiveSelectedArea?.name}`
                  : activeSelectedIds.size > 1
                  ? 'Solo se puede eliminar 1 área a la vez'
                  : 'Selecciona 1 área para eliminar'
              }
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="eliminar" tamano="sm" ariaHidden={true} />
              <span>Eliminar</span>
            </Button>

            {/* Línea de separación vertical a la izquierda del botón Nuevo */}
            <div className="h-6 w-px bg-panel-border/80 self-center mx-1 shrink-0" aria-hidden="true" />

            {/* Botón Nueva área */}
            {canCreate ? (
              <Button
                variant="fila-primario"
                onClick={() => setCreating(true)}
                aria-label="Nueva área"
                title="Nueva área"
                className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
              >
                <Icono nombre="mas" tamano="sm" ariaHidden={true} />
                <span className="sr-only">Nueva área</span>
                <span aria-hidden="true">Nuevo</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Fila 2: La tabla ocupa el 100% de la altura disponible de forma responsiva */}
        <div className="flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden">
          <DataTable
            label="Áreas"
            columns={columnas}
            rows={displayAreas}
            rowKey={(area) => area.id}
            loading={loading && !data}
            error={error}
            emptyMessage={data?.length === 0 ? 'No hay áreas dentro de tu alcance.' : 'Ninguna área coincide con la búsqueda.'}
            selectedKeys={activeSelectedIds}
            onRowClick={(area) => toggleArea(area.id)}
            page={page}
            totalPages={totalPages}
            totalRecords={totalAreas}
            onPageChange={setPage}
            targetRows={8}
            ghostRows={true}
          />
        </div>
      </div>

      {creating ? (
        <AreaForm
          area={null}
          onClose={() => setCreating(false)}
          onSaved={(area) => {
            setCreating(false);
            avisar('success', `"${area.name}" registrada.`, 'Área creada');
            if (!isAdmin) setCreated((ids) => [...ids, area.id]);
            reload();
          }}
        />
      ) : null}

      {editing ? (
        <AreaForm
          area={editing}
          onClose={() => setEditing(null)}
          onSaved={(area) => {
            setEditing(null);
            avisar('success', `"${area.name}" actualizada.`, 'Área actualizada');
            reload();
          }}
        />
      ) : null}

      {assigning ? (
        <AreaAdminsPanel area={assigning} onClose={() => setAssigning(null)} />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="Eliminar área"
          message={`Se eliminará "${removing.name}". Si tiene plataformas asignadas, primero hay que reasignarlas.`}
          onConfirm={remove}
          onCancel={() => setRemoving(null)}
          busy={busy}
        />
      ) : null}
    </div>
  );
}
