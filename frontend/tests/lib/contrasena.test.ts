/** Política de la contraseña inicial en el cliente (FNC-139). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PasswordPolicy } from '@/lib/access/types';
import { generarSegunPolitica, mensajeDeIncumplimiento } from '@/lib/contrasena';

const POLITICA: PasswordPolicy = {
  min_length: 16, max_length: 128,
  required_classes: ['mayusculas', 'minusculas', 'digitos', 'simbolos'],
  symbols: '!#$%&()*+,-./:;<=>?@[]^_{}~',
};

afterEach(() => vi.restoreAllMocks());

describe('mensajeDeIncumplimiento', () => {
  it.each([
    ['', 'Es obligatoria.'],
    ['Abcdefghij-12345', null],
    ['Abcdefghi-12345', 'Entre 16 y 128 caracteres.'],
    ['abcdefghij-123456', 'Falta al menos una mayúscula.'],
    ['ABCDEFGHIJ-123456', 'Falta al menos una minúscula.'],
    ['Abcdefghijk-lmnop', 'Falta al menos un número.'],
    ['Abcdefghijk123456', 'Falta al menos un símbolo.'],
    ['Abcdefghij 123456-', 'Usa solo letras, números y los símbolos permitidos.'],
    ['Abcdefghij"123456-', 'Usa solo letras, números y los símbolos permitidos.'],
    ['Abcdefghijé123456-', 'Usa solo letras, números y los símbolos permitidos.'],
  ])('%j → %j', (valor, mensaje) => {
    expect(mensajeDeIncumplimiento(valor, POLITICA)).toBe(mensaje);
  });

  it('respeta las clases requeridas de la política', () => {
    const solo = { ...POLITICA, required_classes: ['minusculas', 'digitos'] as PasswordPolicy['required_classes'] };
    expect(mensajeDeIncumplimiento('abcdefghijklmn1234', solo)).toBeNull();
  });

  it('el mensaje nunca incluye la contraseña', () => {
    expect(mensajeDeIncumplimiento('CENTINELA-corto', POLITICA)).not.toContain('CENTINELA');
  });
});

describe('generarSegunPolitica', () => {
  it('cumple la política en 1 000 muestras', () => {
    for (let i = 0; i < 1000; i++) {
      expect(mensajeDeIncumplimiento(generarSegunPolitica(POLITICA), POLITICA)).toBeNull();
    }
  });

  it('usa crypto.getRandomValues y nunca Math.random', () => {
    const azar = vi.spyOn(Math, 'random');
    const cripto = vi.spyOn(globalThis.crypto, 'getRandomValues');
    generarSegunPolitica(POLITICA);
    expect(azar).not.toHaveBeenCalled();
    expect(cripto).toHaveBeenCalled();
  });

  it('se ajusta al rango y a los símbolos de la política', () => {
    const politica: PasswordPolicy = {
      min_length: 40, max_length: 40, required_classes: ['mayusculas', 'simbolos'], symbols: '!?',
    };
    for (let i = 0; i < 200; i++) {
      const valor = generarSegunPolitica(politica);
      expect(valor).toHaveLength(40);
      expect(mensajeDeIncumplimiento(valor, politica)).toBeNull();
      expect([...valor].some((c) => '!?'.includes(c))).toBe(true);
    }
  });

  it('lanza sin Web Crypto en lugar de usar Math.random', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => generarSegunPolitica(POLITICA)).toThrow();
    vi.unstubAllGlobals();
  });
});
