'use client';

/** Centro de notificaciones in-app. */

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Button, ConfirmDialog } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { Card, EmptyNote, ErrorNote, RegionDeAviso, Skeleton } from './ui';

const ICONS: Record<string, string> = {
  success: '✓', error: '✕', warning: '!', info: 'i',
};

/** FNC-034: texto accesible del tipo; el glifo es decorativo y el color no basta. */
const TIPOS: Record<string, string> = {
  success: 'Éxito', error: 'Error', warning: 'Advertencia', info: 'Información',
};

const TONES: Record<string, string> = {
  success: 'bg-success/15 text-success-text',
  error: 'bg-error/15 text-error-text',
  warning: 'bg-warning/15 text-warning-text',
  info: 'bg-primary/15 text-primary-text',
};

export function NotificationsList() {
  const { data, loading, error, reload } = useAsync(() => api.notifications(), []);
  const [clearing, setClearing] = useState(false);
  const [busy, setBusy] = useState(false);

  const unread = (data ?? []).filter((n) => !n.is_read).length;

  async function markAll() {
    setBusy(true);
    try {
      await api.markNotificationsRead();
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    setBusy(true);
    try {
      await api.clearNotifications();
      setClearing(false);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-1 min-h-0 flex-col space-y-6">
      <PageHeader
        title="Notificaciones"
        description={unread > 0 ? `${unread} sin leer.` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            {unread > 0 ? (
              <Button
                variant="secondary"
                onClick={markAll}
                disabled={busy}
                className="inline-flex items-center gap-2"
              >
                <Icono nombre="aprobar" tamano="sm" ariaHidden={true} />
                <span>Marcar todas como leídas</span>
              </Button>
            ) : null}
            {(data ?? []).length > 0 ? (
              <Button
                variant="danger"
                onClick={() => setClearing(true)}
                className="inline-flex items-center gap-2"
              >
                <Icono nombre="eliminar" tamano="sm" ariaHidden={true} />
                <span>Vaciar</span>
              </Button>
            ) : null}
          </div>
        }
      />

      <RegionDeAviso minHeight="min-h-6">
        {error ? <ErrorNote message={error} /> : null}
      </RegionDeAviso>

      <div className="flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden">
        {loading ? (
          <Skeleton variant="fila" count={4} ariaLabel="Cargando notificaciones…" />
        ) : !error ? (
          (data ?? []).length === 0 ? (
            <EmptyNote
              icono="campana"
              message="No tienes notificaciones."
              className="flex-1 h-full min-h-72"
            />
          ) : (
            <div className="flex-1 min-h-0 h-full w-full overflow-y-auto space-y-2 pr-1">
              {(data ?? []).map((item) => (
                <Card
                  key={item.id}
                  className={item.is_read ? undefined : 'border-primary/40'}
                >
                  <div className="flex gap-3">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${TONES[item.type] ?? TONES.info}`}
                      aria-hidden
                    >
                      {ICONS[item.type] ?? 'i'}
                    </span>
                    {/* DIS-005: leída = solo el texto atenuado (`opacity-85`, ≥ 5,18:1); el chip conserva su contraste. */}
                    <div className={`min-w-0 flex-1 ${item.is_read ? 'opacity-85' : ''}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium">
                          <span className="sr-only">{TIPOS[item.type] ?? TIPOS.info}: </span>
                          {item.title}
                        </p>
                        <span className="text-xs text-label">{item.time}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-label">{item.message}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : null}
      </div>

      {clearing ? (
        <ConfirmDialog
          title="Vaciar notificaciones"
          message="Se eliminarán tus notificaciones. Las globales del sistema no se ven afectadas."
          confirmLabel="Vaciar"
          onConfirm={clearAll}
          onCancel={() => setClearing(false)}
          busy={busy}
        />
      ) : null}
    </div>
  );
}
