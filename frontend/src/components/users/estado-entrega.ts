/**
 * Estado de las credenciales iniciales (FNC-139, `credentials_status` de
 * `ManagedUser`, contrato `usuarios-directorio.md` v2): etiquetas y avisos del
 * alta. El reenvío se retiró en FNC-161 (la contraseña se cambia en «Editar usuario»).
 */

import type { CredentialsStatus } from '@/lib/types';

export const ETIQUETA_CREDENCIALES: Record<CredentialsStatus, string> = {
  enviadas: 'Credenciales enviadas',
  pendientes: 'Credenciales pendientes',
};

/** Aviso (toast) tras el alta según el estado que devolvió el servidor. */
export function avisoDeCredenciales(estado: CredentialsStatus | null | undefined): {
  tipo: 'success' | 'warning';
  mensaje: string;
} {
  if (estado === 'enviadas') {
    return { tipo: 'success', mensaje: 'Se envió por correo el enlace con la contraseña inicial.' };
  }
  return {
    tipo: 'warning',
    mensaje: 'Las credenciales quedaron pendientes: se reintentará la entrega automáticamente.',
  };
}
