import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Access } from '@/lib/access/types';
import type { Area, ManagedUser, Platform } from '@/lib/types';

vi.mock('@/lib/api', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api')>();
  return {
    ApiError: real.ApiError,
    api: {
      users: vi.fn(),
      platformAccess: vi.fn(),
      grantPlatformAccess: vi.fn(),
      revokeAccess: vi.fn(),
    },
  };
});

import { api } from '@/lib/api';
import { PlatformAccessPanel } from '@/components/platforms/platform-access-panel';

const AREA: Area = {
  id: 3, name: 'Finanzas', description: 'Área financiera', icon: 'areas', color: '', status: 'Activo',
  platforms_count: 1, users_count: 3,
};
const PLATAFORMA: Platform = {
  id: 12,
  name: 'Contabilidad',
  description: 'Sistema contable',
  area_id: 3,
  area_name: 'Finanzas',
  area_color: '',
  area_icon: 'areas',
  direct_link: 'https://contabilidad.ejemplo.local',
  icon: 'plataformas',
  logo_url: null,
  status: 'Activo',
  integration_type: 'conector',
  ldap_group_user_dn: null,
  ldap_group_admin_dn: null,
  groups_status: 'sin_verificar',
  has_connector: true,
  active_grants: 0,
  is_favorite: false,
  bg_color: '',
  text_color: '',
  visits: 0,
};

const USUARIOS: ManagedUser[] = [
  {
    id: 1,
    name: 'Carlos Ruiz',
    email: 'carlos@ejemplo.local',
    role: 'usuario',
    is_active: true,
    auth_source: 'local',
    last_login_at: null,
    areas: [{ id: AREA.id, name: AREA.name }],
    managed_areas: [],
  },
  {
    id: 2,
    name: 'Ana López',
    email: 'ana@ejemplo.local',
    role: 'usuario',
    is_active: true,
    auth_source: 'local',
    last_login_at: null,
    areas: [{ id: AREA.id, name: AREA.name }],
    managed_areas: [],
  },
  {
    id: 3,
    name: 'Pedro Ajeno',
    email: 'pedro@otro.local',
    role: 'usuario',
    is_active: true,
    auth_source: 'local',
    last_login_at: null,
    areas: [{ id: 99, name: 'Ventas' }],
    managed_areas: [],
  },
];

const ACCESOS_EXISTENTES: Access[] = [
  {
    id: 101,
    status: 'activo',
    level: 'usuario',
    origin: 'solicitud',
    user: { id: 1, name: 'Carlos Ruiz', email: 'carlos@ejemplo.local' },
    platform: { id: 12, name: 'Contabilidad', integration_type: 'conector' },
    area: { id: 3, name: 'Finanzas' },
    request_id: null,
    granted_by: { id: 99, name: 'Admin' },
    granted_at: '2026-01-10T10:00:00Z',
    revoked_by: null,
    revoked_at: null,
    revoke_reason: null,
  },
];

