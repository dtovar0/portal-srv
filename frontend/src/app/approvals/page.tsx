import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { ApprovalsView } from '@/components/access/approvals-view';
import { RequireRole } from '@/components/require-role';
import { Skeleton } from '@/components/ui';

/**
 * Solicitudes (DIS-015, DIS-131): admin de área (sus áreas) y superadmin (todas).
 * Resumen con tarjetas, gráficas y dona; cada estado abre su tabla (`?status=`).
 */
export default function Page() {
  return (
    <AppShell>
      <RequireRole requires="any_admin">
        <Suspense fallback={<Skeleton variant="fila" count={5} ariaLabel="Cargando solicitudes…" />}>
          <ApprovalsView />
        </Suspense>
      </RequireRole>
    </AppShell>
  );
}
