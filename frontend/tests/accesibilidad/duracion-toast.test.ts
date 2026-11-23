/** La barra del toast (CSS) dura lo mismo que su cierre (`TOAST_MS`) (DIS-093). */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOAST_MS } from '@/components/toast';

describe('duración del toast', () => {
  it('--toast-duracion de tokens.css coincide con TOAST_MS', () => {
    const tokens = readFileSync(resolve(__dirname, '../../src/styles/tokens.css'), 'utf8');
    const valor = tokens.match(/--toast-duracion:\s*([\d.]+)s;/);
    expect(valor).not.toBeNull();
    expect(Number(valor![1]) * 1000).toBe(TOAST_MS);
  });
});
