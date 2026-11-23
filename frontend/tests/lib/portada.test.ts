import { afterEach, describe, expect, it, vi } from 'vitest';
import { esPortadaActiva } from '@/lib/portada';

describe('esPortadaActiva (DIS-118)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('devuelve true por defecto si la variable no está definida', () => {
    delete process.env.NEXT_PUBLIC_PORTADA_ACTIVA;
    delete process.env.PORTADA_ACTIVA;
    delete process.env.ENABLE_PORTADA;
    expect(esPortadaActiva()).toBe(true);
  });

  it('devuelve false cuando PORTADA_ACTIVA es false, 0, no u off', () => {
    for (const valor of ['false', '0', 'no', 'off', 'FALSE', 'No']) {
      vi.stubEnv('PORTADA_ACTIVA', valor);
      delete process.env.NEXT_PUBLIC_PORTADA_ACTIVA;
      expect(esPortadaActiva()).toBe(false);
    }
  });

  it('devuelve false cuando NEXT_PUBLIC_PORTADA_ACTIVA es false', () => {
    vi.stubEnv('NEXT_PUBLIC_PORTADA_ACTIVA', 'false');
    expect(esPortadaActiva()).toBe(false);
  });

  it('devuelve true cuando está configurada explícitamente en true o activa', () => {
    for (const valor of ['true', '1', 'si', 'activa', 'TRUE', 'Si']) {
      vi.stubEnv('PORTADA_ACTIVA', valor);
      delete process.env.NEXT_PUBLIC_PORTADA_ACTIVA;
      expect(esPortadaActiva()).toBe(true);
    }
  });
});

