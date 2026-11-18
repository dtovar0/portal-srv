// @vitest-environment node
/**
 * DIS-083 (WCAG 1.4.11): el borde de un control (campo, select, buscador, ítem de
 * picklist) se mide a 3:1 en `pares-contraste.ts` solo si es `border-panel-border`
 * sin alfa. Un `/NN` lo baja del umbral, así que aquí se prohíbe en los controles.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ_SRC = resolve(import.meta.dirname, '../../src');

/** Una línea es de control si trae alguna de estas marcas (buscador, select, campo, picklist). */
const MARCAS_DE_CONTROL = [
  'nx-buscador-toolbar',
  'h-12 !w-auto',
  'placeholder:text-placeholder',
  'nexus-select-premium',
  'flex-1 min-h-48',
  'read-only:border-panel-border',
  'min-h-12 flex items-center justify-between gap-2 px-3',
  'min-h-12 min-w-12 flex items-center justify-between gap-2 px-3',
  'min-h-12 px-5 border border-panel-border',
  'min-h-12 inline-flex items-center gap-1 px-3 py-1.5',
];
const BORDE_CON_ALFA = /border-panel-border\/\d+/;

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(carpeta, e.name);
    if (e.isDirectory()) return archivos(ruta);
    return extname(e.name) === '.tsx' ? [ruta] : [];
  });
}

describe('bordes de control a 3:1', () => {
  it('ningún control usa border-panel-border con alfa', () => {
    const hallados = archivos(join(RAIZ_SRC, 'components')).flatMap((ruta) =>
      readFileSync(ruta, 'utf8')
        .split('\n')
        .flatMap((linea, i) =>
          BORDE_CON_ALFA.test(linea) && MARCAS_DE_CONTROL.some((m) => linea.includes(m))
            ? [`${relative(RAIZ_SRC, ruta)}:${i + 1}`]
            : [],
        ),
    );
    expect(hallados).toEqual([]);
  });

  it('el select premium cerrado usa el borde sin alfa', () => {
    const fuente = readFileSync(join(RAIZ_SRC, 'components/select-premium.tsx'), 'utf8');
    expect(fuente).not.toMatch(/border-panel-border\/\d+/);
  });

  it('los CSS del select y del buscador no atenúan el borde', () => {
    const css = readFileSync(join(RAIZ_SRC, 'styles/components.css'), 'utf8');
    const bloques = css.match(/(?:\.nx-buscador-toolbar|\.nx-select-premium,\s*\.nexus-select)\s*\{[^}]*\}/g) ?? [];
    expect(bloques.length).toBeGreaterThan(0);
    for (const b of bloques) expect(b).not.toMatch(/border:[^;]*panel-border\)\s*\/\s*0?\.\d+/);
  });
});
