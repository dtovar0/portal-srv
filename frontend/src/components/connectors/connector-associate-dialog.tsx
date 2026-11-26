'use client';

/**
 * Selector de plataforma para asociar un conector (DIS-140,
 * `PUT /connectors/<id>/platform`, contrato `conectores-y-ejecuciones.md` 1.6).
 * Ofrece las plataformas de `GET /platforms` con `has_connector` falso (una por conector).
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import { connectorsApi } from '@/lib/access/connectors';
import type { ConnectorItem } from '@/lib/access/types';
import type { Platform } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { listLoadError } from '../access/request-errors';
import { Button, Modal } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { EmptyNote, ErrorNote, Spinner } from '../ui';
import { describeConnectorAssociateError } from './connector-errors';

export const SIN_CANDIDATAS = 'Todas las plataformas ya tienen conector.';
export const SIN_PLATAFORMAS = 'Primero crea una plataforma en Plataformas; después asóciale un conector.';

const porNombre = (a: Platform, b: Platform) => a.name.localeCompare(b.name, 'es');

/** Candidatas: plataformas que aún no tienen conector, por nombre. */
export function plataformasSinConector(plataformas: Platform[]): Platform[] {
  return plataformas.filter((p) => !p.has_connector).sort(porNombre);
}

export function ConnectorAssociateDialog({
  connector,
  onClose,
  onDone,
  onStale,
}: {
  connector: Pick<ConnectorItem, 'id' | 'name'>;
  onClose: () => void;
  onDone: (connector: ConnectorItem) => void;
  onStale: () => void;
}) {
  const toast = useToast();
  const lista = useAsync(
    () => api.platforms().catch((err: unknown) => { throw listLoadError(err, 'las plataformas'); }),
    [],
  );
  const [sending, setSending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const candidatas = plataformasSinConector(lista.data ?? []);

  async function elegir(plataforma: Platform) {
    if (sending !== null) return;
    setSending(plataforma.id);
    setError(null);
    try {
      const result = await connectorsApi.associate(connector.id, plataforma.id);
      onDone(result.connector);
    } catch (err) {
      const view = describeConnectorAssociateError(err);
      setError(view.message);
      toast.avisar('error', view.message, 'Error al asociar');
      setSending(null);
      if (view.stale) onStale();
    }
  }

  return (
    <Modal
      title="Asociar a una plataforma"
      icon="plataformas"
      onClose={onClose}
      size="md"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      }
    >
      <div className="space-y-4" aria-busy={sending !== null}>
        <p className="text-sm text-label">
          Elige la plataforma sin conector a la que se asociará «{connector.name}»:
        </p>
        {lista.loading && !lista.data ? <Spinner label="Cargando las plataformas…" /> : null}
        {lista.error ? (
          <div className="space-y-3">
            <ErrorNote message={lista.error} />
            <Button variant="secondary" onClick={lista.reload}>Reintentar</Button>
          </div>
        ) : null}
        {lista.data && candidatas.length === 0 ? (
          <EmptyNote message={lista.data.length === 0 ? SIN_PLATAFORMAS : SIN_CANDIDATAS} icono="plataformas" />
        ) : null}
        {candidatas.length > 0 ? (
          <div className="divide-y divide-panel-border/70 rounded-xl border border-panel-border/80 bg-fondo overflow-hidden max-h-72 overflow-y-auto">
            {candidatas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => elegir(p)}
                aria-disabled={sending !== null || undefined}
                className="flex w-full min-h-12 items-center justify-between p-3.5 text-left transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer aria-disabled:opacity-deshabilitada"
              >
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-body-text">{p.name}</span>
                  <span className="block text-xs text-label">{p.area_name ?? 'Sin área asignada'}</span>
                </div>
                <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} className="text-label" />
              </button>
            ))}
          </div>
        ) : null}
        {error ? <div className="sr-only">{error}</div> : null}
      </div>
    </Modal>
  );
}
