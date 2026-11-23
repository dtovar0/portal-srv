/**
 * Indica si la presentación institucional está habilitada.
 *
 * `next.config.ts` publica PORTADA_ACTIVA como NEXT_PUBLIC_PORTADA_ACTIVA
 * para que servidor y cliente compartan el mismo valor después del build.
 */
export function esPortadaActiva(): boolean {
  const valor =
    process.env.NEXT_PUBLIC_PORTADA_ACTIVA ??
    process.env.PORTADA_ACTIVA ??
    process.env.ENABLE_PORTADA ??
    'true';

  return !['false', '0', 'no', 'off', 'inactiva'].includes(valor.trim().toLowerCase());
}
