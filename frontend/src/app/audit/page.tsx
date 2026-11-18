import { AppShell } from '@/components/app-shell';
import { AuditLog } from '@/components/audit-log';

export default function Page() {
  return (
    <AppShell>
      <div className="flex h-full w-full flex-col min-h-0">
        <AuditLog />
      </div>
    </AppShell>
  );
}
