/**
 * Regresión de FNC-069 sobre `UsersList`: tras FNC-044 el backend rechaza
 * `auth_source` y `managed_area_ids` en `POST/PUT /users` (`400
 * campo_no_permitido`).
 *
 * DIS-019: "Nuevo usuario" abre el alta en el directorio (`POST /users/directory`)
 * y la edición ya no ofrece rol, áreas administradas ni contraseña (salvo la
 * cuenta de emergencia); el rol cambia con "Hacer admin" / "Quitar admin"
 * (pruebas en `users/admin-role-dialog.test.tsx`).
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area, ManagedUser } from '@/lib/types';

vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: {
    users: vi.fn(), areas: vi.fn(), platforms: vi.fn(),
    createUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn(), setUserAreas: vi.fn(),
    setUserPlatforms: vi.fn(), searchDirectory: vi.fn(),
  },
}));
vi.mock('@/lib/access/users', () => ({
  usersApi: { setManagedAreas: vi.fn(), createDirectoryAccount: vi.fn() },
}));
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    session: { managed_areas: [], permissions: { is_admin: true, is_area_admin: false } },
  }),
}));

import { api } from '@/lib/api';
import { usersApi } from '@/lib/access/users';
import { UsersList } from '@/components/users-list';

const AREAS = [{ id: 3, name: 'Finanzas' }, { id: 7, name: 'TI' }] as Area[];
const ADMIN_AREA: ManagedUser = {
  id: 5, email: 'luis@ejemplo.local', name: 'Luis Paz', role: 'admin_area', is_active: true,
  auth_source: 'local', areas: [], managed_areas: [{ id: 3, name: 'Finanzas' }],
  last_login_at: null,
};
const EMERGENCIA: ManagedUser = {
  ...ADMIN_AREA, id: 1, email: 'admin', name: 'Emergencia', role: 'administrador', managed_areas: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.users).mockResolvedValue([ADMIN_AREA]);
  vi.mocked(api.areas).mockResolvedValue(AREAS);
  vi.mocked(api.platforms).mockResolvedValue([]);
  vi.mocked(api.createUser).mockResolvedValue({ status: 'success', id: 9 });
  vi.mocked(api.updateUser).mockResolvedValue({ status: 'success' });
  vi.mocked(api.setUserAreas).mockResolvedValue({ status: 'success', areas: [] });
  vi.mocked(api.searchDirectory).mockResolvedValue({
    count: 1, users: [{ name: 'Eva Mora', email: 'eva@ejemplo.local', account: 'eva', exists: false }],
  });
  vi.mocked(usersApi.setManagedAreas).mockResolvedValue(
    { status: 'success', user: ADMIN_AREA });
});

afterEach(() => {
  cleanup();
});

function dialogo() {
  return within(screen.getByRole('dialog'));
}

describe('UsersList: alta y edición con las reglas de FNC-044 y DIS-019', () => {
  it('"Nuevo usuario" abre el alta en el directorio en 2 pasos con datos de usuario y accesos', async () => {
    render(<UsersList />);
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));

    const modal = dialogo();
    expect(modal.getByText('Nueva cuenta')).toBeTruthy();
    expect(modal.getByLabelText('Nombre completo')).toBeTruthy();
    expect(modal.getByLabelText('Correo')).toBeTruthy();
    expect(modal.getByLabelText('Contraseña')).toBeTruthy();
    expect(modal.getByLabelText('Confirmar contraseña')).toBeTruthy();
    expect(modal.queryByLabelText('Rol')).toBeNull();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it('edición: sin rol, áreas administradas ni contraseña; no envía role ni managed_area_ids', async () => {
    render(<UsersList />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar a Luis Paz' }));
    fireEvent.click(await screen.findByText('Editar'));
    const modal = dialogo();
    expect(modal.queryByLabelText('Rol')).toBeNull();
    expect(modal.queryByText('Áreas que administra')).toBeNull();
    expect(modal.queryByLabelText(/Contraseña/)).toBeNull();
    fireEvent.click(modal.getByText('Guardar'));

    await waitFor(() => expect(api.updateUser).toHaveBeenCalled());
    const enviado = vi.mocked(api.updateUser).mock.calls[0][1];
    expect(enviado).not.toHaveProperty('role');
    expect(enviado).not.toHaveProperty('managed_area_ids');
    expect(enviado).not.toHaveProperty('password');
    expect(usersApi.setManagedAreas).not.toHaveBeenCalled();
  });

  it('DIS-008: acciones de fila y chips de áreas de 48 px con foco visible', async () => {
    render(<UsersList />);
    await screen.findByText('Luis Paz');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar a Luis Paz' }));
    const acciones = ['Accesos de Luis Paz', 'Editar Luis Paz', 'Eliminar Luis Paz']
      .map((nombre) => screen.getByRole('button', { name: nombre }));
    for (const accion of acciones) {
      expect(accion.className).toContain('min-h-12');
      expect(accion.className).toContain('min-w-12');
      expect(accion.className).toContain('focus-visible:ring-primary');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Editar Luis Paz' }));
    const chip = await dialogo().findByRole('button', { name: 'Finanzas' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(chip.className).toContain('min-h-12');
    expect(chip.className).toContain('focus-visible:ring-primary');
  });

  it('DIS-045: los chips van en grupos con leyenda; el primer chip conserva su nombre y la leyenda no lo activa', async () => {
    render(<UsersList />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar a Luis Paz' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Luis Paz' }));
    const modal = dialogo();
    const grupo = await modal.findByRole('group', { name: 'Áreas a las que pertenece' });
    const primero = within(grupo).getByRole('button', { name: 'Finanzas' });
    expect(primero.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(modal.getByText('Áreas a las que pertenece'));
    expect(primero.getAttribute('aria-pressed')).toBe('false');
    expect(modal.getByRole('group', { name: 'Plataformas asignadas' }).getAttribute('aria-describedby')).toBeTruthy();
  });

  it('DIS-046: Editar, Accesos y Eliminar nombran al usuario con su texto visible', async () => {
    render(<UsersList />);
    const checkbox = await screen.findByRole('checkbox', { name: 'Seleccionar a Luis Paz' });
    fireEvent.click(checkbox);
    expect(await screen.findByRole('button', { name: 'Editar Luis Paz' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Eliminar Luis Paz' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Accesos de Luis Paz' }).textContent).toBe('Accesos');
  });

  it('edición de la cuenta de emergencia (superadmin local): ofrece la contraseña', async () => {
    vi.mocked(api.users).mockResolvedValue([EMERGENCIA]);
    render(<UsersList />);
    const checkbox = await screen.findByRole('checkbox', { name: 'Seleccionar a Emergencia' });
    fireEvent.click(checkbox);
    fireEvent.click(await screen.findByText('Editar'));
    expect(dialogo().getByLabelText(/^Contraseña/)).toBeTruthy();
  });

  it('la barra de herramientas solo expone Accesos, Editar, Eliminar y Nuevo', async () => {
    render(<UsersList />);
    expect(await screen.findByRole('button', { name: 'Nuevo usuario' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Buscar en directorio' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Purgar cuentas inactivas' })).toBeNull();
    expect(screen.queryByText('Hacer admin')).toBeNull();
    expect(screen.queryByText('Áreas admin')).toBeNull();
    expect(screen.queryByText('Quitar admin')).toBeNull();
  });

  it('casilla de selección en encabezado selecciona y deselecciona todos los usuarios', async () => {
    vi.mocked(api.users).mockResolvedValue([ADMIN_AREA, EMERGENCIA]);
    render(<UsersList />);
    await screen.findByText('Luis Paz');

    const selectAllCheckbox = screen.getByLabelText('Seleccionar todos los usuarios') as HTMLInputElement;
    expect(selectAllCheckbox).toBeTruthy();

    // Al presionar el checkbox de encabezado, selecciona todos
    fireEvent.click(selectAllCheckbox);
    expect(screen.getByText('2 usuarios seleccionados')).toBeTruthy();

    // Al presionar de nuevo, deselecciona todos
    fireEvent.click(selectAllCheckbox);
    expect(screen.getByText('Acciones de usuarios')).toBeTruthy();
  });

  it('renderiza exactamente las columnas: Nombre, Correo, Rol, Estado, Áreas asignadas', async () => {
    const usuarioConArea: ManagedUser = {
      ...ADMIN_AREA,
      id: 10,
      name: 'Carla Ramos',
      email: 'carla@ejemplo.local',
      areas: [{ id: 3, name: 'Finanzas', icon: 'areas' }],
    };
    vi.mocked(api.users).mockResolvedValue([usuarioConArea]);
    render(<UsersList />);
    await screen.findByText('Carla Ramos');

    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Correo' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Rol' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Áreas asignadas' })).toBeTruthy();

    expect(screen.getByText('Carla Ramos')).toBeTruthy();
    expect(screen.getByText('carla@ejemplo.local')).toBeTruthy();

    // En Áreas asignadas se muestra únicamente el icono con accesibilidad (title / aria-label)
    const badgeIcono = screen.getByTitle('Finanzas');
    expect(badgeIcono).toBeTruthy();
    expect(badgeIcono.getAttribute('aria-label')).toBe('Finanzas');
  });

  it('selección múltiple activa el botón Eliminar y permite eliminar en lote', async () => {
    vi.mocked(api.users).mockResolvedValue([ADMIN_AREA, EMERGENCIA]);
    render(<UsersList />);
    await screen.findByText('Luis Paz');

    const selectAllCheckbox = screen.getByLabelText('Seleccionar todos los usuarios');
    fireEvent.click(selectAllCheckbox);

    // Con selección múltiple (2 usuarios): Editar y Accesos deshabilitados, Eliminar activo
    expect(screen.getByRole('button', { name: 'Accesos de Luis Paz' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Editar Luis Paz' }).hasAttribute('disabled')).toBe(true);
    const botonEliminar = screen.getByRole('button', { name: 'Eliminar 2 usuarios seleccionados' });
    expect(botonEliminar.hasAttribute('disabled')).toBe(false);

    // Al hacer clic, abre confirmación múltiple
    fireEvent.click(botonEliminar);
    expect(await screen.findByRole('heading', { name: 'Eliminar usuarios' })).toBeTruthy();
    expect(screen.getByText('Se eliminarán las cuentas de los 2 usuarios seleccionados. Esta acción no se puede deshacer.')).toBeTruthy();

    // Al confirmar, llama a api.deleteUser para cada uno
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => {
      expect(api.deleteUser).toHaveBeenCalledWith(ADMIN_AREA.id);
      expect(api.deleteUser).toHaveBeenCalledWith(EMERGENCIA.id);
    });
  });
});
