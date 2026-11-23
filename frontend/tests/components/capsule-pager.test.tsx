import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CapsulePager } from '../../src/components/capsule-pager';

afterEach(() => cleanup());

describe('CapsulePager Component', () => {
  it('renderiza la paginación con el indicador de página actual y total', () => {
    const handleChange = vi.fn();
    render(<CapsulePager page={2} totalPages={5} onChange={handleChange} />);

    expect(screen.getByRole('navigation', { name: /paginación/i })).toBeDefined();
    expect(screen.getByText('2/5')).toBeDefined();
    expect(screen.getByText('Pág. 2 de 5')).toBeDefined();
  });

  it('permite avanzar y retroceder de página llamando a onChange', () => {
    const handleChange = vi.fn();
    render(<CapsulePager page={2} totalPages={3} onChange={handleChange} />);

    const btnAnterior = screen.getByRole('button', { name: /página anterior/i });
    const btnSiguiente = screen.getByRole('button', { name: /página siguiente/i });

    expect(btnAnterior.hasAttribute('disabled')).toBe(false);
    expect(btnSiguiente.hasAttribute('disabled')).toBe(false);

    fireEvent.click(btnAnterior);
    expect(handleChange).toHaveBeenCalledWith(1);

    fireEvent.click(btnSiguiente);
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('deshabilita el botón anterior en la primera página', () => {
    const handleChange = vi.fn();
    render(<CapsulePager page={1} totalPages={3} onChange={handleChange} />);

    const btnAnterior = screen.getByRole('button', { name: /página anterior/i });
    expect(btnAnterior.hasAttribute('disabled')).toBe(true);
  });

  it('deshabilita el botón siguiente en la última página', () => {
    const handleChange = vi.fn();
    render(<CapsulePager page={3} totalPages={3} onChange={handleChange} />);

    const btnSiguiente = screen.getByRole('button', { name: /página siguiente/i });
    expect(btnSiguiente.hasAttribute('disabled')).toBe(true);
  });

  it('no se renderiza si totalPages es 1 y showWhenSinglePage es false', () => {
    const { container } = render(<CapsulePager page={1} totalPages={1} onChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('se renderiza si totalPages es 1 y showWhenSinglePage es true', () => {
    render(<CapsulePager page={1} totalPages={1} onChange={vi.fn()} showWhenSinglePage={true} />);
    expect(screen.getByRole('navigation')).toBeDefined();
    expect(screen.getByText('1/1')).toBeDefined();
  });

  it('aplica las clases compactas con tamano="sm"', () => {
    render(<CapsulePager page={1} totalPages={2} onChange={vi.fn()} tamano="sm" />);
    const btnSiguiente = screen.getByRole('button', { name: /página siguiente/i });
    expect(btnSiguiente.className).toContain('size-7');
  });
});
