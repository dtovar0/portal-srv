'use client';

/**
 * Pantalla Conectores (DIS-022, F-CON-01; DIS-140: conectores independientes;
 * ruta `/admin/connectors`, guarda `admin`): conectores de `GET /connectors` con su
 * plataforma (o «Sin asociar») y, debajo, la bitácora de ejecuciones.
 *
 * - «Nuevo» abre el formulario sin plataforma (`POST /connectors`); «Editar» y
 *   «Configurar» abren `ConnectorPanel` bajo la lista; al cerrarlo el foco vuelve al botón.
 * - «Asociar» elige una plataforma sin conector; «Desasociar» y «Eliminar» piden confirmación.
 */

import { useCallback, useMemo, useState } from 'react';
import { connectorsApi } from '@/lib/access/connectors';
import type { ConnectorItem } from '@/lib/access/types';
import { useAsync } from '@/lib/use-async';
import { listLoadError } from '../access/request-errors';
import { Button } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { EmptyNote, ErrorNote, Spinner } from '../ui';
import { ConnectorAssociateDialog } from './connector-associate-dialog';
import { ConnectorDeleteDialog } from './connector-delete-dialog';
import { ConnectorDissociateDialog } from './connector-dissociate-dialog';
import { ConnectorList, botonConfigurarId } from './connector-list';
import { ConnectorPanel, tituloPanelId } from './connector-panel';

export const VACIO_CONECTORES = 'Aún no hay conectores. Usa «Nuevo» para crear uno.';

const MOTIVO_SELECCIONA = (accion: string) => `Selecciona 1 conector para ${accion}`;

