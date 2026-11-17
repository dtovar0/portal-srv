import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SelectPremium } from '@/components/select-premium';

const OPCIONES = [
  { value: 1, label: 'Finanzas', description: 'Área contable y de tesorería' },
  { value: 2, label: 'Infraestructura', description: 'Servidores y redes' },
];

afterEach(() => cleanup());

describe('SelectPremium', () => {
  it('renderiza con la opción seleccionada y abre el dropdown premium al hacer click', () => {
    const onChange = vi.fn();
    render(<SelectPremium value={1} options={OPCIONES} onChange={onChange} />);

    expect(screen.getByRole('combobox').textContent).toContain('Finanzas');
    expect(screen.queryByRole('listbox')).toBeNull();

    // Abrir menú
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(2);

    // Seleccionar otra opción
    fireEvent.click(screen.getByRole('option', { name: /Infraestructura/i }));
    expect(onChange).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('navegación accesible por teclado (ArrowDown, Enter, Escape)', () => {
    const onChange = vi.fn();
    render(<SelectPremium value={1} options={OPCIONES} onChange={onChange} />);

    const combobox = screen.getByRole('combobox');
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.keyDown(combobox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('respeta estado deshabilitado', () => {
    const onChange = vi.fn();
    render(<SelectPremium value={1} options={OPCIONES} onChange={onChange} disabled />);

    const combobox = screen.getByRole('combobox') as HTMLButtonElement;
    expect(combobox.disabled).toBe(true);
    fireEvent.click(combobox);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
