// @vitest-environment node
/**
 * DIS-096: contraste medido del motivo de un botón deshabilitado (tooltip, AA 4.5:1) y del
 * propio estado deshabilitado, en cada tema. El estado deshabilitado está exento de WCAG 1.4.3
 * (componente inactivo): se mide y se deja registrado, con un piso de 2:1 para que no desaparezca.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cargarContextos, resolver, type NombreContexto } from '../utils/tokens-css';
import { MIN_TEXTO, parseColor, razonContraste } from '../utils/wcag';

const contextos = cargarContextos();
const nombres = Object.keys(contextos) as NombreContexto[];
const razon = (v: Record<string, string>, a: string, b: string) =>
  razonContraste(parseColor(resolver(v, a)), parseColor(resolver(v, b)));

describe('motivo de botón deshabilitado: contraste por tema (DIS-096)', () => {
  for (const nombre of nombres) {
    const variables = contextos[nombre];
    it(`${nombre}: el texto del motivo cumple AA sobre el fondo del tooltip`, () => {
      expect(razon(variables, '--color-tooltip-texto', '--color-tooltip-fondo')).toBeGreaterThanOrEqual(MIN_TEXTO);
    });
    it(`${nombre}: el texto deshabilitado se distingue de su fondo (piso 2:1, exento de AA)`, () => {
      expect(razon(variables, '--deshabilitado-texto', '--deshabilitado-fondo')).toBeGreaterThanOrEqual(2);
    });
  }
});

describe('CSS del motivo (DIS-096)', () => {
  const css = readFileSync(resolve(import.meta.dirname, '../../src/styles/components.css'), 'utf8');
  const bloque = css.slice(css.indexOf('.nexus-motivo-boton {'));
  it('usa solo tokens para color y fondo', () => {
    const regla = bloque.slice(0, bloque.indexOf('}'));
    expect(regla).toContain('var(--color-tooltip-fondo)');
    expect(regla).toContain('var(--color-tooltip-texto)');
    expect(regla).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(\s*\d/i);
  });
  it('se muestra al foco visible y al puntero, y Esc lo descarta', () => {
    expect(css).toContain('.nexus-btn:focus-visible + .nexus-motivo-boton');
    expect(css).toContain(":not([data-motivo-descartado='true'])");
  });
  it('es hoverable: puente sobre el hueco y puntero permitido solo cuando está visible (WCAG 1.4.13)', () => {
    expect(css).toContain('.nexus-motivo-boton::before');
    expect(css).toMatch(/\.nexus-btn-con-motivo\[data-lado='inicio'\] \.nexus-motivo-boton/);
    const visible = css.slice(css.indexOf(":not([data-motivo-descartado='true']):hover .nexus-motivo-boton"));
    expect(visible.slice(0, visible.indexOf('}'))).toContain('pointer-events: auto');
  });
});
