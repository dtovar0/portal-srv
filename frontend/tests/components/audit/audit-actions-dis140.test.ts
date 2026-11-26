import { describe, expect, it } from 'vitest';
import { etiquetaAccion } from '@/components/audit/audit-actions';

// DIS-140: eventos nuevos de conectores independientes (FNC-213) con etiqueta legible.
describe('etiquetas de auditoría de conectores (DIS-140)', () => {
  it.each([
    ['conector_creado', 'Conector creado'],
    ['conector_asociado', 'Conector asociado'],
    ['conector_desasociado', 'Conector desasociado'],
  ])('%s → %s', (accion, etiqueta) => {
    expect(etiquetaAccion(accion)).toBe(etiqueta);
  });
});
