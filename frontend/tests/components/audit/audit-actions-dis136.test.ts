import { describe, expect, it } from 'vitest';
import { etiquetaAccion } from '@/components/audit/audit-actions';

// DIS-136: eventos del backend (FNC-163, FNC-209) con etiqueta legible.
describe('etiquetas de auditoría (DIS-136)', () => {
  it.each([
    ['miembro_agregado', 'Miembro agregado'],
    ['miembro_quitado', 'Miembro quitado'],
    ['grupos_movidos', 'Grupos movidos'],
    ['grupos_traslado_fallido', 'Fallo traslado de grupos'],
  ])('%s → %s', (accion, etiqueta) => {
    expect(etiquetaAccion(accion)).toBe(etiqueta);
  });
});
