/**
 * FNC-161: el campo Contraseña de «Editar usuario» según el origen de la cuenta.
 * - local: se guarda en el portal; ldap: se cambia en el directorio (solo superadmin)
 *   y muestra la política; sso: sin campo.
 * - Vacío no se envía; el error del backend sale por aviso.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/toast';
import type { ManagedUser } from '@/lib/types';
import type { PasswordPolicy } from '@/lib/access/types';

vi.mock('@/lib/access/users', () => ({ usersApi: { passwordPolicy: vi.fn() } }));
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: { updateUser: vi.fn(), setUserAreas: vi.fn(), setUserPlatforms: vi.fn(), createUser: vi.fn() },
}));

let esSuperadmin = true;
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({ session: { permissions: { is_admin: esSuperadmin, is_area_admin: !esSuperadmin } } }),
}));

import { api } from '@/lib/api';
import { usersApi } from '@/lib/access/users';
import { UserForm } from '@/components/users/user-form';

const POLITICA: PasswordPolicy = {
  min_length: 16, max_length: 128,
  required_classes: ['mayusculas', 'minusculas', 'digitos', 'simbolos'],
  symbols: '!#$%&()*+,-./:;<=>?@[]^_{}~',
};
const NUEVA = 'Clave-De-Prueba-2026!x';

function usuario(origen: string, rol = 'usuario'): ManagedUser {
  return {
    id: 5, email: 'ana@ejemplo.local', name: 'Ana', role: rol, is_active: true,
    auth_source: origen, areas: [], managed_areas: [], last_login_at: null,
    credentials_status: null, credentials_sent_at: null,
  } as unknown as ManagedUser;
}

function montar(user: ManagedUser, onSaved = vi.fn()) {
  render(
    <ToastProvider>
      <UserForm user={user} areas={[]} platforms={[]} onClose={vi.fn()} onSaved={onSaved} />
    </ToastProvider>,
  );
  return onSaved;
}

beforeEach(() => {
  vi.clearAllMocks();
  esSuperadmin = true;
  vi.mocked(usersApi.passwordPolicy).mockResolvedValue({ status: 'success', policy: POLITICA });
  vi.mocked(api.updateUser).mockResolvedValue({ status: 'success' } as never);
  vi.mocked(api.setUserAreas).mockResolvedValue({ status: 'success' } as never);
});
afterEach(() => cleanup());

describe('UserForm: contraseña (FNC-161)', () => {
  it('cuenta local: campo con la ayuda «Se guarda en el portal» y sin pedir la política', () => {
    montar(usuario('local'));
    const campo = screen.getByLabelText('Contraseña');
    expect(campo.getAttribute('type')).toBe('password');
    const ayuda = screen.getByText(/Se guarda en el portal/);
    expect(campo.getAttribute('aria-describedby')).toBe(ayuda.id);
    expect(usersApi.passwordPolicy).not.toHaveBeenCalled();
  });

  it('cuenta ldap, superadmin: ayuda del directorio con la política vinculada al campo', async () => {
    montar(usuario('ldap'));
    const ayuda = await screen.findByText(/Se cambia en el directorio LDAP/);
    await waitFor(() => expect(ayuda.textContent).toContain('Entre 16 y 128 caracteres.'));
    expect(ayuda.textContent).toContain('Debe incluir');
    expect(screen.getByLabelText('Contraseña').getAttribute('aria-describedby')).toBe(ayuda.id);
  });

  it('cuenta ldap, admin de área: sin campo (el cambio en LDAP es del superadmin)', () => {
    esSuperadmin = false;
    montar(usuario('ldap'));
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
    expect(usersApi.passwordPolicy).not.toHaveBeenCalled();
  });

  it('cuenta sso: sin campo', () => {
    montar(usuario('sso'));
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
  });

  it('vacío no se envía; con valor se envía en el mismo PUT', async () => {
    const onSaved = montar(usuario('ldap'));
    await screen.findByText(/Se cambia en el directorio LDAP/);
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(vi.mocked(api.updateUser).mock.calls[0][1]).not.toHaveProperty('password');

    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: NUEVA } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.updateUser).mock.calls[1][1]).toMatchObject({ password: NUEVA });
  });

  it('el rechazo del backend sale por aviso y no cierra el formulario', async () => {
    vi.mocked(api.updateUser).mockRejectedValue(
      new Error('El directorio rechazó la contraseña por su política de seguridad.'),
    );
    const onSaved = montar(usuario('ldap'));
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: NUEVA } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    expect(await screen.findAllByText(/rechazó la contraseña/)).not.toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('el rechazo de la contraseña marca el campo como inválido y le liga el mensaje', async () => {
    vi.mocked(api.updateUser).mockRejectedValue(
      new Error('El directorio rechazó la contraseña por su política de seguridad.'),
    );
    montar(usuario('ldap'));
    const campo = screen.getByLabelText('Contraseña');
    fireEvent.change(campo, { target: { value: NUEVA } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    await waitFor(() => expect(campo.getAttribute('aria-invalid')).toBe('true'));
    const ids = (campo.getAttribute('aria-describedby') ?? '').split(' ');
    const textos = ids.map((id) => document.getElementById(id)?.textContent ?? '');
    expect(textos.join(' ')).toMatch(/rechazó la contraseña/);
  });
});
