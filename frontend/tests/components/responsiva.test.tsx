import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModalResponsiva } from '@/components/responsiva/modal-responsiva';
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

describe('ModalResponsiva', () => {
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

  it('se despliega como modal accesible directamente en el portal con las herramientas asignadas', async () => {
    const onFirmado = vi.fn();
    renderWithToast(
      <ModalResponsiva session={mockSessionNoFirmada} onFirmado={onFirmado} />,
    );

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Carta Responsiva de Uso de Activos de Información y Plataformas Institucionales')).toBeTruthy();
    expect(screen.getByText(/Hola, Usuario Nuevo/)).toBeTruthy();
    expect(screen.getByText('Jira Software')).toBeTruthy();
    expect(screen.getByText('Área: Operaciones')).toBeTruthy();
    expect(screen.getByText('Texto legal de la responsiva institucional para el uso de plataformas.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cerrar sesión/i })).toBeTruthy();
    // DIS-098: la carta es obligatoria; sin una ✕ «Cerrar» que no cierra.
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });

  it('el botón de firma permanece deshabilitado hasta marcar la casilla de aceptación', async () => {
    const onFirmado = vi.fn();
    renderWithToast(
      <ModalResponsiva session={mockSessionNoFirmada} onFirmado={onFirmado} />,
    );

    await screen.findByRole('dialog');
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

  it('muestra contexto de nuevos accesos aprobados cuando es_aprobacion es true', async () => {
    vi.mocked(api.responsiva).mockResolvedValue({
      ...mockResponsivaData,
      es_aprobacion: true,
      titulo: 'Carta Responsiva: Aprobación de Nuevos Accesos a Plataformas',
    });

    const onFirmado = vi.fn();
    renderWithToast(
      <ModalResponsiva session={mockSessionNoFirmada} onFirmado={onFirmado} />,
    );

    expect(await screen.findByText('Nuevos Accesos Aprobados • Confirmación Requerida')).toBeTruthy();
    expect(screen.getByText('Plataformas recientemente aprobadas')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Firmar y activar accesos/i })).toBeTruthy();
  });

  // Auditoría de accesibilidad independiente (B3): el fondo queda inert bajo un diálogo modal,
  // así que la región de anuncios debe vivir dentro del diálogo para que el lector la lea.
  it('B3: la región de anuncios está dentro del diálogo, no fuera de él', async () => {
    renderWithToast(<ModalResponsiva session={mockSessionNoFirmada} onFirmado={vi.fn()} />);
    const dialogo = await screen.findByRole('dialog');
    const regiones = document.querySelectorAll('[data-region-anuncios]');
    expect(regiones).toHaveLength(1);
    expect(dialogo.contains(regiones[0])).toBe(true);
  });

  // DIS-100: con el mismo texto, React no cambia el DOM y el lector solo lo leía la primera vez.
  it('DIS-100: cada Escape vuelve a cambiar la región de anuncios para que se lea otra vez', async () => {
    renderWithToast(<ModalResponsiva session={mockSessionNoFirmada} onFirmado={vi.fn()} />);
    await screen.findByRole('dialog');
    const region = document.querySelector('[data-region-anuncios]') as HTMLElement;

    fireEvent.keyDown(document, { key: 'Escape' });
    const primero = region.textContent;
    fireEvent.keyDown(document, { key: 'Escape' });
    const segundo = region.textContent;

    expect(primero).toMatch(/aceptar la responsiva o cerrar sesión/);
    expect(segundo).toMatch(/aceptar la responsiva o cerrar sesión/);
    expect(segundo).not.toBe(primero);
  });

  it('M4: mientras falta la casilla, un texto visible explica por qué «Firmar» está deshabilitado', async () => {
    renderWithToast(<ModalResponsiva session={mockSessionNoFirmada} onFirmado={vi.fn()} />);
    await screen.findByRole('dialog');
    const boton = screen.getByRole('button', { name: /Firmar y acceder al portal/i });
    const id = boton.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toBe('Marca la casilla para firmar');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(boton.hasAttribute('aria-describedby')).toBe(false);
    expect(screen.queryByText('Marca la casilla para firmar')).toBeNull();
  });

  it('M5: la casilla usa el estilo estándar del proyecto', async () => {
    renderWithToast(<ModalResponsiva session={mockSessionNoFirmada} onFirmado={vi.fn()} />);
    await screen.findByRole('dialog');
    expect(screen.getByRole('checkbox').className).toContain('nexus-checkbox');
  });

  it('M8: el diálogo se describe con el texto de la carta', async () => {
    renderWithToast(<ModalResponsiva session={mockSessionNoFirmada} onFirmado={vi.fn()} />);
    const dialogo = await screen.findByRole('dialog');
    const id = dialogo.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toContain('Texto legal de la responsiva');
  });
});

describe('AppShell - Integración directa en el portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.responsiva).mockResolvedValue(mockResponsivaData);
  });

  afterEach(() => {
    cleanup();
  });

  it('si responsiva_firmada es false, mantiene el marco del portal y despliega el modal de responsiva encima', async () => {
    vi.mocked(api.session).mockResolvedValue(mockSessionNoFirmada);

    renderWithToast(
      <AppShell>
        <div data-testid="contenido-portal">Catálogo de Plataformas</div>
      </AppShell>,
    );

    // El marco del portal y el contenido están presentes
    expect(await screen.findByTestId('marco-principal')).toBeTruthy();
    expect(screen.getByTestId('contenido-portal')).toBeTruthy();

    // El modal de responsiva se muestra sobre el portal
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(await screen.findByText('Carta Responsiva de Uso de Activos de Información y Plataformas Institucionales')).toBeTruthy();
  });

  it('si responsiva_firmada es true, renderiza el portal normalmente sin modal', async () => {
    vi.mocked(api.session).mockResolvedValue({
      ...mockSessionNoFirmada,
      responsiva_firmada: true,
      responsiva_firmada_at: '2026-11-18T22:00:00Z',
    });

    renderWithToast(
      <AppShell>
        <div data-testid="contenido-portal">Catálogo de Plataformas</div>
      </AppShell>,
    );

    expect(await screen.findByTestId('marco-principal')).toBeTruthy();
    expect(screen.getByTestId('contenido-portal')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
