/**
 * DIS-017: formulario de plataforma con tipo de integración y grupos por nivel
 * (contrato `plataformas-integracion.md`), por rol, con errores y avisos.
 */
import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/toast';
import { ApiError } from '@/lib/api';
import type { Area, ManagedUser, Platform } from '@/lib/types';

function render(ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) {
  return rtlRender(<ToastProvider>{ui}</ToastProvider>, options);
}

vi.mock('@/lib/api', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api')>();
  return {
    ApiError: real.ApiError,
    api: {
      areas: vi.fn(), platforms: vi.fn(), users: vi.fn(),
      createPlatform: vi.fn(), updatePlatform: vi.fn(), deletePlatform: vi.fn(),
      createArea: vi.fn(), updateArea: vi.fn(), deleteArea: vi.fn(),
      platformAccess: vi.fn(), grantPlatformAccess: vi.fn(), revokeAccess: vi.fn(),
    },
  };
});

const permisos = { is_admin: false, is_area_admin: true };
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({ session: { permissions: permisos }, loading: false, error: null }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { api } from '@/lib/api';
import { PlatformAdmin } from '@/components/platform-admin';

const AREAS = [{ id: 3, name: 'Finanzas' }] as Area[];
const PLATAFORMA = {
  id: 12, name: 'Contabilidad', description: 'ERP contable', area_id: 3, area_name: 'Finanzas',
  direct_link: 'https://erp.ejemplo.local', bg_color: '', text_color: '', status: 'Activo',
} as Platform;
const DN_USUARIO = 'cn=conta-usuario,ou=finanzas,ou=plataformas,dc=ejemplo,dc=local';
const DN_ADMIN = 'cn=conta-admin,ou=finanzas,ou=plataformas,dc=ejemplo,dc=local';

function comoSuperadmin() {
  permisos.is_admin = true;
  permisos.is_area_admin = false;
}

function respuesta(warnings: { code: string; message: string }[] = []) {
  return { status: 'success', platform: { ...PLATAFORMA, name: 'Nueva' }, warnings };
}

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
  }
  permisos.is_admin = false;
  permisos.is_area_admin = true;
  vi.mocked(api.areas).mockResolvedValue(AREAS);
  vi.mocked(api.platforms).mockResolvedValue([PLATAFORMA]);
  vi.mocked(api.users).mockResolvedValue([]);
  vi.mocked(api.platformAccess).mockResolvedValue({ items: [], total: 0 });
  vi.mocked(api.createPlatform).mockResolvedValue(respuesta());
  vi.mocked(api.updatePlatform).mockResolvedValue(respuesta());
});

afterEach(() => cleanup());

function dialogo() {
  return within(screen.queryByRole('alertdialog') ?? screen.getByRole('dialog'));
}

async function abrirAlta() {
  render(<PlatformAdmin />);
  fireEvent.click(await screen.findByText('Finanzas'));
  await screen.findByText('Contabilidad');
  fireEvent.click(screen.getByRole('button', { name: /nuevo/i }));
  const modal = dialogo();
  fireEvent.change(modal.getByLabelText(/^Nombre/), { target: { value: 'Nueva' } });
  fireEvent.change(modal.getByLabelText(/^Descripción/), { target: { value: 'Descripción' } });
  return modal;
}

function avanzarYGuardar(modal: ReturnType<typeof dialogo>) {
  while (modal.queryByText('Guardar') === null && modal.queryByText('Siguiente') !== null) {
    fireEvent.click(modal.getByText('Siguiente'));
  }
  fireEvent.click(modal.getByText('Guardar'));
}

