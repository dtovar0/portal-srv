/**
 * DIS-078: marco de administración. Barra lateral colapsable, barra superior (buscador global con
 * paleta de comandos, tema, notificaciones, ayuda; menú de usuario en el pie de la barra lateral, DIS-080) y cajón móvil.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/types';

const ruta = vi.hoisted(() => ({ actual: '/', empujar: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => ruta.actual,
  useRouter: () => ({ push: ruta.empujar }),
}));
vi.mock('@/lib/api', () => ({
  api: { session: vi.fn(), notifications: vi.fn(), savePreferences: vi.fn() },
  ApiError: class ApiError extends Error {},
}));
vi.mock('@/lib/access/home', () => ({ homeApi: { summary: vi.fn() } }));

import { api } from '@/lib/api';
import { homeApi } from '@/lib/access/home';
import { limpiarSesionCache } from '@/components/session-provider';
import { AppShell } from '@/components/app-shell';
import { CLAVE_MENU_COLAPSADO } from '@/lib/use-menu-colapsado';
import { CLAVE_TEMA } from '@/lib/tema';
import { crearRaiz, simularCajas } from '../utils/dom-simulado';

const sesionSimulada = vi.mocked(api.session);
const notificaciones = vi.mocked(api.notifications);
const preferencias = vi.mocked(api.savePreferences);
const resumen = vi.mocked(homeApi.summary);

type Rol = 'usuario' | 'admin_area' | 'administrador';

function sesion(rol: Rol): Session {
  return {
    id: 1,
    email: 'ana.perez@ejemplo.test',
    name: 'Ana Pérez',
    role: rol,
    auth_source: 'local',
    areas: [],
    managed_areas: [],
    permissions: {
      is_admin: rol === 'administrador',
      is_area_admin: rol === 'admin_area',
      can_manage_areas: rol !== 'usuario',
      can_manage_system: rol === 'administrador',
    },
    preferences: {
      notifications: true, email_notifications: false, refresh_interval: 60, tour_enabled: false,
    },
  };
}

async function montar(rol: Rol = 'administrador') {
  sesionSimulada.mockResolvedValue(sesion(rol));
  render(<AppShell>contenido</AppShell>, { container: crearRaiz() });
  await screen.findByRole('navigation', { name: 'Principal' });
  // El atajo Ctrl K lo escucha el buscador de la barra superior: bajo carga se
  // monta después del menú y un atajo pulsado antes se perdía (DIS-094).
  await screen.findByRole('button', { name: 'Buscar' });
}

const lateral = () => within(document.querySelector('aside')!);
const barra = () => within(screen.getByRole('banner'));

beforeEach(() => {
  simularCajas();
  window.localStorage.clear();
  document.documentElement.className = '';
  notificaciones.mockResolvedValue([]);
  resumen.mockResolvedValue({ scope: 'global' });
  preferencias.mockResolvedValue({ status: 'ok', preferences: {} as never });
  ruta.empujar.mockReset();
  resumen.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sesionSimulada.mockReset();
  limpiarSesionCache();
  ruta.actual = '/';
});

describe('Barra lateral', () => {
  it('muestra las secciones General, Gestión y Sistema con icono en cada opción', async () => {
    await montar('administrador');
    const aside = document.querySelector('aside')!;
    for (const seccion of ['General', 'Gestión', 'Sistema']) {
      expect(within(aside).getByText(seccion)).toBeTruthy();
    }
    for (const enlace of lateral().getAllByRole('link')) {
      expect(enlace.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('la marca dice «Portal de accesos» y «Vivaro»', async () => {
    await montar('usuario');
    const aside = within(document.querySelector('aside')!);
    expect(aside.getByText('Portal de accesos')).toBeTruthy();
    expect(aside.getByText('Vivaro')).toBeTruthy();
    expect(aside.queryByText('Nexus')).toBeNull();
  });

  it('al usuario común no se le muestra «Gestión»: no tiene entradas de administración', async () => {
    await montar('usuario');
    expect(lateral().queryByText('Gestión')).toBeNull();
    expect(lateral().getByRole('link', { name: 'Plataformas' })).toBeTruthy();
  });

  it('el usuario no ve la sección Gestión con entradas de administración', async () => {
    await montar('usuario');
    expect(lateral().queryByRole('link', { name: 'Aprobaciones' })).toBeNull();
    expect(lateral().queryByRole('link', { name: 'Usuarios' })).toBeNull();
    expect(lateral().getByRole('link', { name: 'Plataformas' })).toBeTruthy();
  });

  it('marca la pantalla actual con aria-current y los tokens de activo', async () => {
    ruta.actual = '/areas';
    await montar('administrador');
    const actuales = lateral().getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');
    expect(actuales.map((a) => a.textContent)).toEqual(['Áreas']);
    expect(actuales[0].className).toContain('bg-activo-fondo');
    expect(actuales[0].className).toContain('text-activo-texto');
    // DIS-085: marca no cromática (barra lateral), solo en el activo.
    expect(actuales[0].querySelector('span[aria-hidden="true"].w-1')).not.toBeNull();
    const otros = lateral().getAllByRole('link').filter((a) => a !== actuales[0]);
    expect(otros.some((a) => a.querySelector('span[aria-hidden="true"].w-1'))).toBe(false);
  });

  it('colapsa y expande con el ☰ de la barra superior, sin perder el nombre accesible', async () => {
    await montar('administrador');
    const aside = document.querySelector('aside')!;
    expect(aside.className).toContain('w-lateral');
    expect(aside.className).not.toContain('w-lateral-colapsada');

    const boton = barra().getByRole('button', { name: 'Colapsar menú' });
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(boton);

    expect(aside.className).toContain('w-lateral-colapsada');
    const expandir = barra().getByRole('button', { name: 'Expandir menú' });
    expect(expandir.getAttribute('aria-expanded')).toBe('false');
    // Colapsada: solo iconos, con nombre accesible y title.
    const dashboard = lateral().getByRole('link', { name: 'Dashboard' });
    expect(dashboard.getAttribute('title')).toBe('Dashboard');
    expect(dashboard.getAttribute('aria-label')).toBe('Dashboard');
    expect(lateral().queryByText('General')).toBeNull();

    fireEvent.click(expandir);
    expect(aside.className).not.toContain('w-lateral-colapsada');
    expect(lateral().getByText('General')).toBeTruthy();
  });

  it('el botón de la barra superior también colapsa, y el estado se recuerda', async () => {
    await montar('administrador');
    fireEvent.click(barra().getByRole('button', { name: 'Colapsar menú' }));
    expect(window.localStorage.getItem(CLAVE_MENU_COLAPSADO)).toBe('1');
    cleanup();

    await montar('administrador');
    expect(document.querySelector('aside')!.className).toContain('w-lateral-colapsada');
    expect(barra().getByRole('button', { name: 'Expandir menú' }).getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(barra().getByRole('button', { name: 'Expandir menú' }));
    expect(window.localStorage.getItem(CLAVE_MENU_COLAPSADO)).toBe('0');
  });

  it('si el almacenamiento falla, el menú funciona igual', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    await montar('administrador');
    fireEvent.click(barra().getByRole('button', { name: 'Colapsar menú' }));
    expect(document.querySelector('aside')!.className).toContain('w-lateral-colapsada');
    vi.restoreAllMocks();
  });

  it('aprobaciones permanece oculta en la barra lateral aunque haya pendientes', async () => {
    resumen.mockResolvedValue({ scope: 'global', pending_approvals: 3 });
    await montar('administrador');
    expect(lateral().queryByRole('link', { name: /Aprobaciones/ })).toBeNull();
  });

  it('sin pendientes o sin ser admin no hay contador ni se pide el resumen', async () => {
    await montar('usuario');
    expect(resumen).not.toHaveBeenCalled();
    expect(lateral().getByRole('link', { name: 'Plataformas' }).textContent).toBe('Plataformas');
  });
});

describe('Barra superior', () => {
  it('muestra la ruta «sección › pantalla»', async () => {
    ruta.actual = '/audit/users/3';
    await montar('administrador');
    const nav = screen.getByRole('navigation', { name: 'Ruta' });
    expect(within(nav).getByText('Sistema')).toBeTruthy();
    expect(within(nav).getByText('Auditoría').getAttribute('aria-current')).toBe('page');
  });

  it('el botón de tema alterna claro y oscuro y lo guarda', async () => {
    await montar('administrador');
    fireEvent.click(barra().getByRole('button', { name: 'Cambiar a tema oscuro' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
    await waitFor(() => expect(preferencias).toHaveBeenCalledWith({ theme: 'oscuro' }));

    fireEvent.click(barra().getByRole('button', { name: 'Cambiar a tema claro' }));
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(window.localStorage.getItem(CLAVE_TEMA)).toBe('claro');
  });

  it('notificaciones lleva a /notifications e indica cuántas hay sin leer', async () => {
    notificaciones.mockResolvedValue([
      { id: 1, type: 'info', title: 'a', message: 'a', is_read: false, time: '', timestamp: '' },
      { id: 2, type: 'info', title: 'b', message: 'b', is_read: true, time: '', timestamp: '' },
    ]);
    await montar('usuario');
    const enlace = await barra().findByRole('link', { name: 'Notificaciones, 1 sin leer' });
    expect(enlace.getAttribute('href')).toBe('/notifications');
  });

  it('un fallo al pedir los indicadores no rompe el marco', async () => {
    notificaciones.mockRejectedValue(new Error('500'));
    await montar('usuario');
    expect(barra().getByRole('link', { name: 'Notificaciones' })).toBeTruthy();
  });

  it('la ayuda abre un diálogo y devuelve el foco al botón al cerrar', async () => {
    await montar('usuario');
    const boton = barra().getByRole('button', { name: 'Ayuda' });
    boton.focus();
    fireEvent.click(boton);
    const dialogo = screen.getByRole('dialog', { name: 'Ayuda' });
    expect(within(dialogo).getByText(/Ctrl K|⌘K/)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(boton);
  });

  it('en móvil el menú abre el cajón', async () => {
    await montar('usuario');
    const menu = barra().getByRole('button', { name: 'Menú' });
    fireEvent.click(menu);
    expect(screen.getByRole('dialog', { name: 'Menú' })).toBeTruthy();
  });
});

describe('Menú de usuario', () => {
  async function abrirMenu() {
    await montar('admin_area');
    const boton = lateral().getByRole('button', { name: 'Menú de usuario: Ana Pérez' });
    return boton;
  }

  it('muestra el avatar con iniciales, el rol y es un botón de menú', async () => {
    const boton = await abrirMenu();
    expect(boton.getAttribute('aria-haspopup')).toBe('menu');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(boton.textContent).toContain('AP');
    expect(boton.textContent).toContain('Administrador de área');
  });

  it('se maneja con teclado: ↓ abre, flechas mueven, Escape cierra y devuelve el foco', async () => {
    const boton = await abrirMenu();
    boton.focus();
    fireEvent.keyDown(boton, { key: 'ArrowDown' });
    const menu = screen.getByRole('menu', { name: 'Cuenta' });
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    const salir = within(menu).getByRole('menuitem', { name: 'Cerrar sesión' });
    expect(document.activeElement).toBe(salir);

    fireEvent.keyDown(salir, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton);
  });

  it('no muestra opción de tema y «Cerrar sesión» enlaza a /logout', async () => {
    const boton = await abrirMenu();
    fireEvent.click(boton);
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }).getAttribute('href')).toBe('/logout');
    expect(within(menu).queryByRole('menuitemcheckbox')).toBeNull();
  });

  it('el clic fuera cierra el menú', async () => {
    const boton = await abrirMenu();
    fireEvent.click(boton);
    fireEvent.pointerDown(screen.getByText('contenido'));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('Buscador global', () => {
  async function abrirPaleta() {
    await montar('admin_area');
    const origen = document.activeElement;
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    return { origen, dialogo: await screen.findByRole('dialog', { name: 'Buscador global' }) };
  }

  it('Ctrl K y ⌘K abren la paleta con el foco en el combobox y las pantallas del rol', async () => {
    const { dialogo } = await abrirPaleta();
    const campo = within(dialogo).getByRole('combobox', { name: 'Buscar pantallas y acciones' });
    expect(within(dialogo).queryByRole('option', { name: /Aprobaciones/ })).toBeNull();
    expect(within(dialogo).getByRole('option', { name: /Plataformas/ })).toBeTruthy();
    // Un admin de área no ve «Conectores» (solo superadmin).
    expect(within(dialogo).queryByRole('option', { name: /Conectores/ })).toBeNull();
    expect(within(dialogo).getByRole('option', { name: /Cerrar sesión/ })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'K', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'Buscador global' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('filtra sin distinguir acentos ni mayúsculas', async () => {
    const { dialogo } = await abrirPaleta();
    fireEvent.change(within(dialogo).getByRole('combobox'), { target: { value: 'auditoria' } });
    const opciones = within(dialogo).getAllByRole('option');
    expect(opciones).toHaveLength(2);
    const textos = opciones.map((o) => o.textContent);
    expect(textos.some((t) => t?.includes('Auditoría'))).toBe(true);
    expect(textos.some((t) => t?.includes('Auditoría usuarios'))).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('muestra un aviso si no hay resultados', async () => {
    const { dialogo } = await abrirPaleta();
    fireEvent.change(within(dialogo).getByRole('combobox'), { target: { value: 'zzzz' } });
    expect(within(dialogo).queryAllByRole('option')).toHaveLength(0);
    expect(within(dialogo).getByRole('status').textContent).toContain('Sin resultados');
    expect(within(dialogo).getByRole('combobox').getAttribute('aria-activedescendant')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('las flechas mueven la opción activa y Enter navega a la pantalla', async () => {
    const { dialogo } = await abrirPaleta();
    const campo = within(dialogo).getByRole('combobox');
    const opciones = () => within(dialogo).getAllByRole('option');
    expect(opciones()[0].getAttribute('aria-selected')).toBe('true');
    expect(campo.getAttribute('aria-activedescendant')).toBe(opciones()[0].id);

    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    expect(opciones()[1].getAttribute('aria-selected')).toBe('true');
    expect(campo.getAttribute('aria-activedescendant')).toBe(opciones()[1].id);
    fireEvent.keyDown(campo, { key: 'ArrowUp' });
    fireEvent.keyDown(campo, { key: 'ArrowUp' });
    expect(opciones()[opciones().length - 1].getAttribute('aria-selected')).toBe('true');

    fireEvent.change(campo, { target: { value: 'usuarios' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(ruta.empujar).toHaveBeenCalledWith('/users');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un clic en una acción la ejecuta (cambiar de tema)', async () => {
    const { dialogo } = await abrirPaleta();
    fireEvent.click(within(dialogo).getByRole('option', { name: /Cambiar a tema oscuro/ }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape cierra y devuelve el foco al control que lo tenía', async () => {
    const { origen } = await abrirPaleta();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(origen);
  });

  it('Tab no saca el foco de la paleta', async () => {
    const { dialogo } = await abrirPaleta();
    const campo = within(dialogo).getByRole('combobox');
    const cerrar = within(dialogo).getByRole('button', { name: 'Cerrar' });
    cerrar.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(campo);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(cerrar);
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('Ctrl K abre la paleta', async () => {
    await montar('usuario');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(await screen.findByRole('dialog', { name: 'Buscador global' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
  });
});

describe('Menú de usuario en el pie de la barra lateral (DIS-080)', () => {
  it('ya no está en la barra superior, que conserva ☰, ruta, buscador, tema, notificaciones y ayuda', async () => {
    await montar('administrador');
    expect(barra().queryByRole('button', { name: /Menú de usuario/ })).toBeNull();
    expect(barra().getByRole('button', { name: 'Colapsar menú' })).toBeTruthy();
    const buscar = barra().getByRole('button', { name: 'Buscar' });
    expect(buscar.getAttribute('aria-haspopup')).toBe('dialog');
    expect(buscar.getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K');
    expect(barra().getByRole('button', { name: 'Cambiar a tema oscuro' })).toBeTruthy();
    expect(barra().getByRole('link', { name: 'Notificaciones' })).toBeTruthy();
    expect(barra().getByRole('button', { name: /Ayuda/ })).toBeTruthy();
  });

  it('expandida: tarjeta con avatar, nombre y rol, a lo ancho del pie y sin botón de colapsar', async () => {
    await montar('admin_area');
    const tarjeta = lateral().getByRole('button', { name: 'Menú de usuario: Ana Pérez' });
    expect(tarjeta.textContent).toContain('AP');
    expect(tarjeta.textContent).toContain('Ana Pérez');
    expect(tarjeta.textContent).toContain('Administrador de área');
    expect(tarjeta.getAttribute('aria-haspopup')).toBe('menu');
    expect(lateral().queryByRole('button', { name: /(Colapsar|Expandir) menú/ })).toBeNull();
    expect(lateral().getAllByRole('button')).toEqual([tarjeta]);
  });

  it('el menú se abre hacia arriba de la tarjeta', async () => {
    await montar('admin_area');
    const tarjeta = lateral().getByRole('button', { name: 'Menú de usuario: Ana Pérez' });
    fireEvent.click(tarjeta);
    const menu = screen.getByRole('menu', { name: 'Cuenta' });
    expect(menu.className).toContain('bottom-full');
    expect(menu.className).not.toContain('top-full');
    expect(tarjeta.getAttribute('aria-controls')).toBe(menu.id);
    expect(within(menu).queryByRole('menuitemcheckbox')).toBeNull();
    expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('colapsada: solo el avatar con nombre accesible y title, sin botón de expandir, menú arriba y a la derecha', async () => {
    window.localStorage.setItem(CLAVE_MENU_COLAPSADO, '1');
    await montar('admin_area');
    const avatar = lateral().getByRole('button', { name: 'Menú de usuario: Ana Pérez' });
    expect(avatar.getAttribute('title')).toBe('Menú de usuario: Ana Pérez');
    expect(avatar.textContent).toBe('AP');
    expect(avatar.className).toContain('min-w-11');
    expect(lateral().queryByRole('button', { name: /(Colapsar|Expandir) menú/ })).toBeNull();
    expect(lateral().getAllByRole('button')).toEqual([avatar]);
    expect(barra().getByRole('button', { name: 'Expandir menú' }).getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(avatar);
    const menu = screen.getByRole('menu', { name: 'Cuenta' });
    expect(menu.className).toContain('bottom-0');
    expect(menu.className).toContain('left-full');
    expect(menu.className).not.toContain('top-full');
  });

  it('teclado: ArrowDown/ArrowUp abren, Escape devuelve el foco y Tab cierra', async () => {
    await montar('usuario');
    const boton = lateral().getByRole('button', { name: /Menú de usuario/ });
    boton.focus();
    fireEvent.keyDown(boton, { key: 'ArrowDown' });
    const menu = screen.getByRole('menu');
    const salir = within(menu).getByRole('menuitem', { name: 'Cerrar sesión' });
    expect(document.activeElement).toBe(salir);
    fireEvent.keyDown(salir, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(boton);

    fireEvent.keyDown(boton, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Cerrar sesión' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
  });

  it('en el cajón móvil, la tarjeta de usuario va al pie', async () => {
    await montar('usuario');
    fireEvent.click(barra().getByRole('button', { name: 'Menú' }));
    const cajon = screen.getByRole('dialog', { name: 'Menú' });
    const tarjeta = within(cajon).getByRole('button', { name: 'Menú de usuario: Ana Pérez' });
    const enlaces = within(cajon).getAllByRole('link');
    expect(enlaces[enlaces.length - 1].compareDocumentPosition(tarjeta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(tarjeta);
    expect(within(cajon).getByRole('menu', { name: 'Cuenta' }).className).toContain('bottom-full');
  });
});

describe('Correcciones de la auditoría de accesibilidad (DIS-078)', () => {
  it('las opciones visibles tienen título accesible al colapsar el menú y Aprobaciones permanece oculta', async () => {
    resumen.mockResolvedValue({ scope: 'global', pending_approvals: 3 });
    await montar('administrador');
    expect(lateral().queryByRole('link', { name: /Aprobaciones/ })).toBeNull();

    fireEvent.click(barra().getByRole('button', { name: 'Colapsar menú' }));
    expect(lateral().queryByRole('link', { name: /Aprobaciones/ })).toBeNull();
    const dashboard = lateral().getByRole('link', { name: 'Dashboard' });
    expect(dashboard.getAttribute('title')).toBe('Dashboard');
  });

  it('el primer elemento tabulable es «Saltar al contenido» y apunta al main', async () => {
    await montar('usuario');
    const salto = screen.getByRole('link', { name: 'Saltar al contenido' });
    expect(salto.getAttribute('href')).toBe('#contenido');
    expect(screen.getByRole('main').id).toBe('contenido');
    const primero = Array.from(document.querySelectorAll<HTMLElement>('a[href], button')).find(
      (el) => !el.closest('[hidden]'),
    );
    expect(primero).toBe(salto);
    expect(salto.className).toContain('focus:translate-y-0');
  });

  it('el ☰ de la barra superior controla el aside y la barra lateral no tiene botón de colapsar', async () => {
    await montar('administrador');
    const id = document.querySelector('aside')!.id;
    expect(id).toBeTruthy();
    expect(barra().getByRole('button', { name: 'Colapsar menú' }).getAttribute('aria-controls')).toBe(id);
    expect(lateral().queryByRole('button', { name: /(Colapsar|Expandir) menú/ })).toBeNull();
  });

  it('la paleta anuncia el número de resultados y aria-expanded sigue a la lista', async () => {
    await montar('usuario');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const dialogo = await screen.findByRole('dialog', { name: 'Buscador global' });
    const campo = within(dialogo).getByRole('combobox');
    const vivo = () => dialogo.querySelector('[aria-live="polite"]')!;
    expect(vivo().textContent).toMatch(/^\d+ resultados$/);
    expect(campo.getAttribute('aria-expanded')).toBe('true');
    fireEvent.change(campo, { target: { value: 'plataforma' } });
    expect(vivo().textContent).toBe('1 resultado');
    fireEvent.change(campo, { target: { value: 'zzzz' } });
    expect(vivo().textContent).toBe('Sin resultados');
    expect(campo.getAttribute('aria-expanded')).toBe('false');
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('ArrowUp en el botón del menú de usuario lo abre y enfoca el último ítem', async () => {
    await montar('usuario');
    const boton = lateral().getByRole('button', { name: /Menú de usuario/ });
    boton.focus();
    fireEvent.keyDown(boton, { key: 'ArrowUp' });
    const menu = screen.getByRole('menu');
    expect(document.activeElement).toBe(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }));
  });
});
