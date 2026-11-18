import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BotonIcono } from '@/components/marco/boton-icono';

afterEach(() => cleanup());

describe('BotonIcono — tooltip descartable (DIS-085, WCAG 1.4.13)', () => {
  it('Esc descarta el tooltip con el foco y se restablece al salir', () => {
    render(<BotonIcono icono="info" etiqueta="Ayuda" />);
    const boton = screen.getByRole('button', { name: 'Ayuda' });
    expect(boton.getAttribute('data-tooltip-descartado')).toBeNull();
    fireEvent.focus(boton);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(boton.getAttribute('data-tooltip-descartado')).toBe('true');
    fireEvent.blur(boton);
    expect(boton.getAttribute('data-tooltip-descartado')).toBeNull();
  });

  it('Esc también lo descarta con el puntero encima', () => {
    render(<BotonIcono icono="info" etiqueta="Ayuda" />);
    const boton = screen.getByRole('button', { name: 'Ayuda' });
    fireEvent.mouseEnter(boton);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(boton.getAttribute('data-tooltip-descartado')).toBe('true');
    fireEvent.mouseLeave(boton);
    expect(boton.getAttribute('data-tooltip-descartado')).toBeNull();
  });

  it('otras teclas no lo descartan y se conservan los manejadores del llamador', () => {
    let entro = false;
    render(<BotonIcono icono="info" etiqueta="Ayuda" onMouseEnter={() => (entro = true)} />);
    const boton = screen.getByRole('button', { name: 'Ayuda' });
    fireEvent.mouseEnter(boton);
    fireEvent.keyDown(document, { key: 'a' });
    expect(entro).toBe(true);
    expect(boton.getAttribute('data-tooltip-descartado')).toBeNull();
  });
});
