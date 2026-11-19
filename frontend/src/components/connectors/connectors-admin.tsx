'use client';

/**
 * Pantalla Conectores (DIS-022, F-CON-01; ruta `/admin/connectors`, guarda
 * `admin`): plataformas que usan conector con su configuración y, debajo, la
 * bitácora de ejecuciones.
 *
 * - Plataformas de `GET /platforms` con `integration_type` `conector`;
 *   `has_connector` dice si ya tienen configuración (sin una petición por fila).
 * - "Configurar" abre `ConnectorPanel` bajo la lista; al cerrarlo el foco
 *   vuelve al botón de la fila.
 */

import { useCallback, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Platform } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { listLoadError } from '../access/request-errors';
import { Button, Modal } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { EmptyNote, ErrorNote, Spinner } from '../ui';
import { ConnectorDeleteDialog } from './connector-delete-dialog';
import { ConnectorList, botonConfigurarId, plataformasConConector } from './connector-list';
import { ConnectorPanel } from './connector-panel';

export const VACIO_CONECTORES =
  'Ninguna plataforma usa conector. Elige el tipo de integración "conector" en Administrar plataformas.';

export function ConnectorsAdmin() {
  const { avisar } = useToast();
  const lista = useAsync(
    () => api.platforms().catch((err: unknown) => { throw listLoadError(err, 'las plataformas'); }),
    [],
  );
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);
  const [eliminandoPlataforma, setEliminandoPlataforma] = useState<Platform | null>(null);
  const [pickerNuevoAbierto, setPickerNuevoAbierto] = useState(false);

  const todasPlataformas = plataformasConConector(lista.data ?? []);
  const plataformas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return todasPlataformas;
    return todasPlataformas.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.area_name && p.area_name.toLowerCase().includes(q))
    );
  }, [todasPlataformas, busqueda]);

  const seleccionada = todasPlataformas.find((p) => p.id === seleccionadaId) ?? null;

  const cerrar = useCallback(() => {
    const id = seleccionadaId;
    setSeleccionadaId(null);
    if (id !== null) requestAnimationFrame(() => document.getElementById(botonConfigurarId(id))?.focus());
  }, [seleccionadaId]);

  const handleEditar = () => {
    if (!seleccionada) return;
    setSeleccionadaId(seleccionada.id);
    requestAnimationFrame(() => {
      document.getElementById(`conector-${seleccionada.id}-titulo`)?.focus();
    });
  };

  const handleEliminar = () => {
    if (!seleccionada || !seleccionada.has_connector) return;
    setEliminandoPlataforma(seleccionada);
  };

  const handleNuevo = () => {
    if (seleccionada && !seleccionada.has_connector) {
      setSeleccionadaId(seleccionada.id);
      requestAnimationFrame(() => {
        document.getElementById(`conector-${seleccionada.id}-titulo`)?.focus();
      });
      return;
    }
    const sinConector = todasPlataformas.filter((p) => !p.has_connector);
    if (sinConector.length === 0) {
      if (todasPlataformas.length === 0) {
        avisar('info', VACIO_CONECTORES, 'Nuevo conector');
      } else {
        avisar('info', 'Todas las plataformas con integración por conector ya están configuradas.', 'Nuevo conector');
      }
      return;
    }
    if (sinConector.length === 1) {
      setSeleccionadaId(sinConector[0].id);
      avisar('info', `Configurando conector para ${sinConector[0].name}.`, 'Nuevo conector');
      requestAnimationFrame(() => {
        document.getElementById(`conector-${sinConector[0].id}-titulo`)?.focus();
      });
      return;
    }
    setPickerNuevoAbierto(true);
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 min-h-0">
      {/* Grid de 1 columna y 2 filas (10/90): Fila 1 contenedor con botones, Fila 2 tabla al 100% */}
      <div className="grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-4">
        {/* Fila 1 (N columnas, 1 fila): Buscador a la izquierda y botones estandarizados a la derecha */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
          {/* Buscador izquierda */}
          <div className="relative w-full max-w-md">
            <label htmlFor="buscar-conectores" className="sr-only">Buscar plataformas con conector</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
              <Icono nombre="buscar" tamano="md" ariaHidden={true} />
            </div>
            <input
              id="buscar-conectores"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar plataformas con conector…"
              className="nx-buscador-toolbar h-12 w-full rounded-xl border border-panel-border bg-fondo pl-11 pr-10 py-3 text-sm text-body-text placeholder:text-placeholder transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {busqueda ? (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute inset-y-0 right-0 flex items-center justify-center min-h-12 min-w-12 pr-3 text-label hover:text-body-text transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
              </button>
            ) : null}
          </div>

          {/* Botones estandarizados a la derecha: Editar, Eliminar, | y Nuevo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Editar */}
            <Button
              variant="fila"
              disabled={!seleccionada}
              onClick={handleEditar}
              aria-label={seleccionada ? `Editar conector de ${seleccionada.name}` : 'Editar'}
              title={
                seleccionada
                  ? `Editar conector de ${seleccionada.name}`
                  : 'Selecciona 1 plataforma para editar su conector'
              }
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="editar" tamano="sm" ariaHidden={true} />
              <span>Editar</span>
            </Button>

            {/* Botón Eliminar */}
            <Button
              variant="fila-peligro"
              disabled={!seleccionada || !seleccionada.has_connector}
              onClick={handleEliminar}
              aria-label={seleccionada ? `Eliminar conector de ${seleccionada.name}` : 'Eliminar'}
              title={
                !seleccionada
                  ? 'Selecciona 1 plataforma para eliminar su conector'
                  : !seleccionada.has_connector
                  ? 'Esta plataforma no tiene conector configurado'
                  : `Eliminar conector de ${seleccionada.name}`
              }
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="eliminar" tamano="sm" ariaHidden={true} />
              <span>Eliminar</span>
            </Button>

            {/* Línea de separación vertical a la izquierda del botón Nuevo */}
            <div className="h-6 w-px bg-panel-border/80 self-center mx-1 shrink-0" aria-hidden="true" />

            {/* Botón Nuevo conector */}
            <Button
              variant="fila-primario"
              onClick={handleNuevo}
              aria-label="Nuevo conector"
              title="Nuevo conector"
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="mas" tamano="sm" ariaHidden={true} />
              <span className="sr-only">Nuevo conector</span>
              <span aria-hidden="true">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Fila 2: La tabla ocupa el 100% de la altura disponible de forma responsiva */}
        <div className="flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden">
          {lista.loading && !lista.data ? (
            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-panel-border/80 bg-superficie p-4 shadow-1 flex flex-col justify-center items-center">
              <Spinner label="Cargando las plataformas…" />
            </div>
          ) : lista.error ? (
            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-panel-border/80 bg-superficie p-4 shadow-1 flex flex-col justify-center items-center gap-3">
              <ErrorNote message={lista.error} />
              <Button variant="secondary" onClick={lista.reload}>
                <Icono nombre="actividad" tamano="sm" ariaHidden={true} className="mr-1.5" />
                <span>Reintentar</span>
              </Button>
            </div>
          ) : plataformas.length === 0 ? (
            <EmptyNote
              message={VACIO_CONECTORES}
              icono="plataformas"
              className="flex-1 h-full min-h-72"
            />
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-panel-border/80 bg-superficie p-4 shadow-1 flex flex-col">
              <ConnectorList
                plataformas={plataformas}
                seleccionada={seleccionadaId}
                onSelect={(p: Platform) => setSeleccionadaId(p.id)}
              />
              {seleccionada ? (
                <ConnectorPanel platform={seleccionada} onClose={cerrar} onChanged={lista.reload} />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Modal para seleccionar plataforma sin conector al presionar Nuevo */}
      {pickerNuevoAbierto ? (
        <Modal
          title="Nuevo conector"
          icon="plataformas"
          onClose={() => setPickerNuevoAbierto(false)}
          size="md"
          footer={
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPickerNuevoAbierto(false)}>
                Cancelar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-label">
              Selecciona una plataforma sin conector para iniciar su configuración:
            </p>
            <div className="divide-y divide-panel-border/70 rounded-xl border border-panel-border/80 bg-fondo overflow-hidden max-h-72 overflow-y-auto">
              {todasPlataformas
                .filter((p) => !p.has_connector)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPickerNuevoAbierto(false);
                      setSeleccionadaId(p.id);
                      requestAnimationFrame(() => {
                        document.getElementById(`conector-${p.id}-titulo`)?.focus();
                      });
                    }}
                    className="flex w-full min-h-12 items-center justify-between p-3.5 text-left transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="block text-sm font-bold text-body-text">{p.name}</span>
                      <span className="block text-xs text-label">{p.area_name ?? 'Sin área asignada'}</span>
                    </div>
                    <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} className="text-label" />
                  </button>
                ))}
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Diálogo de confirmación al presionar Eliminar en la barra de herramientas */}
      {eliminandoPlataforma ? (
        <ConnectorDeleteDialog
          platform={eliminandoPlataforma}
          onClose={() => setEliminandoPlataforma(null)}
          onDeleted={() => {
            const nombre = eliminandoPlataforma.name;
            setEliminandoPlataforma(null);
            avisar('success', `Conector de ${nombre} eliminado.`, 'Conector eliminado');
            lista.reload();
            if (seleccionadaId === eliminandoPlataforma.id) {
              setSeleccionadaId(null);
            }
          }}
          onStale={() => {
            setEliminandoPlataforma(null);
            lista.reload();
          }}
        />
      ) : null}
    </div>
  );
}
