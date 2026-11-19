/**
 * DIS-019: alta en el directorio en 2 pasos (`POST /users/directory`, contrato
 * `usuarios-directorio.md` v1).
 * - Paso 1: Datos del usuario (Nombre completo, Correo y Contraseña inicial; sin «Confirmar», FNC-139).
 * - Paso 2: Accesos con Dual Picklist (Áreas disponibles a la izquierda, Áreas asignadas a la derecha).
 * - Validación en el cliente, foco en el primer error.
 * - Admin de área: al menos un área de las suyas; superadmin: opcional.
 * - 409 por campo, 422 sin texto del servidor, 404, 503 y genérico.
 * - `aria-disabled` durante el envío; carga, error y vacío de las áreas.
 * - Enganche en `UsersList`: aviso con foco y recarga tras crear.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/toast';
import type { Area, ManagedUser } from '@/lib/types';

vi.mock('@/lib/access/users', () => ({
  usersApi: {
    setManagedAreas: vi.fn(), createDirectoryAccount: vi.fn(), passwordPolicy: vi.fn(), resendCredentials: vi.fn(),
  },
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
import { mensajeDeIncumplimiento } from '@/lib/contrasena';
import type { PasswordPolicy } from '@/lib/access/types';

const POLITICA: PasswordPolicy = {
  min_length: 16, max_length: 128,
  required_classes: ['mayusculas', 'minusculas', 'digitos', 'simbolos'],
  symbols: '!#$%&()*+,-./:;<=>?@[]^_{}~',
};
/** Contraseña ficticia que cumple la política. */
const VALIDA = 'Clave-De-Prueba-2026!x';

const AREAS = [
  { id: 3, name: 'Finanzas', platforms_count: 0 },
  { id: 7, name: 'TI', platforms_count: 2 },
] as Area[];

const CREADA: ManagedUser = {
  id: 31, email: 'ana@ejemplo.local', name: 'Ana Ruiz', role: 'usuario', is_active: true,
  auth_source: 'ldap', areas: [{ id: 3, name: 'Finanzas' }], managed_areas: [], last_login_at: null,
  credentials_status: 'enviadas', credentials_sent_at: '2026-11-18T12:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  esSuperadmin = false;
  vi.mocked(usersApi.createDirectoryAccount).mockResolvedValue({ status: 'success', user: CREADA });
  vi.mocked(usersApi.passwordPolicy).mockResolvedValue({ status: 'success', policy: POLITICA });
});

afterEach(() => {
  cleanup();
});

/** Monta el alta dentro del proveedor de avisos y espera la política del backend. */
async function montar(props: Partial<React.ComponentProps<typeof DirectoryAccountForm>> = {}) {
  const onCreated = vi.fn();
  render(
    <ToastProvider>
      <DirectoryAccountForm
        areas={AREAS} areasRequired onClose={vi.fn()} onCreated={onCreated} {...props}
      />
    </ToastProvider>,
  );
  await screen.findByPlaceholderText('Mínimo 16 caracteres');
  return { onCreated };
}

function llenarPaso1(valores: Partial<Record<'nombre' | 'email' | 'password', string>> = {}) {
  const v = {
    nombre: 'Ana Ruiz',
    email: 'ana@ejemplo.local',
    password: VALIDA,
    ...valores,
  };
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: v.nombre } });
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: v.email } });
  fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: v.password } });
}

function avanzarAlPaso2() {
  fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));
}

const enviar = () => fireEvent.click(screen.getByText('Crear'));

