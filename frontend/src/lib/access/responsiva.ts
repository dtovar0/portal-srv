/**
 * ¿Aplica la Carta Responsiva? (DIS-124, corregido en DIS-127)
 *
 * Aplica en cuanto la persona tiene alguna plataforma APROBADA, aunque su
 * acceso siga «en proceso»: el aprovisionamiento espera justamente a esa firma
 * (`access/services.otorgar`). Con DIS-124 solo contaban las plataformas ya
 * abribles y se formaba un bloqueo: el acceso esperaba la firma y la
 * responsiva esperaba el acceso.
 */
import type { AccessStatus, CatalogItem } from './types';

/** Estados de un acceso aprobado (vigente) que requieren o ya tienen la firma. */
export const ESTADOS_CON_RESPONSIVA: readonly AccessStatus[] = ['en_proceso', 'activo'];

export function responsivaAplica(
  items: readonly CatalogItem[],
  abribles: ReadonlyMap<number, unknown>,
): boolean {
  return abribles.size > 0
    || items.some((item) => item.my_access_status !== null
      && ESTADOS_CON_RESPONSIVA.includes(item.my_access_status));
}
