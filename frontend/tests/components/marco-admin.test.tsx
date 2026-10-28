/**
 * DIS-078: marco de administración. Barra lateral colapsable, barra superior (buscador global con
 * paleta de comandos, tema, notificaciones, ayuda, menú de usuario) y cajón móvil.
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

  it('al usuario común no se le muestra «Gestión» con una sola entrada: Auditoría va en General', async () => {
    await montar('usuario');
    expect(lateral().queryByText('Gestión')).toBeNull();
    expect(lateral().getByRole('link', { name: 'Auditoría' })).toBeTruthy();
  });

  it('el usuario no ve la sección Gestión con entradas de administración', async () => {
    await montar('usuario');
    expect(lateral().queryByRole('link', { name: 'Aprobaciones' })).toBeNull();
    expect(lateral().queryByRole('link', { name: 'Usuarios' })).toBeNull();
    expect(lateral().getByRole('link', { name: 'Mis solicitudes' })).toBeTruthy();
  });

  it('marca la pantalla actual con aria-current y los tokens de activo', async () => {
    ruta.actual = '/areas';
    await montar('administrador');
    const actuales = lateral().getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');
    expect(actuales.map((a) => a.textContent)).toEqual(['Áreas']);
    expect(actuales[0].className).toContain('bg-activo-fondo');
    expect(actuales[0].className).toContain('text-activo-texto');
  });

  it('colapsa y expande con el botón de abajo, sin perder el nombre accesible', async () => {
    await montar('administrador');
    const aside = document.querySelector('aside')!;
    expect(aside.className).toContain('w-lateral');
    expect(aside.className).not.toContain('w-lateral-colapsada');

    const boton = lateral().getByRole('button', { name: 'Colapsar menú' });
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(boton);

    expect(aside.className).toContain('w-lateral-colapsada');
    const expandir = lateral().getByRole('button', { name: 'Expandir menú' });
    expect(expandir.getAttribute('aria-expanded')).toBe('false');
    // Colapsada: solo iconos, con nombre accesible y title.
    const catalogo = lateral().getByRole('link', { name: 'Catálogo' });
    expect(catalogo.getAttribute('title')).toBe('Catálogo');
    expect(catalogo.getAttribute('aria-label')).toBe('Catálogo');
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
    fireEvent.click(lateral().getByRole('button', { name: 'Colapsar menú' }));
    expect(document.querySelector('aside')!.className).toContain('w-lateral-colapsada');
    vi.restoreAllMocks();
  });

  it('muestra el contador de aprobaciones pendientes del resumen y lo anuncia', async () => {
    resumen.mockResolvedValue({ scope: 'global', pending_approvals: 3 });
    await montar('administrador');
    await waitFor(() => expect(lateral().getByRole('link', { name: /Aprobaciones.*3 pendientes/ })).toBeTruthy());
  });

  it('sin pendientes o sin ser admin no hay contador ni se pide el resumen', async () => {
    await montar('usuario');
    expect(resumen).not.toHaveBeenCalled();
    expect(lateral().getByRole('link', { name: 'Catálogo' }).textContent).toBe('Catálogo');
  });
});

describe('Barra superior', () => {
  it('muestra la ruta «Inicio › pantalla»', async () => {
    ruta.actual = '/audit/users/3';
    await montar('administrador');
    const nav = screen.getByRole('navigation', { name: 'Ruta' });
    expect(within(nav).getByRole('link', { name: 'Inicio' }).getAttribute('href')).toBe('/');
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

  it('en móvil el buscador es un icono y el menú abre el cajón', async () => {
    await montar('usuario');
    const iconos = barra().getAllByRole('button', { name: /^Buscar( \(|$)/ });
    // Campo de escritorio y icono móvil, ambos con nombre accesible.
    expect(iconos).toHaveLength(2);
    expect(iconos[1].className).toContain('md:hidden');
    // El de escritorio parece un campo: lupa, texto de la maqueta y atajo.
    expect(iconos[0].textContent).toContain('Buscar usuarios, plataformas, solicitudes…');
    expect(iconos[0].textContent).toMatch(/Ctrl K|⌘K/);
    expect(iconos[0].getAttribute('aria-label')).toMatch(/^Buscar \(/);
    const menu = barra().getByRole('button', { name: 'Menú' });
    fireEvent.click(menu);
    expect(screen.getByRole('dialog', { name: 'Menú' })).toBeTruthy();
  });
});

describe('Menú de usuario', () => {
  async function abrirMenu() {
    await montar('admin_area');
    const boton = barra().getByRole('button', { name: 'Menú de usuario: Ana Pérez' });
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
    const tema = within(menu).getByRole('menuitemcheckbox', { name: 'Tema: según el sistema' });
    const salir = within(menu).getByRole('menuitem', { name: 'Cerrar sesión' });
    expect(document.activeElement).toBe(tema);

    fireEvent.keyDown(tema, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(salir);
    fireEvent.keyDown(salir, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(tema);
    fireEvent.keyDown(tema, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(salir);
    fireEvent.keyDown(salir, { key: 'Home' });
    expect(document.activeElement).toBe(tema);
    fireEvent.keyDown(tema, { key: 'End' });
    expect(document.activeElement).toBe(salir);

    fireEvent.keyDown(salir, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton);
  });

  it('«Tema: según el sistema» vuelve al tema del sistema y «Cerrar sesión» enlaza a /logout', async () => {
    window.localStorage.setItem(CLAVE_TEMA, 'oscuro');
    const boton = await abrirMenu();
    fireEvent.click(boton);
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }).getAttribute('href')).toBe('/logout');
    const tema = within(menu).getByRole('menuitemcheckbox', { name: 'Tema: según el sistema' });
    expect(tema.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(tema);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(CLAVE_TEMA)).toBe('sistema');
    await waitFor(() => expect(preferencias).toHaveBeenCalledWith({ theme: 'sistema' }));
    expect(screen.queryByRole('menu')).toBeNull();
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
    const origen = barra().getAllByRole('button', { name: /^Buscar( \(|$)/ })[0];
    origen.focus();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    return { origen, dialogo: screen.getByRole('dialog', { name: 'Buscador global' }) };
  }

  it('Ctrl K y ⌘K abren la paleta con el foco en el combobox y las pantallas del rol', async () => {
    const { dialogo } = await abrirPaleta();
    const campo = within(dialogo).getByRole('combobox', { name: 'Buscar pantallas y acciones' });
    expect(document.activeElement).toBe(campo);
    expect(within(dialogo).getByRole('option', { name: /Aprobaciones/ })).toBeTruthy();
    // Un admin de área no ve «Conectores» (solo superadmin).
    expect(within(dialogo).queryByRole('option', { name: /Conectores/ })).toBeNull();
    expect(within(dialogo).getByRole('option', { name: /Cerrar sesión/ })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'K', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'Buscador global' })).toBeTruthy();
  });

  it('filtra sin distinguir acentos ni mayúsculas', async () => {
    const { dialogo } = await abrirPaleta();
    fireEvent.change(within(dialogo).getByRole('combobox'), { target: { value: 'auditoria' } });
    const opciones = within(dialogo).getAllByRole('option');
    expect(opciones).toHaveLength(1);
    expect(opciones[0].textContent).toContain('Auditoría');
  });

  it('muestra un aviso si no hay resultados', async () => {
    const { dialogo } = await abrirPaleta();
    fireEvent.change(within(dialogo).getByRole('combobox'), { target: { value: 'zzzz' } });
    expect(within(dialogo).queryAllByRole('option')).toHaveLength(0);
    expect(within(dialogo).getByRole('status').textContent).toContain('Sin resultados');
    expect(within(dialogo).getByRole('combobox').getAttribute('aria-activedescendant')).toBeNull();
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
  });

  it('el campo de la barra abre la paleta con clic', async () => {
    await montar('usuario');
    fireEvent.click(barra().getAllByRole('button', { name: /^Buscar( \(|$)/ })[0]);
    expect(screen.getByRole('dialog', { name: 'Buscador global' })).toBeTruthy();
  });
});
