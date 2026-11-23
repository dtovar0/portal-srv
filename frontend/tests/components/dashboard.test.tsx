/**
 * DIS-024: el Panel muestra el resumen por rol y, debajo, "Actividad del
 * portal" (`/stats`) con sus secciones como h3 bajo ese h2 (auditor-accesibilidad).
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const permisos = vi.hoisted(() => ({ is_admin: true, is_area_admin: false }));
const estado = vi.hoisted(() => ({ cargando: false, resumenFalla: false }));

vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: {
    stats: vi.fn().mockResolvedValue({
      areas: 1, platforms: 2, visits: 3,
      platforms_by_area: [{ area: 'TI', count: 2, color: '' }],
      most_visited: [{ id: 1, name: 'Wiki', visits: 3 }],
    }),
  },
}));
vi.mock('@/lib/access/home', () => ({
  homeApi: { summary: vi.fn(() => (estado.resumenFalla
    ? Promise.reject(new Error('falla'))
    : Promise.resolve({ scope: 'global', pending_approvals: 0, failed_access: 0, totals: { areas: 1, platforms: 2, active_access: 0 } }))) },
}));
vi.mock('@/lib/access/requests', () => ({
  requestsApi: { inbox: vi.fn(() => Promise.resolve({ items: [], page: 1, per_page: 5, total: 0 })) },
}));
vi.mock('@/lib/access/audit', () => ({
  auditApi: { list: vi.fn(() => Promise.resolve({ items: [], page: 1, per_page: 5, total: 0 })) },
}));
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    loading: estado.cargando, error: null,
    session: { preferences: { refresh_interval: 60 }, permissions: permisos },
  }),
}));

import { Dashboard, resetearAnimacionGraficas } from '@/components/dashboard';
import { api } from '@/lib/api';
import { CLAVE_DISENO_TARJETAS, guardarDisenoTarjetas } from '@/components/dashboard/diseno-tarjetas';

// recharts (`ResponsiveContainer`) necesita ResizeObserver, que jsdom no trae.
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  permisos.is_admin = true;
  permisos.is_area_admin = false;
  estado.cargando = false;
  estado.resumenFalla = false;
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetearAnimacionGraficas();
});

/** Tarjetas de contador (grupos con el nombre del indicador), sin el encabezado de la tabla alternativa. */
const contadores = (etiqueta: string) =>
  screen.queryAllByRole('group', { name: etiqueta });