describe('DirectoryAccountForm - Flujo de 2 pasos', () => {
  it('Paso 1: campos de datos del usuario presentes y con etiquetas, sin «Confirmar»', async () => {
    await montar();
    expect(screen.getByLabelText('Nombre completo')).toBeTruthy();
    expect(screen.getByLabelText('Correo')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña inicial')).toBeTruthy();
    expect(screen.queryByLabelText(/confirmar/i)).toBeNull();
    expect(usersApi.passwordPolicy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Datos de usuario')).toBeTruthy();
    expect(screen.getByText('Accesos y áreas')).toBeTruthy();
  });

  it('Paso 1: valida campos obligatorios y la política del backend, con mensaje por regla', async () => {
    await montar();
    avanzarAlPaso2();
    expect(screen.getByText('Por favor completa todos los datos obligatorios correctamente.')).toBeTruthy();

    // 15 caracteres: no cumple (el mínimo sale de la API, no del cliente).
    llenarPaso1({ password: 'Abcdefghi-12345' });
    avanzarAlPaso2();
    const campo = screen.getByLabelText('Contraseña inicial');
    expect(screen.getByText('Entre 16 y 128 caracteres.')).toBeTruthy();
    const error = screen.getByText('Entre 16 y 128 caracteres.');
    // La política (visible siempre) y el error describen el campo.
    expect(campo.getAttribute('aria-describedby')).toBe(`alta-directorio-contrasena-politica ${error.id}`);
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(usersApi.createDirectoryAccount).not.toHaveBeenCalled();

    llenarPaso1({ password: 'abcdefghij-123456' });
    avanzarAlPaso2();
    expect(screen.getByText('Falta al menos una mayúscula.')).toBeTruthy();
  });

  it('el mínimo sale de la política de la API y no de un valor fijo del cliente', async () => {
    vi.mocked(usersApi.passwordPolicy).mockResolvedValue(
      { status: 'success', policy: { ...POLITICA, min_length: 20 } });
    render(
      <ToastProvider>
        <DirectoryAccountForm areas={AREAS} areasRequired onClose={vi.fn()} onCreated={vi.fn()} />
      </ToastProvider>,
    );
    await screen.findByPlaceholderText('Mínimo 20 caracteres');
    llenarPaso1({ password: VALIDA }); // 22 caracteres: cumple
    avanzarAlPaso2();
    expect(screen.queryByText('Entre 20 y 128 caracteres.')).toBeNull();
    expect(screen.getByText('Áreas disponibles')).toBeTruthy();
  });

  it('el generador usa la política, la asigna al campo y se puede mostrar u ocultar con aria-pressed', async () => {
    await montar();
    const btnGenerar = screen.getByRole('button', { name: /generar contraseña/i });

    fireEvent.click(btnGenerar);

    const inputPass = screen.getByLabelText('Contraseña inicial') as HTMLInputElement;
    expect(mensajeDeIncumplimiento(inputPass.value, POLITICA)).toBeNull();
    expect(inputPass.autocomplete).toBe('new-password');
    // Se muestra para que el administrador la vea.
    expect(inputPass.type).toBe('text');

    // Etiqueta fija «Mostrar contraseña»; el estado lo da aria-pressed.
    const btnMostrar = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(btnMostrar.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btnMostrar);
    expect(inputPass.type).toBe('password');
    expect(btnMostrar.getAttribute('aria-pressed')).toBe('false');
  });

  it('el generador no usa Math.random', async () => {
    await montar();
    const azar = vi.spyOn(Math, 'random');
    fireEvent.click(screen.getByRole('button', { name: /generar contraseña/i }));
    expect(azar).not.toHaveBeenCalled();
    azar.mockRestore();
  });

  it('Paso 1 a Paso 2: avanza cuando los datos son válidos y muestra Dual Picklist', async () => {
    await montar();
    llenarPaso1();
    avanzarAlPaso2();

    expect(screen.getByText('Áreas disponibles')).toBeTruthy();
    expect(screen.getByText('Áreas asignadas')).toBeTruthy();
    expect(screen.getByRole('button', { name: /atrás/i })).toBeTruthy();
    expect(screen.getByText('Crear')).toBeTruthy();
  });

  it('Paso 2 a Paso 1: botón atrás regresa al paso 1 conservando valores', async () => {
    await montar();
    llenarPaso1({ nombre: 'Carlos Gomez' });
    avanzarAlPaso2();

    fireEvent.click(screen.getByRole('button', { name: /atrás/i }));
    expect(screen.getByLabelText('Nombre completo')).toBeTruthy();
    expect((screen.getByLabelText('Nombre completo') as HTMLInputElement).value).toBe('Carlos Gomez');
  });

  it('envía los datos del usuario y áreas asignadas y llama onCreated', async () => {
    const { onCreated } = await montar();
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
      password: VALIDA,
    });
  });

  it('tras crear avisa «credenciales enviadas» y borra la contraseña del estado y del almacenamiento', async () => {
    const { onCreated } = await montar();
    llenarPaso1();
    avanzarAlPaso2();
    fireEvent.click(screen.getByLabelText('Asignar Finanzas'));
    enviar();

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(await screen.findByText('Se envió por correo el enlace con la contraseña inicial.')).toBeTruthy();
    expect(JSON.stringify(window.localStorage)).not.toContain(VALIDA);
    expect(JSON.stringify(window.sessionStorage)).not.toContain(VALIDA);
    expect(window.location.href).not.toContain(VALIDA);
  });

  it('tras crear con Vaultwarden caído avisa «credenciales pendientes»', async () => {
    vi.mocked(usersApi.createDirectoryAccount).mockResolvedValue(
      { status: 'success', user: { ...CREADA, credentials_status: 'pendientes', credentials_sent_at: null } });
    const { onCreated } = await montar({ areasRequired: false });
    llenarPaso1();
    avanzarAlPaso2();
    enviar();

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(await screen.findByText(
      'Las credenciales quedaron pendientes: se reintentará la entrega automáticamente.')).toBeTruthy();
  });

  it('un 422 de la política del servidor regresa al paso 1 con el mensaje del contrato', async () => {
    vi.mocked(usersApi.createDirectoryAccount).mockRejectedValue(new ApiError(
      422, 'texto del servidor', { code: 'validacion', fields: {
        password: 'El directorio rechazó la contraseña por su política de seguridad.' } }));
    await montar({ areasRequired: false });
    llenarPaso1();
    avanzarAlPaso2();
    enviar();

    const aviso = await screen.findAllByText(
      'El directorio rechazó la contraseña por su política de seguridad.');
    expect(aviso.length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Contraseña inicial')).toBeTruthy();
  });

  it('un mensaje desconocido de fields.password no se muestra: sale el fijo del cliente', () => {
    const vista = describeDirectoryAccountError(new ApiError(
      422, 'x', { code: 'validacion', fields: { password: 'detalle interno ldap.servidor' } }));
    expect(vista.fields.password).toBe(MENSAJES_CAMPO.password);
  });

  it('admin de área: sin área seleccionada marca error y no envía', async () => {
    await montar({ areasRequired: true });
    llenarPaso1();
    avanzarAlPaso2();

    enviar();
    expect(usersApi.createDirectoryAccount).not.toHaveBeenCalled();
    expect(screen.getByText('Elige al menos un área de tu alcance para continuar.')).toBeTruthy();
  });

  it('superadmin: las áreas son opcionales en el paso 2', async () => {
    await montar({ areasRequired: false });
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
    await montar({ areasRequired: false });
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
    await montar({ areasRequired: false });
    llenarPaso1();
    avanzarAlPaso2();
    enviar();

    expect(await screen.findByText(MENSAJE_CORREO_DUPLICADO)).toBeTruthy();
    expect(screen.getByLabelText('Correo')).toBeTruthy();
  });
});

describe('validación y errores del alta', () => {
  const base = { uid: 'ana', email: 'a@b.mx', given_name: 'A', surname: 'R', area_ids: [], password: VALIDA };

  it('validarStep1 valida nombre, correo y contraseña con la política', () => {
    expect(validarStep1({ fullName: '', email: '', password: '' }, POLITICA)).toEqual({
      fullName: 'Es obligatorio.',
      email: 'Es obligatorio.',
      password: 'Es obligatoria.',
    });

    expect(validarStep1({
      fullName: 'Ana Ruiz', email: 'ana@ejemplo.com', password: 'pass',
    }, POLITICA).password).toBe('Entre 16 y 128 caracteres.');

    expect(validarStep1({
      fullName: 'Ana Ruiz', email: 'ana@ejemplo.com', password: VALIDA,
    }, POLITICA)).toEqual({});
  });

  it('sin política cargada solo se exige que no esté vacía (el servidor valida el resto)', () => {
    expect(validarStep1({ fullName: 'A', email: 'a@b.mx', password: 'x' }, null)).toEqual({});
    expect(validarStep1({ fullName: 'A', email: 'a@b.mx', password: '' }, null).password)
      .toBe('Es obligatoria.');
  });

  it('reglas del contrato en validarAlta', () => {
    expect(validarAlta(base, false)).toEqual({});
    expect(validarAlta({ ...base, uid: 'ab' }, false).uid).toBe(MENSAJES_CAMPO.uid);
  });

  it('el cuerpo no lleva campos fuera de la lista blanca', () => {
    expect(Object.keys(cuerpoAlta(base)).sort())
      .toEqual(['area_ids', 'email', 'given_name', 'password', 'surname', 'uid']);
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
    render(<ToastProvider><UsersList /></ToastProvider>);
    fireEvent.click(await screen.findByText('Nuevo usuario'));
    const modal = within(screen.getByRole('dialog'));
    expect(modal.getByLabelText('Nombre completo')).toBeTruthy();

    llenarPaso1();
    avanzarAlPaso2();

    expect(modal.getByText('Áreas disponibles')).toBeTruthy();
    fireEvent.click(modal.getByLabelText('Asignar Finanzas'));
    enviar();

    // DIS-091: el resultado sale en un toast y el foco vuelve a "Nuevo usuario".
    const aviso = await screen.findByText('Ana Ruiz se agregó al directorio.');
    expect(aviso.closest('.nx-toast')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Nuevo usuario'));
    await waitFor(() => expect(api.users).toHaveBeenCalledTimes(2));
  });
});
