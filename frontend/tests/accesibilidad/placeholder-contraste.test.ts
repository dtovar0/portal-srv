// @vitest-environment node
/**
 * Regresión de DIS-082 (B1): el placeholder usa el token `text-placeholder` (AA medido en
 * `pares-contraste.ts`). Un `placeholder:text-*` con opacidad menor a 85 por ciento no llega a 4.5:1.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ_SRC = resolve(import.meta.dirname, '../../src');
const EXTENSIONES = new Set(['.ts', '.tsx']);
const PLACEHOLDER_TENUE = /placeholder:text-[a-z-]+\/(\d+)/g;

function archivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : EXTENSIONES.has(extname(e.name)) ? [join(dir, e.name)] : [],
  );
}

describe('placeholder con contraste AA', () => {
  it('ningún `placeholder:text-*/NN` baja de 85', () => {
    const usos = archivos(RAIZ_SRC).flatMap((ruta) => {
      const texto = readFileSync(ruta, 'utf8');
      return [...texto.matchAll(PLACEHOLDER_TENUE)]
        .filter((m) => Number(m[1]) < 85)
        .map((m) => `${relative(RAIZ_SRC, ruta)}: ${m[0]}`);
    });
    expect(usos).toEqual([]);
  });
});
