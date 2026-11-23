import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PremiumEmptyState } from '@/components/premium-message';
import { EmptyNote } from '@/components/ui';

afterEach(() => cleanup());

describe('PremiumEmptyState — Estandarización de Mensajes de Vacío Premium', () => {
  it('renderiza con mensaje básico, rol status e icono por defecto', () => {
    render(<PremiumEmptyState message="No hay registros disponibles." />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('No hay registros disponibles.')).toBeDefined();
  });

  it('DIS-085: el rol es opcional y el título admite otro nivel', () => {
    const { container } = render(
      <PremiumEmptyState message="Nada aquí." title="Vacío" role={null} nivelTitulo={2} />,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('[role]')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Vacío' })).toBeDefined();
  });

  it('DIS-085: por defecto status y título de nivel 3; admite role alert', () => {
    const { rerender } = render(<PremiumEmptyState message="Nada." title="T" />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByRole('heading', { level: 3 })).toBeDefined();
    rerender(<PremiumEmptyState message="Nada." role="alert" />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('soporta título destacado y badge superior', () => {
    render(
      <PremiumEmptyState
        badge="Filtro activo"
        title="Sin resultados"
        message="Intenta con otro término de búsqueda."
      />,
    );
    expect(screen.getByText('Filtro activo')).toBeDefined();
    expect(screen.getByText('Sin resultados')).toBeDefined();
    expect(screen.getByText('Intenta con otro término de búsqueda.')).toBeDefined();
  });

  it('renderiza botón de acción / CTA cuando se provee', () => {
    render(
      <PremiumEmptyState
        message="No se encontraron datos."
        action={<button type="button">Restablecer filtros</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Restablecer filtros' })).toBeDefined();
  });

  it('soporta icono personalizado', () => {
    const { container } = render(
      <PremiumEmptyState
        icono="ejecuciones"
        message="Sin ejecuciones en segundo plano."
      />,
    );
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('EmptyNote delega y renderiza correctamente la especificación premium', () => {
    render(
      <EmptyNote
        title="Áreas vacías"
        badge="Estado"
        message="Crea un área para comenzar."
        action={<button type="button">Nueva área</button>}
      />,
    );
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Áreas vacías')).toBeDefined();
    expect(screen.getByText('Estado')).toBeDefined();
    expect(screen.getByText('Crea un área para comenzar.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Nueva área' })).toBeDefined();
  });
});
