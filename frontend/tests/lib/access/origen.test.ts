/** DIS-134: etiquetas del origen del acceso en un solo lugar. */
import { describe, expect, it } from 'vitest';
import { ORIGENES, etiquetaOrigenAcceso } from '@/lib/access/origen';

describe('etiquetaOrigenAcceso', () => {
  it.each([
    ['solicitud', 'propio', 'Por solicitud'],
    ['admin_de_area', 'propio', 'Automático: administras el área'],
    ['admin_de_area', 'admin', 'Automático (admin del área)'],
    ['migracion', 'propio', 'Migración'],
    ['migracion', 'admin', 'Migración'],
  ] as const)('%s (%s) -> %s', (origen, vista, esperado) => {
    expect(etiquetaOrigenAcceso(origen, vista)).toBe(esperado);
  });

  it('origen desconocido: devuelve el valor crudo', () => {
    expect(etiquetaOrigenAcceso('nuevo_origen', 'admin')).toBe('nuevo_origen');
  });

  it('el filtro ofrece los tres orígenes del contrato', () => {
    expect([...ORIGENES]).toEqual(['solicitud', 'admin_de_area', 'migracion']);
  });
});
