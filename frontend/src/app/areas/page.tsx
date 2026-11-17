import { AppShell } from '@/components/app-shell';
import { AreasList } from '@/components/areas-list';

export default function Page() {
  return (
    <AppShell>
      <div className="flex h-full w-full flex-col min-h-0">
        <AreasList />
      </div>
    </AppShell>
  );
}
