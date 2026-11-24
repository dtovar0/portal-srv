/**
 * Origen de una cuenta del portal (`auth_source`), FNC-169.
 *
 * Las cuentas del directorio viven en OpenLDAP y entran por Authelia: el
 * portal las crea como `sso` (FNC-168); `ldap` es el origen heredado.
 */

/** Orígenes cuya contraseña vive en el directorio (se cambia en LDAP). */
export const ORIGENES_DEL_DIRECTORIO: readonly string[] = ['sso', 'ldap'];

export const ORIGEN_LOCAL = 'local';

const ETIQUETA_DIRECTORIO = 'Directorio (Authelia)';
const ETIQUETA_LOCAL = 'Cuenta local';

export function esCuentaDelDirectorio(origen: string | null | undefined): boolean {
  return ORIGENES_DEL_DIRECTORIO.includes(origen ?? '');
}

/** Texto legible del origen; uno desconocido se muestra tal cual. */
export function etiquetaOrigen(origen: string | null | undefined): string {
  if (esCuentaDelDirectorio(origen)) return ETIQUETA_DIRECTORIO;
  if (origen === ORIGEN_LOCAL) return ETIQUETA_LOCAL;
  return origen ?? '';
}
