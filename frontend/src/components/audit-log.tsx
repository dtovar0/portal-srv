'use client';

/**
 * Auditoría (`/audit`; FNC-025, DIS-020): registros dentro del alcance de
 * quien consulta (`GET /audit` paginado, contrato `auditoria.md`), con
 * filtros, paginación y detalle con antes y después.
 */

import { auditApi } from '@/lib/access/audit';
import { PageHeader } from './page-header';
import { AuditHistory } from './audit/audit-history';

export function AuditLog() {
  return (
    <div className="flex h-full w-full flex-col gap-4 min-h-0">
      <PageHeader
        title="Auditoría"
        className="shrink-0"
      />
      <AuditHistory cargar={auditApi.list} />
    </div>
  );
}
