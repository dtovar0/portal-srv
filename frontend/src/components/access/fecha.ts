/**
 * Fecha de los contratos (ISO 8601 UTC con `Z`) para mostrar en pantalla
 * (DIS-014), en la zona horaria del navegador.
 */

/** Idioma de las fechas de la interfaz. */
export const LOCALE_FECHAS = 'es-MX';

const FORMATO = new Intl.DateTimeFormat(LOCALE_FECHAS, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const FORMATO_CORTO_24H = new Intl.DateTimeFormat(LOCALE_FECHAS, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Sin valor o inválida: "—". */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '—' : FORMATO.format(fecha);
}

/** Formato compacto para tablas: día, mes y hora en formato 24 horas (ej. "29 oct, 14:31"). */
export function formatearFechaCorta24h(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '—' : FORMATO_CORTO_24H.format(fecha);
}
