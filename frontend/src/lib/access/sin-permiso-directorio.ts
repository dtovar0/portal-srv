/**
 * DIS-135: la cuenta de servicio del portal no tiene permiso de escritura en
 * LDAP (`503 sin_permiso_en_directorio`, FNC-206). No es una caída: reintentar
 * no sirve, hay que ajustar las ACL del directorio.
 */
export const MENSAJE_SIN_PERMISO_EN_DIRECTORIO =
  'La cuenta de servicio del portal no tiene permiso para esta operación en el directorio. Avisa al administrador de LDAP.';
