/**
 * DIS-131: pantalla Solicitudes (`/approvals`): resumen con tarjetas por estado, gráficas por
 * área y plataforma y dona por estado (`inbox/stats`, contrato solicitudes 1.3); «Abrir» de cada
 * tarjeta lleva a la tabla de su estado; Volver regresa al resumen.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/toast';
import type { AccessRequest, InboxStats } from '@/lib/access/types';
import { crearRaiz, simularCajas } from '../../utils/dom-simulado';

const url = { consulta: '' };
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(url.consulta),
  usePathname: () => '/approvals',
}));
vi.mock('@/lib/access/requests', () => ({
  requestsApi: { inbox: vi.fn(), inboxStats: vi.fn(), approve: vi.fn(), reject: vi.fn() },
}));
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: { areas: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    loading: false,
    error: null,
    session: {
      id: 2, role: 'admin_area', managed_areas: [{ id: 3, name: 'Finanzas' }],
      preferences: { refresh_interval: 60 },
      permissions: { is_admin: false, is_area_admin: true, can_manage_areas: false, can_manage_system: false },
    },
  }),
}));

import { requestsApi } from '@/lib/access/requests';
import { MOCK_REQUEST } from '@/lib/access/mocks';
import { ApprovalsView } from '@/components/access/approvals-view';
import { MAX_BARRAS } from '@/components/access/approvals-resumen';
import { ApiError } from '@/lib/api';

const STATS: InboxStats = {
  total: 12,
  by_status: { pendiente: 3, aprobada: 7, rechazada: 2 },
  by_area: [{ area_id: 3, area: 'Finanzas', count: 8 }, { area_id: 4, area: 'Ventas', count: 4 }],
  by_platform: [{ platform_id: 12, platform: 'Contabilidad', area: 'Finanzas', count: 5 }],
};
const BASE: AccessRequest = {
  ...MOCK_REQUEST, id: 41, status: 'pendiente', rejection_reason: null, decided_at: null, decided_by: null,
};

function render_() {
  return render(<ToastProvider><ApprovalsView /></ToastProvider>);
}

beforeEach(() => {
  // recharts (`ResponsiveContainer`) necesita ResizeObserver, que jsdom no trae.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  simularCajas();
  crearRaiz();
  window.localStorage.clear();
  vi.clearAllMocks();
  url.consulta = '';
  vi.mocked(requestsApi.inboxStats).mockResolvedValue(STATS);
  vi.mocked(requestsApi.inbox).mockResolvedValue({ items: [BASE], page: 1, per_page: 25, total: 1 });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DIS-131: resumen', () => {
  it('muestra una tarjeta por estado con su cifra y porcentaje', async () => {
    render_();
    const pend = await screen.findByRole('group', { name: 'Pendientes' });
    expect(within(pend).getAllByText('3').length).toBeGreaterThan(0);
    expect(within(pend).getByText('25 %')).toBeTruthy();
    const apro = screen.getByRole('group', { name: 'Aprobadas' });
    expect(within(apro).getAllByText('7').length).toBeGreaterThan(0);
    expect(within(apro).getByText('58 %')).toBeTruthy();
    const rech = screen.getByRole('group', { name: 'Rechazadas' });
    expect(within(rech).getAllByText('2').length).toBeGreaterThan(0);
    expect(within(rech).getByText('17 %')).toBeTruthy();
  });

  it('la dona lista los porcentajes por estado en texto', async () => {
    render_();
    const leyenda = await screen.findByRole('list', { name: 'Solicitudes por estado' });
    const items = within(leyenda).getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('Pendientes');
    expect(items[0]).toContain('25 %');
    expect(items[1]).toContain('58 %');
    expect(items[2]).toContain('17 %');
  });

  it('gráficas por área y plataforma con su tabla alternativa', async () => {
    render_();
    expect(await screen.findByRole('heading', { name: 'Solicitudes por área' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Solicitudes por plataforma' })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Solicitudes por área' })).toBeTruthy();
    expect(screen.getByText('Contabilidad')).toBeTruthy();
  });

  it('recorta las gráficas al máximo de barras', async () => {
    const muchas = Array.from({ length: MAX_BARRAS + 5 }, (_, i) => (
      { area_id: i + 1, area: `Área ${i + 1}`, count: 100 - i }));
    vi.mocked(requestsApi.inboxStats).mockResolvedValue({ ...STATS, by_area: muchas });
    render_();
    const tabla = await screen.findByRole('table', { name: 'Solicitudes por área' });
    expect(within(tabla).getAllByRole('row')).toHaveLength(MAX_BARRAS + 1);
  });

  it('sin solicitudes: estados vacíos y dona vacía', async () => {
    vi.mocked(requestsApi.inboxStats).mockResolvedValue({
      total: 0, by_status: { pendiente: 0, aprobada: 0, rechazada: 0 }, by_area: [], by_platform: [],
    });
    render_();
    expect(await screen.findByText('Sin solicitudes por área')).toBeTruthy();
    expect(screen.getByText('Sin solicitudes por plataforma')).toBeTruthy();
    expect(screen.getByText('Sin solicitudes')).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'Pendientes' })).getByText('0 %')).toBeTruthy();
  });

  it('error: mensaje y reintento', async () => {
    vi.mocked(requestsApi.inboxStats).mockRejectedValueOnce(new ApiError(500, 'Error'));
    render_();
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('group', { name: 'Pendientes' })).toBeTruthy();
  });

  it('la vista principal no incluye la tabla de la bandeja', async () => {
    render_();
    await screen.findByRole('group', { name: 'Pendientes' });
    expect(requestsApi.inbox).not.toHaveBeenCalled();
    expect(screen.queryByRole('listitem', { name: /Solicitud de Ana Ruiz/ })).toBeNull();
  });
});

describe('DIS-131: «Abrir» y las tablas por estado', () => {
  it.each([
    ['Abrir solicitudes pendientes', 'pendiente'],
    ['Abrir solicitudes aprobadas', 'aprobada'],
    ['Abrir solicitudes rechazadas', 'rechazada'],
  ])('%s enlaza a la sección de su estado', async (nombre, estado) => {
    render_();
    const enlace = await screen.findByRole('link', { name: nombre });
    expect(enlace.getAttribute('href')).toBe(`/approvals?status=${estado}`);
  });

  it('pendientes: tabla con Aprobar/Rechazar, sin selector de estado y con Volver', async () => {
    url.consulta = 'status=pendiente';
    render_();
    const fila = await screen.findByRole('listitem', { name: /Solicitud de Ana Ruiz/ });
    expect(requestsApi.inbox).toHaveBeenCalledWith({ status: 'pendiente', area_id: undefined, page: 1 });
    expect(within(fila).getByRole('button', { name: /Aprobar/ })).toBeTruthy();
    expect(within(fila).getByRole('button', { name: /Rechazar/ })).toBeTruthy();
    expect(screen.queryByLabelText('Filtrar la bandeja por estado')).toBeNull();
    expect(screen.getByLabelText('Filtrar la bandeja por área')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Volver' }).getAttribute('href')).toBe('/approvals');
    expect(requestsApi.inboxStats).not.toHaveBeenCalled();
  });

  it.each([['aprobada', 'Aprobada'], ['rechazada', 'Rechazada']])(
    '%s: solo ese estado y sin botones de acción',
    async (estado, etiqueta) => {
      url.consulta = `status=${estado}`;
      vi.mocked(requestsApi.inbox).mockResolvedValue({
        items: [{ ...BASE, status: estado as AccessRequest['status'], rejection_reason: estado === 'rechazada' ? 'Sin necesidad.' : null }],
        page: 1, per_page: 25, total: 1,
      });
      render_();
      const fila = await screen.findByRole('listitem', { name: /Solicitud de Ana Ruiz/ });
      await waitFor(() => expect(requestsApi.inbox).toHaveBeenCalledWith({ status: estado, area_id: undefined, page: 1 }));
      expect(within(fila).getByText(etiqueta)).toBeTruthy();
      expect(within(fila).queryByRole('button', { name: /Aprobar|Rechazar/ })).toBeNull();
      if (estado === 'rechazada') expect(within(fila).getByText(/Sin necesidad/)).toBeTruthy();
    },
  );

  it('un estado inválido en la URL muestra el resumen', async () => {
    url.consulta = 'status=otro';
    render_();
    expect(await screen.findByRole('group', { name: 'Pendientes' })).toBeTruthy();
  });
});
