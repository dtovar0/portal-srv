import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLAVE_PLATFORMS_LAYOUT,
  esPlatformsLayout,
  guardarPlatformsLayout,
  leerPlatformsLayout,
} from '@/lib/platforms-layout';
import { BarraSuperior } from '@/components/marco/barra-superior';
import { PlatformsTopbar } from '@/components/platforms/platforms-topbar';
import { PlatformsSidebarView } from '@/components/platforms/platforms-sidebar-view';
import { PlatformsPageShell } from '@/components/platforms/platforms-shell';
import { CLAVE_OMITIR_BIENVENIDA, PlatformsLaunchpadView } from '@/components/platforms/platforms-launchpad-view';
import { UserRequestsTable } from '@/components/platforms/user-requests-table';
import { CLAVE_BOTON_USUARIO_COMPACTO, CLAVE_MOSTRAR_DOCUMENTOS, UserViewSettings } from '@/components/platforms/user-view-settings';
import { PlatformMockupCard } from '@/components/platforms/platform-mockup-card';
import { MenuNotificaciones } from '@/components/platforms/menu-notificaciones';
import { PreferencesTab } from '@/components/settings/preferences-tab';
import type { Session } from '@/lib/types';

vi.mock('@/components/use-tema', () => ({
  useTema: () => ({ oscuro: false, alternar: vi.fn() }),
}));

vi.mock('@/components/marco/use-indicadores', () => ({
  useIndicadores: () => ({ noLeidas: 0, pendientes: 0 }),
}));

let mockPendingRequestId: number | null = null;
const mockMarcarFavorito = vi.fn();
// DIS-124: plataformas aprobadas del usuario (vacío = sin accesos).
const MIAS_CON_ACCESO = new Map([[1, { id: 1, name: 'Slack', is_favorite: true }]]);
let mockMias: Map<number, { id: number; name: string; is_favorite: boolean }> = MIAS_CON_ACCESO;
// DIS-127: estado del acceso de la plataforma del catálogo simulado.
let mockEstadoAcceso: string | null = 'activo';

vi.mock('@/components/access/use-catalogo-solicitable', () => ({
  useCatalogoSolicitable: () => ({
    catalogo: { data: [], loading: false, error: null },
    items: [
      {
        platform: { id: 1, name: 'Slack', description: 'Chat', icon: 'slack' },
        area: { id: 1, name: 'TI' },
        my_access_status: mockEstadoAcceso,
        my_level: 'usuario',
        can_request: false,
        pending_request_id: mockPendingRequestId,
      },
    ],
    areas: [{ id: 1, name: 'TI' }],
    mias: mockMias,
    marcarSolicitada: vi.fn(),
    marcarFavorito: mockMarcarFavorito,
  }),
}));

let sesionActual: Session;
vi.mock('@/components/session-provider', () => ({
  useSession: () => ({ session: sesionActual }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/toast', () => ({
  useToast: () => ({ avisar: vi.fn() }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      savePreferences: vi.fn(),
      notifications: vi.fn().mockResolvedValue([
        {
          id: 1,
          type: 'info',
          title: 'Bienvenido al Portal',
          message: 'Tus accesos están listos para usar.',
          is_read: false,
          time: 'Hace 5 min',
          timestamp: '2026-11-20T16:00:00Z',
        },
      ]),
      markNotificationsRead: vi.fn().mockResolvedValue({ status: 'ok' }),
      responsiva: vi.fn().mockResolvedValue({
        version: '1.0',
        firmada: false,
        titulo: 'Carta Responsiva de Uso de Activos de Información',
        contenido: 'Términos y condiciones de prueba institucionales.',
        plataformas: [],
        areas: [],
      }),
      firmarResponsiva: vi.fn().mockResolvedValue({ status: 'ok', message: 'Firmada', firmada_at: '2026-11-21' }),
    },
  };
});

function crearSesion(esAdmin: boolean): Session {
  return {
    id: 1,
    name: 'Juan Pérez',
    email: 'juan@vivaro.com',
    role: esAdmin ? 'administrador' : 'usuario',
    auth_source: 'local',
    responsiva_firmada: true,
    responsiva_firmada_at: '2026-10-28T13:03:09Z',
    responsiva_version: '1.0',
    areas: [],
    managed_areas: [],
    permissions: {
      is_admin: esAdmin,
      is_area_admin: false,
      can_manage_areas: esAdmin,
      can_manage_system: esAdmin,
    },
    preferences: {
      notifications: true,
      email_notifications: true,
      refresh_interval: 60,
      tour_enabled: true,
      theme: 'sistema',
    },
  };
}

describe('platforms-layout (lib)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('valida tipos de layout reconocidos', () => {
    expect(esPlatformsLayout('topbar')).toBe(true);
    expect(esPlatformsLayout('sidebar')).toBe(true);
    expect(esPlatformsLayout('otro')).toBe(false);
    expect(esPlatformsLayout(null)).toBe(false);
  });

  it('retorna topbar por omisión cuando no hay valor guardado', () => {
    expect(leerPlatformsLayout()).toBe('topbar');
  });

  it('guarda y recupera preferencia de layout en localStorage', () => {
    guardarPlatformsLayout('sidebar');
    expect(window.localStorage.getItem(CLAVE_PLATFORMS_LAYOUT)).toBe('sidebar');
    expect(leerPlatformsLayout()).toBe('sidebar');

    guardarPlatformsLayout('topbar');
    expect(window.localStorage.getItem(CLAVE_PLATFORMS_LAYOUT)).toBe('topbar');
    expect(leerPlatformsLayout()).toBe('topbar');
  });
});

describe('PlatformsTopbar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra el botón para regresar al panel admin primero a la izquierda con icono de panel y diseño estandarizado', () => {
    const sesionAdmin = crearSesion(true);
    render(<PlatformsTopbar session={sesionAdmin} />);

    const botonAdmin = screen.getByRole('link', { name: /regresar al panel/i });
    expect(botonAdmin).toBeDefined();
    expect(botonAdmin.getAttribute('href')).toBe('/dashboard');
    expect(botonAdmin.getAttribute('title')).toBe('Regresar al panel de administración');
    // Diseño estandarizado idéntico a los demás (no azul relleno bg-primary)
    expect(botonAdmin.className).not.toContain('bg-primary');

    // Debe ser el primer elemento de navegación de izquierda a derecha
    const nav = screen.getByRole('navigation', { name: /navegación del portal/i });
    const links = nav.querySelectorAll('a');
    expect(links[0]).toBe(botonAdmin);

    // Divisores de sección presentes (a la izquierda del engrane y a la derecha de la campana)
    expect(screen.getByTestId('divisor-topbar-seccion-1')).toBeDefined();
    expect(screen.getByTestId('divisor-topbar-seccion-2')).toBeDefined();
  });

  it('NO muestra el botón para regresar al panel admin si es usuario regular', () => {
    const sesionUsuario = crearSesion(false);
    render(<PlatformsTopbar session={sesionUsuario} />);

    const botonAdmin = screen.queryByRole('link', { name: /regresar al panel/i });
    expect(botonAdmin).toBeNull();
  });

  it('renderiza enlaces de Plataformas y Mis Solicitudes como iconos con tooltip y botón de engrane', () => {
    const sesionUsuario = crearSesion(false);
    const onToggleAjustes = vi.fn();
    render(<PlatformsTopbar session={sesionUsuario} onToggleAjustes={onToggleAjustes} />);

    // Plataformas es icono con tooltip
    const enlacePlataformas = screen.getByRole('link', { name: 'Plataformas' });
    expect(enlacePlataformas.getAttribute('title')).toBe('Plataformas');

    // Mis Solicitudes es icono con tooltip
    const enlaceSolicitudes = screen.getByRole('link', { name: /mis solicitudes/i });
    expect(enlaceSolicitudes.getAttribute('title')).toContain('Mis solicitudes');

    // Carta Responsiva es icono con tooltip
    const botonResponsiva = screen.getByRole('link', { name: /carta responsiva/i });
    expect(botonResponsiva.getAttribute('title')).toContain('Carta Responsiva');
    expect(botonResponsiva.querySelector('svg')).toBeDefined();

    // Botón de engrane para acceder a configuración de vista
    const botonEngrane = screen.getByRole('button', { name: /configuración y diseño de vista/i });
    expect(botonEngrane).toBeDefined();

    fireEvent.click(botonEngrane);
    expect(onToggleAjustes).toHaveBeenCalledTimes(1);

    // El botón textual previo "Vista: Topbar" ya no existe
    expect(screen.queryByRole('button', { name: /cambiar a diseño/i })).toBeNull();
  });

  it('permite abrir la sección de Carta Responsiva en modo Topbar al hacer clic en el icono', () => {
    const sesionUsuario = crearSesion(false);
    const onToggleResponsiva = vi.fn();
    render(<PlatformsTopbar session={sesionUsuario} onToggleResponsiva={onToggleResponsiva} />);

    const botonResponsiva = screen.getByRole('button', { name: /carta responsiva/i });
    expect(botonResponsiva).toBeDefined();
    expect(botonResponsiva.getAttribute('title')).toContain('Carta Responsiva: Firmada');

    fireEvent.click(botonResponsiva);
    expect(onToggleResponsiva).toHaveBeenCalledTimes(1);
  });

  it('el buscador central de la barra superior utiliza el icono vectorial de buscar y no un emoji, y muestra placeholder conciso con shortcut', () => {
    const sesionUsuario = crearSesion(false);
    render(<PlatformsTopbar session={sesionUsuario} />);
    const input = screen.getByLabelText(/buscar plataforma/i);
    expect(input).toBeDefined();
    expect(input.getAttribute('placeholder')).toBe('Buscar plataforma...');

    const contenedorBuscador = input.parentElement;
    expect(contenedorBuscador).toBeDefined();
    // Debe tener el icono SVG vectorial
    const svgIcono = contenedorBuscador?.querySelector('svg');
    expect(svgIcono).toBeDefined();
    // No debe contener el emoji 🔍
    expect(contenedorBuscador?.textContent).not.toContain('🔍');
    // Muestra el atajo de teclado ⌘K en la insignia kbd
    expect(contenedorBuscador?.querySelector('kbd')?.textContent).toContain('⌘K');
  });

  it('muestra el buscador central cuando está en la sección catálogo y lo oculta en personalización, responsiva o widget', () => {
    const sesionUsuario = crearSesion(false);

    // 1. Catálogo (o por defecto): visible
    const { rerender } = render(<PlatformsTopbar session={sesionUsuario} seccionActiva="catalogo" />);
    expect(screen.queryByPlaceholderText('Buscar plataforma...')).not.toBeNull();

    // 2. Personalización (Ajustes de Vista): oculto
    rerender(<PlatformsTopbar session={sesionUsuario} seccionActiva="personalizacion" />);
    expect(screen.queryByPlaceholderText('Buscar plataforma...')).toBeNull();

    // 3. Responsiva: oculto
    rerender(<PlatformsTopbar session={sesionUsuario} seccionActiva="responsiva" />);
    expect(screen.queryByPlaceholderText('Buscar plataforma...')).toBeNull();

    // 4. Widget: oculto
    rerender(<PlatformsTopbar session={sesionUsuario} seccionActiva="widget" />);
    expect(screen.queryByPlaceholderText('Buscar plataforma...')).toBeNull();

    // 5. Regresar a catálogo: visible de nuevo
    rerender(<PlatformsTopbar session={sesionUsuario} seccionActiva="catalogo" />);
    expect(screen.queryByPlaceholderText('Buscar plataforma...')).not.toBeNull();
  });

  it('no renderiza ningún botón temporal de probar responsiva en la barra superior', () => {
    const sesionUsuario = crearSesion(false);
    render(<PlatformsTopbar session={sesionUsuario} />);

    expect(screen.queryByRole('button', { name: /probar firma de responsiva/i })).toBeNull();
  });
});

