import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Inventory } from '@/components/access/inventory';
import { RequireRole } from '@/components/require-role';
import { Skeleton } from '@/components/ui';

/**
 * Inventario de permisos (DIS-021): admin de área (sus áreas) y superadmin
 * (todo). El usuario recibe 403 del backend; aquí ve "sin permiso".
 */
export default function Page() {
  return (
    <AppShell>
      <RequireRole requires="any_admin">
        <div className="flex h-full w-full flex-col gap-4 min-h-0">
          <PageHeader
            title="Auditoría usuarios"
            className="shrink-0"
          />
          <Suspense fallback={<Skeleton variant="fila" count={5} ariaLabel="Cargando inventario…" />}>
            <Inventory />
          </Suspense>
        </div>
      </RequireRole>
    </AppShell>
  );
}
