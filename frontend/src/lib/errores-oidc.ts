/** Mensajes genéricos de los códigos `?error=` del callback OIDC (contrato `autenticacion` v1). */
export const MENSAJE_ERROR_OIDC_DEFECTO = 'No se pudo iniciar sesión. Inténtalo de nuevo.';

const MENSAJES: Record<string, string> = {
  oidc_no_disponible: 'El inicio de sesión con Authelia no está disponible por ahora.',
  acceso_denegado: 'No se concedió el acceso desde Authelia.',
  autenticacion_fallida: MENSAJE_ERROR_OIDC_DEFECTO,
  identidad_incompleta: 'Tu cuenta de Authelia no aporta un correo verificado.',
  cuenta_no_disponible: 'Tu cuenta no está disponible. Consulta con el administrador.',
};

/** Texto para un código del callback; cualquier valor desconocido recibe el genérico. */
export function mensajeErrorOidc(codigo: string): string {
  return Object.prototype.hasOwnProperty.call(MENSAJES, codigo)
    ? MENSAJES[codigo]
    : MENSAJE_ERROR_OIDC_DEFECTO;
}
