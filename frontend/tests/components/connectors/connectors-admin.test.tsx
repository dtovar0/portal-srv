/**
 * DIS-022 / DIS-140: conectores independientes (`/admin/connectors`; contrato
 * `conectores-y-ejecuciones.md` 1.6; solo superadmin).
 * - Lista conectores (`GET /connectors`) con nombre, tipo, host, plataforma o «Sin asociar»
 *   y credencial; carga, vacío y error sin texto del servidor.
 * - «Nuevo» (con Nombre, sin plataforma), editar, probar (solo asociado), eliminar con confirmación.
 * - Asociar (plataformas sin conector) y desasociar con confirmación; errores por código y campo.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/toast';

/** Con el proveedor de avisos: los resultados se anuncian con toast (DIS-091). */
function renderConToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}
import type { ConnectorItem } from '@/lib/access/types';
import type { Platform } from '@/lib/types';

vi.mock('@/lib/access/connectors', () => ({
  connectorsApi: {
    list: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn(),
    associate: vi.fn(), dissociate: vi.fn(), testById: vi.fn(),
  },
}));
vi.mock('@/lib/access/provisioning', () => ({
  provisioningApi: { jobs: vi.fn(), job: vi.fn(), retry: vi.fn() },
}));
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: { platforms: vi.fn(), areas: vi.fn() },
}));
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({
    loading: false,
    error: null,
    session: {
      id: 1, role: 'administrador', managed_areas: [], preferences: { refresh_interval: 60 },
      permissions: { is_admin: true, is_area_admin: false, can_manage_areas: true, can_manage_system: true },
    },
  }),
}));

import { ApiError, api } from '@/lib/api';
import { connectorsApi } from '@/lib/access/connectors';
import { provisioningApi } from '@/lib/access/provisioning';
import { ConnectorsAdmin, VACIO_CONECTORES } from '@/components/connectors/connectors-admin';
import { SIN_CANDIDATAS, SIN_PLATAFORMAS } from '@/components/connectors/connector-associate-dialog';
import {
  FORMULARIO_VACIO, MENSAJES_CAMPO, NOMBRE_INVALIDO, OBLIGATORIO, cuerpoConector, formularioDesde,
  parametrosConservados, validarConector,
} from '@/components/connectors/connector-catalog';
import {
  MENSAJES_ASOCIAR, MENSAJES_GUARDAR, MENSAJE_DESASOCIAR_ACCESOS, MENSAJE_REVISA, PRUEBA_ERROR, PRUEBA_OK,
  describeConnectorAssociateError, describeConnectorDeleteError, describeConnectorDissociateError,
  describeConnectorSaveError, describeConnectorTestError,
} from '@/components/connectors/connector-errors';
import {
  AVISO_CREADO, AVISO_ELIMINADO, AVISO_SIN_VERIFICAR, MOTIVO_SIN_PLATAFORMA,
} from '@/components/connectors/connector-panel';

function plataforma(extra: Partial<Platform>): Platform {
  return {
    id: 12, name: 'Contabilidad', description: '', area_id: 3, area_name: 'Finanzas', area_color: '',
    area_icon: '', direct_link: null, icon: '', logo_url: null, bg_color: '', text_color: '',
    status: 'active', visits: 0, is_favorite: false, integration_type: 'conector',
    ldap_group_user_dn: null, ldap_group_admin_dn: null, groups_status: 'sin_verificar',
    has_connector: true, active_grants: 2, ...extra,
  };
}

const CONTABILIDAD = plataforma({});
const NOMINA = plataforma({ id: 14, name: 'Nómina', has_connector: false, active_grants: 0 });
const WIKI = plataforma({ id: 5, name: 'Wiki', integration_type: 'ldap', has_connector: false, active_grants: 0 });

/** `timeout` no tiene editor: se conserva sin cambios. */
const PARAMS_API = {
  base_path: '/usuarios', timeout: 30, auth: { esquema: 'bearer' },
  otorgar: { metodo: 'POST', ruta: '/usuarios', cuerpo: { email: '{correo}' } },
  revocar: { metodo: 'DELETE', ruta: '/usuarios/{correo}', sin_cambios: [404, 410] },
};

