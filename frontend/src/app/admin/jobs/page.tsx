import { AppShell } from '@/components/app-shell';
import { JobsLog } from '@/components/connectors/jobs-log';
import { PageHeader } from '@/components/page-header';
import { RequireRole } from '@/components/require-role';

/** Bitácora de ejecuciones para el admin de área (DIS-041); guarda `any_admin`, solo lectura. */
export default function Page() {
  return (
    <AppShell>
      <RequireRole requires="any_admin">
        <div className="flex h-full w-full flex-col gap-4 min-h-0">
          <PageHeader
            title="Log conectores"
            className="shrink-0"
          />
          <JobsLog />
        </div>
      </RequireRole>
    </AppShell>
  );
}
