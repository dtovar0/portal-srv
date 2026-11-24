/** DIS-122: las URL de los íconos llevan versión para que el navegador no
 * se quede con un favicon viejo o vacío en su caché. */
import { describe, expect, it } from 'vitest';
import { metadata } from '@/app/layout';

describe('metadata.icons', () => {
  it('todas las URL de íconos llevan ?v=', () => {
    const iconos = metadata.icons as {
      icon: { url: string }[]; shortcut: string; apple: string;
    };
    const urls = [...iconos.icon.map((i) => i.url), iconos.shortcut, iconos.apple];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/\?v=\S+$/);
    expect(urls).toContain(urls.find((u) => u.startsWith('/favicon.ico?v=')));
  });
});
