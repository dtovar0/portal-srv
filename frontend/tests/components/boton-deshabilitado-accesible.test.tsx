/**
 * DIS-096: botón deshabilitado con motivo accesible.
 * Con `disabled` nativo el botón no recibe foco y el lector no anuncia el motivo;
 * con `motivoDeshabilitado` queda aria-disabled, enfocable, con el motivo descrito.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/button';

afterEach(cleanup);

const MOTIVO = 'Selecciona 1 área para editar';

describe('Button con motivoDeshabilitado (DIS-096)', () => {
  it('deshabilitado con motivo: aria-disabled, sin disabled nativo y enfocable', () => {
    render(<Button disabled motivoDeshabilitado={MOTIVO}>Editar</Button>);
    const boton = screen.getByRole('button', { name: 'Editar' });
    expect(boton.getAttribute('aria-disabled')).toBe('true');
    expect(boton.hasAttribute('disabled')).toBe(false);
    boton.focus();
    expect(document.activeElement).toBe(boton);
    expect(boton.className).toContain('estado-deshabilitado');
  });

  it('el motivo queda asociado con aria-describedby y sin title duplicado', () => {
    render(<Button disabled motivoDeshabilitado={MOTIVO} title="otro">Editar</Button>);
    const boton = screen.getByRole('button', { name: 'Editar' });
    const id = boton.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toBe(MOTIVO);
    expect(boton.hasAttribute('title')).toBe(false);
  });

  it('conserva el aria-describedby del llamador junto al del motivo', () => {
    render(<Button disabled motivoDeshabilitado={MOTIVO} aria-describedby="otro">Editar</Button>);
    const ids = (screen.getByRole('button').getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids).toContain('otro');
    expect(ids).toHaveLength(2);
  });

  it('el clic no ejecuta la acción', () => {
    const alClic = vi.fn();
    render(<Button disabled motivoDeshabilitado={MOTIVO} onClick={alClic}>Editar</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(alClic).not.toHaveBeenCalled();
  });

  it('Esc descarta el motivo visible y se restablece al salir (WCAG 1.4.13)', () => {
    render(<Button disabled motivoDeshabilitado={MOTIVO}>Editar</Button>);
    const boton = screen.getByRole('button', { name: 'Editar' });
    const envoltorio = boton.parentElement as HTMLElement;
    fireEvent.focus(boton);
    fireEvent.keyDown(boton, { key: 'Escape' });
    expect(envoltorio.getAttribute('data-motivo-descartado')).toBe('true');
    fireEvent.blur(boton);
    expect(envoltorio.getAttribute('data-motivo-descartado')).toBeNull();
  });

  it('habilitado: sin aria-disabled ni descripción, y el clic funciona', () => {
    const alClic = vi.fn();
    render(<Button motivoDeshabilitado={MOTIVO} onClick={alClic}>Editar</Button>);
    const boton = screen.getByRole('button', { name: 'Editar' });
    expect(boton.hasAttribute('aria-disabled')).toBe(false);
    expect(boton.hasAttribute('aria-describedby')).toBe(false);
    fireEvent.click(boton);
    expect(alClic).toHaveBeenCalledTimes(1);
  });

  it('sin motivo, disabled sigue siendo nativo (p. ej. envío en curso)', () => {
    render(<Button disabled>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' }).hasAttribute('disabled')).toBe(true);
  });
});
