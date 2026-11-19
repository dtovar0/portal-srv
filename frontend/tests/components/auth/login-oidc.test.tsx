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
    const boton = await screen.findByRole('button', { name: /Entrar con Authelia/ });
    expect(document.querySelector('input')).toBeNull();
    fireEvent.click(boton);
    expect(window.location.href).toBe(URL_INICIO_OIDC);
    expect(URL_INICIO_OIDC).toBe('/api/v1/auth/oidc/login');
  });

  it('no enlaza al acceso de emergencia', async () => {
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: false, emergency_available: true });
    const { container } = render(<LoginForm />);
    await screen.findByRole('button', { name: /Entrar con Authelia/ });
    expect(container.querySelector('a[href*="emergencia"]')).toBeNull();
    expect(container.textContent).not.toMatch(/emergencia/i);
  });

  it('OIDC sin configurar: sin botón y con aviso', async () => {
    ctx.mockResolvedValue({ oidc_enabled: false, authenticated: false, emergency_available: true });
    render(<LoginForm />);
    expect(await screen.findByText(/no está disponible/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con sesión válida redirige a /', async () => {
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: true, emergency_available: true });
    render(<LoginForm />);
    await waitFor(() => expect(window.location.href).toBe('/'));
  });

  it('error del callback: toast genérico y URL limpia', async () => {
    simularUbicacion('?error=cuenta_no_disponible');
    ctx.mockResolvedValue({ oidc_enabled: true, authenticated: false, emergency_available: true });
    render(<LoginForm />);
    await screen.findByRole('button', { name: /Entrar con Authelia/ });
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
    await waitFor(() => expect(window.location.href).toBe('/'));
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
