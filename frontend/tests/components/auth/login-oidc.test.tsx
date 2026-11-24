/**
 * FNC-142: entrada por Authelia (OIDC), acceso de emergencia y cierre de sesión.
 * Contrato `docs/contratos/autenticacion.md` v1. Sin red: `api` simulada.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const avisar = vi.fn();
vi.mock('@/components/toast', () => ({ useToast: () => ({ avisar, cerrar: vi.fn() }) }));
vi.mock('@/lib/api', () => ({
  api: { authContext: vi.fn(), loginLocal: vi.fn(), logout: vi.fn() },
}));

import { AccesoEmergenciaForm } from '@/components/acceso-emergencia-form';
import { LoginForm, URL_INICIO_OIDC } from '@/components/login-form';
import { LogoutView } from '@/components/logout-view';
import { api } from '@/lib/api';
import { mensajeErrorOidc, MENSAJE_ERROR_OIDC_DEFECTO } from '@/lib/errores-oidc';

const ctx = vi.mocked(api.authContext);
const loginLocal = vi.mocked(api.loginLocal);
const logout = vi.mocked(api.logout);
const original = window.location;

function simularUbicacion(search = '') {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '', search, pathname: '/login' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  simularUbicacion();
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'location', { configurable: true, value: original });
  vi.restoreAllMocks();
});

describe('LoginForm', () => {
  it('sin campos de contraseña y con un botón que navega al inicio del flujo', async () => {
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: false, emergency_available: true });
    render(<LoginForm />);
    const boton = await screen.findByRole('button', { name: /Iniciar Sesión con Authelia/ });
    expect(document.querySelector('input')).toBeNull();
    fireEvent.click(boton);
    expect(window.location.href).toBe(URL_INICIO_OIDC);
    expect(URL_INICIO_OIDC).toBe('/api/v1/auth/oidc/login');
  });

  it('no enlaza al acceso de emergencia', async () => {
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: false, emergency_available: true });
    const { container } = render(<LoginForm />);
    await screen.findByRole('button', { name: /Iniciar Sesión con Authelia/ });
    expect(container.querySelector('a[href*="emergencia"]')).toBeNull();
    expect(container.textContent).not.toMatch(/emergencia/i);
  });

  it('enlaza a la portada institucional cuando PORTADA_ACTIVA es true', async () => {
    vi.stubEnv('PORTADA_ACTIVA', 'true');
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: false, emergency_available: true });
    render(<LoginForm />);
    const enlace = await screen.findByRole('link', { name: /Conoce Aduana/ });
    expect(enlace.getAttribute('href')).toBe('/');
  });

  it('oculta el enlace a la portada cuando PORTADA_ACTIVA es false', async () => {
    vi.stubEnv('PORTADA_ACTIVA', 'false');
    delete process.env.NEXT_PUBLIC_PORTADA_ACTIVA;
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: false, emergency_available: true });
    render(<LoginForm />);
    await screen.findByRole('button', { name: /Iniciar Sesión con Authelia/ });
    expect(screen.queryByRole('link', { name: /Conoce Aduana/ })).toBeNull();
  });

  // Botón persistente (306161e): ya no se oculta con OIDC apagado; si hay URL directa de Authelia,
  // el botón lleva a ella y se ofrece además el enlace «Portal de Authelia».
  it('OIDC sin configurar: el botón persiste y lleva a la URL de Authelia', async () => {
    ctx.mockResolvedValue({
      oidc_enabled: false, authenticated: false, emergency_available: true,
      authelia_url: 'https://auth.ejemplo.test',
    });
    render(<LoginForm />);
    const boton = await screen.findByRole('button', { name: /Iniciar Sesión con Authelia/ });
    expect(screen.queryByText(/no está disponible/)).toBeNull();
    fireEvent.click(boton);
    expect(window.location.href).toBe('https://auth.ejemplo.test');
    const directo = screen.getByRole('link', { name: /Portal de Authelia/ });
    expect(directo.getAttribute('rel')).toContain('noopener');
  });

  it('FNC-158: Authelia apagado muestra usuario y contraseña y entra por /auth/local', async () => {
    ctx.mockResolvedValue({
      oidc_enabled: false, authenticated: false, emergency_available: true, local_login: true,
    });
    loginLocal.mockResolvedValue({ status: 'success', role: 'usuario' } as never);
    render(<LoginForm />);
    const usuario = await screen.findByLabelText(/Usuario/);
    fireEvent.change(usuario, { target: { value: 'persona@ejemplo.test' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'clave' } });
    expect(screen.queryByRole('button', { name: /Authelia/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));
    await waitFor(() => expect(loginLocal).toHaveBeenCalledWith('persona@ejemplo.test', 'clave'));
    await waitFor(() => expect(window.location.href).toBe('/dashboard'));
  });

  it('con sesión válida redirige a /', async () => {
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: true, emergency_available: true });
    render(<LoginForm />);
    await waitFor(() => expect(window.location.href).toBe('/dashboard'));
  });

  it('error del callback: toast genérico y URL limpia', async () => {
    simularUbicacion('?error=cuenta_no_disponible');
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: false, emergency_available: true });
    render(<LoginForm />);
    await screen.findByRole('button', { name: /Iniciar Sesión con Authelia/ });
    expect(avisar).toHaveBeenCalledWith('error', mensajeErrorOidc('cuenta_no_disponible'));
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/login');
  });

  it('código desconocido: mensaje genérico, sin reflejar el valor', () => {
    expect(mensajeErrorOidc('<script>x</script>')).toBe(MENSAJE_ERROR_OIDC_DEFECTO);
    expect(mensajeErrorOidc('constructor')).toBe(MENSAJE_ERROR_OIDC_DEFECTO);
  });
});

describe('AccesoEmergenciaForm', () => {
  function llenar() {
    const [usuario, clave] = Array.from(document.querySelectorAll('input'));
    fireEvent.change(usuario, { target: { value: 'emergencia@x.test' } });
    fireEvent.change(clave, { target: { value: 'clave' } });
  }

  it('éxito: llama a /auth/local y entra a /', async () => {
    loginLocal.mockResolvedValue({ status: 'success', role: 'administrador' });
    render(<AccesoEmergenciaForm />);
    llenar();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));
    await waitFor(() => expect(window.location.href).toBe('/dashboard'));
    expect(loginLocal).toHaveBeenCalledWith('emergencia@x.test', 'clave');
  });

  it('fallo: toast con el mensaje único y sin redirigir', async () => {
    loginLocal.mockRejectedValue(new Error('Credenciales incorrectas.'));
    render(<AccesoEmergenciaForm />);
    llenar();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));
    await waitFor(() => expect(avisar).toHaveBeenCalledWith('error', 'Credenciales incorrectas.'));
    expect(window.location.href).toBe('');
  });
});

describe('LogoutView', () => {
  it('navega a la URL de cierre de Authelia cuando el backend la devuelve', async () => {
    logout.mockResolvedValue({ status: 'success', redirect: 'https://auth.example.test/logout' });
    render(<LogoutView />);
    await waitFor(() => expect(window.location.href).toBe('https://auth.example.test/logout'));
  });

  it('sin redirect muestra «Sesión cerrada» y el enlace a /login', async () => {
    logout.mockResolvedValue({ status: 'success', redirect: null });
    render(<LogoutView />);
    expect(await screen.findByText('Sesión cerrada')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/login');
  });
});

describe('LoginForm simplificado (DIS-121)', () => {
  it('solo ofrece el botón y una línea de ayuda; sin caja ni notas extra', async () => {
    render(<LoginForm />);
    await screen.findByRole('button', { name: /Iniciar Sesión con Authelia/ });
    const ayuda = screen.getByRole('navigation', { name: 'Ayuda para iniciar sesión' });
    expect(ayuda.textContent).toContain('¿Olvidaste o caducó tu contraseña?');
    expect(screen.getByRole('link', { name: /Olvidaste o caducó tu contraseña/ }).getAttribute('href')).toBe('/autoservicio');
    expect(screen.queryByText(/Autenticación federada/)).toBeNull();
    expect(screen.queryByText(/No requieres iniciar sesión/)).toBeNull();
    expect(screen.queryByText(/Gobernanza y Control Centralizado/)).toBeNull();
  });
});
