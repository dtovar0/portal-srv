/**
 * DIS-079: contenido del Panel y componentes comunes con icono.
 * - Indicadores con icono decorativo, color de estado y datos reales (sin inventar cifras).
 * - Solicitudes pendientes: avatar, plataforma, insignia con icono y texto, acciones de solo icono
 *   con nombre accesible contextual; estados de carga, vacío y error.
 * - Actividad reciente: eventos reales; vacío y error.
 * - Insignias de estado con icono y texto; avatar de iniciales.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessRequest, AuditEntryV1, HomeSummary } from '@/lib/access/types';

vi.mock('@/lib/access/home', () => ({ homeApi: { summary: vi.fn() } }));
vi.mock('@/lib/access/requests', () => ({ requestsApi: { inbox: vi.fn(), approve: vi.fn(), reject: vi.fn() } }));
vi.mock('@/lib/access/audit', () => ({ auditApi: { list: vi.fn() } }));
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    loading: false, error: null,
    session: { id: 1, preferences: { refresh_interval: 60 }, permissions: { is_admin: true, is_area_admin: false } },
  }),
}));

import { auditApi } from '@/lib/access/audit';
import { homeApi } from '@/lib/access/home';
import { requestsApi } from '@/lib/access/requests';
import { Avatar, iniciales } from '@/components/avatar';
import { RoleSummary } from '@/components/home/role-summary';
import { ActividadReciente, vistaEvento } from '@/components/home/actividad-reciente';
import { SolicitudesPendientes } from '@/components/home/solicitudes-pendientes';
import { AccessStatusBadge } from '@/components/access/access-status-badge';
import { RequestStatusBadge } from '@/components/access/request-status-badge';
import { Badge, StatTile } from '@/components/ui';
import { DataTable, ResponsiveList } from '@/components/data-table';

const SOLICITUD: AccessRequest = {
  id: 7, status: 'pendiente', level: 'usuario', justification: null,
  requester: { id: 8, name: 'usuario1', email: 'usuario1@ejemplo.local' },
  platform: { id: 2, name: 'Demo Wiki' }, area: { id: 3, name: 'Demo' },
  current_level: null, created_at: '2026-10-28T10:00:00Z', decided_at: null,
  decided_by: null, rejection_reason: null, access: null,
};
const EVENTO: AuditEntryV1 = {
  id: 1, time: '2026-10-28T10:00:00Z', user: 'luis@ejemplo.local', action: 'solicitud_rechazada',
  module: 'solicitudes', target: null, detail: null, ip: null, status: 'error',
  actor: { id: 2, email: 'luis@ejemplo.local' }, area: null, platform: null, target_user: null,
  before: null, after: null,
};
const pagina = <T,>(items: T[]) => ({ items, page: 1, per_page: 5, total: items.length });

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('Indicadores del Panel', () => {
  const ADMIN: HomeSummary = {
    scope: 'global', pending_approvals: 3, failed_access: 2, oldest_pending_at: '2026-10-27T09:00:00Z',
    totals: { areas: 1, platforms: 2, active_access: 4 },
  };

  it('muestran los números reales con su icono decorativo y la nota de la más antigua', async () => {
    vi.mocked(homeApi.summary).mockResolvedValue(ADMIN);
    const { container } = render(<RoleSummary />);
    const porAprobar = await screen.findByRole('link', { name: /Por aprobar: 3/ });
    expect(porAprobar.textContent).toContain('La más antigua:');
    // H1: la nota forma parte del nombre accesible.
    expect(porAprobar.getAttribute('aria-label')).toMatch(/Por aprobar: 3\. La más antigua: .+\. Ir a Solicitudes/);
    expect(porAprobar.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Accesos con falla: 2/ }).textContent).toContain('Requieren atención');
    expect(screen.getByRole('link', { name: /Accesos activos: 4/ })).toBeTruthy();
    expect(container.querySelectorAll('.nx-tono-warning, .nx-tono-error, .nx-tono-success, .nx-tono-activo').length).toBeGreaterThanOrEqual(5);
  });

  it('sin pendientes ni fallas no inventa notas', async () => {
    vi.mocked(homeApi.summary).mockResolvedValue({ ...ADMIN, pending_approvals: 0, failed_access: 0 });
    render(<RoleSummary />);
    const enlace = await screen.findByRole('link', { name: /Por aprobar: 0/ });
    expect(enlace.textContent).not.toContain('La más antigua');
    expect(screen.getByRole('link', { name: /Accesos con falla: 0/ }).textContent).not.toContain('Requieren');
  });

  it('carga, vacío y error', async () => {
    vi.mocked(homeApi.summary).mockReturnValue(new Promise(() => {}));
    render(<RoleSummary />);
    expect(screen.getByRole('status', { name: 'Cargando el resumen…' })).toBeTruthy();
    cleanup();
    vi.mocked(homeApi.summary).mockResolvedValue({ scope: 'global', pending_approvals: 0, failed_access: 0, totals: { areas: 0, platforms: 0, active_access: 0 } });
    render(<RoleSummary />);
    expect(await screen.findByText(/Todavía no hay áreas/)).toBeTruthy();
    cleanup();
    vi.mocked(homeApi.summary).mockRejectedValue(new Error('x'));
    render(<RoleSummary />);
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});

describe('StatTile, Badge y Avatar', () => {
  it('StatTile con icono lo oculta a lectores y conserva etiqueta y valor', () => {
    const { container } = render(<StatTile label="Plataformas" value={2} icon="plataformas" tone="activo" />);
    expect(container.querySelector('span[aria-hidden="true"].nx-tono-activo svg')).toBeTruthy();
    expect(screen.getByText('Plataformas')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('StatTile sin icono no cambia', () => {
    const { container } = render(<StatTile label="Visitas" value={3} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('Badge con icono: svg decorativo y el texto sigue visible', () => {
    const { container } = render(<Badge tone="warning" icon="reloj">Pendiente</Badge>);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
  });

  it.each([
    ['pendiente', 'Pendiente'], ['aprobada', 'Aprobada'], ['rechazada', 'Rechazada'],
  ] as const)('insignia de solicitud %s: icono y texto', (status, texto) => {
    const { container } = render(<RequestStatusBadge status={status} />);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByText(texto)).toBeTruthy();
  });

  it.each([
    ['activo', 'Con acceso'], ['en_proceso', 'Acceso en proceso'], ['fallido', 'Acceso fallido'],
    ['revocando', 'Revocando acceso'], ['revocado', 'Sin acceso'], ['fallo_revocacion', 'Fallo al revocar'], [null, 'Sin acceso'],
  ] as const)('insignia de acceso %s: icono y texto', (status, texto) => {
    const { container } = render(<AccessStatusBadge status={status} />);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByText(texto)).toBeTruthy();
  });

  it('iniciales y avatar decorativo', () => {
    expect(iniciales('usuario1')).toBe('US');
    expect(iniciales('Ana Ruiz')).toBe('AR');
    expect(iniciales('  ')).toBe('?');
    const { container } = render(<Avatar nombre="Ana Ruiz" />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('AR');
  });
});

describe('Solicitudes pendientes', () => {
  it('fila con avatar, plataforma, insignia y acciones con nombre contextual', async () => {
    vi.mocked(requestsApi.inbox).mockResolvedValue(pagina([SOLICITUD]));
    render(<SolicitudesPendientes />);
    const tabla = await screen.findByRole('table');
    const fila = within(tabla).getAllByRole('row')[1];
    expect(fila.textContent).toContain('usuario1');
    expect(fila.textContent).toContain('US');
    expect(fila.textContent).toContain('Demo Wiki · Usuario');
    expect(within(fila).getByText('Pendiente')).toBeTruthy();
    expect(within(fila).getByRole('link', { name: 'Ver en aprobaciones: solicitud de usuario1' })).toBeTruthy();
    for (const nombre of ['Rechazar la solicitud de usuario1', 'Aprobar la solicitud de usuario1']) {
      const boton = within(fila).getByRole('button', { name: nombre });
      expect(boton.textContent).toBe('');
      expect(boton.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
      expect(boton.className).toMatch(/min-h-12/);
      expect(boton.className).toMatch(/min-w-12/);
    }
    expect(requestsApi.inbox).toHaveBeenCalledWith({ status: 'pendiente', per_page: 5 });
  });

  it('la solicitud propia solo se puede ver', async () => {
    vi.mocked(requestsApi.inbox).mockResolvedValue(pagina([{ ...SOLICITUD, requester: { ...SOLICITUD.requester, id: 1 } }]));
    render(<SolicitudesPendientes />);
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /Aprobar la solicitud/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Ver en aprobaciones/ })).toBeTruthy();
  });

  it('aprobar abre la confirmación', async () => {
    vi.mocked(requestsApi.inbox).mockResolvedValue(pagina([SOLICITUD]));
    render(<SolicitudesPendientes />);
    (await screen.findByRole('button', { name: 'Aprobar la solicitud de usuario1' })).click();
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
  });

  it('carga, vacío y error dentro de la misma tarjeta', async () => {
    vi.mocked(requestsApi.inbox).mockReturnValue(new Promise(() => {}));
    render(<SolicitudesPendientes />);
    expect(screen.getByRole('heading', { name: 'Solicitudes pendientes' })).toBeTruthy();
    expect(screen.getByRole('status', { name: /Cargando solicitudes pendientes/ })).toBeTruthy();
    cleanup();
    vi.mocked(requestsApi.inbox).mockResolvedValue(pagina([]));
    render(<SolicitudesPendientes />);
    expect(await screen.findByText('No hay solicitudes pendientes.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Solicitudes pendientes' })).toBeTruthy();
    cleanup();
    vi.mocked(requestsApi.inbox).mockRejectedValue(new Error('x'));
    render(<SolicitudesPendientes />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy());
  });
});

describe('DataTable con encabezado (H3, H6)', () => {
  const cols = [{ key: 'a', header: 'A', cell: (r: { id: number }) => r.id }];

  it('el esqueleto reserva las filas y la altura esperadas', () => {
    const { container } = render(
      <DataTable label="Tabla" encabezado={<h2>T</h2>} columns={cols} rows={[]} rowKey={(r) => r.id}
        loading emptyMessage="vacío" filasEsperadas={5} claseFilaEsqueleto="min-h-16" />,
    );
    const filas = container.querySelectorAll('[role="status"] div[aria-hidden="true"]');
    expect(filas).toHaveLength(5);
    expect(filas[0].className).toContain('min-h-16');
  });

  it('la tarjeta de DataTable y de ResponsiveList no llevan el relleno de Card', () => {
    const { container } = render(<>
      <DataTable label="T" columns={cols} rows={[{ id: 1 }]} rowKey={(r) => r.id} emptyMessage="v" />
      <ResponsiveList columns="md:grid-cols-1" headers={['A']} label="L"><li>x</li></ResponsiveList>
    </>);
    const tarjetas = container.querySelectorAll('.bg-panel-fill');
    expect(tarjetas).toHaveLength(2);
    tarjetas.forEach((t) => expect(t.className).toContain('!p-0'));
  });
});

describe('Actividad reciente', () => {
  it('lista los eventos reales con icono según la entidad y badge con icono según el resultado', async () => {
    vi.mocked(auditApi.list).mockResolvedValue(pagina([EVENTO]));
    const { container } = render(<ActividadReciente />);
    expect(await screen.findByText('Solicitud rechazada')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Actividad reciente' }).getAttribute('role')).toBe('list');
    expect(container.querySelector('ul[role="list"]')).toBeTruthy();
    expect(container.querySelector('span[aria-hidden="true"].nx-tono-error svg')).toBeTruthy();
    expect(screen.getByText('Error')).toBeTruthy();
    expect(container.querySelector('.nx-badge.nx-badge-error svg')).toBeTruthy();

    expect(vistaEvento({ ...EVENTO, action: 'cuenta_directorio_creada' }).icono).toBe('usuarios');
    expect(vistaEvento({ ...EVENTO, action: 'plataforma_creada' }).icono).toBe('plataformas');
    expect(vistaEvento({ ...EVENTO, action: 'area_creada' }).icono).toBe('areas');
    expect(vistaEvento({ ...EVENTO, action: 'solicitud_creada' }).icono).toBe('reloj');
    expect(vistaEvento({ ...EVENTO, status: 'success' }).tono).toBe('success');
    expect(vistaEvento({ ...EVENTO, status: 'otro' }).tono).toBe('activo');
  });

  it('vacío y error', async () => {
    vi.mocked(auditApi.list).mockResolvedValue(pagina([]));
    render(<ActividadReciente />);
    expect(await screen.findByText('Todavía no hay actividad.')).toBeTruthy();
    cleanup();
    vi.mocked(auditApi.list).mockRejectedValue(new Error('x'));
    render(<ActividadReciente />);
    expect(await screen.findByText(/No se pudo|No se pudieron|No se pudo cargar/)).toBeTruthy();
  });

  it('oculta la paginación si solo hay 1 página y la muestra cuando hay más de 1', async () => {
    // 1 página (<= 8 registros): nav de paginación oculto
    vi.mocked(auditApi.list).mockResolvedValue({ items: [EVENTO], page: 1, per_page: 8, total: 5 });
    render(<ActividadReciente />);
    expect(await screen.findByText(/5 registros/)).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Paginación de actividad reciente' })).toBeNull();

    cleanup();

    // Más de 1 página (> 8 registros): nav de paginación visible con < N/TOTAL >
    const ochoEventos = Array.from({ length: 8 }, (_, i) => ({ ...EVENTO, id: i + 1 }));
    vi.mocked(auditApi.list).mockResolvedValue({ items: ochoEventos, page: 1, per_page: 8, total: 24 });
    render(<ActividadReciente />);
    expect(await screen.findByRole('navigation', { name: 'Paginación de actividad reciente' })).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
  });
});