describe('BarraSuperior y Navegación a Portal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('no renderiza el botón Ver Portal (Topbar) en la barra superior al haberse sustituido por el elemento Portal en la sección General del sidebar', () => {
    render(
      <BarraSuperior
        menuMovil={null}
        colapsada={false}
        onAlternarMenu={vi.fn()}
        oscuro={false}
        onAlternarTema={vi.fn()}
        noLeidas={0}
      />
    );

    // El botón Ver Portal (Topbar) ha sido retirado de la barra superior
    expect(screen.queryByRole('link', { name: /ver portal/i })).toBeNull();
  });
});

describe('PreferencesTab - selector de diseño de plataformas', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sesionActual = crearSesion(false);
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza las opciones de diseño de plataformas y permite cambiar la preferencia', () => {
    render(<PreferencesTab />);

    const radioTopbar = screen.getByLabelText(/solo barra superior \(launchpad\)/i) as HTMLInputElement;
    const radioSidebar = screen.getByLabelText(/con barra lateral \(panel de control\)/i) as HTMLInputElement;

    expect(radioTopbar).toBeDefined();
    expect(radioSidebar).toBeDefined();

    // Por omisión está seleccionada la opción topbar
    expect(radioTopbar.checked).toBe(true);
    expect(radioSidebar.checked).toBe(false);

    // Cambiar a sidebar
    fireEvent.click(radioSidebar);
    expect(radioSidebar.checked).toBe(true);
    expect(radioTopbar.checked).toBe(false);
    expect(window.localStorage.getItem(CLAVE_PLATFORMS_LAYOUT)).toBe('sidebar');

    // Checkbox de mensaje de bienvenida en plataformas
    const checkboxBienvenida = screen.getByLabelText(/mostrar diálogo de bienvenida al ingresar/i) as HTMLInputElement;
    expect(checkboxBienvenida).toBeDefined();
    expect(checkboxBienvenida.checked).toBe(true);

    fireEvent.click(checkboxBienvenida);
    expect(checkboxBienvenida.checked).toBe(false);
    expect(window.localStorage.getItem(CLAVE_OMITIR_BIENVENIDA)).toBe('true');

    fireEvent.click(checkboxBienvenida);
    expect(checkboxBienvenida.checked).toBe(true);
    expect(window.localStorage.getItem(CLAVE_OMITIR_BIENVENIDA)).toBeNull();
  });
});

