import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    session: vi.fn().mockRejectedValue(new Error('Sin sesión')),
  },
}));

import { PaginaPortada } from '@/components/portada/pagina-portada';
import RootPage from '@/app/page';
import PortadaPage from '@/app/portada/page';

describe('Página de Portada / Presentación de Aduana (DIS-118)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockRedirect.mockClear();
    mockReplace.mockClear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('renderiza la cabecera con el logotipo, nombre de la plataforma y botón directo a /login', () => {
    render(<PaginaPortada />);

    // Logotipo y nombre
    expect(screen.getByText('Aduana')).toBeDefined();
    expect(screen.getByText('v2.0')).toBeDefined();

    // Enlaces de llamada a la acción que apuntan al login
    const botonesLogin = screen.getAllByRole('link', { name: /iniciar sesión/i });
    expect(botonesLogin.length).toBeGreaterThanOrEqual(1);
    expect(botonesLogin[0].getAttribute('href')).toBe('/login');
  });

  it('describe la problemática del Shadow IT y la misión de Aduana', () => {
    render(<PaginaPortada />);

    expect(screen.getByText(/¿por qué se creó aduana y qué problemática resuelve\?/i)).toBeDefined();
    expect(screen.getByText(/el caos previo \(sin aduana\)/i)).toBeDefined();
    expect(screen.getByText(/la solución aduana/i)).toBeDefined();
    expect(screen.getByText(/shadow it descontrolado:/i)).toBeDefined();
    expect(screen.getByText(/catálogo único de la verdad:/i)).toBeDefined();
  });

  it('describe el flujo de funcionamiento en 4 etapas', () => {
    render(<PaginaPortada />);

    expect(screen.getByText(/¿cómo funciona la plataforma\?/i)).toBeDefined();
    expect(screen.getByText('Descubrimiento')).toBeDefined();
    expect(screen.getByText('Solicitud Segura')).toBeDefined();
    expect(screen.getByText('Aprobación TI')).toBeDefined();
    expect(screen.getByText('Aprovisionamiento')).toBeDefined();
  });

  it('permite alternar entre capturas de pantalla de módulos clave', () => {
    render(<PaginaPortada />);

    // Por defecto se encuentra seleccionada la primera captura (Catálogo General)
    const botonPlataforma = screen.getByRole('button', { name: /diseño de plataformas \(patrón suizo\)/i });
    expect(botonPlataforma).toBeDefined();

    fireEvent.click(botonPlataforma);

    // Debe mostrar la información de la captura seleccionada
    expect(screen.getByText('Vista previa en tiempo real con altura estandarizada de 240px')).toBeDefined();
    expect(screen.getByAltText('Diseño de Plataformas (Patrón Suizo)')).toBeDefined();
  });

  it('ofrece sección de preguntas frecuentes con acordeón interactivo', () => {
    render(<PaginaPortada />);

    const botonFaq = screen.getByRole('button', { name: /¿por qué se creó aduana en lugar de gestionar accesos por tickets o correo\?/i });
    expect(botonFaq).toBeDefined();

    fireEvent.click(botonFaq);

    expect(
      screen.getByText(/se creó para erradicar el shadow it \(herramientas contratadas o compartidas de manera informal\)/i)
    ).toBeDefined();
  });

  it('la raíz (/) renderiza directamente la portada si está activa', () => {
    vi.stubEnv('PORTADA_ACTIVA', 'true');
    render(<RootPage />);

    expect(screen.getByText('El acceso correcto.')).toBeDefined();
    expect(screen.getByText('Para cada persona.')).toBeDefined();
  });

  it('la raíz (/) redirige a /login cuando PORTADA_ACTIVA es false', async () => {
    vi.stubEnv('PORTADA_ACTIVA', 'false');
    delete process.env.NEXT_PUBLIC_PORTADA_ACTIVA;

    render(<RootPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('la ruta /portada muestra la presentación cuando está activa y redirige a /login si está inactiva', () => {
    vi.stubEnv('PORTADA_ACTIVA', 'true');
    render(<PortadaPage />);
    expect(screen.getByText('El acceso correcto.')).toBeDefined();
    expect(mockRedirect).not.toHaveBeenCalled();

    mockRedirect.mockClear();
    vi.stubEnv('PORTADA_ACTIVA', 'false');
    delete process.env.NEXT_PUBLIC_PORTADA_ACTIVA;
    render(<PortadaPage />);
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
