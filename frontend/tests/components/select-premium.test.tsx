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

  it('DIS-086: combobox correcto (activedescendant, controls, nombre del listbox)', () => {
    render(<SelectPremium value={1} options={OPCIONES} onChange={vi.fn()} aria-label="Área" />);
    const combobox = screen.getByRole('combobox');
    expect(combobox.getAttribute('aria-controls')).toBeNull();
    expect(combobox.getAttribute('aria-activedescendant')).toBeNull();

    fireEvent.click(combobox);
    const listbox = screen.getByRole('listbox', { name: 'Área' });
    expect(combobox.getAttribute('aria-controls')).toBe(listbox.id);
    const activa = document.getElementById(combobox.getAttribute('aria-activedescendant')!);
    expect(activa?.getAttribute('role')).toBe('option');
    expect(activa?.textContent).toContain('Finanzas');
    expect(listbox.getAttribute('aria-activedescendant')).toBeNull();

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant')!)?.textContent).toContain(
      'Infraestructura',
    );
  });

  it('DIS-086: el nombre del listbox sigue a aria-labelledby', () => {
    render(
      <>
        <span id="etq">Área de trabajo</span>
        <SelectPremium value={1} options={OPCIONES} onChange={vi.fn()} aria-labelledby="etq" />
      </>,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox', { name: 'Área de trabajo' })).toBeTruthy();
  });

  it('DIS-086: Home y End mueven la opción activa; Enter la elige', () => {
    const onChange = vi.fn();
    render(<SelectPremium value={1} options={OPCIONES} onChange={onChange} />);
    const combobox = screen.getByRole('combobox');
    fireEvent.keyDown(combobox, { key: 'End' });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(combobox, { key: 'End' });
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant')!)?.textContent).toContain(
      'Infraestructura',
    );
    fireEvent.keyDown(combobox, { key: 'Home' });
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant')!)?.textContent).toContain('Finanzas');
    fireEvent.keyDown(combobox, { key: 'End' });
    fireEvent.keyDown(combobox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('DIS-086: el nombre va en el select nativo (se envía con el formulario), no en el botón', () => {
    const { container } = render(<SelectPremium name="area" value={2} options={OPCIONES} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox').getAttribute('name')).toBeNull();
    const nativo = container.querySelector('select')!;
    expect(nativo.getAttribute('name')).toBe('area');
    expect(nativo.value).toBe('2');
  });
});