describe('PlatformsPageShell - modo Topbar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sesionActual = crearSesion(true);
    window.localStorage.setItem(CLAVE_PLATFORMS_LAYOUT, 'topbar');
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza el contenedor principal main con espaciado p-4 md:p-6 simétrico a la barra superior', () => {
    render(<PlatformsPageShell />);
    const mainEl = document.getElementById('contenido');
    expect(mainEl).toBeDefined();
    expect(mainEl?.className).toContain('p-4 md:p-6');
    expect(mainEl?.className).not.toContain('md:p-8');
  });

  it('permite abrir ajustes de vista desde el engrane en modo Topbar y conmutar a sidebar', () => {
    render(<PlatformsPageShell />);

    // El botón de engrane está en la topbar
    const botonEngrane = screen.getByRole('button', { name: /configuración y diseño de vista/i });
    expect(botonEngrane).toBeDefined();

    // Al hacer clic, abre la pantalla de ajustes de vista
    fireEvent.click(botonEngrane);
    expect(screen.getByText('Disposición Principal del Portal')).toBeDefined();

    // Cambiar a sidebar desde los ajustes
    const radioSidebar = screen.getByRole('radio', { name: /vista barra lateral/i });
    fireEvent.click(radioSidebar);
    expect(window.localStorage.getItem(CLAVE_PLATFORMS_LAYOUT)).toBe('sidebar');
  });

  it('permite abrir y visualizar la sección de Carta Responsiva en modo Topbar y volver al catálogo', async () => {
    render(<PlatformsPageShell />);

    // El botón de Carta Responsiva está presente en la topbar
    const botonResponsiva = screen.getByRole('button', { name: /carta responsiva/i });
    expect(botonResponsiva).toBeDefined();

    // Al hacer clic, abre la sección de Carta Responsiva
    fireEvent.click(botonResponsiva);
    expect(await screen.findByText('Carta Responsiva de Activos y Herramientas')).toBeDefined();
    expect(screen.getByText('Usuario Titular')).toBeDefined();
    expect(screen.getByText('Fecha de Firma')).toBeDefined();
    expect(screen.getByText('28 de octubre de 2026')).toBeDefined();

    // No debe existir botón redundante de retorno dentro del encabezado
    expect(screen.queryByRole('button', { name: /volver al catálogo/i })).toBeNull();

    // Al pulsar nuevamente el botón de Carta Responsiva, permanece en la sección
    fireEvent.click(botonResponsiva);
    expect(screen.getByText('Carta Responsiva de Activos y Herramientas')).toBeDefined();

    // Vuelve al catálogo al presionar el botón de Plataformas
    const botonPlataformas = screen.getByRole('link', { name: /^plataformas$/i });
    fireEvent.click(botonPlataformas);
    expect(screen.queryByText('Carta Responsiva de Activos y Herramientas')).toBeNull();
  });

  it('despliega el modal bloqueante de responsiva automáticamente cuando el usuario no ha firmado', async () => {
    window.localStorage.setItem(CLAVE_OMITIR_BIENVENIDA, 'true');
    sesionActual = { ...crearSesion(false), responsiva_firmada: false };
    render(<PlatformsPageShell />);

    // No existe botón temporal en la interfaz
    expect(screen.queryByRole('button', { name: /probar firma de responsiva/i })).toBeNull();

    const dialog = await screen.findByRole('dialog', { name: /carta responsiva/i });
    expect(dialog).toBeDefined();
    expect(within(dialog).getByRole('heading', { name: /carta responsiva/i })).toBeDefined();
    expect(screen.getByText(/He leído, comprendo y acepto los términos/i)).toBeDefined();

    // Botón de firmar deshabilitado inicialmente
    const botonFirmar = screen.getByRole('button', { name: /firmar y acceder al portal/i });
    expect((botonFirmar as HTMLButtonElement).disabled).toBe(true);

    // Marcar la casilla sin captcha aún no habilita el botón (evita firma accidental)
    const checkbox = screen.getByLabelText(/He leído, comprendo y acepto los términos/i);
    fireEvent.click(checkbox);
    expect((botonFirmar as HTMLButtonElement).disabled).toBe(true);

    // Ingresar captcha válido habilita el botón de firmar
    const captchaWord = screen.getByTestId('captcha-word').textContent!;
    const inputCaptcha = screen.getByRole('textbox', { name: /código de seguridad/i });
    fireEvent.change(inputCaptcha, { target: { value: captchaWord } });
    expect((botonFirmar as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('PlatformsSidebarView - colapsar y restaurar barra lateral', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sesionActual = crearSesion(false);
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza la barra lateral expandida por omisión y permite colapsarla desde el botón de la barra superior', () => {
    render(<PlatformsSidebarView />);

    const aside = document.getElementById('barra-lateral-plataformas');
    expect(aside).toBeDefined();
    expect(aside?.getAttribute('data-colapsada')).toBe('false');
    expect(aside?.className).toContain('w-lateral');
    expect(aside?.className).not.toContain('w-lateral-colapsada');

    // No debe existir el botón repetido de chevron < en la barra lateral
    expect(screen.queryByRole('button', { name: /colapsar barra lateral/i })).toBeNull();

    // Botón de colapsar en el encabezado de la barra superior
    const botonColapsar = screen.getByRole('button', { name: /colapsar menú/i });
    expect(botonColapsar).toBeDefined();

    fireEvent.click(botonColapsar);

    expect(aside?.getAttribute('data-colapsada')).toBe('true');
    expect(aside?.className).toContain('w-lateral-colapsada');
    expect(window.localStorage.getItem('nexus.platforms.sidebar_collapsed')).toBe('true');
  });

  it('permite restaurar la barra lateral usando el botón de menú en la barra superior', () => {
    window.localStorage.setItem('nexus.platforms.sidebar_collapsed', 'true');
    render(<PlatformsSidebarView />);

    const aside = document.getElementById('barra-lateral-plataformas');
    expect(aside?.getAttribute('data-colapsada')).toBe('true');

    // Botón de menú en la barra superior
    const botonMenu = screen.getByRole('button', { name: /expandir menú/i });
    expect(botonMenu).toBeDefined();

    fireEvent.click(botonMenu);

    expect(aside?.getAttribute('data-colapsada')).toBe('false');
    expect(aside?.className).toContain('w-lateral');
    expect(window.localStorage.getItem('nexus.platforms.sidebar_collapsed')).toBe('false');
  });

  it('permite restaurar la barra lateral usando el botón de escudo en la barra lateral colapsada', () => {
    window.localStorage.setItem('nexus.platforms.sidebar_collapsed', 'true');
    render(<PlatformsSidebarView />);

    const aside = document.getElementById('barra-lateral-plataformas');
    expect(aside?.getAttribute('data-colapsada')).toBe('true');

    // Botón de escudo en la barra lateral colapsada
    const botonEscudo = screen.getByRole('button', { name: /expandir barra lateral/i });
    expect(botonEscudo).toBeDefined();

    fireEvent.click(botonEscudo);

    expect(aside?.getAttribute('data-colapsada')).toBe('false');
    expect(aside?.className).toContain('w-lateral');
    expect(window.localStorage.getItem('nexus.platforms.sidebar_collapsed')).toBe('false');
  });

  it('renderiza la barra de herramientas premium con buscador, filtro de estado y selector de cuadrícula', () => {
    render(<PlatformsSidebarView />);

    // Buscador en "Todas las áreas": busca áreas
    const buscador = screen.getByPlaceholderText('Buscar áreas…') as HTMLInputElement;
    expect(buscador).toBeDefined();
    expect(buscador.className).toContain('nx-buscador-toolbar');

    // Botón de Estado
    const botonEstado = screen.getByRole('button', { name: /filtrar por estado/i });
    expect(botonEstado).toBeDefined();
    expect(botonEstado.textContent).toContain('Estado:');
    expect(botonEstado.textContent).toContain('Todos');

    // Botón de Cuadrícula (por defecto 2×2 como en admin/platform)
    const botonGrid = screen.getByRole('button', { name: /configurar cuadrícula/i });
    expect(botonGrid).toBeDefined();
    expect(botonGrid.textContent).toContain('Cuadrícula:');
    expect(botonGrid.textContent).toContain('2×2');

    // Abrir menú de Estado y verificar opciones de áreas (Todos, Activas, Inactivas)
    fireEvent.click(botonEstado);
    expect(screen.getByRole('option', { name: /^activas/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /^inactivas/i })).toBeDefined();
    // En "Todas las áreas" solo se muestran áreas, no aplica favoritos
    expect(screen.queryByRole('option', { name: /^favoritas/i })).toBeNull();

    // Seleccionar Activas
    const opcionActivas = screen.getByRole('option', { name: /^activas/i });
    fireEvent.click(opcionActivas);
    expect(screen.getByRole('button', { name: /filtrar por estado/i }).textContent).toContain('Activas');

    // Abrir menú de Cuadrícula y seleccionar 3×3
    fireEvent.click(botonGrid);
    const opcion3x3 = screen.getByRole('menuitem', { name: /3×3/i });
    expect(opcion3x3).toBeDefined();
    fireEvent.click(opcion3x3);

    expect(screen.getByRole('button', { name: /configurar cuadrícula/i }).textContent).toContain('3×3');
  });

  it('en todas las áreas muestra tarjetas de área y al hacer clic en un área navega a sus plataformas', () => {
    render(<PlatformsSidebarView />);

    // En "Todas las áreas", muestra la tarjeta de área
    expect(screen.getByRole('heading', { level: 3, name: 'TI' })).toBeDefined();
    expect(screen.getByText('Ver plataformas')).toBeDefined();

    // Al hacer clic en "Ver plataformas" navega a esa área específica
    fireEvent.click(screen.getByText('Ver plataformas'));

    // Ahora muestra buscador de plataformas en el área
    expect(screen.getByPlaceholderText(/buscar plataformas en ti/i)).toBeDefined();
    // No muestra botón redundante de Áreas ni badge repetido en la barra de herramientas del sidebar
    expect(screen.queryByRole('button', { name: /volver a áreas/i })).toBeNull();
    expect(screen.queryByTitle(/área activa:/i)).toBeNull();
    // Muestra la plataforma del área
    expect(screen.getByRole('heading', { level: 3, name: 'Slack' })).toBeDefined();

    // En la vista de área, el menú de estado sí incluye Favoritas y el filtro solo aplica al área actual
    const botonEstadoArea = screen.getByRole('button', { name: /filtrar por estado/i });
    fireEvent.click(botonEstadoArea);
    const opcionFavoritas = screen.getByRole('option', { name: /^favoritas/i });
    expect(opcionFavoritas).toBeDefined();

    // Al filtrar por favoritas en TI, se mantiene Slack
    fireEvent.click(opcionFavoritas);
    expect(screen.getByRole('heading', { level: 3, name: 'Slack' })).toBeDefined();

    // Al filtrar por inactivas en TI (no hay inactivas en TI), muestra mensaje contextual del área con opción de limpiar
    fireEvent.click(screen.getByRole('button', { name: /filtrar por estado/i }));
    fireEvent.click(screen.getByRole('option', { name: /^inactivas/i }));
    expect(screen.getByText(/Ninguna plataforma en «TI» coincide con los filtros aplicados/i)).toBeDefined();

    // Limpiar filtros restaura las plataformas del área seleccionada
    fireEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    expect(screen.getByRole('heading', { level: 3, name: 'Slack' })).toBeDefined();
  });

  it('renderiza contadores simétricos en círculos en la barra lateral y solo muestra solicitudes pendientes de aprobar', () => {
    render(<PlatformsSidebarView />);

    // Mis Plataformas ya no existe en la barra lateral (evita duplicar la vista Topbar)
    expect(screen.queryByRole('button', { name: /mis plataformas/i })).toBeNull();

    // Favoritas tiene contador en círculo
    const botonFavoritas = screen.getByRole('button', { name: /favoritas/i });
    expect(botonFavoritas.querySelector('.rounded-full')).toBeDefined();

    // Mis Solicitudes: con 0 pendientes, NO muestra placa con '0'
    const botonSolicitudes = screen.getByRole('button', { name: /mis solicitudes/i });
    expect(botonSolicitudes.querySelector('.rounded-full')).toBeNull();
    expect(botonSolicitudes.textContent).not.toContain('0');

    // Catálogo por Área: Todas las áreas tiene contador en círculo
    const botonTodasAreas = screen.getByRole('button', { name: /todas las áreas/i });
    expect(botonTodasAreas.querySelector('.rounded-full')).toBeDefined();
    expect(botonTodasAreas.textContent).toContain('1');

    // Mi Widget: tiene contador en círculo en Mi Espacio
    const botonWidget = screen.getByRole('button', { name: /mi widget/i });
    expect(botonWidget.querySelector('.rounded-full')).toBeDefined();
  });

  it('permite acceder a la sección Mi Widget y conmutar el widget maestro y las plataformas', () => {
    render(<PlatformsSidebarView />);

    // El botón Mi Widget existe en la barra lateral con su contador
    const botonWidget = screen.getByRole('button', { name: /mi widget/i });
    expect(botonWidget).toBeDefined();

    // Navegar a Mi Widget
    fireEvent.click(botonWidget);

    // Muestra el encabezado del widget
    expect(screen.getByText('Widget Flotante de Acceso Rápido')).toBeDefined();

    // Interruptor maestro de activación del widget
    const switchMaestro = screen.getByRole('switch', { name: /activar o desactivar widget flotante/i });
    expect(switchMaestro).toBeDefined();
    expect(switchMaestro.getAttribute('aria-checked')).toBe('true');

    // Desactivar widget maestro
    fireEvent.click(switchMaestro);
    expect(switchMaestro.getAttribute('aria-checked')).toBe('false');

    // Reactivar widget maestro
    fireEvent.click(switchMaestro);
    expect(switchMaestro.getAttribute('aria-checked')).toBe('true');

    // Tarjeta de plataforma con switch individual
    const switchPlataforma = screen.getByRole('switch', { name: /slack.*widget flotante/i });
    expect(switchPlataforma).toBeDefined();
    const estadoInicial = switchPlataforma.getAttribute('aria-checked');

    // Conmutar plataforma en el widget
    fireEvent.click(switchPlataforma);
    expect(switchPlataforma.getAttribute('aria-checked')).toBe(estadoInicial === 'true' ? 'false' : 'true');

    // Filtro desplegable de plataformas en el widget (dropdown menu premium)
    const botonFiltroWidget = screen.getByRole('button', { name: /filtrar plataformas del widget/i });
    expect(botonFiltroWidget).toBeDefined();
    expect(botonFiltroWidget.textContent).toContain('Mostrar:');
    expect(botonFiltroWidget.textContent).toContain('Todas');

    // Desplegar menú de opciones de filtro
    fireEvent.click(botonFiltroWidget);
    const opcionEnWidget = screen.getByRole('option', { name: /en el widget/i });
    expect(opcionEnWidget).toBeDefined();
    const opcionFuera = screen.getByRole('option', { name: /fuera/i });
    expect(opcionFuera).toBeDefined();

    // Seleccionar 'En el Widget'
    fireEvent.click(opcionEnWidget);
    expect(botonFiltroWidget.textContent).toContain('En el Widget');
  });

  it('permite acceder a Personalización desde el engrane del topbar y configurar opciones de vista', () => {
    render(<PlatformsSidebarView />);

    // Botón de engrane en la topbar
    const botonEngrane = screen.getByRole('button', { name: /configuración y diseño de vista/i });
    expect(botonEngrane).toBeDefined();

    // Navegar a Personalización
    fireEvent.click(botonEngrane);

    // Muestra sección de ajustes de vista
    expect(screen.getByText('Disposición Principal del Portal')).toBeDefined();

    // 1. Selector de layout
    const radioSidebar = screen.getByRole('radio', { name: /vista barra lateral/i });
    const radioTopbar = screen.getByRole('radio', { name: /vista barra superior/i });
    expect(radioSidebar.getAttribute('aria-checked')).toBe('true');
    expect(radioTopbar.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radioTopbar);
    expect(window.localStorage.getItem(CLAVE_PLATFORMS_LAYOUT)).toBe('topbar');

    // 2. Conmutar visibilidad de Documentos (Carta Responsiva)
    const switchDocs = screen.getByRole('switch', { name: /mostrar u ocultar sección de documentos/i });
    expect(switchDocs.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Carta Responsiva')).toBeDefined();

    fireEvent.click(switchDocs);
    expect(switchDocs.getAttribute('aria-checked')).toBe('false');
    // Al desactivar, la sección Documentos se oculta del sidebar
    expect(screen.queryByText('Carta Responsiva')).toBeNull();

    // 3. Conmutar visibilidad de badges circulares del sidebar
    const switchBadges = screen.getByRole('switch', { name: /mostrar u ocultar badges circulares/i });
    expect(switchBadges.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(switchBadges);
    expect(switchBadges.getAttribute('aria-checked')).toBe('false');
    // Al desactivar badges, el botón Favoritas ya no muestra .rounded-full
    const botonFavoritas = screen.getByRole('button', { name: /favoritas/i });
    expect(botonFavoritas.querySelector('.rounded-full')).toBeNull();

    // 4. Selector de diseño de tarjetas (en la pestaña Plataformas con vista previa en vivo)
    const tabGeneral = screen.getByRole('tab', { name: /general/i });
    const tabAreas = screen.getByRole('tab', { name: /áreas/i });
    const tabPlataformas = screen.getByRole('tab', { name: /plataformas/i });

    // Pestañas con tamaño estandarizado simétrico
    expect(tabGeneral.className).toContain('w-48');
    expect(tabGeneral.className).toContain('sm:w-52');
    expect(tabAreas.className).toContain('w-48');
    expect(tabAreas.className).toContain('sm:w-52');
    expect(tabPlataformas.className).toContain('w-48');
    expect(tabPlataformas.className).toContain('sm:w-52');

    fireEvent.click(tabPlataformas);
    expect(screen.getByText(/vista previa en vivo/i)).toBeDefined();

    const radioEstandar = screen.getByRole('radio', { name: /diseño estándar/i });
    const radioCompacta = screen.getByRole('radio', { name: /diseño compacto/i });
    const radioHorizontal = screen.getByRole('radio', { name: /diseño horizontal/i });

    expect(radioEstandar.getAttribute('aria-checked')).toBe('true');
    expect(radioCompacta.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radioCompacta);
    expect(radioCompacta.getAttribute('aria-checked')).toBe('true');
    expect(window.localStorage.getItem('nexus.platforms.card_design')).toBe('compacta');

    fireEvent.click(radioHorizontal);
    expect(radioHorizontal.getAttribute('aria-checked')).toBe('true');
    expect(window.localStorage.getItem('nexus.platforms.card_design')).toBe('horizontal');

    // Cerrar Personalización volviendo a pulsar el botón de engrane
    fireEvent.click(botonEngrane);
    expect(screen.queryByText('Disposición Principal del Portal')).toBeNull();
  });

  it('despliega el menú desplegable de usuario hacia arriba en la barra lateral al hacer clic en el botón de usuario/admin y no muestra el enlace de engrane a /settings', () => {
    sesionActual = crearSesion(true);
    render(<PlatformsSidebarView />);

    // El enlace de engrane a /settings NO debe existir en el sidebar
    expect(screen.queryByRole('link', { name: /ajustes/i })).toBeNull();

    // El botón del menú de usuario está presente en el pie del sidebar
    const botonMenu = screen.getByRole('button', { name: /menú de usuario: juan pérez/i });
    expect(botonMenu).toBeDefined();
    expect(botonMenu.getAttribute('aria-expanded')).toBe('false');

    // Al hacer clic, se abre el dropdown menu hacia arriba
    fireEvent.click(botonMenu);
    expect(botonMenu.getAttribute('aria-expanded')).toBe('true');

    const menu = screen.getByRole('menu', { name: /cuenta/i });
    expect(menu).toBeDefined();
    expect(menu.textContent).toContain('Juan Pérez');
    expect(menu.textContent).toContain('Administrador');

    // Contiene la opción de Cerrar sesión
    const opcionCerrar = screen.getByRole('menuitem', { name: /cerrar sesión/i });
    expect(opcionCerrar).toBeDefined();
    expect(opcionCerrar.getAttribute('href')).toBe('/logout');
  });

  it('utiliza iconos vectoriales estándar Icono en la navegación lateral y documentos en lugar de emojis', () => {
    const { container } = render(<PlatformsSidebarView />);

    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    const textoAside = aside?.textContent ?? '';
    expect(textoAside).not.toContain('★');
    expect(textoAside).not.toContain('⏱️');
    expect(textoAside).not.toContain('🧩');
    expect(textoAside).not.toContain('🏢');
    expect(textoAside).not.toContain('💻');
    expect(textoAside).not.toContain('📄');
    expect(textoAside).not.toContain('⚙️');
  });
});

describe('UserRequestsTable - barra de herramientas premium encapsulada', () => {
  it('renderiza la barra de herramientas premium encapsulada con buscador y filtro de estado (sin selector de filas, fijo en 10)', () => {
    render(<UserRequestsTable />);

    // Buscador
    const buscador = screen.getByPlaceholderText('Buscar por plataforma o área…') as HTMLInputElement;
    expect(buscador).toBeDefined();
    expect(buscador.className).toContain('nx-buscador-toolbar');

    // Botón de Estado (por defecto muestra solicitudes pendientes)
    const botonEstado = screen.getByRole('button', { name: /filtrar por estado/i });
    expect(botonEstado).toBeDefined();
    expect(botonEstado.textContent).toContain('Estado:');
    expect(botonEstado.textContent).toContain('Pendientes');

    // El selector de filas por página fue removido (límite fijo de 10 por página)
    expect(screen.queryByRole('button', { name: /filas por página/i })).toBeNull();

    // Abrir menú de Estado y seleccionar Todas
    fireEvent.click(botonEstado);
    const opcionTodas = screen.getByRole('option', { name: /todas/i });
    expect(opcionTodas).toBeDefined();
    fireEvent.click(opcionTodas);
    expect(screen.getByRole('button', { name: /filtrar por estado/i }).textContent).toContain('Todas');
  });
});

describe('PlatformsLaunchpadView - modal de bienvenida y omisión', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sesionActual = crearSesion(false);
  });

  afterEach(() => {
    cleanup();
  });

  it('no muestra el hero banner estático en la página y muestra el modal de bienvenida si no ha sido omitido', () => {
    render(<PlatformsLaunchpadView />);

    // El banner hero estático inline ya no existe
    expect(screen.queryByRole('region', { name: /bienvenida/i })).toBeNull();

    // El diálogo modal de bienvenida aparece en pantalla
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/¡hola, juan! 👋/i)).toBeDefined();
    expect(screen.getByText('✨ Bienvenido a tu espacio de trabajo')).toBeDefined();
    expect(screen.getByText(/plataforma(s)? activa(s)?/i)).toBeDefined();

    // Checkbox de omitir y botón de entendido
    const checkboxOmitir = screen.getByRole('checkbox', { name: /omitir la próxima vez/i });
    expect(checkboxOmitir).toBeDefined();
    expect((checkboxOmitir as HTMLInputElement).checked).toBe(false);

    const botonEntendido = screen.getByRole('button', { name: /entendido/i });
    expect(botonEntendido).toBeDefined();
  });

  it('permite cerrar el modal sin omitir para futuras visitas si no se marca la casilla', () => {
    render(<PlatformsLaunchpadView />);

    const botonEntendido = screen.getByRole('button', { name: /entendido/i });
    fireEvent.click(botonEntendido);

    // El modal se cierra
    expect(screen.queryByRole('dialog')).toBeNull();
    // No se guardó la bandera en localStorage
    expect(window.localStorage.getItem(CLAVE_OMITIR_BIENVENIDA)).toBeNull();
  });

  it('guarda la preferencia de omisión en localStorage cuando se marca la casilla y se cierra', () => {
    render(<PlatformsLaunchpadView />);

    const checkboxOmitir = screen.getByRole('checkbox', { name: /omitir la próxima vez/i });
    fireEvent.click(checkboxOmitir);

    const botonEntendido = screen.getByRole('button', { name: /entendido/i });
    fireEvent.click(botonEntendido);

    // El modal se cierra y se guarda la clave
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem(CLAVE_OMITIR_BIENVENIDA)).toBe('true');
  });

  it('no muestra el modal de bienvenida si la clave de omisión ya existe en localStorage', () => {
    window.localStorage.setItem(CLAVE_OMITIR_BIENVENIDA, 'true');
    render(<PlatformsLaunchpadView />);

    // Ni el banner inline ni el modal se muestran
    expect(screen.queryByRole('region', { name: /bienvenida/i })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renderiza el modal de bienvenida en la vista de barra lateral si no ha sido omitido', () => {
    render(<PlatformsSidebarView />);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('✨ Bienvenido a tu espacio de trabajo')).toBeDefined();

    // Al pulsar Entendido, se cierra
    const botonEntendido = screen.getByRole('button', { name: /entendido/i });
    fireEvent.click(botonEntendido);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('no renderiza el modal de bienvenida en la vista de barra lateral si ya está omitido', () => {
    window.localStorage.setItem(CLAVE_OMITIR_BIENVENIDA, 'true');
    render(<PlatformsSidebarView />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('permite omitir, restaurar y previsualizar el mensaje de bienvenida desde configuración de vista', () => {
    render(
      <UserViewSettings
        layout="topbar"
        onLayoutChange={vi.fn()}
        mostrarDocumentos={true}
        onToggleMostrarDocumentos={vi.fn()}
        mostrarBadgesSidebar={true}
        onToggleMostrarBadgesSidebar={vi.fn()}
        disenoCards="estandar"
        onDisenoCardsChange={vi.fn()}
      />
    );

    // Conmutador Toggle
    const switchBienvenida = screen.getByRole('switch', { name: /mostrar mensaje de bienvenida al entrar/i });
    expect(switchBienvenida.getAttribute('aria-checked')).toBe('true');

    // Desactivar bienvenida (omitir)
    fireEvent.click(switchBienvenida);
    expect(switchBienvenida.getAttribute('aria-checked')).toBe('false');
    expect(window.localStorage.getItem(CLAVE_OMITIR_BIENVENIDA)).toBe('true');

    // Botón Restaurar mensaje eliminado; se reactiva directamente con el switch toggle
    expect(screen.queryByRole('button', { name: /restaurar mensaje de bienvenida/i })).toBeNull();
    fireEvent.click(switchBienvenida);
    expect(switchBienvenida.getAttribute('aria-checked')).toBe('true');
    expect(window.localStorage.getItem(CLAVE_OMITIR_BIENVENIDA)).toBeNull();

    // Botón Previsualizar
    const botonPrevisualizar = screen.getByRole('button', { name: /previsualizar mensaje de bienvenida/i });
    fireEvent.click(botonPrevisualizar);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('✨ Bienvenido a tu espacio de trabajo')).toBeDefined();

    // Cerrar previsualización
    const botonEntendido = screen.getByRole('button', { name: /entendido/i });
    fireEvent.click(botonEntendido);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('PlatformsLaunchpadView - barra de herramientas: cuadrícula y solicitudes pendientes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(CLAVE_OMITIR_BIENVENIDA, 'true');
    mockPendingRequestId = null;
    sesionActual = crearSesion(false);
  });

  afterEach(() => {
    mockPendingRequestId = null;
    cleanup();
  });

  it('no muestra el texto "Mostrando N plataformas"', () => {
    render(<PlatformsLaunchpadView />);
    expect(screen.queryByText(/mostrando \d+ plataformas/i)).toBeNull();
  });

  it('muestra el enlace a solicitudes pendientes de aprobación a la izquierda del selector de cuadrícula cuando hay pendientes', () => {
    mockPendingRequestId = 10;
    render(<PlatformsLaunchpadView />);
    const linkPendientes = screen.getByRole('link', { name: /pendiente de aprobación/i });
    expect(linkPendientes).toBeDefined();
    expect(linkPendientes.getAttribute('href')).toBe('/requests');
    expect(linkPendientes.textContent).toContain('pendiente de aprobación');
    mockPendingRequestId = null;
  });

  it('muestra el botón de cuadrícula con menú desplegable para modificar dimensiones y persiste en localStorage', () => {
    render(<PlatformsLaunchpadView />);

    const botonGrid = screen.getByRole('button', { name: /configurar cuadrícula/i });
    expect(botonGrid).toBeDefined();
    expect(botonGrid.textContent).toContain('Cuadrícula:');

    // Abre el menú desplegable
    fireEvent.click(botonGrid);

    const opcion2x2 = screen.getByRole('menuitem', { name: '2×2' });
    const opcion3x3 = screen.getByRole('menuitem', { name: '3×3' });
    expect(opcion2x2).toBeDefined();
    expect(opcion3x3).toBeDefined();

    // Selecciona 3×3
    fireEvent.click(opcion3x3);

    expect(screen.getByRole('button', { name: /configurar cuadrícula/i }).textContent).toContain('3×3');
    expect(window.localStorage.getItem('portal_grid_filas')).toBe('3');
    expect(window.localStorage.getItem('portal_grid_columnas')).toBe('3');
  });

  it('elimina textos redundantes de secciones ("Catálogo General y Solicitudes", subtítulos)', () => {
    render(<PlatformsLaunchpadView />);
    expect(screen.queryByText(/catálogo general y solicitudes/i)).toBeNull();
    expect(screen.queryByText(/solicita permisos o abre tus demás herramientas/i)).toBeNull();
    expect(screen.queryByText(/favoritas y acceso rápido/i)).toBeNull();
    expect(screen.queryByText(/tus herramientas más utilizadas/i)).toBeNull();
  });

  it('renderiza botones de filtro simétricos con el mismo tamaño (h-12 min-h-12), diseño e iconos de apoyo', () => {
    render(<PlatformsLaunchpadView />);

    const botonTodas = screen.getByRole('button', { name: /^todas/i });
    const botonFavoritas = screen.getByRole('button', { name: /^plataformas favoritas/i });
    const botonArea = screen.getByRole('button', { name: /^área TI/i });

    // Todos tienen la misma clase de altura y bordes redondeados
    for (const boton of [botonTodas, botonFavoritas, botonArea]) {
      expect(boton.className).toContain('h-12');
      expect(boton.className).toContain('min-h-12');
      expect(boton.className).toContain('rounded-xl');
      expect(boton.className).toContain('gap-2.5');
      // Cada botón contiene un SVG de icono de apoyo
      expect(boton.querySelector('svg')).toBeDefined();
    }

    // Botón Todas tiene icono de plataformas y contador en pill
    expect(botonTodas.textContent).toContain('Todas');
    expect(botonTodas.textContent).toContain('1');

    // Botón Favoritas tiene icono de favorito y contador en pill
    expect(botonFavoritas.textContent).toContain('Favoritas');
    expect(botonFavoritas.textContent).toContain('1');

    // Botón Área tiene icono de área y contador en pill
    expect(botonArea.textContent).toContain('TI');
    expect(botonArea.textContent).toContain('1');
  });
});

describe('MenuUsuario y Topbar - diseño premium y modo compacto colapsable', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sesionActual = crearSesion(false);
  });

  afterEach(() => {
    cleanup();
  });

  it('despliega menú premium con avatar, nombre, rol en badge y enlace a cerrar sesión', () => {
    render(<PlatformsTopbar session={sesionActual} />);

    const botonMenu = screen.getByRole('button', { name: /menú de usuario/i });
    expect(botonMenu).toBeDefined();

    // Al abrir el menú
    fireEvent.click(botonMenu);

    const menu = screen.getByRole('menu', { name: /cuenta/i });
    expect(menu).toBeDefined();
    // Diseño premium: alineado a la derecha con ancho estandarizado w-72 y esquinas rounded-2xl
    expect(menu.className).toContain('w-72');
    expect(menu.className).toContain('rounded-2xl');

    // Header premium contiene el nombre, correo y rol
    expect(menu.textContent).toContain(sesionActual.name);
    expect(menu.textContent).toContain(sesionActual.email);
    expect(menu.textContent).toContain('Usuario');

    // Opción Cerrar sesión
    const opcionSalir = screen.getByRole('menuitem', { name: /cerrar sesión/i });
    expect(opcionSalir).toBeDefined();
    expect(opcionSalir.getAttribute('href')).toBe('/logout');
  });

  it('colapsa el botón de usuario mostrando solo el avatar cuando el modo compacto está activado', () => {
    // Sin colapsar: muestra el nombre
    const { unmount } = render(<PlatformsTopbar session={sesionActual} botonUsuarioCompacto={false} />);
    const botonExpandido = screen.getByRole('button', { name: /menú de usuario/i });
    expect(botonExpandido.textContent).toContain(sesionActual.name);
    unmount();

    // Colapsado: solo icono, tamaño simétrico size-12 (48x48)
    render(<PlatformsTopbar session={sesionActual} botonUsuarioCompacto={true} />);
    const botonColapsado = screen.getByRole('button', { name: /menú de usuario/i });
    expect(botonColapsado.className).toContain('size-12');
    expect(botonColapsado.textContent).not.toContain(sesionActual.name);
  });

  it('permite conmutar el modo compacto desde la configuración de vista y persiste en localStorage', () => {
    const onToggle = vi.fn();
    render(
      <UserViewSettings
        layout="topbar"
        onLayoutChange={vi.fn()}
        mostrarDocumentos={true}
        onToggleMostrarDocumentos={vi.fn()}
        mostrarBadgesSidebar={true}
        onToggleMostrarBadgesSidebar={vi.fn()}
        botonUsuarioCompacto={false}
        onToggleBotonUsuarioCompacto={onToggle}
        disenoCards="estandar"
        onDisenoCardsChange={vi.fn()}
      />
    );

    const switchCompacto = screen.getByRole('switch', { name: /colapsar botón de usuario/i });
    expect(switchCompacto.getAttribute('aria-checked')).toBe('false');

    // Activar modo compacto
    fireEvent.click(switchCompacto);
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(window.localStorage.getItem(CLAVE_BOTON_USUARIO_COMPACTO)).toBe('true');
  });

  it('deshabilita colapsar usuario en vista sidebar y deshabilita badges circulares en vista topbar', () => {
    const onToggleCompacto = vi.fn();
    const onToggleBadges = vi.fn();

    // 1. En vista Topbar: botón compacto habilitado, badges circulares deshabilitado
    const { rerender } = render(
      <UserViewSettings
        layout="topbar"
        onLayoutChange={vi.fn()}
        mostrarDocumentos={true}
        onToggleMostrarDocumentos={vi.fn()}
        mostrarBadgesSidebar={true}
        onToggleMostrarBadgesSidebar={onToggleBadges}
        botonUsuarioCompacto={false}
        onToggleBotonUsuarioCompacto={onToggleCompacto}
        disenoCards="estandar"
        onDisenoCardsChange={vi.fn()}
      />
    );

    const switchCompactoTopbar = screen.getByRole('switch', { name: /colapsar botón de usuario/i });
    const switchBadgesTopbar = screen.getByRole('switch', { name: /badges circulares/i });

    expect(switchCompactoTopbar.hasAttribute('disabled')).toBe(false);
    expect(switchBadgesTopbar.hasAttribute('disabled')).toBe(true);

    // Clic en badges no debe disparar callback porque está deshabilitado en topbar
    fireEvent.click(switchBadgesTopbar);
    expect(onToggleBadges).not.toHaveBeenCalled();

    // 2. En vista Sidebar: botón compacto deshabilitado, badges circulares habilitado
    rerender(
      <UserViewSettings
        layout="sidebar"
        onLayoutChange={vi.fn()}
        mostrarDocumentos={true}
        onToggleMostrarDocumentos={vi.fn()}
        mostrarBadgesSidebar={true}
        onToggleMostrarBadgesSidebar={onToggleBadges}
        botonUsuarioCompacto={false}
        onToggleBotonUsuarioCompacto={onToggleCompacto}
        disenoCards="estandar"
        onDisenoCardsChange={vi.fn()}
      />
    );

    const switchCompactoSidebar = screen.getByRole('switch', { name: /colapsar botón de usuario/i });
    const switchBadgesSidebar = screen.getByRole('switch', { name: /badges circulares/i });

    expect(switchCompactoSidebar.hasAttribute('disabled')).toBe(true);
    expect(switchBadgesSidebar.hasAttribute('disabled')).toBe(false);

    // Clic en compacto no debe disparar callback porque está deshabilitado en sidebar
    fireEvent.click(switchCompactoSidebar);
    expect(onToggleCompacto).not.toHaveBeenCalled();

    // Clic en badges sí dispara callback porque está habilitado en sidebar
    fireEvent.click(switchBadgesSidebar);
    expect(onToggleBadges).toHaveBeenCalledWith(false);
  });
});

