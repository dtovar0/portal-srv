/**
 * Estado de un acceso como insignia con texto (DIS-013): nunca solo color.
 * Reutilizable en Mis accesos (DIS-014) y en los accesos de un usuario.
 */

import type { AccessLevel, AccessStatus } from '@/lib/access/types';
import type { NombreIcono } from '../icono';
import { Badge } from '../ui';

type Tono = React.ComponentProps<typeof Badge>['tone'];

export const NIVELES: Record<AccessLevel, string> = {
  usuario: 'Usuario',
  admin: 'Admin',
};

export const ESTADOS: Record<AccessStatus, { texto: string; tono: Tono; icono: NombreIcono }> = {
  activo: { texto: 'Con acceso', tono: 'success', icono: 'aprobar' },
  en_proceso: { texto: 'Acceso en proceso', tono: 'sky', icono: 'reloj' },
  fallido: { texto: 'Acceso fallido', tono: 'error', icono: 'rechazar' },
  revocando: { texto: 'Revocando acceso', tono: 'warning', icono: 'reloj' },
  revocado: { texto: 'Sin acceso', tono: 'slate', icono: 'escudo' },
  fallo_revocacion: { texto: 'Fallo al revocar', tono: 'error', icono: 'rechazar' },
};

/** Estados que todavía cambian: con ellos se refresca (contrato `accesos.md`, "Refresco"). */
export const ESTADOS_ACCESO_TRANSITORIOS: readonly AccessStatus[] = ['en_proceso', 'revocando'];

export function hayAccesosTransitorios(accesos: ReadonlyArray<{ status: AccessStatus }>): boolean {
  return accesos.some((a) => ESTADOS_ACCESO_TRANSITORIOS.includes(a.status));
}

/** `status` null (o `revocado`) se muestra como "Sin acceso". */
export function AccessStatusBadge({
  status,
  level,
}: {
  status: AccessStatus | null;
  level?: AccessLevel | null;
}) {
  if (!status || status === 'revocado') return <Badge tone="slate" icon="escudo">Sin acceso</Badge>;
  const { texto, tono, icono } = ESTADOS[status];
  return <Badge tone={tono} icon={icono}>{level ? `${texto} · ${NIVELES[level]}` : texto}</Badge>;
}
