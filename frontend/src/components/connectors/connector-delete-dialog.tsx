'use client';

/**
 * Confirmación de eliminar un conector (DIS-022, DIS-075; DIS-140: `DELETE /connectors/<id>`,
 * contrato `conectores-y-ejecuciones.md` 1.6).
 * Migrado a `AlertDialog` (DIS-075).
 */

import { useId, useState } from 'react';
import { connectorsApi } from '@/lib/access/connectors';
import type { ConnectorItem } from '@/lib/access/types';
import { AlertDialog } from '../alert-dialog';
import { useToast } from '../toast';
import { describeConnectorDeleteError } from './connector-errors';

export function ConnectorDeleteDialog({
  connector,
  onClose,
  onDeleted,
  onStale,
}: {
  connector: Pick<ConnectorItem, 'id' | 'name' | 'platform'>;
  onClose: () => void;
  onDeleted: () => void;
  onStale: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const efectoId = useId();
  const detalleId = useId();
  const toast = useToast();

  async function confirmar() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await connectorsApi.destroy(connector.id);
      onDeleted();
    } catch (err) {
      const view = describeConnectorDeleteError(err);
      setError(view.message);
      toast.avisar('error', view.message, 'Error al eliminar');
      setSending(false);
      if (view.stale) onStale();
    }
  }

  return (
    <AlertDialog
      open={true}
      title="Eliminar conector"
      onClose={onClose}
      onConfirm={confirmar}
      type="aviso"
      confirmVariant="danger"
      confirmLabel={sending ? 'Eliminando…' : 'Eliminar'}
      cancelLabel="Cancelar"
      busy={sending}
      describedBy={`${efectoId} ${detalleId}`}
    >
      <div aria-busy={sending} className="space-y-3">
        <p id={efectoId} className="text-sm text-body-text">
          Se borrará el conector «{connector.name}».
        </p>
        <p id={detalleId} className="text-sm text-label">
          {connector.platform
            ? `Hasta asociar otro conector, los accesos que se aprueben en ${connector.platform.name} no podrán aplicarse. `
            : ''}
          No se borra el ítem del gestor de secretos. Si hay accesos vigentes en la plataforma
          asociada, no se puede eliminar.
        </p>
        {error ? <div className="sr-only">{error}</div> : null}
      </div>
    </AlertDialog>
  );
}
