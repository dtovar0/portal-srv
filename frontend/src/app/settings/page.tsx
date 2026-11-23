import { AppShell } from '@/components/app-shell';
import { RequireRole } from '@/components/require-role';
import { SettingsPanel } from '@/components/settings-panel';

export default function Page() {
  return (
    <AppShell>
      <RequireRole requires="any_admin">
        <SettingsPanel />
      </RequireRole>
    </AppShell>
  );
}