describe('PlatformAccessPanel (Dual Picklist)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.users).mockResolvedValue(USUARIOS);
    vi.mocked(api.platformAccess).mockResolvedValue({ items: ACCESOS_EXISTENTES, total: 1 });
    vi.mocked(api.grantPlatformAccess).mockResolvedValue({ status: 'success', access: {} as any });
    vi.mocked(api.revokeAccess).mockResolvedValue({ status: 'success', access: {} as any });
  });

  afterEach(() => cleanup());

  it('muestra dual picklist con usuarios sin acceso a la izquierda y con acceso a la derecha', async () => {
    render(<PlatformAccessPanel platform={PLATAFORMA} area={AREA} onClose={() => {}} />);

    // Esperar a que carguen los datos
    expect(await screen.findByText('Carlos Ruiz')).toBeTruthy();

    const listaSinAcceso = screen.getByRole('list', { name: `Usuarios sin acceso a ${PLATAFORMA.name}` });
    const listaConAcceso = screen.getByRole('list', { name: `Usuarios con acceso a ${PLATAFORMA.name}` });

    // Ana López está en la lista de la izquierda (Sin acceso)
    expect(within(listaSinAcceso).getByText('Ana López')).toBeTruthy();

    // Carlos Ruiz está en la lista de la derecha (Con acceso)
    expect(within(listaConAcceso).getByText('Carlos Ruiz')).toBeTruthy();

    // Pedro Ajeno no está en ninguna lista porque pertenece a otra área
    expect(screen.queryByText('Pedro Ajeno')).toBeNull();
  });

  it('permite transferir un usuario de Sin acceso a Con acceso y guardar el cambio', async () => {
    const onClose = vi.fn();
    render(<PlatformAccessPanel platform={PLATAFORMA} area={AREA} onClose={onClose} />);

    await screen.findByText('Ana López');
    const listaSinAcceso = screen.getByRole('list', { name: `Usuarios sin acceso a ${PLATAFORMA.name}` });
    const listaConAcceso = screen.getByRole('list', { name: `Usuarios con acceso a ${PLATAFORMA.name}` });

    // Transferir Ana a la derecha
    const btnOtorgarAna = within(listaSinAcceso).getByRole('button', { name: /Otorgar acceso a Ana López/i });
    fireEvent.click(btnOtorgarAna);

    // Ahora Ana está en la lista de la derecha con badge Nuevo
    expect(within(listaConAcceso).getByText('Ana López')).toBeTruthy();
    expect(within(listaSinAcceso).queryByText('Ana López')).toBeNull();

    // El botón guardar se habilita
    const btnGuardar = screen.getByRole('button', { name: /Guardar/i });
    expect(btnGuardar).not.toHaveProperty('disabled', true);
    fireEvent.click(btnGuardar);

    await waitFor(() => expect(api.grantPlatformAccess).toHaveBeenCalledTimes(1));
    expect(api.grantPlatformAccess).toHaveBeenCalledWith(12, 2, 'usuario');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('permite transferir un usuario de Con acceso a Sin acceso y revocar directamente al guardar', async () => {
    const onClose = vi.fn();
    render(<PlatformAccessPanel platform={PLATAFORMA} area={AREA} onClose={onClose} />);

    await screen.findByText('Carlos Ruiz');
    const listaConAcceso = screen.getByRole('list', { name: `Usuarios con acceso a ${PLATAFORMA.name}` });
    const listaSinAcceso = screen.getByRole('list', { name: `Usuarios sin acceso a ${PLATAFORMA.name}` });

    // Transferir Carlos a la izquierda (quitar acceso)
    const btnQuitarCarlos = within(listaConAcceso).getByRole('button', { name: /Retirar acceso a Carlos Ruiz/i });
    fireEvent.click(btnQuitarCarlos);

    // Ahora Carlos está en la lista de la izquierda
    expect(within(listaSinAcceso).getByText('Carlos Ruiz')).toBeTruthy();
    expect(within(listaConAcceso).queryByText('Carlos Ruiz')).toBeNull();

    const btnGuardar = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => expect(api.revokeAccess).toHaveBeenCalledTimes(1));
    expect(api.revokeAccess).toHaveBeenCalledWith(101, expect.any(String));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('al mover un usuario, el foco queda en la lista de origen y se anuncia (DIS-082)', async () => {
    render(<PlatformAccessPanel platform={PLATAFORMA} area={AREA} onClose={() => {}} />);
    await screen.findByText('Ana López');
    const listaSinAcceso = screen.getByRole('list', { name: `Usuarios sin acceso a ${PLATAFORMA.name}` });

    fireEvent.click(within(listaSinAcceso).getByRole('button', { name: /Otorgar acceso a Ana López/i }));

    // Era el único sin acceso: el foco queda en la lista.
    expect(document.activeElement).toBe(listaSinAcceso);
    expect(document.querySelector('[data-region-anuncios]')?.textContent).toBe(
      '«Ana López» pasa a con acceso, 2 con acceso',
    );
  });

  it('filtra usuarios independientemente en los buscadores de ambas columnas', async () => {
    render(<PlatformAccessPanel platform={PLATAFORMA} area={AREA} onClose={() => {}} />);

    await screen.findByText('Carlos Ruiz');

    const inputSinAcceso = screen.getByPlaceholderText('Filtrar sin acceso…');
    fireEvent.change(inputSinAcceso, { target: { value: 'nadie' } });

    const listaSinAcceso = screen.getByRole('list', { name: `Usuarios sin acceso a ${PLATAFORMA.name}` });
    expect(within(listaSinAcceso).getByText('Ningún usuario coincide con la búsqueda.')).toBeTruthy();

    const inputConAcceso = screen.getByPlaceholderText('Filtrar con acceso…');
    fireEvent.change(inputConAcceso, { target: { value: 'carlos' } });

    const listaConAcceso = screen.getByRole('list', { name: `Usuarios con acceso a ${PLATAFORMA.name}` });
    expect(within(listaConAcceso).getByText('Carlos Ruiz')).toBeTruthy();
  });
});