describe('Dashboard', () => {
  it('DIS-079: el admin ve la distribución responsiva con actividad reciente', async () => {
    render(<Dashboard />);
    expect(screen.queryByRole('button', { name: /Exportar/ })).toBeNull();
    expect(await screen.findByRole('heading', { level: 2, name: 'Actividad reciente' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Plataformas por área' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Más visitadas' })).toBeTruthy();
  });

  it('DIS-079: quien no administra no ve esas secciones', async () => {
    permisos.is_admin = false;
    render(<Dashboard />);
    await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
    expect(screen.queryByRole('link', { name: 'Revisar aprobaciones' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Solicitudes pendientes' })).toBeNull();
  });

  it('secciones de /stats como h3 bajo el h2 "Actividad del portal"', async () => {
    render(<Dashboard />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Plataformas por área' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Más visitadas' })).toBeTruthy();
  });

  it('la gráfica tiene una tabla alternativa con los mismos datos (DIS-003)', async () => {
    render(<Dashboard />);
    const tabla = await screen.findByRole('table', { name: 'Plataformas por área' });
    expect(tabla.textContent).toContain('TI');
    expect(tabla.textContent).toContain('2');
  });

  it('el admin no ve Áreas y Plataformas repetidos; sí Visitas (DIS-037)', async () => {
    render(<Dashboard />);
    await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
    // Una sola vez: la del resumen por rol.
    expect(await screen.findAllByText('Áreas')).toHaveLength(1);
    expect(contadores('Plataformas')).toHaveLength(1);
    expect(screen.getByText('Visitas')).toBeTruthy();
  });

  it('quien no tiene resumen de totales conserva Áreas y Plataformas (DIS-037)', async () => {
    permisos.is_admin = false;
    render(<Dashboard />);
    await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
    expect(contadores('Áreas')).toHaveLength(1);
    expect(contadores('Plataformas')).toHaveLength(1);
  });

  it('no muestra Áreas ni Plataformas mientras carga la sesión (DIS-037)', async () => {
    permisos.is_admin = false;
    estado.cargando = true;
    render(<Dashboard />);
    await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
    expect(contadores('Áreas')).toHaveLength(0);
    expect(contadores('Plataformas')).toHaveLength(0);
  });

  it('si el resumen falla, el admin recupera Áreas y Plataformas de /stats (DIS-037)', async () => {
    estado.resumenFalla = true;
    render(<Dashboard />);
    await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
    await waitFor(() => expect(contadores('Áreas')).toHaveLength(1));
    expect(contadores('Plataformas')).toHaveLength(1);
  });

  it('muestra la card Solicitudes entre Plataformas y Visitas con grid 60/40', async () => {
    const { container } = render(<Dashboard />);
    await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
    expect(screen.getByText('Solicitudes')).toBeTruthy();

    // Verificamos que las 5 cards están presentes
    expect(screen.getByText('Áreas')).toBeTruthy();
    expect(contadores('Plataformas')).toHaveLength(1);
    expect(screen.getByText('Solicitudes')).toBeTruthy();
    expect(screen.getByText('Visitas')).toBeTruthy();

    // Verificamos la distribución 60/40 de la segunda fila (3 cols / 2 cols en grid de 5)
    const fila2Cols = container.querySelector('.lg\\:grid-cols-5');
    expect(fila2Cols).toBeTruthy();
    expect(container.querySelector('.lg\\:col-span-3')).toBeTruthy();
    expect(container.querySelector('.lg\\:col-span-2')).toBeTruthy();
  });

  describe('DIS-112: tarjetas con anillo y selector de diseño', () => {
    const conDesglose = () => vi.mocked(api.stats).mockResolvedValueOnce({
      areas: 4, platforms: 10, visits: 100, users: 8, requests: 6,
      desglose: {
        areas: { parte: 3, resto: 1 }, platforms: { parte: 5, resto: 5 }, requests: { parte: 3, resto: 3 },
        visits: { parte: 80, resto: 20 }, users: { parte: 6, resto: 2 },
      },
      platforms_by_area: [], most_visited: [],
    });

    it('por omisión usa «Dos segmentos» con el desglose del backend en las 5 tarjetas', async () => {
      permisos.is_admin = false;
      conDesglose();
      const { container } = render(<Dashboard />);
      await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
      const tarjetas = container.querySelectorAll('.nx-ind');
      expect(tarjetas).toHaveLength(5);
      tarjetas.forEach((t) => expect(t.getAttribute('data-diseno')).toBe('segmentos'));
      expect(within(screen.getByRole('group', { name: 'Visitas' })).getByText('80 %')).toBeTruthy();
    });

    it('el encabezado del dashboard ya no trae el botón «Diseño de tarjetas» (vive en la barra superior)', async () => {
      permisos.is_admin = false;
      render(<Dashboard />);
      await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
      expect(screen.queryByRole('button', { name: 'Diseño de tarjetas' })).toBeNull();
    });

    it('las tarjetas toman el diseño guardado y cambian al instante cuando se aplica otro', async () => {
      permisos.is_admin = false;
      window.localStorage.setItem(CLAVE_DISENO_TARJETAS, 'medidor');
      conDesglose();
      const { container } = render(<Dashboard />);
      await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
      container.querySelectorAll('.nx-ind').forEach((t) => expect(t.getAttribute('data-diseno')).toBe('medidor'));
      act(() => guardarDisenoTarjetas('brillo'));
      container.querySelectorAll('.nx-ind').forEach((t) => expect(t.getAttribute('data-diseno')).toBe('brillo'));
    });

    it('sin desglose (backend anterior) cada tarjeta conserva su diseño con el anillo vacío', async () => {
      permisos.is_admin = false;
      const { container } = render(<Dashboard />);
      await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
      container.querySelectorAll('.nx-ind').forEach((t) => expect(t.getAttribute('data-diseno')).toBe('segmentos'));
      expect(container.querySelectorAll('.nx-ind__aro--vacio').length).toBeGreaterThan(0);
    });

    it('al regresar al dashboard en la misma sesión desactiva la re-animación de gráficas', async () => {
      permisos.is_admin = false;
      // Primera visita: se anima y se marca como animado
      const { unmount } = render(<Dashboard />);
      await screen.findByRole('heading', { level: 2, name: 'Actividad del portal' });
      unmount();

      // Segunda visita (usuario navega a otra sección y regresa):
      const { container } = render(<Dashboard />);
      const seccion = await screen.findByRole('region', { name: 'Actividad del portal' });
      expect(seccion.className).toContain('nx-sin-animacion-graficas');
    });
  });
});
