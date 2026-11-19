/**
 * Estado de las credenciales iniciales (FNC-139, `credentials_status` de
 * `ManagedUser`, contrato `usuarios-directorio.md` v2): etiquetas y mensajes
 * de «Reenviar credenciales». Nunca se muestra el texto del servidor.
 */

import { ApiError } from '@/lib/api';
import type { CredentialsStatus } from '@/lib/types';

export const ETIQUETA_CREDENCIALES: Record<CredentialsStatus, string> = {
  enviadas: 'Credenciales enviadas',
  pendientes: 'Credenciales pendientes',
};

/** Aviso (toast) tras el alta o el reenvío según el estado que devolvió el servidor. */
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

const MENSAJES_POR_CODIGO: Record<string, string> = {
  credenciales_no_aplicables: 'Esta cuenta no admite el reenvío de credenciales.',
  directorio_no_disponible: 'No se pudo actualizar la contraseña en el directorio.',
};

const MENSAJES_POR_ESTADO: Record<number, string> = {
  401: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  403: 'Solo el superadmin puede reenviar credenciales.',
  404: 'La cuenta ya no existe. Recarga la lista.',
  503: 'No se pudo actualizar la contraseña en el directorio.',
};

const MENSAJE_GENERICO = 'No se pudieron reenviar las credenciales. Inténtalo de nuevo.';

export function describeResendError(err: unknown): string {
  if (!(err instanceof ApiError)) return MENSAJE_GENERICO;
  return (err.code && MENSAJES_POR_CODIGO[err.code]) ?? MENSAJES_POR_ESTADO[err.status] ?? MENSAJE_GENERICO;
}
