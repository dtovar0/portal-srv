/** DIS-123: pantalla de acceso denegado (misma tarjeta que el login). */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccesoDenegadoView } from '@/components/acceso-denegado-view';

const CORREO = 'soporte@pruebas.local';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); cleanup(); });

describe('AccesoDenegadoView', () => {
  it('ofrece escribir a soporte con el correo y su mailto', () => {
    render(<AccesoDenegadoView supportEmail={CORREO} />);
    const enlace = screen.getByRole('link', { name: /Escribir a soporte/ });
    expect(enlace.getAttribute('href')).toMatch(new RegExp(`^mailto:${CORREO}`));
    expect(screen.getByText(CORREO)).toBeTruthy();
  });

  it('los dos botones del reintento tienen el mismo ancho y estilo', () => {
    render(<AccesoDenegadoView supportEmail={CORREO} />);
    const reintentar = screen.getByRole('button', { name: 'Reintentar' });
    const pausar = screen.getByRole('button', { name: 'Pausar' });
    expect(reintentar.className).toBe(pausar.className);
    expect(reintentar.className).toContain('w-full');
    expect(reintentar.parentElement?.className).toContain('grid-cols-2');
  });

  it('pausar detiene la cuenta y cambia a Reanudar', () => {
    render(<AccesoDenegadoView supportEmail={CORREO} />);
    expect(screen.getByText(/Volveremos a intentarlo en 15 s/)).toBeTruthy();
    for (let i = 0; i < 2; i += 1) act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/en 13 s/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    for (let i = 0; i < 5; i += 1) act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByText(/en 8 s/)).toBeNull();
    expect(screen.getByText(/en pausa/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeTruthy();
  });

  it('enlaza de vuelta al inicio de sesión', () => {
    render(<AccesoDenegadoView supportEmail={CORREO} />);
    expect(screen.getByRole('link', { name: /Volver al inicio de sesión/ }).getAttribute('href')).toBe('/login');
  });
});
