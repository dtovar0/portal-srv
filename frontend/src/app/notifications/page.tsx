import { AppShell } from '@/components/app-shell';
import { NotificationsList } from '@/components/notifications-list';

export default function Page() {
  return (
    <AppShell>
      <div className="flex h-full w-full flex-1 flex-col min-h-0">
        <NotificationsList />
      </div>
    </AppShell>
  );
}
