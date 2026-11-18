import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generarContrasenaSegura,
  LONGITUD_MINIMA_GENERADOR,
} from '@/lib/generador-contrasena';

describe('generadorContrasenaSegura', () => {
  it('genera una contraseña con longitud por omisión de al menos 16 caracteres', () => {
    const pass = generarContrasenaSegura();
    expect(pass.length).toBeGreaterThanOrEqual(16);
    expect(pass.length).toBe(LONGITUD_MINIMA_GENERADOR);
  });

  it('fuerza un mínimo de 16 caracteres si se solicita una longitud inferior', () => {
    const pass = generarContrasenaSegura(8);
    expect(pass.length).toBe(16);
  });

  it('permite longitudes mayores a 16 caracteres', () => {
    const pass = generarContrasenaSegura(24);
    expect(pass.length).toBe(24);
  });

  it('contiene caracteres alfanuméricos y símbolos requeridos (mayúsculas, minúsculas, números y símbolos)', () => {
    for (let i = 0; i < 50; i++) {
      const pass = generarContrasenaSegura();
      expect(pass.length).toBeGreaterThanOrEqual(16);
      expect(/[A-Z]/.test(pass)).toBe(true);
      expect(/[a-z]/.test(pass)).toBe(true);
      expect(/[0-9]/.test(pass)).toBe(true);
      expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pass)).toBe(true);
    }
  });

  describe('sin Web Crypto', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('lanza un error y nunca recurre a Math.random', () => {
      vi.stubGlobal('crypto', undefined);
      const aleatorio = vi.spyOn(Math, 'random');
      expect(() => generarContrasenaSegura()).toThrow('El navegador no permite generar contraseñas seguras.');
      expect(aleatorio).not.toHaveBeenCalled();
      aleatorio.mockRestore();
    });
  });

  it('descarta los valores que sesgarían el módulo (muestreo por rechazo)', () => {
    const valores = [0xffffffff, 5];
    const original = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: (buffer: Uint32Array) => {
        buffer[0] = valores.length > 0 ? valores.shift()! : 7;
        return buffer;
      },
    });
    try {
      // 0xffffffff está en el tramo final para cualquier conjunto (>= límite): se descarta.
      const pass = generarContrasenaSegura();
      expect(pass).toHaveLength(LONGITUD_MINIMA_GENERADOR);
      expect(valores).toHaveLength(0);
    } finally {
      vi.stubGlobal('crypto', original);
      vi.unstubAllGlobals();
    }
  });
});
