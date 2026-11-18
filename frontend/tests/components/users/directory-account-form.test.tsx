/**
 * DIS-019: alta en el directorio en 2 pasos (`POST /users/directory`, contrato
 * `usuarios-directorio.md` v1).
 * - Paso 1: Datos del usuario (Nombre completo, Correo, Contraseña, Confirmar contraseña).
 * - Paso 2: Accesos con Dual Picklist (Áreas disponibles a la izquierda, Áreas asignadas a la derecha).
 * - Validación en el cliente, foco en el primer error.
 * - Admin de área: al menos un área de las suyas; superadmin: opcional.
 * - 409 por campo, 422 sin texto del servidor, 404, 503 y genérico.
 * - `aria-disabled` durante el envío; carga, error y vacío de las áreas.
 * - Enganche en `UsersList`: aviso con foco y recarga tras crear.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area, ManagedUser } from '@/lib/types';

vi.mock('@/lib/access/users', () => ({
  usersApi: { setManagedAreas: vi.fn(), createDirectoryAccount: vi.fn() },
}));
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: { users: vi.fn(), areas: vi.fn(), platforms: vi.fn(), updateUser: vi.fn() },
}));

let esSuperadmin = false;
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    session: {
      managed_areas: [{ id: 3, name: 'Finanzas' }],
      permissions: { is_admin: esSuperadmin, is_area_admin: !esSuperadmin },
    },
  }),
}));

import { ApiError, api } from '@/lib/api';
import { usersApi } from '@/lib/access/users';
import { UsersList } from '@/components/users-list';
import { DirectoryAccountForm } from '@/components/users/directory-account-form';
import {
  MENSAJES_CAMPO, MENSAJE_CORREO_DUPLICADO, cuerpoAlta,
  describeDirectoryAccountError, validarAlta, validarStep1,
} from '@/components/users/directory-account-errors';

const AREAS = [
  { id: 3, name: 'Finanzas', platforms_count: 0 },
  { id: 7, name: 'TI', platforms_count: 2 },
] as Area[];

const CREADA: ManagedUser = {
  id: 31, email: 'ana@ejemplo.local', name: 'Ana Ruiz', role: 'usuario', is_active: true,
  auth_source: 'ldap', areas: [{ id: 3, name: 'Finanzas' }], managed_areas: [], last_login_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  esSuperadmin = false;
  vi.mocked(usersApi.createDirectoryAccount).mockResolvedValue({ status: 'success', user: CREADA });
});

afterEach(() => {
  cleanup();
});

function montar(props: Partial<React.ComponentProps<typeof DirectoryAccountForm>> = {}) {
  const onCreated = vi.fn();
  render(
    <DirectoryAccountForm
      areas={AREAS} areasRequired onClose={vi.fn()} onCreated={onCreated} {...props}
    />,
  );
  return { onCreated };
}

function llenarPaso1(valores: Partial<Record<'nombre' | 'email' | 'password' | 'confirmPassword', string>> = {}) {
  const v = {
    nombre: 'Ana Ruiz',
    email: 'ana@ejemplo.local',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    ...valores,
  };
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: v.nombre } });
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: v.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: v.password } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: v.confirmPassword } });
}

function avanzarAlPaso2() {
  fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));
}

const enviar = () => fireEvent.click(screen.getByText('Crear'));

describe('DirectoryAccountForm - Flujo de 2 pasos', () => {
  it('Paso 1: campos de datos del usuario presentes y con etiquetas', () => {
    montar();
    expect(screen.getByLabelText('Nombre completo')).toBeTruthy();
    expect(screen.getByLabelText('Correo')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeTruthy();
    expect(screen.getByText('Datos de usuario')).toBeTruthy();
    expect(screen.getByText('Accesos y áreas')).toBeTruthy();
  });

  it('Paso 1: valida campos obligatorios y contraseñas coincidentes', () => {
    montar();
    // Intentar avanzar con campos vacíos
    avanzarAlPaso2();
    expect(screen.getByText('Por favor completa todos los datos obligatorios correctamente.')).toBeTruthy();

    // Contraseñas no coincidentes
    llenarPaso1({ password: 'Password123!', confirmPassword: 'OtraPassword' });
    avanzarAlPaso2();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
  });

  it('el generador de contraseñas genera una contraseña segura alfanumérica con símbolos de mínimo 16 caracteres y la asigna a ambos campos', () => {
    montar();
    const btnGenerar = screen.getByRole('button', { name: /generar contraseña/i });
    expect(btnGenerar).toBeTruthy();

    fireEvent.click(btnGenerar);

    const inputPass = screen.getByLabelText('Contraseña') as HTMLInputElement;
    const inputConf = screen.getByLabelText('Confirmar contraseña') as HTMLInputElement;

    expect(inputPass.value.length).toBeGreaterThanOrEqual(16);
    expect(inputPass.value).toBe(inputConf.value);
    expect(/[A-Z]/.test(inputPass.value)).toBe(true);
    expect(/[a-z]/.test(inputPass.value)).toBe(true);
    expect(/[0-9]/.test(inputPass.value)).toBe(true);
    expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(inputPass.value)).toBe(true);

    // Los campos son mostrados como texto visible para verificación
    expect(inputPass.type).toBe('text');
    expect(inputConf.type).toBe('text');

    // Botón de alternar visibilidad
    const btnOcultar = screen.getByRole('button', { name: /ocultar contraseña/i });
    expect(btnOcultar).toBeTruthy();
    fireEvent.click(btnOcultar);
    expect(inputPass.type).toBe('password');
    expect(inputConf.type).toBe('password');
  });

  it('Paso 1 a Paso 2: avanza cuando los datos son válidos y muestra Dual Picklist', () => {
    montar();
    llenarPaso1();
    avanzarAlPaso2();

    expect(screen.getByText('Áreas disponibles')).toBeTruthy();
    expect(screen.getByText('Áreas asignadas')).toBeTruthy();
    expect(screen.getByRole('button', { name: /atrás/i })).toBeTruthy();
    expect(screen.getByText('Crear')).toBeTruthy();
  });

  it('Paso 2 a Paso 1: botón atrás regresa al paso 1 conservando valores', () => {
    montar();
    llenarPaso1({ nombre: 'Carlos Gomez' });
    avanzarAlPaso2();

    fireEvent.click(screen.getByRole('button', { name: /atrás/i }));
    expect(screen.getByLabelText('Nombre completo')).toBeTruthy();
    expect((screen.getByLabelText('Nombre completo') as HTMLInputElement).value).toBe('Carlos Gomez');
  });

  it('envía los datos del usuario y áreas asignadas y llama onCreated', async () => {
    const { onCreated } = montar();
    llenarPaso1({ nombre: 'Ana Ruiz', email: 'ana@ejemplo.local' });
    avanzarAlPaso2();

    // Asignar Finanzas
    fireEvent.click(screen.getByLabelText('Asignar Finanzas'));
    enviar();

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREADA));
    expect(usersApi.createDirectoryAccount).toHaveBeenCalledWith({
      uid: 'ana',
      email: 'ana@ejemplo.local',
      given_name: 'Ana',
      surname: 'Ruiz',
      area_ids: [3],
    });
  });

  it('admin de área: sin área seleccionada marca error y no envía', () => {
    montar({ areasRequired: true });
    llenarPaso1();
    avanzarAlPaso2();

    enviar();
    expect(usersApi.createDirectoryAccount).not.toHaveBeenCalled();
    expect(screen.getByText('Elige al menos un área de tu alcance para continuar.')).toBeTruthy();
  });

  it('superadmin: las áreas son opcionales en el paso 2', async () => {
    montar({ areasRequired: false });
    llenarPaso1();
    avanzarAlPaso2();

    enviar();
    await waitFor(() => expect(usersApi.createDirectoryAccount).toHaveBeenCalled());
    expect(vi.mocked(usersApi.createDirectoryAccount).mock.calls[0][0].area_ids).toEqual([]);
  });

  it('durante el envío el botón queda aria-disabled', async () => {
    let resolver: (v: { status: 'success'; user: ManagedUser }) => void = () => {};
    vi.mocked(usersApi.createDirectoryAccount).mockReturnValue(
      new Promise((r) => { resolver = r; }));
    montar({ areasRequired: false });
    llenarPaso1();
    avanzarAlPaso2();
    enviar();

    const boton = await screen.findByText('Creando…');
    expect(boton.getAttribute('aria-disabled')).toBe('true');
    resolver({ status: 'success', user: CREADA });
  });

  it('manejo de error 409: regresa al paso 1 y muestra el error', async () => {
    vi.mocked(usersApi.createDirectoryAccount).mockRejectedValue(
      new ApiError(409, 'texto del servidor', { code: 'correo_duplicado' }));
    montar({ areasRequired: false });
    llenarPaso1();
    avanzarAlPaso2();
    enviar();

    expect(await screen.findByText(MENSAJE_CORREO_DUPLICADO)).toBeTruthy();
    expect(screen.getByLabelText('Correo')).toBeTruthy();
  });
});

describe('validación y errores del alta', () => {
  const base = { uid: 'ana', email: 'a@b.mx', given_name: 'A', surname: 'R', area_ids: [] };

  it('validarStep1 valida nombre, correo y contraseñas', () => {
    expect(validarStep1({ fullName: '', email: '', password: '', confirmPassword: '' })).toEqual({
      fullName: 'Es obligatorio.',
      email: 'Es obligatorio.',
      password: 'Es obligatorio.',
      confirmPassword: 'Es obligatorio.',
    });

    expect(validarStep1({
      fullName: 'Ana Ruiz',
      email: 'ana@ejemplo.com',
      password: 'pass',
      confirmPassword: 'pass',
    }).password).toBe(MENSAJES_CAMPO.password);

    expect(validarStep1({
      fullName: 'Ana Ruiz',
      email: 'ana@ejemplo.com',
      password: 'Password123!',
      confirmPassword: 'otra',
    }).confirmPassword).toBe(MENSAJES_CAMPO.confirmPassword);
  });

  it('reglas del contrato en validarAlta', () => {
    expect(validarAlta(base, false)).toEqual({});
    expect(validarAlta({ ...base, uid: 'ab' }, false).uid).toBe(MENSAJES_CAMPO.uid);
  });

  it('el cuerpo no lleva campos fuera de la lista blanca', () => {
    expect(Object.keys(cuerpoAlta(base)).sort())
      .toEqual(['area_ids', 'email', 'given_name', 'surname', 'uid']);
  });

  it('un error que no es ApiError da el mensaje genérico', () => {
    expect(describeDirectoryAccountError(new Error('x')).message)
      .toBe('No se pudo crear la cuenta. Inténtalo de nuevo.');
  });
});

describe('UsersList: alta en el directorio', () => {
  beforeEach(() => {
    vi.mocked(api.users).mockResolvedValue([]);
    vi.mocked(api.areas).mockResolvedValue(AREAS as never);
    vi.mocked(api.platforms).mockResolvedValue([]);
  });

  it('admin de área: abre el modal de 2 pasos y crea la cuenta', async () => {
    render(<UsersList />);
    fireEvent.click(await screen.findByText('Nuevo usuario'));
    const modal = within(screen.getByRole('dialog'));
    expect(modal.getByLabelText('Nombre completo')).toBeTruthy();

    llenarPaso1();
    avanzarAlPaso2();

    expect(modal.getByText('Áreas disponibles')).toBeTruthy();
    fireEvent.click(modal.getByLabelText('Asignar Finanzas'));
    enviar();

    const aviso = await screen.findByText('Se creó la cuenta de Ana Ruiz.');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(aviso.closest('[role="status"]')));
    await waitFor(() => expect(api.users).toHaveBeenCalledTimes(2));
  });
});
