'use client';

/** Ajustes › Respaldo: descarga y restauración de la configuración. */

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, FileInput } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { Card } from '../ui';

export function BackupTab() {
  const [busy, setBusy] = useState(false);
  const { avisar } = useToast();

  async function download() {
    setBusy(true);
    try {
      const blob = await api.downloadBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `portal_backup_${stamp}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      avisar('success', 'Respaldo descargado.', 'Respaldo');
    } catch (err) {
      avisar('error', err instanceof Error ? err.message : 'No se pudo descargar', 'Respaldo');
    } finally {
      setBusy(false);
    }
  }

  async function restore(file: File) {
    setBusy(true);
    try {
      const result = await api.uploadBackup(file);
      avisar('success', `Restaurado: ${result.restored.join(', ') || 'nada'}.`, 'Respaldo restaurado');
    } catch (err) {
      avisar('error', err instanceof Error ? err.message : 'No se pudo restaurar', 'Respaldo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex h-full w-full flex-1 min-h-0 flex-col space-y-5">
      <div>
        <h2 className="text-sm font-medium">Descargar respaldo</h2>
        <p className="mt-1 text-sm text-label">
          Incluye la identidad del portal, el directorio, el correo, las
          plantillas y las cuentas locales (sin contraseñas ni superadmins: tras restaurar, la cuenta de emergencia se crea con el comando del servidor).
        </p>
        <Button onClick={download} disabled={busy} className="mt-3">
          <Icono nombre="exportar" tamano="sm" ariaHidden={true} className="mr-1.5" />
          {busy ? 'Preparando…' : 'Descargar ZIP'}
        </Button>
      </div>

      <div className="border-t border-panel-border pt-5">
        <h2 className="text-sm font-medium">Restaurar</h2>
        <p className="mt-1 text-sm text-label">
          Sobrescribe la configuración con la del paquete. Las cuentas que ya
          existan no se modifican.
        </p>
        <FileInput
          accept=".zip,application/zip"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) restore(file);
          }}
          className="mt-3 block"
        />
      </div>
    </Card>
  );
}
