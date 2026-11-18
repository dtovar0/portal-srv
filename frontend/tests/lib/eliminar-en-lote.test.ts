import { describe, expect, it, vi } from 'vitest';
import { eliminarEnLote, mensajeLoteParcial } from '@/lib/eliminar-en-lote';

describe('eliminarEnLote', () => {
  it('elimina todos en orden cuando no hay errores', async () => {
    const eliminar = vi.fn().mockResolvedValue(undefined);
    const r = await eliminarEnLote([1, 2, 3], eliminar);
    expect(r).toEqual({ eliminados: [1, 2, 3], error: null });
    expect(eliminar.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
  });

  it('se detiene en el primer error y devuelve lo que sí se eliminó', async () => {
    const fallo = new Error('409');
    const eliminar = vi.fn(async (n: number) => {
      if (n === 2) throw fallo;
    });
    const r = await eliminarEnLote([1, 2, 3], eliminar);
    expect(r).toEqual({ eliminados: [1], error: fallo });
    expect(eliminar).toHaveBeenCalledTimes(2);
  });
});

describe('mensajeLoteParcial', () => {
  it('antepone cuántos se eliminaron cuando el lote quedó a medias', () => {
    expect(mensajeLoteParcial(2, 3, 'Falló.')).toBe('Se eliminaron 2 de 3. Falló.');
  });

  it('deja el mensaje igual si no se eliminó ninguno', () => {
    expect(mensajeLoteParcial(0, 3, 'Falló.')).toBe('Falló.');
  });
});
