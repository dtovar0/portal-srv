'use client';

/**
 * Confirmación de desasociar un conector de su plataforma (DIS-140,
 * `DELETE /connectors/<id>/platform`, contrato `conectores-y-ejecuciones.md` 1.6).
 * El conector no se borra: queda sin plataforma.
 */

import { useId, useState } from 'react';
import { connectorsApi } from '@/lib/access/connectors';
import type { ConnectorItem } from '@/lib/access/types';
import { AlertDialog } from '../alert-dialog';
import { useToast } from '../toast';
import { describeConnectorDissociateError } from './connector-errors';

export function ConnectorDissociateDialog({
  connector,
  onClose,
  onDone,
  onStale,
}: {
  connector: Pick<ConnectorItem, 'id' | 'name' | 'platform'>;
  onClose: () => void;
  onDone: (connector: ConnectorItem) => void;
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
      const result = await connectorsApi.dissociate(connector.id);
      onDone(result.connector);
    } catch (err) {
      const view = describeConnectorDissociateError(err);
      setError(view.message);
      toast.avisar('error', view.message, 'Error al desasociar');
      setSending(false);
      if (view.stale) onStale();
    }
  }

  return (
    <AlertDialog
      open={true}
      title="Desasociar conector"
      onClose={onClose}
      onConfirm={confirmar}
      type="aviso"
      confirmVariant="danger"
      confirmLabel={sending ? 'Desasociando…' : 'Desasociar'}
      cancelLabel="Cancelar"
      busy={sending}
      describedBy={`${efectoId} ${detalleId}`}
    >
      <div aria-busy={sending} className="space-y-3">
        <p id={efectoId} className="text-sm text-body-text">
          El conector «{connector.name}» dejará de estar asociado a {connector.platform?.name ?? 'su plataforma'}.
        </p>
        <p id={detalleId} className="text-sm text-label">
          El conector no se borra: queda sin asociar y no hace nada hasta asociarlo a una plataforma.
          Si la plataforma tiene accesos vigentes, no se puede desasociar.
        </p>
        {error ? <div className="sr-only">{error}</div> : null}
      </div>
    </AlertDialog>
  );
}
