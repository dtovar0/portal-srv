import { AppShell } from '@/components/app-shell';
import { AuditLog } from '@/components/audit-log';
import { RequireRole } from '@/components/require-role';

export default function Page() {
  return (
    <AppShell>
      <RequireRole requires="any_admin">
        <div className="flex h-full w-full flex-col min-h-0">
          <AuditLog />
        </div>
      </RequireRole>
    </AppShell>
  );
}