describe('MenuNotificaciones - menú desplegable de notificaciones en portal de usuario', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renderiza el botón simétrico y despliega el menú con las notificaciones', async () => {
    render(<MenuNotificaciones noLeidasInicial={1} />);

    const boton = screen.getByRole('button', { name: /notificaciones/i });
    expect(boton).toBeDefined();
    expect(boton.getAttribute('aria-expanded')).toBe('false');

    // Al hacer clic, se abre el dropdown dialog
    fireEvent.click(boton);
    expect(boton.getAttribute('aria-expanded')).toBe('true');

    const panel = await screen.findByLabelText(/panel de notificaciones/i);
    expect(panel).toBeDefined();
    expect(screen.getByText('Notificaciones')).toBeDefined();
    expect(screen.getByText('1 nueva')).toBeDefined();
    expect(await screen.findByText('Bienvenido al Portal')).toBeDefined();
    expect(screen.getByText('Tus accesos están listos para usar.')).toBeDefined();

    // Enlace al centro completo
    const linkCentro = screen.getByRole('link', { name: /ver todas las notificaciones/i });
    expect(linkCentro).toBeDefined();
    expect(linkCentro.getAttribute('href')).toBe('/notifications');

    // Botón marcar como leídas
    const botonMarcar = screen.getByRole('button', { name: /marcar todas como leídas/i });
    expect(botonMarcar).toBeDefined();
    fireEvent.click(botonMarcar);

    // Cierre con Escape
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.queryByLabelText(/panel de notificaciones/i)).toBeNull();
  });

  it('oculta el recuadro de solicitudes pendientes de aprobación cuando hay 0 pendientes', () => {
    render(<PlatformsLaunchpadView />);
    expect(screen.queryByTitle(/ver mis solicitudes pendientes de aprobación/i)).toBeNull();
  });

  it('los botones de filtros (Todas, Favoritas y Áreas) tienen ancho unificado y simétrico', () => {
    render(<PlatformsLaunchpadView />);
    const botonTodas = screen.getByRole('button', { name: /todas las plataformas/i });
    const botonFavoritas = screen.getByRole('button', { name: /plataformas favoritas/i });
    const botonArea = screen.getByRole('button', { name: /área ti/i });

    expect(botonTodas.className).toContain('w-48');
    expect(botonTodas.className).toContain('min-w-48');
    expect(botonFavoritas.className).toContain('w-48');
    expect(botonFavoritas.className).toContain('min-w-48');
    expect(botonArea.className).toContain('w-48');
    expect(botonArea.className).toContain('min-w-48');
  });

  it('el contenedor de la cuadrícula de tarjetas utiliza todo el alto disponible de forma responsiva', () => {
    render(<PlatformsLaunchpadView />);
    const regionCatalogo = screen.getByRole('region', { name: /catálogo de plataformas/i });
    expect(regionCatalogo.className).toContain('h-full');
    expect(regionCatalogo.className).toContain('flex-1');
    expect(regionCatalogo.className).toContain('auto-rows-fr');
  });

  it('al alternar el favorito de una tarjeta se llama a marcarFavorito inmediatamente sin necesidad de recargar la página', () => {
    render(<PlatformsLaunchpadView />);
    const botonFavorito = screen.getByRole('button', { name: /favorito: slack/i });
    expect(botonFavorito).toBeDefined();

    fireEvent.click(botonFavorito);
    expect(mockMarcarFavorito).toHaveBeenCalledWith(1, false);
  });

  it('el contenedor del catálogo de tarjetas y áreas incluye holgura p-1 para evitar que la animación de elevación en hover oculte el borde superior', () => {
    render(<PlatformsLaunchpadView />);
    const regionPlataformas = screen.getByRole('region', { name: /catálogo de plataformas/i });
    expect(regionPlataformas.parentElement?.className).toContain('p-1');
    cleanup();

    render(<PlatformsSidebarView />);
    const regionAreas = screen.getByRole('region', { name: /catálogo de áreas/i });
    const scrollContainer = regionAreas.closest('.overflow-y-auto');
    expect(scrollContainer?.className).toContain('p-1');
  });

  it('en la sección Favoritas de la barra lateral, el menú de estado no muestra la opción redundante Favoritas y filtra solo entre favoritas sin salir a Todas las áreas', () => {
    render(<PlatformsSidebarView />);

    // Navegar a la sección Favoritas desde la barra lateral
    const botonFavoritasSidebar = screen.getByRole('button', { name: /favoritas,/i });
    fireEvent.click(botonFavoritasSidebar);

    // Debe mostrar la vista de plataformas favoritas, no el catálogo de áreas
    expect(screen.queryByRole('region', { name: /catálogo de áreas/i })).toBeNull();
    expect(screen.getByRole('region', { name: /catálogo de plataformas/i })).toBeDefined();

    // Abrir el selector de estado
    const botonEstado = screen.getByRole('button', { name: /filtrar por estado/i });
    fireEvent.click(botonEstado);

    // En Favoritas, el menú de estado NO debe contener la opción "Favoritas" (es redundante)
    const opciones = screen.getAllByRole('option');
    const textosOpciones = opciones.map((op) => op.textContent);
    expect(textosOpciones.some((t) => t?.includes('Favoritas'))).toBe(false);
    expect(textosOpciones.some((t) => t?.includes('Todos'))).toBe(true);
    expect(textosOpciones.some((t) => t?.includes('Activas'))).toBe(true);
    expect(textosOpciones.some((t) => t?.includes('Inactivas'))).toBe(true);

    // Al seleccionar "Activas", debe permanecer en Favoritas y no mandar a "Todas las áreas"
    const opcionActivas = screen.getByRole('option', { name: /^activas/i });
    fireEvent.click(opcionActivas);

    // Sigue en catálogo de plataformas (no regresó a catálogo de áreas)
    expect(screen.queryByRole('region', { name: /catálogo de áreas/i })).toBeNull();
    expect(screen.getByRole('region', { name: /catálogo de plataformas/i })).toBeDefined();
    // La tarjeta de Slack (que es favorita y activa) se mantiene visible
    expect(screen.getByText('Slack')).toBeDefined();
  });

  it('estandariza las ghost cards entre la vista topbar y la vista sidebar mostrando el componente PlatformGhostCard con Espacio disponible e icono', () => {
    // 1. Vista Topbar (Launchpad)
    const { container: containerTopbar } = render(<PlatformsLaunchpadView />);
    const ghostsTopbar = containerTopbar.querySelectorAll('.border-dashed[aria-hidden="true"]');
    expect(ghostsTopbar.length).toBeGreaterThan(0);
    // Cada ghost card debe contener el texto "Espacio disponible"
    ghostsTopbar.forEach((ghost) => {
      expect(ghost.textContent).toContain('Espacio disponible');
      expect(ghost.className).toContain('rounded-2xl');
      expect(ghost.className).toContain('border-dashed');
    });
    cleanup();

    // 2. Vista Sidebar (SidebarView - Catálogo de áreas y plataformas)
    const { container: containerSidebar } = render(<PlatformsSidebarView />);
    const ghostsSidebar = containerSidebar.querySelectorAll('.border-dashed[aria-hidden="true"]');
    expect(ghostsSidebar.length).toBeGreaterThan(0);
    ghostsSidebar.forEach((ghost) => {
      expect(ghost.textContent).toContain('Espacio disponible');
      expect(ghost.className).toContain('rounded-2xl');
      expect(ghost.className).toContain('border-dashed');
    });
  });

  it('al alternar de vista topbar a vista sidebar estando en Ajustes de Vista, conserva la sección de personalización', () => {
    window.localStorage.setItem(CLAVE_PLATFORMS_LAYOUT, 'topbar');
    sesionActual = crearSesion(false);

    render(<PlatformsPageShell />);

    // Abrir Ajustes de Vista (engrane en PlatformsTopbar)
    const botonAjustes = screen.getByRole('button', { name: /configuración y diseño de vista/i });
    fireEvent.click(botonAjustes);

    // Debe estar en Ajustes de Vista
    expect(screen.getByText('Disposición Principal del Portal')).toBeDefined();

    // Cambiar layout a Sidebar
    const opcionSidebar = screen.getByRole('radio', { name: /seleccionar vista barra lateral/i });
    fireEvent.click(opcionSidebar);

    // Debe seguir en Ajustes de Vista dentro del layout de Sidebar (no debe mandar a todas las áreas)
    expect(screen.getByText('Disposición Principal del Portal')).toBeDefined();
    expect(screen.getByText('Ajustes de Vista')).toBeDefined();
  });

  it('permite acceder y configurar Mi Widget desde la barra superior (topbar) sin forzar a usar la vista lateral', () => {
    window.localStorage.setItem(CLAVE_PLATFORMS_LAYOUT, 'topbar');
    sesionActual = crearSesion(false);

    render(<PlatformsPageShell />);

    // El botón de Mi Widget debe estar presente en la barra superior
    const botonWidget = screen.getByRole('button', { name: /mi widget: configurar accesos rápidos/i });
    expect(botonWidget).toBeDefined();

    // Al hacer clic, abre la vista de configuración del widget
    fireEvent.click(botonWidget);

    // Debe mostrar la sección de configuración del widget flotante
    expect(screen.getByPlaceholderText(/buscar plataforma para agregar al widget/i)).toBeDefined();
    expect(screen.getByTitle('Widget Flotante de Acceso Rápido')).toBeDefined();

    // No debe existir botón redundante de retorno dentro del encabezado
    expect(screen.queryByRole('button', { name: /volver al catálogo/i })).toBeNull();

    // Al pulsar nuevamente el botón de Mi Widget en la barra superior, no regresa al catálogo (permanece en Mi Widget)
    fireEvent.click(botonWidget);
    expect(screen.getByTitle('Widget Flotante de Acceso Rápido')).toBeDefined();

    // Vuelve al catálogo de plataformas al presionar el botón de Plataformas
    const botonPlataformas = screen.getByRole('link', { name: /^plataformas$/i });
    fireEvent.click(botonPlataformas);
    expect(screen.getByRole('region', { name: /catálogo de plataformas/i })).toBeDefined();
  });

  it('organiza la configuración visual en pestañas "General", "Áreas" y "Plataformas", con distribución en 2 columnas y sin botón redundante de volver', () => {
    const onDisenoCards = vi.fn();
    const onDisenoArea = vi.fn();

    render(
      <UserViewSettings
        layout="sidebar"
        onLayoutChange={vi.fn()}
        mostrarDocumentos={true}
        onToggleMostrarDocumentos={vi.fn()}
        mostrarBadgesSidebar={true}
        onToggleMostrarBadgesSidebar={vi.fn()}
        disenoCards="duotono"
        onDisenoCardsChange={onDisenoCards}
        disenoCardsArea="split"
        onDisenoCardsAreaChange={onDisenoArea}
        onVolver={vi.fn()}
      />
    );

    // 1. Pestañas visibles y pestaña General activa por omisión
    const tabGeneral = screen.getByRole('tab', { name: /general/i });
    const tabAreas = screen.getByRole('tab', { name: /áreas/i });
    const tabPlataformas = screen.getByRole('tab', { name: /plataformas/i });

    expect(tabGeneral.getAttribute('aria-selected')).toBe('true');
    expect(tabAreas.getAttribute('aria-selected')).toBe('false');
    expect(tabPlataformas.getAttribute('aria-selected')).toBe('false');

    // No debe existir el botón redundante de volver a plataformas
    expect(screen.queryByRole('button', { name: /volver a plataformas/i })).toBeNull();

    // Sección General visible en 2 columnas
    expect(screen.getByText('Disposición Principal del Portal')).toBeDefined();
    expect(screen.getByText('Elementos de la Barra Lateral')).toBeDefined();

    // 2. Conmutar a la pestaña Áreas
    fireEvent.click(tabAreas);
    expect(tabAreas.getAttribute('aria-selected')).toBe('true');
    expect(tabGeneral.getAttribute('aria-selected')).toBe('false');

    // 3. Verifica vista previa en vivo de área y su selector de estilos (8 opciones)
    expect(screen.getAllByText(/tarjeta de área organizativa/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Diseño de Tarjetas de Área Organizativa')).toBeDefined();

    const radioOnda = screen.getByRole('radio', { name: /diseño de área onda curva/i });
    fireEvent.click(radioOnda);
    expect(onDisenoArea).toHaveBeenCalledWith('onda');

    const radioPortada = screen.getByRole('radio', { name: /diseño de área con portada fotográfica/i });
    fireEvent.click(radioPortada);
    expect(onDisenoArea).toHaveBeenCalledWith('portada');

    const radioBannerArea = screen.getByRole('radio', { name: /diseño de área con hero banner fotográfico/i });
    fireEvent.click(radioBannerArea);
    expect(onDisenoArea).toHaveBeenCalledWith('banner');

    const radioGlassArea = screen.getByRole('radio', { name: /diseño de área glassmorphism neón/i });
    fireEvent.click(radioGlassArea);
    expect(onDisenoArea).toHaveBeenCalledWith('glass');

    const radioFlotanteArea = screen.getByRole('radio', { name: /diseño de área flotante inmersiva/i });
    fireEvent.click(radioFlotanteArea);
    expect(onDisenoArea).toHaveBeenCalledWith('flotante');

    // 4. Conmutar a la pestaña Plataformas
    fireEvent.click(tabPlataformas);
    expect(tabPlataformas.getAttribute('aria-selected')).toBe('true');
    expect(tabAreas.getAttribute('aria-selected')).toBe('false');

    // 5. Verifica vista previa en vivo de plataforma y su selector de estilos
    expect(screen.getAllByText(/tarjeta de plataforma/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Diseño de Tarjetas de Plataformas')).toBeDefined();

    const radioEnmarcada = screen.getByRole('radio', { name: /diseño enmarcada pastel/i });
    fireEvent.click(radioEnmarcada);
    expect(onDisenoCards).toHaveBeenCalledWith('enmarcada');

    // 6. Verificar variantes con imagen de fondo (Banner y Flotante) accesibles directamente sin paginación
    const radioBanner = screen.getByRole('radio', { name: /diseño hero banner fotográfico/i });
    fireEvent.click(radioBanner);
    expect(onDisenoCards).toHaveBeenCalledWith('banner');

    const radioFlotante = screen.getByRole('radio', { name: /diseño flotante inmersiva/i });
    fireEvent.click(radioFlotante);
    expect(onDisenoCards).toHaveBeenCalledWith('flotante');
  });

  it('cuando el admin fuerza el diseño de área, desactiva las opciones de diseño de área en Ajustes de Vista con badge y alerta', () => {
    const onDisenoArea = vi.fn();
    window.localStorage.setItem('nexus.platforms.force_area_card_design', 'true');

    render(
      <UserViewSettings
        layout="sidebar"
        onLayoutChange={vi.fn()}
        mostrarDocumentos={true}
        onToggleMostrarDocumentos={vi.fn()}
        mostrarBadgesSidebar={true}
        onToggleMostrarBadgesSidebar={vi.fn()}
        disenoCards="duotono"
        onDisenoCardsChange={vi.fn()}
        disenoCardsArea="split"
        onDisenoCardsAreaChange={onDisenoArea}
        forzarDisenoArea={true}
        tabInicial="areas"
      />
    );

    // Badge de bloqueo por admin y estado de vacío premium en el tab content
    expect(screen.getByTestId('badge-diseno-bloqueado-area')).toBeDefined();
    expect(screen.getByText('Bloqueado por Admin')).toBeDefined();
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/el administrador ha forzado el diseño corporativo/i)).toBeDefined();
    expect(screen.getByText('Diseño de Tarjetas de Área Bloqueado')).toBeDefined();

    // En lugar del selector de tarjetas, se muestra el estado de vacío premium y no hay radios interactivos
    expect(screen.queryByRole('radio')).toBeNull();

    window.localStorage.removeItem('nexus.platforms.force_area_card_design');
  });

  it('muestra mensaje de vacío premium cuando el diseño de tarjetas de plataforma está forzado por admin', () => {
    window.localStorage.setItem('nexus.platforms.force_platform_card_design', 'true');

    render(
      <UserViewSettings
        layout="sidebar"
        onLayoutChange={vi.fn()}
        mostrarDocumentos={true}
        onToggleMostrarDocumentos={vi.fn()}
        mostrarBadgesSidebar={true}
        onToggleMostrarBadgesSidebar={vi.fn()}
        disenoCards="duotono"
        onDisenoCardsChange={vi.fn()}
        disenoCardsArea="split"
        onDisenoCardsAreaChange={vi.fn()}
        forzarDisenoPlataforma={true}
        tabInicial="plataformas"
      />
    );

    // Badge y mensaje de bloqueo por admin en la pestaña de plataformas
    expect(screen.getByTestId('badge-diseno-bloqueado-plataforma')).toBeDefined();
    expect(screen.getByText('Bloqueado por Admin')).toBeDefined();
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Diseño de Tarjetas de Plataforma Bloqueado')).toBeDefined();
    expect(screen.getByText(/el administrador ha forzado el diseño corporativo para las tarjetas de plataforma/i)).toBeDefined();

    // No se muestran radios interactivos
    expect(screen.queryByRole('radio')).toBeNull();

    window.localStorage.removeItem('nexus.platforms.force_platform_card_design');
  });

  it('evita mostrar 4 rectángulos vacíos en la carga inicial y preserva la estructura del portal', () => {
    sesionActual = crearSesion(false);
    render(<PlatformsSidebarView />);

    // La barra lateral y el encabezado existen en el DOM
    expect(screen.getByRole('complementary', { name: /barra lateral del usuario/i })).toBeDefined();
    expect(screen.getByText('Aduana')).toBeDefined();
    expect(screen.getByText('Vivaro Launchpad')).toBeDefined();

    // No debe existir el mensaje o bloque de 4 rectángulos de Skeleton sueltos
    expect(screen.queryByLabelText('Cargando plataformas…')).toBeNull();
  });

  it('renderiza PlatformMockupCard en variantes banner y flotante con imagen de fondo y botón de acción', () => {
    const itemDemo = {
      platform: { id: 101, name: 'AWS Cloud Console', description: 'Servicios de infraestructura en la nube.', icon: 'plataformas' },
      area: { id: 1, name: 'Tecnología & TI' },
      my_level: 'admin',
      my_access_status: 'activo',
      pending_request_id: null,
      can_request: true,
      requestable_levels: ['admin'],
    } satisfies import('@/lib/access/types').CatalogItem;
    const mineDemo = {
      id: 101,
      name: 'AWS Cloud Console',
      direct_link: 'https://aws.amazon.com',
      is_favorite: true,
    } as unknown as import('@/lib/types').Platform;

    // 1. Variante 'banner'
    const { unmount: unmountBanner } = render(
      <PlatformMockupCard
        item={itemDemo}
        mine={mineDemo}
        variante="banner"
        isDemo={true}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText('AWS Cloud Console')).toBeDefined();
    expect(screen.getByRole('link', { name: /abrir aws cloud console/i })).toBeDefined();
    const imgsBanner = document.querySelectorAll('img');
    expect(imgsBanner.length).toBeGreaterThan(0);
    unmountBanner();

    // 2. Variante 'flotante'
    render(
      <PlatformMockupCard
        item={itemDemo}
        mine={mineDemo}
        variante="flotante"
        isDemo={true}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText('AWS Cloud Console')).toBeDefined();
    expect(screen.getByRole('link', { name: /ir a aws cloud console/i })).toBeDefined();
    const imgsFlotante = document.querySelectorAll('img');
    expect(imgsFlotante.length).toBeGreaterThan(0);
  });

  it('Location Bar: elimina "General >" y presenta estrictamente 2 niveles dinámicos (Catálogo > [Áreas | Nombre Área | Favoritos | Ajustes de Vista])', () => {
    const sessionAdmin = crearSesion(true);

    // 1. En raíz de catálogo: muestra solo "Catálogo", sin enlace a "General >"
    const { unmount: unmountRoot } = render(
      <PlatformsTopbar session={sessionAdmin} seccionActiva="catalogo" />
    );
    expect(screen.queryByRole('link', { name: /^general$/i })).toBeNull();
    const navRoot = screen.getByRole('navigation', { name: /ruta de navegación/i });
    expect(navRoot.textContent).toContain('Catálogo');
    expect(navRoot.textContent).not.toContain('General');
    unmountRoot();

    // 2. En Ajustes de Vista: exactamente 2 niveles (Catálogo > Ajustes de Vista)
    const { unmount: unmountAjustes } = render(
      <PlatformsTopbar session={sessionAdmin} seccionActiva="personalizacion" />
    );
    const navAjustes = screen.getByRole('navigation', { name: /ruta de navegación/i });
    expect(navAjustes.textContent).toContain('Catálogo');
    expect(navAjustes.textContent).toContain('Ajustes de Vista');
    expect(navAjustes.textContent).not.toContain('General');
    unmountAjustes();

    // 3. Con filtro de favoritos: Catálogo > Favoritos
    const { unmount: unmountFav } = render(
      <PlatformsTopbar session={sessionAdmin} esFavoritos={true} />
    );
    const navFav = screen.getByRole('navigation', { name: /ruta de navegación/i });
    expect(navFav.textContent).toContain('Catálogo');
    expect(navFav.textContent).toContain('Favoritos');
    unmountFav();

    // 4. Con área seleccionada: Catálogo > [Nombre Área]
    const { unmount: unmountArea } = render(
      <PlatformsTopbar session={sessionAdmin} areaNombre="Tecnología & TI" />
    );
    const navArea = screen.getByRole('navigation', { name: /ruta de navegación/i });
    expect(navArea.textContent).toContain('Catálogo');
    expect(navArea.textContent).toContain('Tecnología & TI');
    unmountArea();

    // 5. En SidebarView con seccionInicial="favoritas": Catálogo > Favoritos
    const { container: contSidebarFav } = render(
      <PlatformsSidebarView seccionInicial="favoritas" />
    );
    const breadcrumbSidebar = contSidebarFav.querySelector('header .text-xs.font-medium');
    expect(breadcrumbSidebar?.textContent).toContain('Catálogo');
    expect(breadcrumbSidebar?.textContent).toContain('Favoritos');
    expect(breadcrumbSidebar?.textContent).not.toContain('Mi Espacio');
  });

  it('mantiene diseño limpio de URLs al cambiar de sección o pulsar en el Location Bar sin ensuciar la URL con query params', () => {
    const sessionAdmin = crearSesion(true);
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    // Simular que el navegador tenía una query sucia en la barra de direcciones
    const ventana = window as unknown as { location?: Partial<Location> };
    delete ventana.location;
    ventana.location = {
      pathname: '/platforms',
      search: '?seccion=widget',
      href: 'http://localhost:3000/platforms?seccion=widget',
    };

    const onNavigateCatalogo = vi.fn();
    render(
      <PlatformsTopbar
        session={sessionAdmin}
        seccionActiva="widget"
        onNavigateCatalogo={onNavigateCatalogo}
      />
    );

    // Los botones de fallback usan URLs limpias /platforms (nunca /platforms?seccion=...)
    const enlaceWidget = screen.queryByRole('link', { name: /mi widget/i });
    if (enlaceWidget) {
      expect(enlaceWidget.getAttribute('href')).toBe('/platforms');
    }

    // Al hacer clic en "Catálogo" desde el Location Bar, se limpia la URL mediante replaceState
    const botonCatalogo = screen.getByRole('button', { name: 'Catálogo' });
    fireEvent.click(botonCatalogo);

    expect(onNavigateCatalogo).toHaveBeenCalledTimes(1);
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/platforms');

    replaceStateSpy.mockRestore();
  });

  it('no conmuta al catálogo al presionar el botón de Mi Widget si ya se encuentra en la sección widget', () => {
    const sesionUsuario = crearSesion(false);
    const onToggleWidget = vi.fn();

    render(
      <PlatformsTopbar
        session={sesionUsuario}
        seccionActiva="widget"
        onToggleWidget={onToggleWidget}
      />
    );

    const botonWidget = screen.getByRole('button', { name: /mi widget: configurar accesos rápidos/i });
    expect(botonWidget).toBeDefined();

    // Al hacer clic estando ya en 'widget', no debe invocar toggle (permanece en widget)
    fireEvent.click(botonWidget);
    expect(onToggleWidget).not.toHaveBeenCalled();
  });

  it('oculta el botón de Carta Responsiva en PlatformsTopbar cuando mostrarDocumentos es false', () => {
    const sesionUsuario = crearSesion(false);

    render(
      <PlatformsTopbar
        session={sesionUsuario}
        mostrarDocumentos={false}
      />
    );

    expect(screen.queryByRole('button', { name: /carta responsiva/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /carta responsiva/i })).toBeNull();
  });

  it('DIS-127: con accesos aprobados pide firmar aunque «Mostrar documentos» esté desactivado', () => {
    window.localStorage.setItem(CLAVE_PLATFORMS_LAYOUT, 'topbar');
    window.localStorage.setItem('nexus.platforms.show_documents', 'false');
    sesionActual = {
      ...crearSesion(false),
      responsiva_firmada: false,
    };

    render(<PlatformsPageShell />);

    // Firmar es obligatorio para activar los accesos: no depende de la
    // preferencia de vista (antes no aparecía y los accesos quedaban en proceso).
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});


describe('Carta responsiva sin plataformas aprobadas (DIS-124)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(CLAVE_PLATFORMS_LAYOUT, 'topbar');
  });
  afterEach(() => { cleanup(); mockMias = MIAS_CON_ACCESO; mockEstadoAcceso = 'activo'; });

  it('sin accesos no muestra el ícono de la responsiva', () => {
    mockMias = new Map();
    mockEstadoAcceso = null;
    sesionActual = crearSesion(false);
    render(<PlatformsPageShell />);
    expect(screen.queryByRole('button', { name: /carta responsiva/i })).toBeNull();
  });

  it('sin accesos, en Ajustes la opción está apagada y deshabilitada', () => {
    mockMias = new Map();
    mockEstadoAcceso = null;
    sesionActual = crearSesion(false);
    render(<PlatformsPageShell />);
    fireEvent.click(screen.getByRole('button', { name: /configuración y diseño de vista/i }));
    const opcion = screen.getByRole('switch', { name: /sección de documentos/i });
    expect(opcion.getAttribute('aria-checked')).toBe('false');
    expect((opcion as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Se activa cuando se te apruebe el acceso/)).toBeDefined();
  });

  it('con una plataforma aprobada el ícono vuelve a aparecer', () => {
    sesionActual = crearSesion(false);
    render(<PlatformsPageShell />);
    expect(screen.getByRole('button', { name: /carta responsiva/i })).toBeDefined();
  });
});