const ASOCIADO: ConnectorItem = {
  id: 4, name: 'ERP usuarios', platform_id: 12,
  platform: { id: 12, name: 'Contabilidad', area_id: 3, area: 'Finanzas' },
  type: 'api', host: 'erp.ejemplo.local', port: 443,
  params: PARAMS_API, credential_ref: 'pokemon/contabilidad-api',
  credential_status: 'ok', active: true, updated_at: '2026-10-14T14:00:00Z',
};
const SUELTO: ConnectorItem = {
  ...ASOCIADO, id: 5, name: 'Directorio SSH', platform_id: null, platform: null, type: 'ssh',
  host: 'ssh.ejemplo.local', port: 22, params: {}, credential_ref: 'pokemon/ssh',
  credential_status: 'sin_verificar', updated_at: '2026-11-26T10:00:00Z',
};

const mocks = {
  platforms: vi.mocked(api.platforms),
  list: vi.mocked(connectorsApi.list),
  create: vi.mocked(connectorsApi.create),
  update: vi.mocked(connectorsApi.update),
  destroy: vi.mocked(connectorsApi.destroy),
  associate: vi.mocked(connectorsApi.associate),
  dissociate: vi.mocked(connectorsApi.dissociate),
  test: vi.mocked(connectorsApi.testById),
};

