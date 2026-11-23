/**
 * Configuración dinámica de marca, identidad y dominio de la plataforma.
 * Permite que el nombre ("Aduana", "Nexus", etc.) y dominio no queden fijos en código.
 */

export const APP_TITLE =
  process.env.NEXT_PUBLIC_APP_TITLE || 'Aduana';

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || 'aduana';

export const APP_DOMAIN =
  process.env.NEXT_PUBLIC_DOMAIN || '';

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'aduana-app@vivaro.com';
