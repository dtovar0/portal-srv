/**
 * DIS-113: el botón «Diseño de tarjetas» vive en la barra superior (solo en el dashboard) y el
 * diseño aplicado llega a las tarjetas al instante, sin recargar.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ruta = vi.hoisted(() => ({ actual: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => ruta.actual }));

import { BarraSuperior } from '@/components/marco/barra-superior';
import { TarjetasIndicadores } from '@/components/dashboard/tarjetas-indicadores';
import { useDisenoTarjetas } from '@/components/dashboard/use-diseno-tarjetas';
import { CLAVE_DISENO_TARJETAS, guardarDisenoTarjetas } from '@/components/dashboard/diseno-tarjetas';
import { crearRaiz, simularCajas } from '../utils/dom-simulado';

const barra = () => (
  <BarraSuperior menuMovil={null} colapsada={false} onAlternarMenu={() => {}} oscuro={false} onAlternarTema={() => {}} noLeidas={0} />
);

function TarjetasConHook() {
  const diseno = useDisenoTarjetas();
  return <TarjetasIndicadores contadores={[{ indicador: 'areas', valor: 12 }]} desglose={{ areas: { parte: 9, resto: 3 } }} diseno={diseno} />;
}

beforeEach(() => {
  simularCajas();
  crearRaiz();
  window.localStorage.clear();
  ruta.actual = '/';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DIS-113: botón en la barra superior', () => {
  it('en el dashboard aparece como botón de icono de 44 px con nombre accesible y tooltip', () => {
    render(barra());
    const boton = screen.getByRole('button', { name: 'Diseño de tarjetas' });
    expect(boton.className).toContain('min-h-11');
    expect(boton.getAttribute('title')).toBe('Diseño de tarjetas');
    expect(boton.getAttribute('data-tooltip')).toBe('Diseño de tarjetas');
  });

  it.each(['/platforms', '/users', '/notifications', '/admin/areas'])('no aparece en %s', (otra) => {
    ruta.actual = otra;
    render(barra());
    expect(screen.queryByRole('button', { name: 'Diseño de tarjetas' })).toBeNull();
  });

  it('abre el mismo modal y «Aplicar» guarda el diseño elegido', () => {
    render(barra());
    fireEvent.click(screen.getByRole('button', { name: 'Diseño de tarjetas' }));
    const dialogo = screen.getByRole('dialog', { name: 'Diseño de tarjetas' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Medidor' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Aplicar' }));
    expect(window.localStorage.getItem(CLAVE_DISENO_TARJETAS)).toBe('medidor');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('DIS-113: el diseño llega a las tarjetas sin recargar', () => {
  it('aplicar desde la barra cambia las tarjetas al instante', () => {
    render(
      <>
        {barra()}
        <TarjetasConHook />
      </>,
    );
    expect(screen.getByRole('group', { name: 'Áreas' }).getAttribute('data-diseno')).toBe('segmentos');
    fireEvent.click(screen.getByRole('button', { name: 'Diseño de tarjetas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Medidor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(screen.getByRole('group', { name: 'Áreas' }).getAttribute('data-diseno')).toBe('medidor');
  });

  it('lee la preferencia guardada al montar y reacciona a un cambio externo', () => {
    window.localStorage.setItem(CLAVE_DISENO_TARJETAS, 'brillo');
    render(<TarjetasConHook />);
    expect(screen.getByRole('group', { name: 'Áreas' }).getAttribute('data-diseno')).toBe('brillo');
    act(() => guardarDisenoTarjetas('segmentos'));
    expect(screen.getByRole('group', { name: 'Áreas' }).getAttribute('data-diseno')).toBe('segmentos');
  });

  it('si el almacenamiento falla, el diseño aplicado igual rige en la sesión', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    render(<TarjetasConHook />);
    act(() => guardarDisenoTarjetas('medidor'));
    expect(screen.getByRole('group', { name: 'Áreas' }).getAttribute('data-diseno')).toBe('medidor');
  });
});