beforeEach(() => {
  vi.mocked(api.areas).mockResolvedValue([]);
  vi.mocked(provisioningApi.jobs).mockResolvedValue({ items: [], page: 1, per_page: 25, total: 0 });
  mocks.platforms.mockResolvedValue([CONTABILIDAD, NOMINA, WIKI]);
  mocks.list.mockResolvedValue({ items: [ASOCIADO, SUELTO] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function abrir(nombre = 'ERP usuarios', renderizar: (ui: React.ReactElement) => unknown = render) {
  renderizar(<ConnectorsAdmin />);
  fireEvent.click(await screen.findByRole('button', { name: `Configurar el conector ${nombre}` }));
  return screen.findByRole('region', { name: `Conector ${nombre}` });
}

async function seleccionar(nombre: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Configurar el conector ${nombre}` }));
}

describe('reglas del formulario', () => {
  it('valida obligatorios, nombre, host, puerto y referencia como el servidor', () => {
    expect(validarConector(FORMULARIO_VACIO)).toEqual({
      name: OBLIGATORIO, host: OBLIGATORIO, port: OBLIGATORIO, credential_ref: OBLIGATORIO,
    });
    expect(validarConector({
      ...FORMULARIO_VACIO, name: 'x'.repeat(101), host: 'https://erp', port: '70000', credential_ref: '/mal//ref',
    })).toEqual({
      name: NOMBRE_INVALIDO, host: MENSAJES_CAMPO.host, port: MENSAJES_CAMPO.port,
      credential_ref: MENSAJES_CAMPO.credential_ref,
    });
    expect(validarConector({ ...FORMULARIO_VACIO, name: 'a\u0007b' }).name).toBe(NOMBRE_INVALIDO);
    expect(validarConector({
      ...FORMULARIO_VACIO, name: ' ERP ', host: 'erp.ejemplo.local', port: '443', credential_ref: 'pokemon/erp-api',
    })).toEqual({});
  });

  it('arma el cuerpo del contrato: nombre recortado, conserva parámetros sin editor y omite los vacíos', () => {
    const base = formularioDesde(ASOCIADO);
    const form = { ...base, name: ' ERP nuevo ', host: ' erp.ejemplo.local ', params: { ...base.params, base_path: '' } };
    const sinBase = Object.fromEntries(
      Object.entries(PARAMS_API).filter(([clave]) => clave !== 'base_path'));
    expect(cuerpoConector(form, ASOCIADO)).toEqual({
      name: 'ERP nuevo', type: 'api', host: 'erp.ejemplo.local', port: 443, params: sinBase,
      credential_ref: 'pokemon/contabilidad-api', active: true,
    });
    // Cambiar de tipo descarta los parámetros del anterior.
    expect(parametrosConservados(ASOCIADO, 'ssh')).toEqual({});
    expect(cuerpoConector({ ...form, type: 'ssh', params: {} }, ASOCIADO).params).toEqual({});
  });

  it('describe los errores por código y por campo sin el texto del servidor', () => {
    const v422 = describeConnectorSaveError(new ApiError(422, 'texto del servidor', {
      code: 'validacion', fields: { host: 'x', name: 'y', 'params.password': 'z' },
    }));
    expect(v422).toEqual({
      message: MENSAJE_REVISA, stale: false, paramFields: {},
      fields: { host: MENSAJES_CAMPO.host, name: MENSAJES_CAMPO.name, params: MENSAJES_CAMPO.params },
    });
    expect(MENSAJES_CAMPO.name).toBe('Ya existe un conector con ese nombre.');
    expect(describeConnectorSaveError(new ApiError(409, 'x', { code: 'conector_concurrente' })))
      .toMatchObject({ message: MENSAJES_GUARDAR.conector_concurrente, stale: true });
    expect(describeConnectorSaveError(new ApiError(409, 'x', { code: 'plataforma_con_accesos' })).fields.type)
      .toBeTruthy();
    expect(describeConnectorSaveError(new ApiError(415, 'x')).message).not.toContain('x');
    expect(describeConnectorDeleteError(new ApiError(409, 'x', { code: 'plataforma_con_accesos' })).message)
      .toMatch(/accesos vigentes/);
  });

  it('describe los 409 de asociar, desasociar y probar por código', () => {
    expect(describeConnectorAssociateError(new ApiError(409, 'x', { code: 'plataforma_con_conector' })))
      .toMatchObject({ message: MENSAJES_ASOCIAR.plataforma_con_conector, stale: true });
    expect(describeConnectorAssociateError(new ApiError(409, 'x', { code: 'plataforma_con_accesos' })))
      .toMatchObject({ message: MENSAJES_ASOCIAR.plataforma_con_accesos, stale: false });
    expect(describeConnectorAssociateError(new ApiError(404, 'x')).stale).toBe(true);
    expect(describeConnectorDissociateError(new ApiError(409, 'x', { code: 'conector_sin_plataforma' })))
      .toMatchObject({ message: MENSAJES_ASOCIAR.conector_sin_plataforma, stale: true });
    expect(describeConnectorDissociateError(new ApiError(409, 'x', { code: 'plataforma_con_accesos' })))
      .toMatchObject({ message: MENSAJE_DESASOCIAR_ACCESOS, stale: false });
    expect(describeConnectorTestError(new ApiError(409, 'x', { code: 'conector_sin_plataforma' })))
      .toMatchObject({ message: MENSAJES_ASOCIAR.conector_sin_plataforma, stale: true });
  });
});

describe('lista de conectores', () => {
  it('muestra nombre, tipo, host, plataforma o «Sin asociar» y credencial', async () => {
    render(<ConnectorsAdmin />);
    const lista = await screen.findByRole('list', { name: 'Conectores' });
    const filas = within(lista).getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText('ERP usuarios')).toBeTruthy();
    expect(within(filas[0]).getByText('API')).toBeTruthy();
    expect(within(filas[0]).getByText('erp.ejemplo.local')).toBeTruthy();
    expect(within(filas[0]).getByText('Contabilidad')).toBeTruthy();
    expect(within(filas[0]).getByText('Credencial verificada')).toBeTruthy();
    expect(within(filas[1]).getByText('Directorio SSH')).toBeTruthy();
    expect(within(filas[1]).getByText('Sin asociar')).toBeTruthy();
    expect(within(filas[1]).getByText('Credencial sin verificar')).toBeTruthy();
  });

  it('vacío si no hay conectores', async () => {
    mocks.list.mockResolvedValue({ items: [] });
    render(<ConnectorsAdmin />);
    expect(await screen.findByText(VACIO_CONECTORES)).toBeTruthy();
  });

  it('error sin texto del servidor y con Reintentar', async () => {
    mocks.list.mockRejectedValue(new ApiError(500, 'Traceback interno'));
    render(<ConnectorsAdmin />);
    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toBe('No se pudieron cargar los conectores.');
    mocks.list.mockResolvedValue({ items: [ASOCIADO] });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('list', { name: 'Conectores' })).toBeTruthy();
  });

  it('busca por nombre, host o plataforma', async () => {
    render(<ConnectorsAdmin />);
    const lista = await screen.findByRole('list', { name: 'Conectores' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar conectores' }), { target: { value: 'ssh' } });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1);
    expect(within(lista).getByText('Directorio SSH')).toBeTruthy();
  });

  it('las acciones de la barra se habilitan según la selección', async () => {
    render(<ConnectorsAdmin />);
    await screen.findByRole('list', { name: 'Conectores' });
    const aria = (nombre: string) =>
      screen.getByRole('button', { name: new RegExp(`^${nombre}`) }).getAttribute('aria-disabled');
    for (const accion of ['Editar', 'Asociar', 'Desasociar', 'Eliminar']) expect(aria(accion)).toBe('true');
    expect((screen.getByRole('button', { name: 'Nuevo conector' }) as HTMLButtonElement).disabled).toBe(false);

    // Asociado: se puede desasociar, no asociar.
    await seleccionar('ERP usuarios');
    expect(aria('Editar')).toBeNull();
    expect(aria('Desasociar')).toBeNull();
    expect(aria('Asociar')).toBe('true');

    // Sin asociar: se puede asociar, no desasociar.
    await seleccionar('Directorio SSH');
    expect(aria('Asociar')).toBeNull();
    expect(aria('Desasociar')).toBe('true');
  });
});

describe('Nuevo conector (sin plataforma)', () => {
  it('abre el formulario con «Nombre», valida y enfoca el primer error', async () => {
    render(<ConnectorsAdmin />);
    await screen.findByRole('list', { name: 'Conectores' });
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo conector' }));
    const panel = await screen.findByRole('region', { name: 'Nuevo conector' });
    expect(within(panel).queryByText(/Plataforma/)).toBeNull();
    expect(panel.querySelector('input[type="password"]')).toBeNull();
    const nombre = within(panel).getByLabelText('Nombre *') as HTMLInputElement;
    expect(nombre.required).toBe(true);
    expect(within(panel).queryByRole('button', { name: 'Probar conexión' })).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar conector' }));
    expect(mocks.create).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(nombre));
  });

  /** Completa el alta de un conector `api` con lo mínimo obligatorio. */
  async function completarAlta(nombre: string) {
    renderConToast(<ConnectorsAdmin />);
    await screen.findByRole('list', { name: 'Conectores' });
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo conector' }));
    const panel = await screen.findByRole('region', { name: 'Nuevo conector' });
    fireEvent.change(within(panel).getByLabelText('Nombre *'), { target: { value: nombre } });
    fireEvent.change(within(panel).getByLabelText('Puerto *'), { target: { value: '443' } });
    fireEvent.change(within(panel).getByLabelText('Host *'), { target: { value: 'erp.ejemplo.local' } });
    fireEvent.change(within(panel).getByLabelText('Referencia de la credencial *'), { target: { value: 'pokemon/erp' } });
    fireEvent.change(within(panel).getByLabelText('Esquema de autenticación *'), { target: { value: 'bearer' } });
    const metodos = within(panel).getAllByLabelText(/^Método HTTP/);
    const rutas = within(panel).getAllByLabelText(/^Ruta(?! base)/);
    fireEvent.change(metodos[0], { target: { value: 'POST' } });
    fireEvent.change(rutas[0], { target: { value: '/usuarios' } });
    fireEvent.change(metodos[1], { target: { value: 'DELETE' } });
    fireEvent.change(rutas[1], { target: { value: '/usuarios/{correo}' } });
    return panel;
  }

  it('crea con POST /connectors (cuerpo con name, sin plataforma), avisa y lo deja seleccionado', async () => {
    mocks.create.mockResolvedValue({ status: 'success', connector: { ...SUELTO, type: 'api', name: 'ERP nuevo' } });
    const nuevo = { ...SUELTO, type: 'api' as const, name: 'ERP nuevo' };
    mocks.list.mockResolvedValueOnce({ items: [ASOCIADO] }).mockResolvedValue({ items: [ASOCIADO, nuevo] });
    const panel = await completarAlta(' ERP nuevo ');
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar conector' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      name: 'ERP nuevo', type: 'api', host: 'erp.ejemplo.local', port: 443, credential_ref: 'pokemon/erp', active: true,
    });
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('platform_id');
    expect((await screen.findByText(AVISO_CREADO)).closest('.nx-toast')).toBeTruthy();
    expect(await screen.findByRole('region', { name: 'Conector ERP nuevo' })).toBeTruthy();
  });

  it('422 con fields.name marca «Nombre» con el mensaje propio y le da el foco', async () => {
    mocks.create.mockRejectedValue(new ApiError(422, 'Ya existe un conector con ese nombre.', {
      code: 'validacion', fields: { name: 'Ya existe un conector con ese nombre.' },
    }));
    const panel = await completarAlta('ERP usuarios');
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar conector' }));
    const nombre = within(panel).getByLabelText('Nombre *');
    expect(await within(panel).findByText(MENSAJES_CAMPO.name)).toBeTruthy();
    expect(nombre.getAttribute('aria-invalid')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(nombre));
  });
});

describe('panel del conector', () => {
  it('muestra la configuración y un formulario sin campos de contraseña', async () => {
    const panel = await abrir();
    expect(within(panel).getByText('erp.ejemplo.local:443')).toBeTruthy();
    expect(within(panel).getByText('Credencial verificada')).toBeTruthy();
    expect(panel.querySelector('input[type="password"]')).toBeNull();
    expect((within(panel).getByLabelText('Nombre *') as HTMLInputElement).value).toBe('ERP usuarios');
    const host = within(panel).getByLabelText('Host *') as HTMLInputElement;
    expect(host.value).toBe('erp.ejemplo.local');
    expect(host.required).toBe(true);
    expect(within(panel).getByText(/Se conservan sin cambios: timeout/)).toBeTruthy();
  });

  it('guarda con PUT /connectors/<id> y anuncia que la credencial queda sin verificar', async () => {
    mocks.update.mockResolvedValue({
      status: 'success',
      connector: { ...ASOCIADO, port: 8443, credential_status: 'sin_verificar', updated_at: '2026-10-21T10:00:00Z' },
    });
    const panel = await abrir('ERP usuarios', renderConToast);
    const pedidas = mocks.list.mock.calls.length;
    fireEvent.change(within(panel).getByLabelText('Puerto *'), { target: { value: '8443' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar conector' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(4, {
      name: 'ERP usuarios', type: 'api', host: 'erp.ejemplo.local', port: 8443,
      params: PARAMS_API,
      credential_ref: 'pokemon/contabilidad-api', active: true,
    }));
    expect((await screen.findByText(AVISO_SIN_VERIFICAR)).closest('.nx-toast')).toBeTruthy();
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(pedidas + 1));
  });

  it('422 en un campo marca el campo con un mensaje propio', async () => {
    mocks.update.mockRejectedValue(new ApiError(422, 'Usa un nombre de host autorizado.', {
      code: 'validacion', fields: { host: 'Usa un nombre de host autorizado.' },
    }));
    const panel = await abrir();
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar conector' }));
    expect(await within(panel).findByText(MENSAJES_CAMPO.host)).toBeTruthy();
    expect(within(panel).getByLabelText('Host *').getAttribute('aria-invalid')).toBe('true');
  });

  it('422 con fields.name en una edición marca «Nombre» y le da el foco', async () => {
    mocks.update.mockRejectedValue(new ApiError(422, 'x', { code: 'validacion', fields: { name: 'x' } }));
    const panel = await abrir();
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar conector' }));
    const nombre = within(panel).getByLabelText('Nombre *');
    expect(await within(panel).findByText(MENSAJES_CAMPO.name)).toBeTruthy();
    expect(nombre.getAttribute('aria-invalid')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(nombre));
  });

  it('422 en params.<ruta>: marca el campo con mensaje propio, lo asocia y le da el foco', async () => {
    mocks.update.mockRejectedValue(new ApiError(422, 'srv', {
      code: 'validacion', fields: { 'params.base_path': 'srv' },
    }));
    const panel = await abrir();
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar conector' }));
    const campo = within(panel).getByLabelText('Ruta base');
    const aviso = await within(panel).findByText(/^Revisa «Ruta base»/);
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(campo.getAttribute('aria-describedby')).toContain(aviso.id);
    expect(aviso.textContent).not.toContain('srv');
    await waitFor(() => expect(document.activeElement).toBe(campo));
  });

  it('probar conexión muestra un texto propio y recarga el estado de la credencial', async () => {
    mocks.test.mockResolvedValueOnce({ status: 'success', result: 'ok', message: 'servidor' });
    const panel = await abrir('ERP usuarios', renderConToast);
    const pedidas = mocks.list.mock.calls.length;
    fireEvent.click(within(panel).getByRole('button', { name: 'Probar conexión' }));
    expect(await screen.findByText(PRUEBA_OK)).toBeTruthy();
    expect(screen.getByText(PRUEBA_OK).closest('[role]')?.getAttribute('role')).toBe('status');
    expect(mocks.test).toHaveBeenCalledWith(4);
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(pedidas + 1));

    mocks.test.mockResolvedValueOnce({ status: 'success', result: 'error', message: 'detalle interno' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Probar conexión' }));
    expect(await screen.findByText(PRUEBA_ERROR)).toBeTruthy();
    expect(screen.getByText(PRUEBA_ERROR).closest('[role]')?.getAttribute('role')).toBe('alert');
    expect(screen.queryByText('detalle interno')).toBeNull();
  });

  it('sin plataforma «Probar conexión» está deshabilitado y explica por qué', async () => {
    const panel = await abrir('Directorio SSH');
    const boton = within(panel).getByRole('button', { name: 'Probar conexión' });
    expect(boton.getAttribute('aria-disabled')).toBe('true');
    // Motivo visible en el panel (además del tooltip del botón).
    expect(within(panel).getAllByText(MOTIVO_SIN_PLATAFORMA).length).toBeGreaterThan(0);
    expect(MOTIVO_SIN_PLATAFORMA).toBe('Asocia el conector a una plataforma para probarlo.');
    fireEvent.click(boton);
    expect(mocks.test).not.toHaveBeenCalled();
  });

  it('eliminar pide confirmación y muestra el 409 con accesos', async () => {
    mocks.destroy.mockRejectedValueOnce(new ApiError(409, 'x', { code: 'plataforma_con_accesos' }));
    const panel = await abrir('ERP usuarios', renderConToast);
    fireEvent.click(within(panel).getByRole('button', { name: 'Eliminar el conector ERP usuarios' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Eliminar conector' });
    expect(within(dialogo).getByText(/Se borrará el conector «ERP usuarios»/)).toBeTruthy();
    expect(mocks.destroy).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));
    expect(await within(dialogo).findByText(/Revócalos primero/)).toBeTruthy();

    mocks.destroy.mockResolvedValueOnce({ status: 'success' });
    mocks.list.mockResolvedValue({ items: [SUELTO] });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));
    expect((await screen.findByText(AVISO_ELIMINADO)).closest('.nx-toast')).toBeTruthy();
    expect(mocks.destroy).toHaveBeenLastCalledWith(4);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Conector ERP usuarios' })).toBeNull());
  });

  it('cerrar devuelve el foco al botón de la fila', async () => {
    const panel = await abrir();
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Configurar el conector ERP usuarios' })));
  });
});

describe('Asociar y desasociar', () => {
  it('«Asociar» ofrece solo las plataformas sin conector y asocia con PUT .../platform', async () => {
    mocks.associate.mockResolvedValue({
      status: 'success',
      connector: { ...SUELTO, platform_id: 14, platform: { id: 14, name: 'Nómina', area_id: 3, area: 'Finanzas' } },
    });
    renderConToast(<ConnectorsAdmin />);
    await seleccionar('Directorio SSH');
    fireEvent.click(screen.getByRole('button', { name: 'Asociar el conector Directorio SSH' }));
    const picker = await screen.findByRole('dialog', { name: 'Asociar a una plataforma' });
    const nombres = (await within(picker).findAllByRole('button')).map((b) => b.textContent ?? '');
    expect(nombres.some((t) => t.includes('Nómina'))).toBe(true);
    expect(nombres.some((t) => t.includes('Wiki'))).toBe(true);
    expect(nombres.some((t) => t.includes('Contabilidad'))).toBe(false);

    fireEvent.click(within(picker).getByRole('button', { name: /Nómina/ }));
    await waitFor(() => expect(mocks.associate).toHaveBeenCalledWith(5, 14));
    expect(await screen.findByText('Conector Directorio SSH asociado a Nómina.')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Asociar a una plataforma' })).toBeNull();
  });

  it('sin candidatas avisa según el caso', async () => {
    mocks.platforms.mockResolvedValue([CONTABILIDAD]);
    render(<ConnectorsAdmin />);
    await seleccionar('Directorio SSH');
    fireEvent.click(screen.getByRole('button', { name: 'Asociar el conector Directorio SSH' }));
    expect(await screen.findByText(SIN_CANDIDATAS)).toBeTruthy();
    cleanup();
    mocks.platforms.mockResolvedValue([]);
    render(<ConnectorsAdmin />);
    await seleccionar('Directorio SSH');
    fireEvent.click(screen.getByRole('button', { name: 'Asociar el conector Directorio SSH' }));
    expect(await screen.findByText(SIN_PLATAFORMAS)).toBeTruthy();
  });

  it('plataforma_con_conector: mensaje propio y se actualiza la lista', async () => {
    mocks.associate.mockRejectedValue(new ApiError(409, 'x', { code: 'plataforma_con_conector' }));
    renderConToast(<ConnectorsAdmin />);
    await seleccionar('Directorio SSH');
    fireEvent.click(screen.getByRole('button', { name: 'Asociar el conector Directorio SSH' }));
    const picker = await screen.findByRole('dialog', { name: 'Asociar a una plataforma' });
    const pedidas = mocks.list.mock.calls.length;
    fireEvent.click(await within(picker).findByRole('button', { name: /Nómina/ }));
    expect(await screen.findAllByText(MENSAJES_ASOCIAR.plataforma_con_conector)).not.toHaveLength(0);
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(pedidas + 1));
  });

  it('«Desasociar» pide confirmación, explica el efecto y llama a DELETE .../platform', async () => {
    mocks.dissociate.mockRejectedValueOnce(new ApiError(409, 'x', { code: 'plataforma_con_accesos' }));
    renderConToast(<ConnectorsAdmin />);
    await seleccionar('ERP usuarios');
    fireEvent.click(screen.getByRole('button', { name: 'Desasociar el conector ERP usuarios' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Desasociar conector' });
    expect(within(dialogo).getByText(/dejará de estar asociado a Contabilidad/)).toBeTruthy();
    expect(mocks.dissociate).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Desasociar' }));
    expect(await within(dialogo).findByText(MENSAJE_DESASOCIAR_ACCESOS)).toBeTruthy();

    mocks.dissociate.mockResolvedValueOnce({
      status: 'success', connector: { ...ASOCIADO, platform_id: null, platform: null },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Desasociar' }));
    expect(await screen.findByText('Conector ERP usuarios desasociado.')).toBeTruthy();
    expect(mocks.dissociate).toHaveBeenLastCalledWith(4);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('conector_sin_plataforma al desasociar: mensaje propio y se actualiza la lista', async () => {
    mocks.dissociate.mockRejectedValue(new ApiError(409, 'x', { code: 'conector_sin_plataforma' }));
    renderConToast(<ConnectorsAdmin />);
    await seleccionar('ERP usuarios');
    const pedidas = mocks.list.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Desasociar el conector ERP usuarios' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Desasociar conector' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Desasociar' }));
    expect(await screen.findAllByText(MENSAJES_ASOCIAR.conector_sin_plataforma)).not.toHaveLength(0);
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(pedidas + 1));
  });
});
