import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { Icono } from '@/components/icono';
import { TRAZOS, type NombreIcono } from '@/components/icono-trazos';

const NOMBRES = Object.keys(TRAZOS) as NombreIcono[];

describe('Icono', () => {
  it('el catálogo tiene 50 iconos', () => {
    expect(NOMBRES).toHaveLength(50);
  });

  it('conserva los nombres previos y los nuevos del DIS-077', () => {
    const esperados = [
      'cerrar', 'marca', 'favorito', 'exito', 'error', 'aviso', 'info', 'pregunta',
      'panel', 'catalogo', 'widget', 'solicitudes', 'aprobaciones', 'areas', 'plataformas', 'usuarios',
      'inventario', 'ejecuciones', 'auditoria', 'ajustes',
      'menu', 'buscar', 'sol', 'luna', 'campana', 'ayuda', 'chevron-izq', 'chevron-der',
      'chevron-abajo', 'flecha-izq', 'colapsar',
      'ver', 'aprobar', 'rechazar', 'editar', 'eliminar', 'exportar', 'abrir-externo', 'mas',
      'reloj', 'escudo', 'escudo-ok', 'actividad', 'documento', 'diseno',
      // Agregados después (flecha-der, flecha-izquierda y candado en 412f0f9; correo y recargar en 951343c).
      'flecha-der', 'flecha-izquierda', 'candado', 'correo', 'recargar',
    ];
    for (const n of esperados) expect(NOMBRES).toContain(n);
  });

  it.each(NOMBRES)('%s pinta un svg 24x24 oculto por defecto, con trazos', (nombre) => {
    const { container } = render(<Icono nombre={nombre} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.getAttribute('stroke-width')).toBe('2');
    expect(svg?.hasAttribute('style')).toBe(false);
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('con ariaLabel usa role=img y no se oculta', () => {
    const { container } = render(<Icono nombre="campana" ariaLabel="Notificaciones" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Notificaciones');
    expect(svg?.getAttribute('aria-hidden')).toBe('false');
  });

  it('tamaños sm, md, lg, xl y 2xl', () => {
    const medidas = { sm: '16', md: '20', lg: '24', xl: '22', '2xl': '28' } as const;
    for (const [t, px] of Object.entries(medidas)) {
      const { container } = render(<Icono nombre="mas" tamano={t as keyof typeof medidas} />);
      expect(container.querySelector('svg')?.getAttribute('width')).toBe(px);
    }
  });

  it('permite conmutar relleno (fill) con la prop relleno', () => {
    const { container: vacio } = render(<Icono nombre="favorito" relleno={false} />);
    expect(vacio.querySelector('svg')?.getAttribute('fill')).toBe('none');

    const { container: lleno } = render(<Icono nombre="favorito" relleno={true} />);
    expect(lleno.querySelector('svg')?.getAttribute('fill')).toBe('currentColor');
  });
});
