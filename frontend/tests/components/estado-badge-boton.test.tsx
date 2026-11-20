/**
 * DIS-114: el badge de estado de áreas y plataformas es un botón que conmuta el estado
 * (activa → confirma y desactiva; inactiva → activa directo), sin abrir la tarjeta ni la fila.
 */
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EstadoBadgeBoton } from '@/components/estado-badge-boton';
import { TarjetaArea } from '@/components/areas/tarjeta-area';
import { ToastProvider } from '@/components/toast';
import { ApiError } from '@/lib/api';
import type { Area } from '@/lib/types';
import { cargarContextos, resolver } from '../utils/tokens-css';
import { MIN_TEXTO, parseColor, razonContraste, type Rgba } from '../utils/wcag';

function render(ui: React.ReactElement) {
  return rtlRender(<ToastProvider>{ui}</ToastProvider>);
}

afterEach(() => cleanup());

const AREA = {
  id: 3, name: 'Finanzas', description: 'x', icon: 'areas', color: '', status: 'Activo',
  platforms_count: 0, users_count: 0,
} as Area;

function montar(over: Partial<React.ComponentProps<typeof EstadoBadgeBoton>> = {}) {
  const actualizar = vi.fn().mockResolvedValue({});
  const onCambiado = vi.fn();
  render(
    <EstadoBadgeBoton tipo="area" nombre="Finanzas" activo editable actualizar={actualizar} onCambiado={onCambiado} {...over} />,
  );
  return { actualizar, onCambiado };
}

describe('EstadoBadgeBoton', () => {
  it('activa: pulsar pide confirmación y al confirmar guarda Inactivo', async () => {
    const { actualizar, onCambiado } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar área Finanzas' }));
    expect(actualizar).not.toHaveBeenCalled();
    const dialogo = within(screen.getByRole('alertdialog'));
    expect(dialogo.getByText(/¿Desactivar el área «Finanzas»\?/)).toBeTruthy();
    expect(dialogo.getByText(/plataformas quedarán inactivas/)).toBeTruthy();
    expect(dialogo.getByText(/grupos LDAP se moverán a inactivos/)).toBeTruthy();
    fireEvent.click(dialogo.getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith('Inactivo'));
    await waitFor(() => expect(onCambiado).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Área desactivada')).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('inactiva: pulsar activa directo, sin confirmar', async () => {
    const { actualizar, onCambiado } = montar({ activo: false });
    fireEvent.click(screen.getByRole('button', { name: 'Activar área Finanzas' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith('Activo'));
    await waitFor(() => expect(onCambiado).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Área activada')).toBeTruthy();
  });

  it('cancelar no hace nada', () => {
    const { actualizar, onCambiado } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar área Finanzas' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(actualizar).not.toHaveBeenCalled();
    expect(onCambiado).not.toHaveBeenCalled();
  });

  it('sin permiso es un badge normal, no un botón', () => {
    montar({ editable: false });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Activa')).toBeTruthy();
  });

  it('error 409 (grupos_en_inactivos): avisa con el mensaje del servidor y no cambia nada', async () => {
    const actualizar = vi.fn().mockRejectedValue(
      new ApiError(409, 'Reactiva la plataforma antes de cambiarla.', { code: 'grupos_en_inactivos' }),
    );
    const { onCambiado } = montar({ actualizar });
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar área Finanzas' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }));
    expect(await screen.findByText('Reactiva la plataforma antes de cambiarla.')).toBeTruthy();
    expect(onCambiado).not.toHaveBeenCalled();
    expect(screen.getByText('Activa')).toBeTruthy();
  });

  it('plataforma: nombre accesible y mensaje propios', async () => {
    const { actualizar } = montar({ tipo: 'plataforma', nombre: 'Contabilidad' });
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar plataforma Contabilidad' }));
    expect(within(screen.getByRole('alertdialog')).getByText(/¿Desactivar la plataforma «Contabilidad»\?/)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith('Inactivo'));
  });
});

describe('TarjetaArea con badge de estado', () => {
  function tarjeta(over: Partial<React.ComponentProps<typeof TarjetaArea>> = {}) {
    const onSelect = vi.fn();
    const actualizarEstado = vi.fn().mockResolvedValue({});
    render(
      <TarjetaArea area={AREA} conteo={0} plataformas={[]} onSelect={onSelect} puedeEditar actualizarEstado={actualizarEstado} {...over} />,
    );
    return { onSelect, actualizarEstado };
  }

  it('el clic en el badge, en el diálogo y al confirmar no abre la tarjeta; el resto de la tarjeta sí', async () => {
    const { onSelect, actualizarEstado } = tarjeta();
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar área Finanzas' }));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(actualizarEstado).toHaveBeenCalledWith('Inactivo'));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Finanzas'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('el badge-botón no queda dentro de otro control interactivo', () => {
    tarjeta();
    const boton = screen.getByRole('button', { name: 'Desactivar área Finanzas' });
    expect(boton.parentElement?.closest('button, a, [role="button"]')).toBeNull();
  });

  it('activa muestra «Activa» y inactiva «Inactiva», ambas como botón', () => {
    tarjeta({ area: { ...AREA, status: 'Inactivo' } });
    expect(screen.getByRole('button', { name: 'Activar área Finanzas' }).textContent).toBe('Inactiva');
    cleanup();
    tarjeta();
    expect(screen.getByRole('button', { name: 'Desactivar área Finanzas' }).textContent).toBe('Activa');
  });

  it('sin permiso es un badge normal, no un botón', () => {
    tarjeta({ puedeEditar: false });
    expect(screen.queryByRole('button', { name: /(Activar|Desactivar) área/ })).toBeNull();
    expect(screen.getByText('Activa')).toBeTruthy();
  });
});

describe('Badge de estado: CSS y contraste (AA en ambos temas)', () => {
  const CSS = readFileSync('src/styles/components.css', 'utf8');

  it('área clicable de 44 px mínimo sin cambiar el aspecto', () => {
    expect(CSS).toMatch(/\.nx-estado-boton::after\s*\{[^}]*width: max\(100%, 2\.75rem\)[^}]*height: max\(100%, 2\.75rem\)/);
  });

  const contextos = cargarContextos();
  for (const [tema, nombre] of [['claro', 'claro'], ['oscuro', 'html.dark']] as const) {
    it(`tema ${tema}: «Activa» (success) e «Inactiva» (warning) >= 4,5:1, también con el brillo del hover`, () => {
      const v = contextos[nombre];
      const color = (token: string): Rgba => parseColor(resolver(v, token));
      const oscurecer = (c: Rgba, f: number): Rgba => ({ ...c, r: c.r * f, g: c.g * f, b: c.b * f });
      for (const tono of ['success', 'warning']) {
        const texto = color(`--badge-${tono}-text`);
        const fondo = color(`--badge-${tono}-bg`);
        const normal = razonContraste(texto, fondo);
        const hover = razonContraste(oscurecer(texto, 0.95), oscurecer(fondo, 0.95));
        expect(normal, `${tono} en ${tema}`).toBeGreaterThanOrEqual(MIN_TEXTO);
        expect(hover, `${tono} hover en ${tema}`).toBeGreaterThanOrEqual(MIN_TEXTO);
      }
    });
  }
});
