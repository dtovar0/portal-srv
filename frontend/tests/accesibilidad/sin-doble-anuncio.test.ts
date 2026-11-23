// @vitest-environment node
/**
 * DIS-089: un error de diálogo o formulario lo anuncia el toast (`role="alert"` en
 * `toast.tsx`). Un `<div className="sr-only" role="alert">` con el mismo mensaje lo duplica,
 * así que no puede volver a aparecer en `src/components`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ_SRC = resolve(import.meta.dirname, '../../src');

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(carpeta, e.name);
    if (e.isDirectory()) return archivos(ruta);
    return extname(e.name) === '.tsx' ? [ruta] : [];
  });
}

describe('sin doble anuncio de errores', () => {
  it('ningún componente usa sr-only con role="alert"', () => {
    const hallados = archivos(join(RAIZ_SRC, 'components')).filter((ruta) =>
      /className="sr-only"\s+role="alert"|role="alert"\s+className="sr-only"/.test(readFileSync(ruta, 'utf8')),
    );
    expect(hallados.map((r) => relative(RAIZ_SRC, r))).toEqual([]);
  });
});
