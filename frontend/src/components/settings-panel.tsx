'use client';

/** Configuración del sistema: contenedor con las pestañas de Ajustes. */

import { useState } from 'react';
import { PageHeader } from './page-header';
import { useSession } from './session-provider';
import { Tabs, TabPanel } from './tabs';
import { BackupTab } from './settings/backup-tab';
import { DirectoryTab } from './settings/directory-tab';
import { PortalTab } from './settings/portal-tab';
import { PreferencesTab } from './settings/preferences-tab';
import { SmtpTab } from './settings/smtp-tab';
import { type Tab, panelId, tabId } from './settings/settings-tabs';
import { TemplatesTab } from './settings/templates-tab';

export function SettingsPanel() {
  const { session } = useSession();
  const isAdmin = session?.permissions.is_admin ?? false;
  const [tab, setTab] = useState<Tab>(isAdmin ? 'portal' : 'preferences');

  // La configuración del sistema es solo del superadmin; las preferencias, de
  // cada usuario.
  const tabs: { id: Tab; label: string }[] = [
    ...(isAdmin
      ? ([
          { id: 'portal', label: 'Portal' },
          { id: 'smtp', label: 'Correo' },
          { id: 'templates', label: 'Plantillas' },
          { id: 'ldap', label: 'Directorio' },
          { id: 'backup', label: 'Respaldo' },
        ] as { id: Tab; label: string }[])
      : []),
    { id: 'preferences', label: 'Mis preferencias' },
  ];

  return (
    <div className="flex h-full w-full flex-1 flex-col gap-4 min-h-0">
      <PageHeader title="Ajustes" />

      <Tabs
        tabs={tabs}
        value={tab}
        onChange={setTab}
        ariaLabel="Ajustes"
        getTabId={tabId}
        getPanelId={panelId}
      />

      <TabPanel id={panelId(tab)} tabId={tabId(tab)} className="!mt-0 flex h-full w-full flex-1 min-h-0 flex-col">
        {tab === 'portal' ? <PortalTab /> : null}
        {tab === 'smtp' ? <SmtpTab /> : null}
        {tab === 'templates' ? <TemplatesTab /> : null}
        {tab === 'ldap' ? <DirectoryTab /> : null}
        {tab === 'backup' ? <BackupTab /> : null}
        {tab === 'preferences' ? <PreferencesTab /> : null}
      </TabPanel>
    </div>
  );
}
