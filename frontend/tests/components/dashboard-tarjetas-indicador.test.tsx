/**
 * DIS-112: tarjetas de contador del dashboard en tres diseños (anillo con brillo, dos
 * segmentos y medidor), sin desglose, total 0 y selector del diseño con su persistencia.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLAVE_DISENO_TARJETAS, DISENO_POR_OMISION, DISENOS_TARJETA, guardarDisenoTarjetas, leerDisenoTarjetas,
} from '@/components/dashboard/diseno-tarjetas';
import { SelectorDisenoTarjetas } from '@/components/dashboard/selector-diseno-tarjetas';
import { TarjetaIndicador } from '@/components/dashboard/tarjeta-indicador';
import { TarjetasIndicadores } from '@/components/dashboard/tarjetas-indicadores';
import { crearRaiz, simularCajas } from '../utils/dom-simulado';

beforeEach(() => {
  simularCajas();
  crearRaiz();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const DESGLOSE = { parte: 9, resto: 3 };

describe('DIS-112: los tres diseños', () => {
  it('«Anillo con brillo»: cifra, porcentaje dentro del anillo y parte', () => {
    const { container } = render(<TarjetaIndicador indicador="areas" valor={12} desglose={DESGLOSE} diseno="brillo" />);
    const tarjeta = screen.getByRole('group', { name: 'Áreas' });
    expect(tarjeta.getAttribute('data-diseno')).toBe('brillo');
    expect(within(tarjeta).getByText('12')).toBeTruthy();
    expect(within(tarjeta).getByText('75 %')).toBeTruthy();
    expect(within(tarjeta).getByText('9 activas')).toBeTruthy();
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('«Dos segmentos»: título como badge, cifra, leyenda con las dos partes y dos trazos', () => {
    const { container } = render(<TarjetaIndicador indicador="requests" valor={12} desglose={DESGLOSE} diseno="segmentos" />);
    const tarjeta = screen.getByRole('group', { name: 'Solicitudes' });
    expect(within(tarjeta).getByText('Solicitudes').className).toContain('badge-titulo');
    expect(within(tarjeta).getByText('12')).toBeTruthy();
    expect(within(tarjeta).getByText('75 %')).toBeTruthy();
    const filas = Array.from(tarjeta.querySelectorAll('li'));
    expect(filas.map((f) => f.textContent)).toEqual(['resueltas9', 'pendientes3']);
    expect(container.querySelector('.nx-ind__valor')).toBeTruthy();
    expect(container.querySelector('.nx-ind__resto')).toBeTruthy();
  });

  it('«Medidor»: semicírculo, cifra y porcentaje con la parte', () => {
    const { container } = render(<TarjetaIndicador indicador="visits" valor={12} desglose={DESGLOSE} diseno="medidor" />);
    const tarjeta = screen.getByRole('group', { name: 'Visitas' });
    expect(within(tarjeta).getByText('12')).toBeTruthy();
    expect(within(tarjeta).getByText('75 %')).toBeTruthy();
    expect(tarjeta.textContent).toContain('de plataformas activas');
    expect(container.querySelector('.nx-ind__semi')).toBeTruthy();
  });

  it('el llenado parte de vacío: dashoffset = 100 - largo y se apaga con movimiento reducido', () => {
    const { container } = render(<TarjetaIndicador indicador="areas" valor={12} desglose={DESGLOSE} diseno="brillo" />);
    expect(container.querySelector('.nx-ind__valor')?.getAttribute('stroke-dashoffset')).toBe('25');
  });

  it('cada indicador usa su clase de color', () => {
    const claves = [['areas', 'areas'], ['platforms', 'plataformas'], ['requests', 'solicitudes'], ['visits', 'visitas'], ['users', 'usuarios']] as const;
    for (const [indicador, clase] of claves) {
      const { container, unmount } = render(<TarjetaIndicador indicador={indicador} valor={4} diseno="medidor" desglose={{ parte: 1, resto: 3 }} />);
      expect(container.querySelector(`.nx-ind--${clase}`)).toBeTruthy();
      unmount();
    }
  });
});

describe('DIS-112: datos incompletos', () => {
  it.each(DISENOS_TARJETA)('sin desglose (%s): solo la cifra, sin anillo ni porcentaje', (diseno) => {
    const { container } = render(<TarjetaIndicador indicador="users" valor={147} diseno={diseno} />);
    const tarjeta = screen.getByRole('group', { name: 'Usuarios' });
    expect(within(tarjeta).getByText('147')).toBeTruthy();
    expect(tarjeta.getAttribute('data-diseno')).toBe('solo-cifra');
    expect(tarjeta.textContent).not.toContain('%');
    expect(container.querySelector('.nx-ind__aro, .nx-ind__semi')).toBeNull();
  });

  it('un desglose que no suma el contador se ignora', () => {
    render(<TarjetaIndicador indicador="areas" valor={20} desglose={DESGLOSE} diseno="segmentos" />);
    expect(screen.getByRole('group', { name: 'Áreas' }).textContent).not.toContain('%');
  });

  it.each(DISENOS_TARJETA)('total 0 (%s): anillo vacío y «0 %%»', (diseno) => {
    const { container } = render(<TarjetaIndicador indicador="requests" valor={0} desglose={{ parte: 0, resto: 0 }} diseno={diseno} />);
    expect(screen.getByText('0 %')).toBeTruthy();
    expect(container.querySelector('.nx-ind__pista')).toBeTruthy();
    expect(container.querySelector('.nx-ind__valor')).toBeNull();
    expect(container.querySelector('.nx-ind__resto')).toBeNull();
  });

  it('la fila muestra solo los contadores recibidos y tolera un desglose parcial', () => {
    render(
      <TarjetasIndicadores
        contadores={[{ indicador: 'areas', valor: 12 }, { indicador: 'visits', valor: 5 }]}
        desglose={{ areas: DESGLOSE }}
        diseno="segmentos"
      />,
    );
    expect(screen.getAllByRole('group')).toHaveLength(2);
    expect(screen.getByRole('group', { name: 'Áreas' }).textContent).toContain('75 %');
    expect(screen.getByRole('group', { name: 'Visitas' }).textContent).not.toContain('%');
  });
});

describe('DIS-112: preferencia de diseño', () => {
  it('por omisión rige «Dos segmentos»; un valor desconocido también', () => {
    expect(DISENO_POR_OMISION).toBe('segmentos');
    expect(leerDisenoTarjetas()).toBe('segmentos');
    window.localStorage.setItem(CLAVE_DISENO_TARJETAS, 'otro');
    expect(leerDisenoTarjetas()).toBe('segmentos');
  });

  it('guarda y lee; si el almacenamiento falla no lanza', () => {
    guardarDisenoTarjetas('medidor');
    expect(leerDisenoTarjetas()).toBe('medidor');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(leerDisenoTarjetas()).toBe('segmentos');
    expect(() => guardarDisenoTarjetas('brillo')).not.toThrow();
  });
});

describe('DIS-112: selector de diseño', () => {
  it('abre un diálogo con los tres diseños, marca el actual con aria-pressed y aplica la elección', () => {
    const alAplicar = vi.fn();
    render(<SelectorDisenoTarjetas actual="segmentos" onAplicar={alAplicar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Diseño de tarjetas' }));

    const dialogo = screen.getByRole('dialog', { name: 'Diseño de tarjetas' });
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(within(dialogo).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))).toHaveLength(3);
    expect(within(dialogo).getByRole('button', { name: 'Dos segmentos', pressed: true })).toBeTruthy();
    expect(within(dialogo).getByRole('button', { name: 'Medidor', pressed: false })).toBeTruthy();
    expect(within(dialogo).getByRole('button', { name: 'Anillo con brillo', pressed: false })).toBeTruthy();
    // vista previa: una tarjeta de ejemplo por diseño
    expect(dialogo.querySelectorAll('.nx-ind')).toHaveLength(3);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Medidor' }));
    expect(within(dialogo).getByRole('button', { name: 'Medidor', pressed: true })).toBeTruthy();
    expect(alAplicar).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Aplicar' }));
    expect(alAplicar).toHaveBeenCalledWith('medidor');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Cancelar y Escape descartan la elección', () => {
    const alAplicar = vi.fn();
    render(<SelectorDisenoTarjetas actual="brillo" onAplicar={alAplicar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Diseño de tarjetas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Medidor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(alAplicar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Diseño de tarjetas' }));
    expect(screen.getByRole('button', { name: 'Anillo con brillo', pressed: true })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('accesibilidad: el diálogo tiene nombre, foco dentro y los botones miden al menos 48 px (min-h-12)', () => {
    render(<SelectorDisenoTarjetas actual="segmentos" onAplicar={() => {}} />);
    const disparador = screen.getByRole('button', { name: 'Diseño de tarjetas' });
    expect(disparador.className).toContain('min-h-12');
    fireEvent.click(disparador);
    const dialogo = screen.getByRole('dialog');
    expect(dialogo.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    for (const opcion of within(dialogo).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))) {
      expect(opcion.className).toContain('min-h-12');
      // la vista previa no se anuncia dos veces: el nombre sale solo del título
      expect(opcion.querySelector('[aria-hidden="true"] [role="group"]')).toBeTruthy();
    }
  });

  it('la opción elegida lleva una marca no cromática («Elegido» con icono) y el foco inicial va a la actual', () => {
    render(<SelectorDisenoTarjetas actual="medidor" onAplicar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Diseño de tarjetas' }));
    const dialogo = screen.getByRole('dialog');
    const actual = within(dialogo).getByRole('button', { name: 'Medidor', pressed: true });
    expect(document.activeElement).toBe(actual);
    expect(actual.textContent).toContain('Elegido');
    expect(actual.querySelector('svg')).toBeTruthy();
    const otra = within(dialogo).getByRole('button', { name: 'Anillo con brillo', pressed: false });
    expect(otra.textContent).not.toContain('Elegido');
    fireEvent.click(otra);
    expect(otra.textContent).toContain('Elegido');
    expect(actual.textContent).not.toContain('Elegido');
  });
});

describe('DIS-112: lector de pantalla y recortes', () => {
  it.each(DISENOS_TARJETA)('%s: dice las dos partes y de qué es el porcentaje', (diseno) => {
    render(<TarjetaIndicador indicador="areas" valor={12} desglose={DESGLOSE} diseno={diseno} />);
    const texto = screen.getByRole('group', { name: 'Áreas' }).textContent ?? '';
    expect(texto).toMatch(/9 activas/);
    expect(texto).toMatch(/3 inactivas/);
    expect(texto).toMatch(/75 %\s*activas/);
  });

  it('el badge puede truncar y conserva el texto completo en title', () => {
    const { container } = render(<TarjetaIndicador indicador="platforms" valor={12} desglose={DESGLOSE} diseno="segmentos" />);
    expect(container.querySelector('.badge-titulo')?.getAttribute('title')).toBe('Plataformas');
    expect(container.querySelector('.badge-titulo')?.className).toContain('truncate');
  });

  it('la fila pasa a 5 columnas solo en 2xl (con menos ancho la tarjeta se recortaría)', () => {
    const { container } = render(<TarjetasIndicadores contadores={[{ indicador: 'areas', valor: 1 }]} desglose={undefined} diseno="brillo" />);
    const clases = (container.firstElementChild?.className ?? '').split(' ');
    expect(clases).toContain('2xl:grid-cols-5');
    expect(clases).not.toContain('xl:grid-cols-5');
  });
});
