// @vitest-environment node
/**
 * DIS-112: contraste medido de las tarjetas de indicador del dashboard, en ambos temas.
 * Replica `components.css`: texto legible = 35 % del color del indicador + 65 % del texto del
 * tema, sobre superficie, sobre el tinte del badge (13 %) y sobre los resplandores (<= 10 %).
 * Texto >= 4.5:1; icono blanco sobre su caja de color >= 3:1 (no textual).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cargarContextos, resolver, type NombreContexto } from '../utils/tokens-css';
import { MIN_NO_TEXTO, MIN_TEXTO, componer, parseColor, razonContraste, type Rgba } from '../utils/wcag';

const INDICADORES = ['areas', 'plataformas', 'solicitudes', 'visitas', 'usuarios', 'pendientes', 'aprobadas', 'rechazadas'];
/** DIS-131: tarjetas de Solicitudes; su icono toma color propio por tema (`-icono`). */
const CON_ICONO_PROPIO = ['pendientes', 'aprobadas', 'rechazadas'];
const contextos = cargarContextos();
const CSS = readFileSync(resolve(import.meta.dirname, '../../src/styles/components.css'), 'utf8');

const mezclar = (a: Rgba, b: Rgba, parteA: number): Rgba => ({
  r: a.r * parteA + b.r * (1 - parteA),
  g: a.g * parteA + b.g * (1 - parteA),
  b: a.b * parteA + b.b * (1 - parteA),
  a: 1,
});

for (const tema of Object.keys(contextos) as NombreContexto[]) {
  describe(`DIS-112: contraste de las tarjetas de indicador (${tema})`, () => {
    const v = contextos[tema];
    const tok = (n: string) => parseColor(resolver(v, n));
    const superficie = tok('--color-superficie');
    const texto = tok('--color-texto');
    const tenue = tok('--color-texto-tenue');
    const etiqueta = tok('--color-texto-secundario');

    it('etiquetas tenues y secundarias sobre la superficie >= 4.5:1', () => {
      expect(razonContraste(tenue, superficie)).toBeGreaterThanOrEqual(MIN_TEXTO);
      expect(razonContraste(etiqueta, superficie)).toBeGreaterThanOrEqual(MIN_TEXTO);
    });

    it('el trazo del segundo segmento (texto-tenue, sin opacidad) contra panel-fill >= 3:1', () => {
      const panel = tok('--color-panel-fill');
      expect(razonContraste(tenue, panel)).toBeGreaterThanOrEqual(MIN_NO_TEXTO);
    });

    it('«Elegido» del selector (accion-texto) sobre el tinte de la opción >= 4.5:1', () => {
      const fondo = componer(tok('--color-accion-tenue'), tok('--color-superficie-hundida'));
      expect(razonContraste(tok('--color-accion-texto'), fondo)).toBeGreaterThanOrEqual(MIN_TEXTO);
    });

    it('components.css no vuelve a atenuar el trazo del resto con opacity', () => {
      const bloque = CSS.match(/\.nx-ind__resto\s*\{[^}]*\}/g)?.join('') ?? '';
      expect(bloque).not.toMatch(/opacity/);
    });

    for (const nombre of INDICADORES) {
      const color = tok(`--color-indicador-${nombre}`);
      const legible = mezclar(color, texto, 0.35);

      it(`${nombre}: texto legible sobre superficie, badge (13 %) y resplandor (10 %) >= 4.5:1`, () => {
        const badge = mezclar(color, superficie, 0.13);
        const brillo = mezclar(color, superficie, 0.1);
        for (const fondo of [superficie, badge, brillo]) {
          expect(razonContraste(legible, fondo)).toBeGreaterThanOrEqual(MIN_TEXTO);
        }
      });

      it(`${nombre}: el icono blanco sobre su caja de color >= 3:1`, () => {
        const blanco = CON_ICONO_PROPIO.includes(nombre)
          ? tok(`--color-indicador-${nombre}-icono`)
          : tok('--color-texto-sobre-accion');
        const oscuro = mezclar(color, tok('--color-texto-sobre-fondo-claro'), 0.72);
        expect(razonContraste(blanco, color)).toBeGreaterThanOrEqual(MIN_NO_TEXTO);
        expect(razonContraste(blanco, oscuro)).toBeGreaterThanOrEqual(MIN_NO_TEXTO);
      });

      it(`${nombre}: el trazo y su extremo -fin contra panel-fill >= 3:1`, () => {
        const panel = tok('--color-panel-fill');
        const fin = tok(`--color-indicador-${nombre}-fin`);
        expect(razonContraste(componer(color, panel), panel)).toBeGreaterThanOrEqual(MIN_NO_TEXTO);
        expect(razonContraste(componer(fin, panel), panel)).toBeGreaterThanOrEqual(MIN_NO_TEXTO);
      });
    }
  });
}