export function ConnectorsAdmin() {
  const { avisar } = useToast();
  const lista = useAsync(
    () => connectorsApi.list()
      .then((r) => r.items)
      .catch((err: unknown) => { throw listLoadError(err, 'los conectores'); }),
    [],
  );
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [eliminando, setEliminando] = useState<ConnectorItem | null>(null);
  const [asociando, setAsociando] = useState<ConnectorItem | null>(null);
  const [desasociando, setDesasociando] = useState<ConnectorItem | null>(null);

  const todos = useMemo(() => lista.data ?? [], [lista.data]);
  const conectores = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter((c) =>
      c.name.toLowerCase().includes(q) || c.host.toLowerCase().includes(q)
      || (c.platform?.name.toLowerCase().includes(q) ?? false)
    );
  }, [todos, busqueda]);

  // Si el conector ya no está en la lista (eliminado por otra persona), no hay selección.
  const seleccionado = todos.find((c) => c.id === seleccionadoId) ?? null;

  const enfocarTitulo = (id: number | null) =>
    requestAnimationFrame(() => document.getElementById(tituloPanelId(id))?.focus());

  const cerrar = useCallback(() => {
    const id = seleccionadoId;
    setSeleccionadoId(null);
    setCreando(false);
    if (id !== null) requestAnimationFrame(() => document.getElementById(botonConfigurarId(id))?.focus());
  }, [seleccionadoId]);

  const abrir = (c: ConnectorItem) => {
    setCreando(false);
    setSeleccionadoId(c.id);
  };

  const handleEditar = () => {
    if (!seleccionado) return;
    setCreando(false);
    enfocarTitulo(seleccionado.id);
  };

  const handleNuevo = () => {
    setSeleccionadoId(null);
    setCreando(true);
    enfocarTitulo(null);
  };

  /** Asociado o desasociado: se selecciona el conector con su dato nuevo. */
  const cambioDePlataforma = (c: ConnectorItem, texto: string) => {
    setAsociando(null);
    setDesasociando(null);
    setSeleccionadoId(c.id);
    avisar('success', texto, 'Conector');
    lista.reload();
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 min-h-0">
      {/* Grid de 1 columna y 2 filas (10/90): Fila 1 contenedor con botones, Fila 2 tabla al 100% */}
      <div className="grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-4">
        {/* Fila 1 (N columnas, 1 fila): Buscador a la izquierda y botones estandarizados a la derecha */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
          {/* Buscador izquierda */}
          <div className="relative w-full max-w-md">
            <label htmlFor="buscar-conectores" className="sr-only">Buscar conectores</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
              <Icono nombre="buscar" tamano="md" ariaHidden={true} />
            </div>
            <input
              id="buscar-conectores"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar conectores…"
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

          {/* Botones estandarizados a la derecha: Editar, Asociar, Desasociar, Eliminar, | y Nuevo */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="fila"
              disabled={!seleccionado}
              motivoDeshabilitado={MOTIVO_SELECCIONA('editar')}
              onClick={handleEditar}
              aria-label={seleccionado ? `Editar el conector ${seleccionado.name}` : 'Editar'}
              title={seleccionado ? `Editar el conector ${seleccionado.name}` : MOTIVO_SELECCIONA('editar')}
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="editar" tamano="sm" ariaHidden={true} />
              <span>Editar</span>
            </Button>
            <Button
              variant="fila"
              disabled={!seleccionado || seleccionado.platform !== null}
              motivoDeshabilitado={!seleccionado ? MOTIVO_SELECCIONA('asociar') : 'Este conector ya está asociado a una plataforma'}
              onClick={() => { if (seleccionado) setAsociando(seleccionado); }}
              aria-label={seleccionado ? `Asociar el conector ${seleccionado.name}` : 'Asociar'}
              title={seleccionado ? `Asociar el conector ${seleccionado.name}` : MOTIVO_SELECCIONA('asociar')}
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="plataformas" tamano="sm" ariaHidden={true} />
              <span>Asociar</span>
            </Button>
            <Button
              variant="fila"
              disabled={!seleccionado || seleccionado.platform === null}
              motivoDeshabilitado={!seleccionado ? MOTIVO_SELECCIONA('desasociar') : 'Este conector no está asociado a ninguna plataforma'}
              onClick={() => { if (seleccionado) setDesasociando(seleccionado); }}
              aria-label={seleccionado ? `Desasociar el conector ${seleccionado.name}` : 'Desasociar'}
              title={seleccionado ? `Desasociar el conector ${seleccionado.name}` : MOTIVO_SELECCIONA('desasociar')}
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
              <span>Desasociar</span>
            </Button>
            <Button
              variant="fila-peligro"
              disabled={!seleccionado}
              motivoDeshabilitado={MOTIVO_SELECCIONA('eliminar')}
              onClick={() => { if (seleccionado) setEliminando(seleccionado); }}
              aria-label={seleccionado ? `Eliminar el conector ${seleccionado.name}` : 'Eliminar'}
              title={seleccionado ? `Eliminar el conector ${seleccionado.name}` : MOTIVO_SELECCIONA('eliminar')}
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
              <Spinner label="Cargando los conectores…" />
            </div>
          ) : lista.error ? (
            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-panel-border/80 bg-superficie p-4 shadow-1 flex flex-col justify-center items-center gap-3">
              <ErrorNote message={lista.error} />
              <Button variant="secondary" onClick={lista.reload}>
                <Icono nombre="actividad" tamano="sm" ariaHidden={true} className="mr-1.5" />
                <span>Reintentar</span>
              </Button>
            </div>
          ) : conectores.length === 0 && !creando ? (
            <EmptyNote
              message={VACIO_CONECTORES}
              icono="plataformas"
              className="flex-1 h-full min-h-72"
            />
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-panel-border/80 bg-superficie p-4 shadow-1 flex flex-col">
              <ConnectorList conectores={conectores} seleccionado={seleccionadoId} onSelect={abrir} />
              {creando || seleccionado ? (
                <ConnectorPanel
                  connector={creando ? null : seleccionado}
                  onClose={cerrar}
                  onSaved={(c, creado) => {
                    if (creado) { setCreando(false); setSeleccionadoId(c.id); }
                    lista.reload();
                  }}
                  onChanged={lista.reload}
                  onDeleted={() => { setSeleccionadoId(null); lista.reload(); }}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {asociando ? (
        <ConnectorAssociateDialog
          connector={asociando}
          onClose={() => setAsociando(null)}
          onDone={(c) => cambioDePlataforma(c, `Conector ${c.name} asociado a ${c.platform?.name ?? 'la plataforma'}.`)}
          onStale={() => { setAsociando(null); lista.reload(); }}
        />
      ) : null}

      {desasociando ? (
        <ConnectorDissociateDialog
          connector={desasociando}
          onClose={() => setDesasociando(null)}
          onDone={(c) => cambioDePlataforma(c, `Conector ${c.name} desasociado.`)}
          onStale={() => { setDesasociando(null); lista.reload(); }}
        />
      ) : null}

      {/* Diálogo de confirmación al presionar Eliminar en la barra de herramientas */}
      {eliminando ? (
        <ConnectorDeleteDialog
          connector={eliminando}
          onClose={() => setEliminando(null)}
          onDeleted={() => {
            const eliminado = eliminando;
            setEliminando(null);
            avisar('success', `Conector ${eliminado.name} eliminado.`, 'Conector eliminado');
            if (seleccionadoId === eliminado.id) setSeleccionadoId(null);
            lista.reload();
          }}
          onStale={() => {
            setEliminando(null);
            lista.reload();
          }}
        />
      ) : null}
    </div>
  );
}
