/**
 * Diseños de las tarjetas de contadores del dashboard y su preferencia (DIS-112).
 *
 * La elección es por navegador (no un secreto): se guarda en `localStorage` con la llave
 * `CLAVE_DISENO_TARJETAS`; si el almacenamiento falla o trae un valor desconocido, rige el
 * diseño por omisión. Al guardar se avisa con el evento `EVENTO_DISENO_TARJETAS` para que las
 * tarjetas (`useDisenoTarjetas`) cambien al instante aunque el botón viva en la barra superior
 * (DIS-113).
 */

export const DISENOS_TARJETA = ['brillo', 'segmentos', 'medidor'] as const;
export type DisenoTarjeta = (typeof DISENOS_TARJETA)[number];

/** Llave en `localStorage` (preferencia por navegador). */
export const CLAVE_DISENO_TARJETAS = 'nexus.dashboard.diseno-tarjetas';

/** Evento de `window` con el diseño aplicado en `detail` (DIS-113). */
export const EVENTO_DISENO_TARJETAS = 'nexus:diseno-tarjetas';

/** Diseño que rige mientras nadie elija otro («Dos segmentos»). */
export const DISENO_POR_OMISION: DisenoTarjeta = 'segmentos';

export const DISENOS: Record<DisenoTarjeta, { nombre: string; descripcion: string }> = {
  brillo: {
    nombre: 'Anillo con brillo',
    descripcion: 'Cifra grande con su icono y un anillo con degradado y porcentaje.',
  },
  segmentos: {
    nombre: 'Dos segmentos',
    descripcion: 'Anillo de dos partes con una leyenda que explica cada una.',
  },
  medidor: {
    nombre: 'Medidor',
    descripcion: 'Semicírculo con el icono al centro, la cifra y el porcentaje.',
  },
};

export function esDisenoTarjeta(valor: unknown): valor is DisenoTarjeta {
  return typeof valor === 'string' && (DISENOS_TARJETA as readonly string[]).includes(valor);
}

/** Lee la preferencia; ante cualquier falla del almacenamiento devuelve el diseño por omisión. */
export function leerDisenoTarjetas(): DisenoTarjeta {
  try {
    const guardado = window.localStorage.getItem(CLAVE_DISENO_TARJETAS);
    return esDisenoTarjeta(guardado) ? guardado : DISENO_POR_OMISION;
  } catch {
    return DISENO_POR_OMISION;
  }
}

/**
 * Guarda la preferencia y avisa del cambio; si el almacenamiento no está disponible, solo rige
 * en esta sesión (el aviso se emite igual).
 */
export function guardarDisenoTarjetas(diseno: DisenoTarjeta): void {
  try {
    window.localStorage.setItem(CLAVE_DISENO_TARJETAS, diseno);
  } catch {
    /* sin almacenamiento: la elección vale hasta recargar */
  }
  window.dispatchEvent(new CustomEvent<DisenoTarjeta>(EVENTO_DISENO_TARJETAS, { detail: diseno }));
}
