'use client';

/** Modal de búsqueda de cuentas en el directorio corporativo. */

import { useState } from 'react';
import { api } from '@/lib/api';
import type { DirectoryUser } from '@/lib/types';
import { Button, Modal, TextInput } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { Badge, EmptyNote } from '../ui';

export function DirectoryPicker({
  onPick,
  onClose,
}: {
  onPick: (found: DirectoryUser) => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<DirectoryUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const { avisar } = useToast();

  async function search() {
    setBusy(true);
    try {
      const found = await api.searchDirectory(term);
      setResults(found.users);
    } catch (err) {
      avisar('error', err instanceof Error ? err.message : 'No se pudo buscar', 'Búsqueda en el directorio');
      setResults(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Directorio"
      icon="buscar"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
          Cerrar
        </Button>
      }
    >
      <div className="flex gap-2">
        <TextInput
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void search(); }}
          placeholder="Nombre, cuenta o correo"
          autoFocus
        />
        <Button onClick={search} disabled={busy || term.trim().length < 2}>
          <Icono nombre="buscar" tamano="sm" ariaHidden={true} className="mr-1.5" />
          {busy ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>

      {results !== null ? (
        results.length === 0 ? (
          <EmptyNote message="Sin resultados." />
        ) : (
          <ul className="max-h-72 divide-y divide-panel-border overflow-y-auto">
            {results.map((found) => (
              <li
                key={found.account || found.email}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{found.name}</p>
                  <p className="truncate text-xs text-label">
                    {found.email || found.account}
                  </p>
                </div>
                {found.exists ? (
                  <Badge>Ya existe</Badge>
                ) : (
                  <Button variant="secondary" onClick={() => onPick(found)}>
                    <Icono nombre="mas" tamano="sm" ariaHidden={true} className="mr-1.5" />
                    Añadir
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </Modal>
  );
}
