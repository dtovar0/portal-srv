/**
 * Aviso entre vistas de que los accesos del usuario cambiaron (DIS-128).
 *
 * Lo usa la firma de la Carta Responsiva: al firmar, los accesos «en proceso»
 * se aprovisionan y el catálogo (barra superior o lateral, cada una con su
 * propia copia) debe recargarse sin que el usuario pulse F5.
 */
export const EVENTO_ACCESOS_CAMBIADOS = 'nexus:accesos-cambiados';

export function avisarAccesosCambiados(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENTO_ACCESOS_CAMBIADOS));
}
