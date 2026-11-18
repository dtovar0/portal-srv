/**
 * Pruebas unitarias de la pestaña Ajustes › Importación masiva (Bulk Import).
 * Verifica renderizado, cambio de entidad, parseo de CSV/JSON, validaciones
 * fila a fila (rechazo de rol administrador por seguridad), llamada a la API
 * y descarga de plantillas.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkImportTab } from '@/components/settings/bulk-import-tab';
import { SettingsPanel } from '@/components/settings-panel';
import { api } from '@/lib/api';

vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: {
    settings: vi.fn(),
    smtp: vi.fn(),
    templates: vi.fn(),
    bulkImport: vi.fn(),
    downloadImportTemplate: vi.fn(),
  },
}));

const sesion = vi.hoisted(() => ({ isAdmin: true }));
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    loading: false,
    error: null,
    session: {
      id: 1,
      role: sesion.isAdmin ? 'administrador' : 'usuario',
      managed_areas: [],
      preferences: {
        notifications: true,
        email_notifications: false,
        tour_enabled: false,
        refresh_interval: 60,
      },
      permissions: {
        is_admin: sesion.isAdmin,
        is_area_admin: false,
        can_manage_areas: false,
        can_manage_system: sesion.isAdmin,
      },
    },
  }),
}));

describe('BulkImportTab (Ajustes › Importación masiva)', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    sesion.isAdmin = true;
    vi.mocked(api.settings).mockResolvedValue({
      portal_name: 'Nexus',
      bg_color: '',
      text_color: '',
      portal_identity_type: 'icon',
      portal_icon: 'plataformas',
    } as any);
  });

  it('renderiza el selector de entidad y la guía de formato por omisión (usuarios)', () => {
    render(<BulkImportTab />);

    expect(screen.getByText('1. Selecciona la entidad a importar')).toBeTruthy();
    expect(screen.getByRole('button', { name: /usuarios y cuentas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /áreas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /plataformas/i })).toBeTruthy();

    expect(screen.getByText('Formato esperado para users')).toBeTruthy();
    expect(screen.getByRole('button', { name: /descargar plantilla csv/i })).toBeTruthy();
  });

  it('permite cambiar entre entidades y actualiza la guía correspondiente', () => {
    render(<BulkImportTab />);

    const btnAreas = screen.getByRole('button', { name: /áreas/i });
    fireEvent.click(btnAreas);
    expect(screen.getByText('Formato esperado para areas')).toBeTruthy();

    const btnPlataformas = screen.getByRole('button', { name: /plataformas/i });
    fireEvent.click(btnPlataformas);
    expect(screen.getByText('Formato esperado para platforms')).toBeTruthy();
  });

  it('parsea y valida filas de texto CSV detectando registros válidos y con error', async () => {
    render(<BulkImportTab />);

    // Cambiar a modo texto
    fireEvent.click(screen.getByRole('button', { name: /pegar texto/i }));

    const textarea = screen.getByPlaceholderText(/nombre,correo,rol,areas/i);
    const csvContent =
      'nombre,correo,rol,areas\n' +
      'Ana Ruiz,ana@ejemplo.com,usuario,Finanzas\n' +
      'Invalido,correo-sin-arroba,usuario,TI\n' +
      'Carlos Super,carlos@ejemplo.com,administrador,Finanzas\n';

    fireEvent.change(textarea, { target: { value: csvContent } });

    // Previsualización y conteos
    expect(await screen.findByText('3. Previsualización')).toBeTruthy();
    expect(screen.getByText('Total: 3')).toBeTruthy();
    expect(screen.getByText('Válidos: 1')).toBeTruthy();
    expect(screen.getByText('Errores: 2')).toBeTruthy();

    // Verificación de motivos de error en la tabla
    expect(screen.getByText(/formato de correo no válido/i)).toBeTruthy();
    expect(screen.getByText(/no se permite rol administrador/i)).toBeTruthy();
  });

  it('ejecuta la importación llamando a api.bulkImport con los registros válidos', async () => {
    vi.mocked(api.bulkImport).mockResolvedValue({
      status: 'success',
      entity: 'users',
      dry_run: false,
      total: 1,
      valid: 1,
      created: 1,
      errors: [],
      items: [
        {
          row: 1,
          name: 'Ana Ruiz',
          email: 'ana@ejemplo.com',
          role: 'usuario',
          status: 'valid',
          error: null,
        },
      ],
    });

    render(<BulkImportTab />);
    fireEvent.click(screen.getByRole('button', { name: /pegar texto/i }));

    const textarea = screen.getByPlaceholderText(/nombre,correo,rol,areas/i);
    fireEvent.change(textarea, {
      target: {
        value: 'nombre,correo,rol,areas\nAna Ruiz,ana@ejemplo.com,usuario,Finanzas',
      },
    });

    const botonImportar = await screen.findByRole('button', { name: /importar 1 registros/i });
    fireEvent.click(botonImportar);

    await waitFor(() => {
      expect(api.bulkImport).toHaveBeenCalledWith(
        'users',
        [
          {
            nombre: 'Ana Ruiz',
            correo: 'ana@ejemplo.com',
            rol: 'usuario',
            areas: 'Finanzas',
          },
        ],
        false
      );
    });

    expect(
      await screen.findByText('Se han importado 1 registros correctamente.')
    ).toBeTruthy();
  });

  it('el botón limpiar restablece el contenido y la tabla', async () => {
    render(<BulkImportTab />);
    fireEvent.click(screen.getByRole('button', { name: /pegar texto/i }));

    const textarea = screen.getByPlaceholderText(/nombre,correo,rol,areas/i);
    fireEvent.change(textarea, {
      target: {
        value: 'nombre,correo,rol,areas\nAna Ruiz,ana@ejemplo.com,usuario,Finanzas',
      },
    });

    expect(await screen.findByText('3. Previsualización')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /limpiar/i }));

    expect(screen.queryByText('3. Previsualización')).toBeNull();
  });
});

describe('SettingsPanel con Importación masiva', () => {
  afterEach(cleanup);
  it('el superadmin ve la pestaña "Importación masiva" en Ajustes', () => {
    sesion.isAdmin = true;
    render(<SettingsPanel />);

    const tab = screen.getByRole('tab', { name: 'Importación masiva' });
    expect(tab).toBeTruthy();

    fireEvent.click(tab);
    expect(screen.getByText('1. Selecciona la entidad a importar')).toBeTruthy();
  });

  it('el usuario no administrador no ve la pestaña "Importación masiva"', () => {
    sesion.isAdmin = false;
    render(<SettingsPanel />);

    expect(screen.queryByRole('tab', { name: 'Importación masiva' })).toBeNull();
  });
});
