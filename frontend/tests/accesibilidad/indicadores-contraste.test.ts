// @vitest-environment node
/**
 * DIS-112: contraste medido de las tarjetas de indicador del dashboard, en ambos temas.
 * Replica `components.css`: texto legible = 35 % del color del indicador + 65 % del texto del
 * tema, sobre superficie, sobre el tinte del badge (13 %) y sobre los resplandores (<= 10 %).
 * Texto >= 4.5:1; icono blanco sobre su caja de color >= 3:1 (no textual).
 */
import { describe, expect, it } from 'vitest';
import { cargarContextos, resolver, type NombreContexto } from '../utils/tokens-css';
import { MIN_NO_TEXTO, MIN_TEXTO, componer, parseColor, razonContraste, type Rgba } from '../utils/wcag';

const INDICADORES = ['areas', 'plataformas', 'solicitudes', 'visitas', 'usuarios'];
const contextos = cargarContextos();

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
        const blanco = tok('--color-texto-sobre-accion');
        const oscuro = mezclar(color, tok('--color-texto-sobre-fondo-claro'), 0.72);
        expect(razonContraste(blanco, color)).toBeGreaterThanOrEqual(MIN_NO_TEXTO);
        expect(razonContraste(blanco, oscuro)).toBeGreaterThanOrEqual(MIN_NO_TEXTO);
      });

      it(`${nombre}: el trazo sobre la superficie >= 3:1`, () => {
        expect(razonContraste(componer(color, superficie), superficie)).toBeGreaterThanOrEqual(MIN_NO_TEXTO);
      });
    }
  });
}
