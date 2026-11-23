// @vitest-environment node
/**
 * DIS-084: los CSS de `src/styles` (salvo `tokens.css`) no esconden colores en
 * data-URI (`%23rrggbb`) ni en respaldos de `var()` (`var(--x, 17 22 33)`), y
 * toda `var(--*)` usada en `src` está definida en algún lado (evita sombras o
 * colores que no existen, como `--sombra-xs` o `--s-sombra-1`).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ_SRC = resolve(import.meta.dirname, '../../src');
const EXTENSIONES = new Set(['.ts', '.tsx', '.css']);

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(carpeta, e.name);
    if (e.isDirectory()) return archivos(ruta);
    return EXTENSIONES.has(extname(e.name)) ? [ruta] : [];
  });
}

const sinComentarios = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

describe('CSS sin colores escondidos', () => {
  const css = ['components.css', 'global.css'].map((n) => ({
    n,
    texto: sinComentarios(readFileSync(join(RAIZ_SRC, 'styles', n), 'utf8')),
  }));

  it('sin colores en data-URI (%23rrggbb)', () => {
    const hallados = css.flatMap(({ n, texto }) => (texto.match(/%23[0-9a-fA-F]{3,8}\b/g) ?? []).map((m) => `${n}: ${m}`));
    expect(hallados).toEqual([]);
  });

  it('sin respaldos literales de color en var()', () => {
    const hallados = css.flatMap(({ n, texto }) =>
      (texto.match(/var\(--[\w-]+,\s*\d{1,3}\s+\d{1,3}\s+\d{1,3}\s*\)/g) ?? []).map((m) => `${n}: ${m}`),
    );
    expect(hallados).toEqual([]);
  });
});

/** Variables usadas sin definir: ninguna desde DIS-095. */
const DEUDA: string[] = []; // DIS-095: sin deuda; toda var(--*) usada está definida.

describe('variables CSS usadas están definidas', () => {
  const textos = archivos(RAIZ_SRC).map((r) => sinComentarios(readFileSync(r, 'utf8')));
  const definidas = new Set(textos.flatMap((t) => [...t.matchAll(/(--[\w-]+)['"]?\s*:/g)].map((m) => m[1])));
  const usadas = new Set(textos.flatMap((t) => [...t.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1])));

  it('ninguna var(--*) apunta a una variable inexistente', () => {
    expect([...usadas].filter((v) => !definidas.has(v)).sort()).toEqual([...DEUDA].sort());
  });
});

describe('clases de Tailwind inexistentes (DIS-095)', () => {
  it('no se usa shadow-inner-soft (no existe en tailwind.config.ts)', () => {
    const textos = archivos(RAIZ_SRC).map((r) => readFileSync(r, 'utf8'));
    expect(textos.some((t) => t.includes('shadow-inner-soft'))).toBe(false);
  });
});
