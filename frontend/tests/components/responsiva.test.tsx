import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PantallaResponsiva } from '@/components/responsiva/pantalla-responsiva';
import { AppShell } from '@/components/app-shell';
import { ToastProvider } from '@/components/toast';
import { api } from '@/lib/api';
import type { ResponsivaData, Session } from '@/lib/types';

vi.mock('@/lib/api', () => ({
  api: {
    responsiva: vi.fn(),
    firmarResponsiva: vi.fn(),
    session: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

vi.mock('@/components/marco/marco', () => ({
  Marco: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marco-principal">{children}</div>
  ),
}));

const mockSessionNoFirmada: Session = {
  id: 42,
  email: 'usuario.nuevo@empresa.local',
  name: 'Usuario Nuevo',
  role: 'usuario',
  auth_source: 'local',
  responsiva_firmada: false,
  responsiva_firmada_at: null,
  responsiva_version: '1.0',
  areas: [{ id: 1, name: 'Operaciones' }],
  managed_areas: [],
  permissions: {
    is_admin: false,
    is_area_admin: false,
    can_manage_areas: false,
    can_manage_system: false,
  },
  preferences: {
    notifications: true,
    email_notifications: true,
    refresh_interval: 60,
    tour_enabled: true,
  },
};

const mockResponsivaData: ResponsivaData = {
  version: '1.0',
  firmada: false,
  firmada_at: null,
  titulo: 'Carta Responsiva de Uso de Activos de Información y Plataformas Institucionales',
  contenido: 'Texto legal de la responsiva institucional para el uso de plataformas.',
  areas: [{ id: 1, name: 'Operaciones' }],
  plataformas: [{ id: 10, name: 'Jira Software', area_name: 'Operaciones', level: 'usuario' }],
};

function renderWithToast(ui: React.ReactElement) {
  return rtlRender(<ToastProvider>{ui}</ToastProvider>);
}

describe('PantallaResponsiva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.responsiva).mockResolvedValue(mockResponsivaData);
    vi.mocked(api.firmarResponsiva).mockResolvedValue({
      status: 'success',
      message: 'Firmado',
      firmada_at: '2026-11-18T22:00:00Z',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra la carta responsiva, las herramientas asignadas y el estado de lectura obligatoria', async () => {
    const onFirmado = vi.fn();
    renderWithToast(
      <PantallaResponsiva session={mockSessionNoFirmada} onFirmado={onFirmado} />,
    );

    expect(await screen.findByText('Portal de Accesos Institucionales')).toBeTruthy();
    expect(screen.getByText(/Hola, Usuario Nuevo/)).toBeTruthy();
    expect(screen.getByText('Jira Software')).toBeTruthy();
    expect(screen.getByText('Área: Operaciones')).toBeTruthy();
    expect(screen.getByText('Texto legal de la responsiva institucional para el uso de plataformas.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cerrar sesión/i })).toBeTruthy();
  });

  it('el botón de firma permanece deshabilitado hasta marcar la casilla de aceptación', async () => {
    const onFirmado = vi.fn();
    renderWithToast(
      <PantallaResponsiva session={mockSessionNoFirmada} onFirmado={onFirmado} />,
    );

    await screen.findByText('Portal de Accesos Institucionales');
    const botonFirmar = screen.getByRole('button', { name: /Firmar y acceder al portal/i }) as HTMLButtonElement;
    expect(botonFirmar.disabled).toBe(true);

    // Marcar la casilla
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(botonFirmar.disabled).toBe(false);

    // Enviar firma
    fireEvent.click(botonFirmar);
    await waitFor(() => expect(api.firmarResponsiva).toHaveBeenCalledTimes(1));
    expect(onFirmado).toHaveBeenCalledTimes(1);
  });
});

describe('AppShell - Bloqueo de Responsiva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.responsiva).mockResolvedValue(mockResponsivaData);
  });

  afterEach(() => {
    cleanup();
  });

  it('si responsiva_firmada es false, bloquea el marco y renderiza exclusivamente la responsiva', async () => {
    vi.mocked(api.session).mockResolvedValue(mockSessionNoFirmada);

    renderWithToast(
      <AppShell>
        <div data-testid="contenido-protegido">Contenido Secreto</div>
      </AppShell>,
    );

    expect(await screen.findByText('Portal de Accesos Institucionales')).toBeTruthy();
    expect(screen.queryByTestId('marco-principal')).toBeNull();
    expect(screen.queryByTestId('contenido-protegido')).toBeNull();
  });

  it('si responsiva_firmada es true, renderiza el marco y el contenido normalmente', async () => {
    vi.mocked(api.session).mockResolvedValue({
      ...mockSessionNoFirmada,
      responsiva_firmada: true,
      responsiva_firmada_at: '2026-11-18T22:00:00Z',
    });

    renderWithToast(
      <AppShell>
        <div data-testid="contenido-protegido">Contenido Libre</div>
      </AppShell>,
    );

    expect(await screen.findByTestId('marco-principal')).toBeTruthy();
    expect(screen.getByTestId('contenido-protegido')).toBeTruthy();
    expect(screen.queryByText('Portal de Accesos Institucionales')).toBeNull();
  });
});