describe('Tarjeta con solicitud pendiente (DIS-125)', () => {
  afterEach(() => cleanup());

  it('muestra un solo badge «SOLICITUD ENVIADA» y ya no el texto «Esperando admin»', () => {
    const item = {
      platform: { id: 7, name: 'tacacs', description: 'Acceso a los servidores cisco', icon: 'plataformas' },
      area: { id: 3, name: 'Packet' },
      my_level: null,
      my_access_status: null,
      pending_request_id: 42,
      can_request: false,
      requestable_levels: [],
    } satisfies import('@/lib/access/types').CatalogItem;

    render(<PlatformMockupCard item={item} onRequest={vi.fn()} />);

    const badge = screen.getByText('SOLICITUD ENVIADA');
    expect(badge.closest('span')?.getAttribute('title')).toBe('Esperando la aprobación del administrador del área');
    expect(screen.queryByText('Esperando admin')).toBeNull();
    expect(screen.queryByText('EN REVISIÓN')).toBeNull();
    expect(screen.queryByRole('button', { name: /Solicitar acceso/ })).toBeNull();
  });
});


describe('Responsiva con acceso aprobado en proceso (DIS-127)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(CLAVE_PLATFORMS_LAYOUT, 'topbar');
  });
  afterEach(() => { cleanup(); mockMias = MIAS_CON_ACCESO; mockEstadoAcceso = 'activo'; });

  it('aprobado y esperando la firma: muestra el ícono y pide firmar (regresión del bloqueo)', () => {
    mockMias = new Map();
    mockEstadoAcceso = 'en_proceso';
    sesionActual = { ...crearSesion(false), responsiva_firmada: false };
    render(<PlatformsPageShell />);
    expect(screen.getAllByRole('button', { name: /carta responsiva/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('pide firmar aunque la preferencia «Mostrar documentos» esté apagada', () => {
    window.localStorage.setItem(CLAVE_MOSTRAR_DOCUMENTOS, 'false');
    mockMias = new Map();
    mockEstadoAcceso = 'en_proceso';
    sesionActual = { ...crearSesion(false), responsiva_firmada: false };
    render(<PlatformsPageShell />);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('sin ningún acceso aprobado no pide firmar', () => {
    mockMias = new Map();
    mockEstadoAcceso = null;
    sesionActual = { ...crearSesion(false), responsiva_firmada: false };
    render(<PlatformsPageShell />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Tarjeta con acceso aprobado en proceso (DIS-128)', () => {
  afterEach(() => cleanup());

  it('muestra «CONFIGURANDO ACCESO» en lugar de «No disponible para solicitar»', () => {
    const item = {
      platform: { id: 7, name: 'tacacs', description: 'Acceso a los servidores cisco', icon: 'plataformas' },
      area: { id: 3, name: 'Packet' },
      my_level: 'usuario',
      my_access_status: 'en_proceso',
      pending_request_id: null,
      can_request: false,
      requestable_levels: [],
    } satisfies import('@/lib/access/types').CatalogItem;

    render(<PlatformMockupCard item={item} onRequest={vi.fn()} reason="Configurando tu acceso…" />);

    expect(screen.getByText('CONFIGURANDO ACCESO')).toBeDefined();
    expect(screen.queryByText(/No disponible para soli/)).toBeNull();
    expect(screen.queryByText('SIN ACCESO')).toBeNull();
  });
});
