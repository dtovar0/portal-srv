import { AppShell } from '@/components/app-shell';
import { ConnectorsAdmin } from '@/components/connectors/connectors-admin';
import { PageHeader } from '@/components/page-header';
import { RequireRole } from '@/components/require-role';

/** Conectores y bitácora de ejecuciones (DIS-022); guarda `admin` (FNC-070). */
export default function Page() {
  return (
    <AppShell>
      <RequireRole requires="admin">
        <div className="flex h-full w-full flex-col gap-4 min-h-0">
          <PageHeader
            title="Conectores"
            className="shrink-0"
          />
          <ConnectorsAdmin />
        </div>
      </RequireRole>
    </AppShell>
  );
}
