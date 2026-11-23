import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '@/app/requests/page';
import { CLAVE_MOSTRAR_DOCUMENTOS } from '@/components/platforms/user-view-settings';

let sesionMock = {
  name: 'Test User',
  email: 'test@example.com',
  role: 'usuario' as const,
  managed_areas: [],
  preferences: { refresh_interval: 60 },
  permissions: {
    is_admin: false,
    is_area_admin: false,
    can_manage_areas: false,
    can_manage_system: false,
  },
  responsiva_firmada: false,
};

vi.mock('@/components/session-provider', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: () => ({
    session: sesionMock,
    loading: false,
    error: null,
    actualizarSesion: vi.fn(),
    recargarSesion: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    platforms: vi.fn().mockResolvedValue([]),
    responsiva: vi.fn().mockResolvedValue({
      usuario: { nombre: 'Test User', email: 'test@example.com' },
      fecha: '2026-11-22',
      plataformas: [],
      areas: [],
    }),
  },
}));

vi.mock('@/lib/access/requests', () => ({
  requestsApi: {
    mine: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, per_page: 10 }),
  },
}));

describe('Página /requests - Visibilidad de Carta Responsiva', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sesionMock = {
      ...sesionMock,
      responsiva_firmada: false,
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('no muestra el modal ni el botón de Carta Responsiva cuando mostrarDocumentos es false en ajustes de vista', () => {
    window.localStorage.setItem(CLAVE_MOSTRAR_DOCUMENTOS, 'false');

    render(<Page />);

    // El modal de responsiva no debe aparecer
    expect(screen.queryByRole('dialog', { name: /carta responsiva/i })).toBeNull();
    expect(screen.queryByText(/firma de carta responsiva/i)).toBeNull();

    // El botón de responsiva en la topbar no debe aparecer
    expect(screen.queryByRole('button', { name: /carta responsiva/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /carta responsiva/i })).toBeNull();
  });

  it('muestra el modal y el botón de Carta Responsiva cuando mostrarDocumentos es true y la responsiva está pendiente', async () => {
    window.localStorage.setItem(CLAVE_MOSTRAR_DOCUMENTOS, 'true');

    render(<Page />);

    // El modal de responsiva sí debe aparecer cuando está visible en ajustes
    const modal = await screen.findByRole('dialog', { name: /carta responsiva/i });
    expect(modal).toBeDefined();

    // El botón de responsiva en la topbar sí debe aparecer
    expect(screen.getByRole('link', { name: /carta responsiva/i })).toBeDefined();
  });
});
