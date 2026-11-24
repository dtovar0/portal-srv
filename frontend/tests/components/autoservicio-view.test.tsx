import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const avisar = vi.fn();
vi.mock('@/components/toast', () => ({ useToast: () => ({ avisar, cerrar: vi.fn() }) }));
vi.mock('@/lib/api', () => ({
  api: {
    autoservicioConfiguracion: vi.fn(),
    autoservicioSolicitarMfa: vi.fn(),
    autoservicioVerificarMfa: vi.fn(),
    autoservicioRestablecer: vi.fn(),
    autoservicioRestablecerMfa: vi.fn(),
  },
}));

import { AutoservicioView } from '@/components/autoservicio-view';
import { api } from '@/lib/api';

const configuracion = {
  status: 'success',
  brand_name: 'Authelia',
  mfa_enabled: true,
  mfa_tipo: 'email' as const,
  mfa_ttl_minutos: 10,
  authelia_url: '/login',
  password_length: 16,
  politica: {
    min_length: 16,
    max_length: 128,
    required_classes: ['upper', 'lower', 'number', 'symbol'],
    symbols: '!#$%',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.autoservicioConfiguracion).mockResolvedValue(configuracion);
  window.history.replaceState(null, '', '/autoservicio');
});

afterEach(cleanup);

describe('AutoservicioView', () => {
  it('presenta la identidad corporativa y el primer paso accesible', async () => {
    render(<AutoservicioView />);

    expect(screen.getByRole('complementary', { name: /Authelia, identidad corporativa/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Recupera el acceso a tu cuenta/i })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: /Paso 1 de 3/i })).toBeTruthy();
    expect(screen.getByLabelText(/Usuario o correo Authelia/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Continuar/i }).hasAttribute('disabled')).toBe(true);

    await waitFor(() => expect(api.autoservicioConfiguracion).toHaveBeenCalledOnce());
  });

  it('usa una cuadrícula corporativa simétrica en escritorio', () => {
    const { container } = render(<AutoservicioView />);
    const shell = container.querySelector('main > div');

    expect(shell?.className).toContain('md:grid-cols-2');
    expect(shell?.className).toContain('md:h-185');
    expect(screen.queryByRole('button', { name: /Restablecer otra cuenta/i })).toBeNull();
  });
});
