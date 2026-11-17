import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '@/lib/types';
import { AreaDualPicklist } from '@/components/users/area-dual-picklist';

const AREAS: Area[] = [
  {
    id: 1,
    name: 'Operaciones',
    description: null,
    icon: 'areas',
    color: 'slate',
    status: 'activo',
    platforms_count: 0,
    users_count: 5,
  },
  {
    id: 2,
    name: 'Sistemas Críticos',
    description: null,
    icon: 'areas',
    color: 'amber',
    status: 'activo',
    platforms_count: 3,
    users_count: 2,
  },
];

afterEach(() => {
  cleanup();
});

const TRES: Area[] = [
  ...AREAS.map((a) => ({ ...a, platforms_count: 0 })),
  { ...AREAS[0]!, id: 3, name: 'Finanzas' },
];

/** Controla `selected` como lo hace el formulario real. */
function Controlado({ inicial = [] as number[] }) {
  const [sel, setSel] = useState(inicial);
  return <AreaDualPicklist areas={TRES} selected={sel} onChange={setSel} />;
}

describe('AreaDualPicklist: foco y anuncios (DIS-082)', () => {
  it('al asignar, el foco pasa al ítem vecino de la lista de disponibles y se anuncia', () => {
    render(<Controlado />);
    fireEvent.click(screen.getByLabelText('Asignar Operaciones'));
    expect(document.activeElement).toBe(screen.getByLabelText('Asignar Sistemas Críticos'));
    expect(document.querySelector('[data-region-anuncios]')?.textContent).toBe('«Operaciones» asignada, 1 asignada');
  });

  it('al quitar el último ítem de la lista, el foco queda en la lista y se anuncia', () => {
    render(<Controlado inicial={[1]} />);
    fireEvent.click(screen.getByLabelText('Quitar Operaciones'));
    expect(document.activeElement).toBe(screen.getByRole('list', { name: 'Áreas asignadas' }));
    expect(document.querySelector('[data-region-anuncios]')?.textContent).toBe('«Operaciones» quitada, 0 asignadas');
  });

  it('al cancelar el desafío, el foco vuelve al botón de origen', () => {
    render(<AreaDualPicklist areas={AREAS} selected={[]} onChange={vi.fn()} />);
    const origen = screen.getByLabelText('Asignar Sistemas Críticos');
    origen.focus();
    fireEvent.click(origen);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(document.activeElement).toBe(origen);
  });
});

describe('AreaDualPicklist', () => {
  it('renderiza áreas disponibles y asignadas', () => {
    render(<AreaDualPicklist areas={AREAS} selected={[1]} onChange={vi.fn()} />);

    expect(screen.getByText('Áreas disponibles')).toBeTruthy();
    expect(screen.getByText('Áreas asignadas')).toBeTruthy();
    // Operaciones está asignada
    expect(screen.getByLabelText('Quitar Operaciones')).toBeTruthy();
    // Sistemas Críticos está disponible
    expect(screen.getByLabelText('Asignar Sistemas Críticos')).toBeTruthy();
  });

  it('transfiere un área sin plataformas directamente', () => {
    const onChange = vi.fn();
    render(<AreaDualPicklist areas={AREAS} selected={[]} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Asignar Operaciones'));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it('exige confirmación con captcha al intentar transferir un área con plataformas', () => {
    const onChange = vi.fn();
    render(<AreaDualPicklist areas={AREAS} selected={[]} onChange={onChange} />);

    // Intentar asignar área con plataformas
    fireEvent.click(screen.getByLabelText('Asignar Sistemas Críticos'));

    // No debe llamar a onChange directamente
    expect(onChange).not.toHaveBeenCalled();

    // Debe mostrar el diálogo de confirmación de captcha
    expect(screen.getByRole('region', { name: 'Confirmación de acceso a plataformas' })).toBeTruthy();
    expect(screen.getByText('Confirmación de acceso a plataformas')).toBeTruthy();

    const captchaWord = screen.getByTestId('captcha-word').textContent!;
    expect(captchaWord).toBeTruthy();

    const input = screen.getByPlaceholderText(`Escribe ${captchaWord}...`);
    const btnConfirmar = screen.getByRole('button', { name: 'Confirmar asignación' });

    // El botón está deshabilitado inicialmente
    expect(btnConfirmar.hasAttribute('disabled')).toBe(true);

    // Escribir palabra incorrecta
    fireEvent.change(input, { target: { value: 'INCORRECTO' } });
    expect(btnConfirmar.hasAttribute('disabled')).toBe(true);

    // Escribir palabra correcta
    fireEvent.change(input, { target: { value: captchaWord } });
    expect(btnConfirmar.hasAttribute('disabled')).toBe(false);

    // Confirmar asignación
    fireEvent.click(btnConfirmar);
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it('cancela la transferencia con plataformas sin modificar selección', () => {
    const onChange = vi.fn();
    render(<AreaDualPicklist areas={AREAS} selected={[]} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Asignar Sistemas Críticos'));
    expect(screen.getByRole('region', { name: 'Confirmación de acceso a plataformas' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('region', { name: 'Confirmación de acceso a plataformas' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('permite quitar un área asignada', () => {
    const onChange = vi.fn();
    render(<AreaDualPicklist areas={AREAS} selected={[1]} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Quitar Operaciones'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
