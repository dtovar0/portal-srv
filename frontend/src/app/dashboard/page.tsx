import { AppShell } from '@/components/app-shell';
import { DashboardGate } from '@/components/dashboard-gate';

/** Panel autenticado, separado de la entrada pública del producto. */
export default function Page() {
  return (
    <AppShell>
      <DashboardGate />
    </AppShell>
  );
}
