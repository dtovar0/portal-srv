/**
 * Estado de una solicitud de acceso como insignia con texto (DIS-014): nunca
 * solo color. Reutilizable en Aprobaciones (DIS-015).
 */

import type { AccessRequest, RequestStatus } from '@/lib/access/types';
import type { NombreIcono } from '../icono';
import { Badge } from '../ui';
import { hayAccesosTransitorios } from './access-status-badge';

type Tono = React.ComponentProps<typeof Badge>['tone'];

export const ESTADOS_SOLICITUD: Record<RequestStatus, { texto: string; tono: Tono; icono: NombreIcono }> = {
  pendiente: { texto: 'Pendiente', tono: 'warning', icono: 'reloj' },
  aprobada: { texto: 'Aprobada', tono: 'success', icono: 'aprobar' },
  rechazada: { texto: 'Rechazada', tono: 'error', icono: 'rechazar' },
};

/**
 * Con la página mostrada se refresca mientras haya una solicitud `pendiente`
 * o un acceso derivado transitorio (contrato `solicitudes.md`, "Refresco").
 */
export function hayTransitoriosEnSolicitudes(solicitudes: AccessRequest[]): boolean {
  return solicitudes.some((s) => s.status === 'pendiente'
    || (s.access !== null && hayAccesosTransitorios([s.access])));
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { texto, tono, icono } = ESTADOS_SOLICITUD[status];
  return <Badge tone={tono} icon={icono}>{texto}</Badge>;
}
