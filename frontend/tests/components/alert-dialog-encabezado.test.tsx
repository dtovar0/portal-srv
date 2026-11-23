/**
 * DIS-097 (auditoría de accesibilidad): el encabezado de AlertDialog compone el texto sobre su
 * relleno con tokens que cumplen AA. Aviso/pregunta: texto oscuro sobre ámbar (el blanco daba 2,15:1);
 * error: relleno `error-solid` (el `error` claro con blanco daba 3,76:1).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AlertDialog } from '@/components/alert-dialog';

afterEach(cleanup);

function encabezado(type: 'aviso' | 'pregunta' | 'error' | 'info', confirmVariant?: 'primary' | 'danger') {
  render(
    <AlertDialog title="Título" message="Mensaje" type={type} confirmVariant={confirmVariant} onClose={() => undefined} />,
  );
  const titulo = screen.getByRole('heading', { name: 'Título' });
  const cabecera = titulo.closest('div[class*="bg-gradient-to-r"]') as HTMLElement;
  const icono = cabecera.querySelector('span[aria-hidden="true"]') as HTMLElement;
  const cerrar = screen.getByRole('button', { name: 'Cerrar' });
  return { titulo, cabecera, icono, cerrar };
}

describe('AlertDialog: encabezado con contraste (DIS-097)', () => {
  for (const [type, variante] of [['pregunta', 'primary'], ['aviso', 'primary']] as const) {
    it(`type="${type}" con variante ${variante}: texto, icono y cerrar oscuros sobre el relleno de aviso`, () => {
      const { titulo, cabecera, icono, cerrar } = encabezado(type, variante);
      expect(cabecera.className).toContain('from-warning');
      expect(titulo.className).toContain('text-texto-sobre-aviso');
      expect(icono.className).toContain('text-texto-sobre-aviso');
      expect(cerrar.className).toContain('text-texto-sobre-aviso/80');
      for (const el of [titulo, icono, cerrar]) expect(el.className).not.toContain('text-texto-sobre-accion');
    });
  }

  it('encabezado de error: relleno error-solid, no el rojo claro', () => {
    const { titulo, cabecera, cerrar } = encabezado('error');
    expect(cabecera.className).toContain('error-solid');
    expect(cabecera.className).not.toMatch(/(from|via|to)-error(\/|\s|$)/);
    expect(titulo.className).toContain('text-texto-sobre-accion');
    expect(cerrar.className).toContain('text-texto-sobre-accion');
  });

  it('encabezado de peligro por variante (aviso destructivo): también error-solid', () => {
    const { cabecera } = encabezado('aviso');
    expect(cabecera.className).toContain('error-solid');
  });
});
