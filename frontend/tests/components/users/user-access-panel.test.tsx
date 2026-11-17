/**
 * Modal de administración de "Accesos de usuario" con Dual Picklist.
 * - Columna izquierda: Plataformas SIN acceso asignado.
 * - Columna derecha: Plataformas CON acceso asignado.
 * - Transferencia con un solo clic entre columnas.
 * - Buscadores independientes en ambas columnas.
 * - Notificaciones exclusivas por Toast (sin notas de error inline en el modal).
 * - Enganche en `UsersList`: selección de usuario y botón "Accesos".
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Access, Paginated } from '@/lib/access/types';
import type { ManagedUser, Platform } from '@/lib/types';

vi.mock('@/lib/access/grants', () => ({
  grantsApi: { ofUser: vi.fn(), revoke: vi.fn(), mine: vi.fn() },
}));
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: {
    users: vi.fn(),
    areas: vi.fn(),
    platforms: vi.fn(),
    grantPlatformAccess: vi.fn(),
    revokeAccess: vi.fn(),
  },
}));
vi.mock('@/lib/access/users', () => ({ usersApi: { setManagedAreas: vi.fn() } }));

let esSuperadmin = false;
const MI_ID = 2;
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    loading: false,
    error: null,
    session: {
      id: MI_ID,
      role: esSuperadmin ? 'administrador' : 'admin_area',
      managed_areas: [{ id: 3, name: 'Finanzas' }],
      preferences: { refresh_interval: 60 },
      permissions: {
        is_admin: esSuperadmin,
        is_area_admin: !esSuperadmin,
        can_manage_areas: esSuperadmin,
        can_manage_system: esSuperadmin,
      },
    },
  }),
}));

import { ApiError, api } from '@/lib/api';
import { grantsApi } from '@/lib/access/grants';
import { UsersList } from '@/components/users-list';
import {
  ESTADO_PARA_ADMIN,
  MENSAJE_SUPERADMIN,
  SIN_ACCION,
  UserAccessPanel,
  avisoRevocacion,
  mensajeVacioAccesos,
  motivoSinRevocar,
} from '@/components/users/user-access-panel';

function pagina<T>(items: T[], extra: Partial<Paginated<T>> = {}): Paginated<T> {
  return { items, page: 1, per_page: 25, total: items.length, ...extra };
}

const ANA: ManagedUser = {
  id: 8,
  email: 'ana@ejemplo.local',
  name: 'Ana Ruiz',
  role: 'usuario',
  is_active: true,
  auth_source: 'ldap',
  areas: [{ id: 3, name: 'Finanzas' }],
  managed_areas: [],
  last_login_at: null,
};

const SUPERADMIN_USER: ManagedUser = {
  ...ANA,
  id: 1,
  name: 'Superadmin Root',
  email: 'root@ejemplo.local',
  role: 'administrador',
};

const PLATAFORMAS: Platform[] = [
  {
    id: 12,
    name: 'Contabilidad',
    description: 'Sistema contable',
    area_id: 3,
    area_name: 'Finanzas',
    area_color: '',
    area_icon: 'areas',
    direct_link: null,
    icon: 'plataformas',
    logo_url: null,
    bg_color: '',
    text_color: '',
    status: 'Activo',
    visits: 0,
    is_favorite: false,
    integration_type: 'ldap',
    ldap_group_user_dn: null,
    ldap_group_admin_dn: null,
    groups_status: 'ok',
    has_connector: false,
    active_grants: 1,
  },
  {
    id: 15,
    name: 'Facturación',
    description: 'Módulo de facturas',
    area_id: 3,
    area_name: 'Finanzas',
    area_color: '',
    area_icon: 'areas',
    direct_link: null,
    icon: 'ejecuciones',
    logo_url: null,
    bg_color: '',
    text_color: '',
    status: 'Activo',
    visits: 0,
    is_favorite: false,
    integration_type: 'ldap',
    ldap_group_user_dn: null,
    ldap_group_admin_dn: null,
    groups_status: 'ok',
    has_connector: false,
    active_grants: 0,
  },
];

const ACTIVO: Access = {
  id: 77,
  status: 'activo',
  level: 'usuario',
  origin: 'solicitud',
  user: { id: 8, name: 'Ana Ruiz', email: 'ana@ejemplo.local' },
  platform: { id: 12, name: 'Contabilidad', integration_type: 'ldap' },
  area: { id: 3, name: 'Finanzas' },
  request_id: 41,
  granted_by: { id: 2, name: 'Luis Paz' },
  granted_at: '2026-10-14T15:10:00Z',
  revoked_by: null,
  revoked_at: null,
  revoke_reason: null,
  last_job_id: 301,
};

beforeEach(() => {
  vi.clearAllMocks();
  esSuperadmin = false;
  vi.mocked(api.platforms).mockResolvedValue(PLATAFORMAS);
  vi.mocked(grantsApi.ofUser).mockResolvedValue(pagina([ACTIVO]));
  vi.mocked(api.grantPlatformAccess).mockResolvedValue({ status: 'success', access: ACTIVO });
  vi.mocked(api.revokeAccess).mockResolvedValue({ status: 'success', access: ACTIVO });
});

afterEach(cleanup);

describe('motivoSinRevocar (reglas del contrato)', () => {
  const sesion = { id: MI_ID, esSuperadmin: false };
  const propio: Access = { ...ACTIVO, user: { ...ACTIVO.user, id: MI_ID } };
  const adminDelArea: ManagedUser = { ...ANA, managed_areas: [{ id: 3, name: 'Finanzas' }] };
  const superadmin = { ...sesion, esSuperadmin: true };
  const automatico: Access = { ...ACTIVO, id: 78, origin: 'admin_de_area' };
  const enProceso: Access = { ...ACTIVO, id: 79, status: 'en_proceso' };

  it.each<[string, Access, ManagedUser, typeof sesion, string | null]>([
    ['activo por solicitud', ACTIVO, ANA, sesion, null],
    ['no activo (409)', enProceso, ANA, sesion, SIN_ACCION.noActivo],
    ['propio (403)', propio, ANA, sesion, SIN_ACCION.propio],
    ['automático, admin de área (404)', automatico, ANA, sesion, SIN_ACCION.automatico],
    ['automático, superadmin', automatico, ANA, superadmin, null],
    ['de otro admin del área (404)', ACTIVO, adminDelArea, sesion, SIN_ACCION.adminDelArea],
    ['de otro admin del área, superadmin', ACTIVO, adminDelArea, superadmin, null],
    ['propio, también superadmin', propio, ANA, superadmin, SIN_ACCION.propio],
  ])('%s', (_caso, access, user, s, esperado) => {
    expect(motivoSinRevocar(access, user, s)).toBe(esperado);
  });
});

describe('UserAccessPanel (Modal con Dual Picklist)', () => {
  it('abre un Modal con título Accesos — Ana Ruiz y muestra el Dual Picklist', async () => {
    render(<UserAccessPanel user={ANA} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Accesos — Ana Ruiz')).toBeTruthy();

    // Esperar a que carguen las plataformas
    expect(await screen.findByText('Contabilidad')).toBeTruthy();
    expect(screen.getByText('Facturación')).toBeTruthy();

    const listaSinAcceso = screen.getByRole('list', { name: `Plataformas sin acceso para ${ANA.name}` });
    const listaConAcceso = screen.getByRole('list', { name: `Plataformas con acceso para ${ANA.name}` });

    // Facturación está en Sin acceso
    expect(within(listaSinAcceso).getByText('Facturación')).toBeTruthy();

    // Contabilidad está en Con acceso (ya que tiene grant activo)
    expect(within(listaConAcceso).getByText('Contabilidad')).toBeTruthy();
  });

  it('permite transferir una plataforma de Sin acceso a Con acceso y guardar el cambio', async () => {
    const onClose = vi.fn();
    render(<UserAccessPanel user={ANA} onClose={onClose} />);

    await screen.findByText('Facturación');
    const listaSinAcceso = screen.getByRole('list', { name: `Plataformas sin acceso para ${ANA.name}` });
    const listaConAcceso = screen.getByRole('list', { name: `Plataformas con acceso para ${ANA.name}` });

    // Transferir Facturación a Con acceso
    const btnOtorgar = within(listaSinAcceso).getByRole('button', { name: /Otorgar acceso a Facturación/i });
    fireEvent.click(btnOtorgar);

    expect(within(listaConAcceso).getByText('Facturación')).toBeTruthy();
    expect(within(listaSinAcceso).queryByText('Facturación')).toBeNull();

    // El botón guardar se habilita
    const btnGuardar = screen.getByRole('button', { name: /Guardar/i });
    expect(btnGuardar.hasAttribute('disabled')).toBe(false);
    fireEvent.click(btnGuardar);

    await waitFor(() => expect(api.grantPlatformAccess).toHaveBeenCalledTimes(1));
    expect(api.grantPlatformAccess).toHaveBeenCalledWith(15, 8, 'usuario');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('permite transferir una plataforma de Con acceso a Sin acceso y revocar al guardar', async () => {
    const onClose = vi.fn();
    render(<UserAccessPanel user={ANA} onClose={onClose} />);

    await screen.findByText('Contabilidad');
    const listaConAcceso = screen.getByRole('list', { name: `Plataformas con acceso para ${ANA.name}` });
    const listaSinAcceso = screen.getByRole('list', { name: `Plataformas sin acceso para ${ANA.name}` });

    // Transferir Contabilidad a Sin acceso
    const btnQuitar = within(listaConAcceso).getByRole('button', { name: /Revocar acceso a Contabilidad/i });
    fireEvent.click(btnQuitar);

    expect(within(listaSinAcceso).getByText('Contabilidad')).toBeTruthy();
    expect(within(listaConAcceso).queryByText('Contabilidad')).toBeNull();

    const btnGuardar = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => expect(api.revokeAccess).toHaveBeenCalledTimes(1));
    expect(api.revokeAccess).toHaveBeenCalledWith(77, 'Retirado por administrador');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filtra plataformas en los buscadores independientes', async () => {
    render(<UserAccessPanel user={ANA} onClose={() => {}} />);
    await screen.findByText('Contabilidad');

    const inputSinAcceso = screen.getByPlaceholderText('Filtrar sin acceso…');
    fireEvent.change(inputSinAcceso, { target: { value: 'inexistente' } });

    const listaSinAcceso = screen.getByRole('list', { name: `Plataformas sin acceso para ${ANA.name}` });
    expect(within(listaSinAcceso).getByText('Ninguna plataforma coincide con la búsqueda.')).toBeTruthy();

    const inputConAcceso = screen.getByPlaceholderText('Filtrar con acceso…');
    fireEvent.change(inputConAcceso, { target: { value: 'conta' } });

    const listaConAcceso = screen.getByRole('list', { name: `Plataformas con acceso para ${ANA.name}` });
    expect(within(listaConAcceso).getByText('Contabilidad')).toBeTruthy();
  });

  it('si el usuario es superadmin, muestra mensaje explicativo', async () => {
    render(<UserAccessPanel user={SUPERADMIN_USER} onClose={() => {}} />);
    expect(screen.getByText(MENSAJE_SUPERADMIN)).toBeTruthy();
  });
});

describe('UsersList: botón "Accesos" abre el Modal con Dual Picklist', () => {
  beforeEach(() => {
    vi.mocked(api.users).mockResolvedValue([ANA]);
    vi.mocked(api.areas).mockResolvedValue([]);
    vi.mocked(api.platforms).mockResolvedValue(PLATAFORMAS);
  });

  it('al seleccionar un usuario y presionar Accesos, abre el modal y al cerrarlo devuelve el foco', async () => {
    render(<UsersList />);
    await screen.findByText('Ana Ruiz');

    // Seleccionar usuario
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar a Ana Ruiz' }));

    // Presionar botón Accesos en la barra
    const botonAccesos = await screen.findByRole('button', { name: 'Accesos de Ana Ruiz' });
    fireEvent.click(botonAccesos);

    // Se abre el MODAL
    const modal = screen.getByRole('dialog');
    expect(modal).toBeTruthy();
    expect(within(modal).getByText('Accesos — Ana Ruiz')).toBeTruthy();

    // Cerrar el modal
    const botonesCerrar = within(modal).getAllByRole('button', { name: 'Cerrar' });
    fireEvent.click(botonesCerrar[0]);

    // El modal se cierra
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(botonAccesos);
  });
});