describe('PlatformAdmin: alta por rol', () => {
  it('asistente de 3 pasos: Paso 1 (Descripción), Paso 2 (Diseño con vista previa y activación) y Paso 3 (Accesos con Dual Picklist)', async () => {
    const modal = await abrirAlta();
    // Paso 1: muestra controles de descripción y no los de diseño, sin área ni conector
    expect(modal.getByLabelText(/^Nombre/)).toBeTruthy();
    expect(modal.getByLabelText(/^Descripción/)).toBeTruthy();
    expect(modal.getByLabelText(/^Enlace/)).toBeTruthy();
    expect(modal.queryByRole('combobox', { name: /^Área/ })).toBeNull();
    expect(modal.queryByLabelText(/^Tipo de integración/)).toBeNull();
    expect(modal.queryByLabelText('Color de fondo')).toBeNull();

    // Avanzar a Paso 2: Diseño (con vista previa y toggle de activa)
    fireEvent.click(modal.getByText('Siguiente'));
    expect(modal.getByText('Diseño')).toBeTruthy();
    expect(await modal.findByLabelText('Color de fondo')).toBeTruthy();
    expect(modal.getByLabelText(/Color del icono|Color de texto/i)).toBeTruthy();
    expect(modal.getByText('Elegir icono')).toBeTruthy();
    expect(modal.getByText('Subir imagen')).toBeTruthy();
    expect(modal.getByText('Vista previa de la plataforma')).toBeTruthy();
    expect(modal.getByRole('switch', { name: /activa/i })).toBeTruthy();

    // Avanzar a Paso 3: Accesos con Dual Picklist
    fireEvent.click(modal.getByText('Siguiente'));
    expect(modal.getByText('Accesos')).toBeTruthy();
    expect(modal.getByText('Sin acceso')).toBeTruthy();
    expect(modal.getByText('Con acceso')).toBeTruthy();

    // Retroceder a Paso 2: Diseño
    fireEvent.click(modal.getByText('Atrás'));
    expect(modal.getByText('Diseño')).toBeTruthy();
    expect(modal.getByText('Vista previa de la plataforma')).toBeTruthy();

    // Retroceder a Paso 1
    fireEvent.click(modal.getByText('Atrás'));
    expect(modal.getByLabelText(/^Nombre/)).toBeTruthy();
    expect((modal.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe('Nueva');
  });

  it('Paso 3 Dual Picklist: permite asignar accesos a usuarios del área y llama a grantPlatformAccess al guardar', async () => {
    const usuarioFinanzas = {
      id: 88,
      name: 'Carlos Finanzas',
      email: 'carlos@ejemplo.local',
      role: 'usuario',
      areas: [{ id: 3, name: 'Finanzas' }],
      platforms: [],
    } as unknown as ManagedUser;
    vi.mocked(api.users).mockResolvedValue([usuarioFinanzas]);
    vi.mocked(api.platformAccess).mockResolvedValue({ items: [], total: 0 });

    const modal = await abrirAlta();
    // Paso 1 -> Paso 2
    fireEvent.click(modal.getByText('Siguiente'));
    // Paso 2 -> Paso 3
    fireEvent.click(modal.getByText('Siguiente'));
    expect(modal.getByText('Accesos')).toBeTruthy();

    // El usuario debe aparecer en la columna "Sin acceso"
    expect(await modal.findByText('Carlos Finanzas')).toBeTruthy();

    // Click en el usuario para pasarlo a "Con acceso"
    fireEvent.click(modal.getByRole('button', { name: /Otorgar acceso a Carlos Finanzas/i }));

    // Click en Guardar
    fireEvent.click(modal.getByText('Guardar'));

    await waitFor(() => expect(api.createPlatform).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(api.grantPlatformAccess).toHaveBeenCalledWith(PLATAFORMA.id, 88, 'usuario'));
  });

  it('alta simplificada: crea la plataforma en el área seleccionada con conector por omisión', async () => {
    const modal = await abrirAlta();
    avanzarYGuardar(modal);

    await waitFor(() => expect(api.createPlatform).toHaveBeenCalledTimes(1));
    const enviado = vi.mocked(api.createPlatform).mock.calls[0][0];
    expect(enviado).toMatchObject({
      name: 'Nueva',
      description: 'Descripción',
      area_id: 3,
      integration_type: 'conector',
    });
    expect(enviado).not.toHaveProperty('ldap_group_user_dn');
    expect(enviado).not.toHaveProperty('ldap_group_admin_dn');
    // Sin color elegido no se envía: el servidor aplica el suyo por omisión.
    expect(enviado).not.toHaveProperty('bg_color');
    expect(enviado).not.toHaveProperty('text_color');
  });

  it('enlace que no es https: error en el campo, sin enviar', async () => {
    const modal = await abrirAlta();
    fireEvent.change(modal.getByLabelText(/^Enlace/), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(modal.getByText('Siguiente'));
    expect(await modal.findByText('Usa una dirección https://.')).toBeTruthy();
    expect(api.createPlatform).not.toHaveBeenCalled();
  });

  it('enlace sin https: antepone https:// automáticamente y permite guardar sin error', async () => {
    const modal = await abrirAlta();
    fireEvent.change(modal.getByLabelText(/^Enlace/), { target: { value: 'sistema.empresa.local' } });
    avanzarYGuardar(modal);
    await waitFor(() => expect(api.createPlatform).toHaveBeenCalledTimes(1));
    const [enviado] = vi.mocked(api.createPlatform).mock.calls[0];
    expect(enviado.direct_link).toBe('https://sistema.empresa.local');
  });
});

describe('PlatformAdmin: edición por rol', () => {
  it('admin de área: no envía el tipo ni DN y no expone área ni integración', async () => {
    render(<PlatformAdmin />);
    fireEvent.click(await screen.findByText('Finanzas'));
    fireEvent.click(await screen.findByLabelText('Seleccionar Contabilidad'));
    fireEvent.click(screen.getByRole('button', { name: /Editar Contabilidad/i }));
    const modal = dialogo();
    expect(modal.queryByRole('combobox', { name: /^Área/ })).toBeNull();
    expect(modal.queryByLabelText(/^Tipo de integración/)).toBeNull();
    avanzarYGuardar(modal);
    await waitFor(() => expect(api.updatePlatform).toHaveBeenCalledTimes(1));
    const [, enviado] = vi.mocked(api.updatePlatform).mock.calls[0];
    expect(enviado).not.toHaveProperty('integration_type');
    expect(enviado).not.toHaveProperty('ldap_group_user_dn');
  });

  it('superadmin: "Sin cambiar" no envía el tipo', async () => {
    comoSuperadmin();
    render(<PlatformAdmin />);
    fireEvent.click(await screen.findByText('Finanzas'));
    fireEvent.click(await screen.findByLabelText('Seleccionar Contabilidad'));
    fireEvent.click(screen.getByRole('button', { name: /Editar Contabilidad/i }));
    avanzarYGuardar(dialogo());
    await waitFor(() => expect(api.updatePlatform).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.updatePlatform).mock.calls[0][1]).not.toHaveProperty('integration_type');
  });

  it('con accesos vigentes: el formulario simplificado omite área e integración', async () => {
    comoSuperadmin();
    vi.mocked(api.platforms).mockResolvedValue([{ ...PLATAFORMA, integration_type: 'ldap', active_grants: 4 }]);
    render(<PlatformAdmin initialAreaId={3} />);
    fireEvent.click(await screen.findByLabelText('Seleccionar Contabilidad'));
    fireEvent.click(screen.getByRole('button', { name: /Editar Contabilidad/i }));
    const modal = dialogo();
    expect(modal.queryByRole('combobox', { name: /^Área/ })).toBeNull();
    expect(modal.queryByLabelText(/^Tipo de integración/)).toBeNull();
    expect(modal.getByLabelText(/^Nombre/)).toBeTruthy();
  });
});

describe('PlatformAdmin: errores del backend', () => {
  async function guardarConError(error: ApiError) {
    comoSuperadmin();
    vi.mocked(api.createPlatform).mockRejectedValue(error);
    const modal = await abrirAlta();
    avanzarYGuardar(modal);
    return modal;
  }

  it('422: errores por campo y mensaje general', async () => {
    const modal = await guardarConError(new ApiError(422, 'Datos no válidos.', {
      code: 'validacion',
      fields: { direct_link: 'Usa una dirección https://.', icon: 'Debe ser texto.' },
    }));
    expect(await modal.findByText('Usa una dirección https://.')).toBeTruthy();
    expect(modal.getByText('Revisa los campos marcados. Icono: Debe ser texto.')).toBeTruthy();
  });

  it.each([
    ['dn_solo_superadmin', 403, 'Solo el superadmin define los grupos del directorio o cambia el tipo de integración.'],
    ['plataforma_con_accesos', 409, 'No se puede cambiar el tipo, los grupos ni el área con accesos vigentes.'],
    ['grupo_en_uso', 409, 'El grupo ya pertenece a otra plataforma.'],
  ])('%s: mensaje del contrato', async (code, status, mensaje) => {
    const modal = await guardarConError(new ApiError(status, 'x', { code }));
    expect(await modal.findByText(mensaje)).toBeTruthy();
  });

  it('409 grupos_iguales en edición: mensaje general del contrato', async () => {
    comoSuperadmin();
    vi.mocked(api.updatePlatform).mockRejectedValue(new ApiError(409, 'x', { code: 'grupos_iguales' }));
    render(<PlatformAdmin />);
    fireEvent.click(await screen.findByText('Finanzas'));
    fireEvent.click(await screen.findByLabelText('Seleccionar Contabilidad'));
    fireEvent.click(screen.getByRole('button', { name: /Editar Contabilidad/i }));
    const modal = dialogo();
    avanzarYGuardar(modal);
    expect(await modal.findByText('Los grupos de usuario y admin deben ser distintos.')).toBeTruthy();
  });

  it('404: área o plataforma fuera de alcance', async () => {
    const modal = await guardarConError(new ApiError(404, 'No encontrado'));
    expect(await modal.findByText(/ya no está en tu alcance/)).toBeTruthy();
  });
});

describe('PlatformAdmin: avisos y estados', () => {
  it('muestra los warnings tras guardar', async () => {
    vi.mocked(api.createPlatform).mockResolvedValue(respuesta([
      { code: 'grupo_no_existe', message: 'El grupo de nivel usuario no existe en el directorio.' },
    ]));
    const modal = await abrirAlta();
    avanzarYGuardar(modal);
    expect(await screen.findByText('Guardada con avisos')).toBeTruthy();
    expect(screen.getByText(/El grupo de nivel usuario no existe en el directorio\./)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    fireEvent.click(screen.getByLabelText('Cerrar aviso'));
    expect(screen.queryByText('Guardada con avisos')).toBeNull();
  });

  it('sin avisos: confirma el guardado', async () => {
    const modal = await abrirAlta();
    avanzarYGuardar(modal);
    expect(await screen.findByText('Guardada')).toBeTruthy();
  });

  it('enlace no https en la tabla: se muestra "Sin enlace"', async () => {
    vi.mocked(api.platforms).mockResolvedValue([{ ...PLATAFORMA, direct_link: 'javascript:alert(1)' }]);
    render(<PlatformAdmin initialAreaId={3} />);
    expect(await screen.findByText('Sin enlace')).toBeTruthy();
    expect(screen.queryByText('javascript:alert(1)')).toBeNull();
  });

  it('vacío y error de carga', async () => {
    vi.mocked(api.platforms).mockResolvedValue([]);
    render(<PlatformAdmin initialAreaId={3} />);
    expect(await screen.findByText('Sin plataformas en Finanzas')).toBeTruthy();
    cleanup();
    vi.mocked(api.platforms).mockRejectedValue(new Error('Falla de red'));
    render(<PlatformAdmin initialAreaId={3} />);
    expect(await screen.findByText('Falla de red')).toBeTruthy();
  });

  it('usuario sin rol de admin: sin permiso y sin llamar a la API', () => {
    permisos.is_area_admin = false;
    render(<PlatformAdmin />);
    expect(screen.getByText('No tienes permiso para ver esta sección.')).toBeTruthy();
    expect(api.platforms).not.toHaveBeenCalled();
  });
});

describe('PlatformAdmin: cuadrícula de áreas y navegación a plataformas', () => {
  it('renderiza la barra de herramientas y las cards de áreas con badges de conteo y ghost cards para simetría 4x2', async () => {
    const { container } = render(<PlatformAdmin />);
    expect(await screen.findByLabelText('Buscar áreas')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Filtrar por estado/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Configurar cuadrícula/i })).toBeTruthy();
    expect(screen.getByText('Finanzas')).toBeTruthy();
    expect(screen.getByLabelText('Área Finanzas, 1 plataforma. Ver plataformas.')).toBeTruthy();
    // DIS-102: solo se completa la última fila (4 columnas: 1 real + 3 huecos)
    const ghostCards = container.querySelectorAll('.border-dashed[aria-hidden="true"]');
    expect(ghostCards).toHaveLength(3);
  });

  it('el botón de filtrar por estado permite alternar entre Todos, Activas e Inactivas', async () => {
    vi.mocked(api.areas).mockResolvedValueOnce([
      { id: 1, name: 'Finanzas Activa', status: 'Activo' } as Area,
      { id: 2, name: 'Legales Inactiva', status: 'Inactivo' } as Area,
    ]);
    render(<PlatformAdmin />);
    expect(await screen.findByText('Finanzas Activa')).toBeTruthy();
    expect(screen.getByText('Legales Inactiva')).toBeTruthy();

    // Abrir menú de estado
    fireEvent.click(screen.getByRole('button', { name: /Filtrar por estado/i }));
    // Filtrar por Activas (exacto)
    fireEvent.click(screen.getByRole('option', { name: /^Activas$/i }));
    expect(screen.getByText('Finanzas Activa')).toBeTruthy();
    expect(screen.queryByText('Legales Inactiva')).toBeNull();

    // Abrir menú y filtrar por Inactivas (exacto)
    fireEvent.click(screen.getByRole('button', { name: /Filtrar por estado/i }));
    fireEvent.click(screen.getByRole('option', { name: /^Inactivas$/i }));
    expect(screen.queryByText('Finanzas Activa')).toBeNull();
    expect(screen.getByText('Legales Inactiva')).toBeTruthy();
  });

  it('el botón de configurar cuadrícula permite cambiar dimensiones de 2x2 hasta 4x4 dinámicamente', async () => {
    const { container } = render(<PlatformAdmin />);
    await screen.findByText('Finanzas');

    // Inicialmente 4 columnas: 1 real + 3 huecos en la última fila
    expect(container.querySelectorAll('.border-dashed[aria-hidden="true"]')).toHaveLength(3);

    // Abrir configuración de cuadrícula y cambiar a 2 columnas (2 columnas: 1 real + 1 hueco)
    fireEvent.click(screen.getByRole('button', { name: /Configurar cuadrícula/i }));
    fireEvent.click(screen.getByRole('button', { name: '2 columnas' }));
    expect(container.querySelectorAll('.border-dashed[aria-hidden="true"]')).toHaveLength(1);

    // Cambiar a 3x3 (3 columnas: 1 real + 2 huecos) y verificar persistencia en localStorage
    fireEvent.click(screen.getByRole('button', { name: '3×3' }));
    expect(container.querySelectorAll('.border-dashed[aria-hidden="true"]')).toHaveLength(2);
    expect(window.localStorage.getItem('portal_grid_filas')).toBe('3');
    expect(window.localStorage.getItem('portal_grid_columnas')).toBe('3');

    // Desmontar y volver a montar: debe recordar la cuadrícula 3x3
    cleanup();
    const segundo = render(<PlatformAdmin />);
    await segundo.findByText('Finanzas');
    expect(segundo.container.querySelectorAll('.border-dashed[aria-hidden="true"]')).toHaveLength(2);
  });

  it('el buscador de áreas filtra la cuadrícula', async () => {
    render(<PlatformAdmin />);
    await screen.findByText('Finanzas');
    const buscador = screen.getByLabelText('Buscar áreas');
    fireEvent.change(buscador, { target: { value: 'Inexistente' } });
    expect(screen.queryByText('Finanzas')).toBeNull();
    expect(screen.getByText(/No hay áreas que coincidan/)).toBeTruthy();
  });

  it('hacer click en una card de área abre la sección 2 con toolbar y tabla, y volver regresa a áreas', async () => {
    render(<PlatformAdmin />);
    fireEvent.click(await screen.findByText('Finanzas'));
    expect(await screen.findByText('Contabilidad')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver a áreas' })).toBeTruthy();
    expect(screen.getByLabelText('Buscar plataformas en Finanzas')).toBeTruthy();

    // Volver a áreas
    fireEvent.click(screen.getByRole('button', { name: 'Volver a áreas' }));
    expect(await screen.findByText('Finanzas')).toBeTruthy();
    expect(screen.queryByText('Contabilidad')).toBeNull();
  });

  it('en la sección 2 muestra el texto del área después del buscador y los botones de accesos, editar y eliminar con las reglas de selección', async () => {
    comoSuperadmin();
    render(<PlatformAdmin />);
    fireEvent.click(await screen.findByText('Finanzas'));
    expect(await screen.findByText('Contabilidad')).toBeTruthy();

    // Texto del área después del buscador
    expect(screen.getByTitle('Área activa: Finanzas')).toBeTruthy();

    // Sin selección: botones de toolbar deshabilitados con nombres genéricos
    const btnAccesos = screen.getByRole('button', { name: 'Accesos' });
    const btnEditar = screen.getByRole('button', { name: 'Editar' });
    const btnEliminar = screen.getByRole('button', { name: 'Eliminar' });
    const btnNuevo = screen.getByRole('button', { name: 'Nuevo' });

    expect(btnAccesos.getAttribute('aria-disabled')).toBe('true');
    expect(btnEditar.getAttribute('aria-disabled')).toBe('true');
    expect(btnEliminar.getAttribute('aria-disabled')).toBe('true');
    expect((btnNuevo as HTMLButtonElement).disabled).toBe(false);

    // Al seleccionar 1 plataforma (Contabilidad) se habilitan con el contexto correspondiente
    fireEvent.click(screen.getByLabelText('Seleccionar Contabilidad'));

    const btnAccesosActivo = screen.getByRole('button', { name: 'Accesos de Contabilidad' });
    const btnEditarActivo = screen.getByRole('button', { name: 'Editar Contabilidad' });
    const btnEliminarActivo = screen.getByRole('button', { name: 'Eliminar Contabilidad' });

    expect((btnAccesosActivo as HTMLButtonElement).disabled).toBe(false);
    expect((btnEditarActivo as HTMLButtonElement).disabled).toBe(false);
    expect((btnEliminarActivo as HTMLButtonElement).disabled).toBe(false);

    // Abrir modal de Accesos de la plataforma
    fireEvent.click(btnAccesosActivo);
    const dialogAccesos = await screen.findByRole('dialog', { name: /Accesos — Contabilidad/i });
    expect(dialogAccesos).toBeTruthy();
    fireEvent.click(within(dialogAccesos).getAllByRole('button', { name: 'Cerrar' })[0]);

    // Abrir modal de Editar plataforma
    fireEvent.click(btnEditarActivo);
    const dialogEditar = await screen.findByRole('dialog', { name: 'Editar plataforma' });
    expect(dialogEditar).toBeTruthy();
    fireEvent.click(within(dialogEditar).getByText('Cancelar'));

    // Abrir diálogo de Eliminar plataforma
    fireEvent.click(btnEliminarActivo);
    const dialogEliminar = await screen.findByRole('alertdialog', { name: 'Eliminar plataforma' });
    expect(dialogEliminar).toBeTruthy();
    fireEvent.click(within(dialogEliminar).getByRole('button', { name: 'Cancelar' }));
  });

  it('indica con badge "Inactiva" y tratamiento visual cuando el área tiene status Inactivo', async () => {
    vi.mocked(api.areas).mockResolvedValueOnce([
      { id: 4, name: 'Operaciones', status: 'Inactivo' } as Area,
    ]);
    render(<PlatformAdmin />);
    expect(await screen.findByText('Operaciones')).toBeTruthy();
    expect(screen.getByText('Inactiva')).toBeTruthy();
    expect(screen.getByLabelText(/Área Operaciones \(Inactiva\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Área Operaciones \(Inactiva\)/ }).getAttribute('data-state')).toBe('inactiva');
  });
});

describe('PlatformAdmin: accesibilidad (revisión de DIS-017)', () => {
  function descripcionDe(control: HTMLElement) {
    return (control.getAttribute('aria-describedby') ?? '').split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
  }

  it('errores por campo y pistas ligados al control con aria-describedby', async () => {
    comoSuperadmin();
    const modal = await abrirAlta();
    fireEvent.change(modal.getByLabelText(/^Nombre/), { target: { value: '' } });
    fireEvent.change(modal.getByLabelText(/^Enlace/), { target: { value: 'http://x.ejemplo.local' } });
    fireEvent.click(modal.getByText('Siguiente'));
    const nombre = await modal.findByLabelText(/^Nombre/);
    expect(descripcionDe(nombre)).toContain('El nombre debe tener entre 2 y 100 caracteres.');
    const enlace = modal.getByLabelText(/^Enlace/);
    expect(descripcionDe(enlace)).toContain('Usa una dirección https://.');
    expect(descripcionDe(enlace)).toContain('Dirección https://');
  });

  it('edición simplificada no expone controles de área ni integración bloqueados', async () => {
    comoSuperadmin();
    vi.mocked(api.platforms).mockResolvedValue([{ ...PLATAFORMA, integration_type: 'ldap', active_grants: 2 }]);
    render(<PlatformAdmin initialAreaId={3} />);
    fireEvent.click(await screen.findByLabelText('Seleccionar Contabilidad'));
    fireEvent.click(screen.getByRole('button', { name: /Editar Contabilidad/i }));
    const modal = dialogo();
    expect(modal.queryByLabelText(/^Tipo de integración/)).toBeNull();
    expect(modal.queryByRole('combobox', { name: /^Área/ })).toBeNull();
  });

  it('la región de estado está montada antes de guardar', async () => {
    render(<PlatformAdmin initialAreaId={3} />);
    await screen.findByText('Contabilidad');
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: /nuevo/i }));
    const modal = dialogo();
    fireEvent.change(modal.getByLabelText(/^Nombre/), { target: { value: 'Nueva' } });
    fireEvent.change(modal.getByLabelText(/^Descripción/), { target: { value: 'D' } });
    avanzarYGuardar(modal);
    await waitFor(() => expect(region.textContent).toContain('Se guardó'));
  });

  it('foco: al primer campo con error, al disparador al cancelar y aviso tras guardar', async () => {
    render(<PlatformAdmin initialAreaId={3} />);
    await screen.findByText('Contabilidad');
    const nueva = screen.getByRole('button', { name: /nuevo/i });
    nueva.focus();
    fireEvent.click(nueva);
    fireEvent.click(dialogo().getByText('Siguiente'));
    await waitFor(() => expect(document.activeElement).toBe(dialogo().getByLabelText(/^Nombre/)));
    fireEvent.click(dialogo().getByText('Cancelar'));
    await waitFor(() => expect(document.activeElement).toBe(nueva));

    const modal = await abrirAltaSinRender();
    avanzarYGuardar(modal);
    expect(await screen.findByText(/Se guardó/)).toBeTruthy();
  });

  it('Editar y Eliminar con el nombre de la plataforma al seleccionarla', async () => {
    render(<PlatformAdmin initialAreaId={3} />);
    await screen.findByText('Contabilidad');
    // Sin selección: botones deshabilitados con nombre genérico
    const btnEditar = screen.getByRole('button', { name: 'Editar' });
    const btnEliminar = screen.getByRole('button', { name: 'Eliminar' });
    expect(btnEditar.getAttribute('aria-disabled')).toBe('true');
    expect(btnEliminar.getAttribute('aria-disabled')).toBe('true');

    // Con 1 plataforma seleccionada: botones habilitados con el nombre de la plataforma
    fireEvent.click(screen.getByLabelText('Seleccionar Contabilidad'));
    const btnEditarPlat = screen.getByRole('button', { name: 'Editar Contabilidad' });
    const btnEliminarPlat = screen.getByRole('button', { name: 'Eliminar Contabilidad' });
    expect((btnEditarPlat as HTMLButtonElement).disabled).toBe(false);
    expect((btnEliminarPlat as HTMLButtonElement).disabled).toBe(false);
  });

  it('DIS-035: acciones en la barra de herramientas al seleccionar plataforma', async () => {
    render(<PlatformAdmin initialAreaId={3} />);
    await screen.findByText('Contabilidad');
    const checkbox = await screen.findByLabelText('Seleccionar Contabilidad');
    fireEvent.click(checkbox);
    const acciones = [
      screen.getByRole('button', { name: 'Editar Contabilidad' }),
      screen.getByRole('button', { name: 'Eliminar Contabilidad' }),
    ];
    for (const accion of acciones) {
      expect(accion.className).toContain('min-h-12');
      expect(accion.className).toContain('min-w-12');
      expect(accion.className).toContain('focus-visible:ring-primary');
    }
  });

  it('DIS-008: la tabla desplazable es una región con nombre, enfocable y con foco visible; la cabecera de selección tiene checkbox', async () => {
    render(<PlatformAdmin initialAreaId={3} />);
    const region = await screen.findByRole('region', { name: 'Plataformas de Finanzas' });
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.className).toContain('overflow-x-auto');
    expect(region.className).toContain('focus-visible:ring-primary');
    expect(screen.getByRole('checkbox', { name: 'Seleccionar todas las plataformas' })).toBeTruthy();
  });

  it.each([
    [404, 'La plataforma ya no existe o no está en tu alcance. Recarga la lista.'],
    [409, 'No se puede eliminar una plataforma con accesos vigentes.'],
  ])('error %s al eliminar: mensaje fijo', async (status, mensaje) => {
    vi.mocked(api.deletePlatform).mockRejectedValue(new ApiError(status, 'detalle interno', { code: 'x' }));
    render(<PlatformAdmin initialAreaId={3} />);
    await screen.findByText('Contabilidad');
    fireEvent.click(screen.getByLabelText('Seleccionar Contabilidad'));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Contabilidad' }));
    fireEvent.click(within(screen.queryByRole('alertdialog') ?? screen.getByRole('dialog')).getByText('Eliminar'));
    expect(await screen.findByText(mensaje)).toBeTruthy();
  });

  it('permite eliminar múltiples plataformas seleccionadas en el área activa', async () => {
    const plat2 = {
      id: 15, name: 'Facturación', description: 'Módulo de facturas', area_id: 3, area_name: 'Finanzas',
      direct_link: 'https://facturas.ejemplo.local', bg_color: '', text_color: '', status: 'Activo',
    } as Platform;
    vi.mocked(api.platforms).mockResolvedValue([PLATAFORMA, plat2]);
    vi.mocked(api.deletePlatform).mockResolvedValue({ ok: true } as any);

    render(<PlatformAdmin initialAreaId={3} />);
    await screen.findByText('Contabilidad');
    await screen.findByText('Facturación');

    fireEvent.click(screen.getByLabelText('Seleccionar Contabilidad'));
    fireEvent.click(screen.getByLabelText('Seleccionar Facturación'));

    const btnEliminar = screen.getByRole('button', { name: 'Eliminar 2 plataformas seleccionadas' });
    expect((btnEliminar as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(btnEliminar);
    const dialog = await screen.findByRole('alertdialog', { name: 'Eliminar plataformas' });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText(/Se eliminarán las 2 plataformas seleccionadas/)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => {
      expect(api.deletePlatform).toHaveBeenCalledWith(12);
      expect(api.deletePlatform).toHaveBeenCalledWith(15);
    });
  });
});

async function abrirAltaSinRender() {
  fireEvent.click(screen.getByRole('button', { name: /nuevo/i }));
  const modal = within(screen.queryByRole('alertdialog') ?? screen.getByRole('dialog'));
  fireEvent.change(modal.getByLabelText(/^Nombre/), { target: { value: 'Nueva' } });
  fireEvent.change(modal.getByLabelText(/^Descripción/), { target: { value: 'Descripción' } });
  return modal;
}
