import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BotonRegresarAdmin,
  CLAVE_OMITIR_MODAL_ADMIN,
  ModalTransicionAdmin,
  guardarOmitirModalAdmin,
  leerOmitirModalAdmin,
} from '@/components/platforms/modal-transicion-admin';

const rutaMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: rutaMock.push }),
}));

describe('ModalTransicionAdmin y BotonRegresarAdmin', () => {
  beforeEach(() => {
    window.localStorage.clear();
    rutaMock.push.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('no renderiza nada si abierto es false', () => {
    render(
      <ModalTransicionAdmin
        abierto={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renderiza título, mensaje, checkbox de omisión y botones cuando abierto es true', () => {
    render(
      <ModalTransicionAdmin
        abierto={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Regresar al Panel de Administración')).toBeTruthy();
    expect(screen.getByText(/Estás por salir del/i)).toBeTruthy();
    expect(screen.getByLabelText('No volver a mostrar este aviso')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ir a admin' })).toBeTruthy();
  });

  it('llama a onCancel al pulsar el botón Cancelar', () => {
    const onCancel = vi.fn();
    render(
      <ModalTransicionAdmin
        abierto={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('llama a onConfirm con false si el checkbox no fue marcado', () => {
    const onConfirm = vi.fn();
    render(
      <ModalTransicionAdmin
        abierto={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ir a admin' }));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it('llama a onConfirm con true si el checkbox fue marcado', () => {
    const onConfirm = vi.fn();
    render(
      <ModalTransicionAdmin
        abierto={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const checkbox = screen.getByLabelText('No volver a mostrar este aviso');
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Ir a admin' }));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('persiste y lee correctamente la preferencia en localStorage', () => {
    expect(leerOmitirModalAdmin()).toBe(false);

    guardarOmitirModalAdmin(true);
    expect(leerOmitirModalAdmin()).toBe(true);
    expect(window.localStorage.getItem(CLAVE_OMITIR_MODAL_ADMIN)).toBe('true');

    guardarOmitirModalAdmin(false);
    expect(leerOmitirModalAdmin()).toBe(false);
    expect(window.localStorage.getItem(CLAVE_OMITIR_MODAL_ADMIN)).toBeNull();
  });

  describe('BotonRegresarAdmin', () => {
    it('renderiza el enlace con href="/dashboard" y label accesible', () => {
      render(<BotonRegresarAdmin />);
      const link = screen.getByRole('link', { name: 'Regresar al panel de administración' });
      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe('/dashboard');
    });

    it('al hacer clic abre el modal cuando no está omitido y no navega inmediatamente', () => {
      render(<BotonRegresarAdmin />);
      const link = screen.getByRole('link', { name: 'Regresar al panel de administración' });
      fireEvent.click(link);

      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Regresar al Panel de Administración')).toBeTruthy();
      expect(rutaMock.push).not.toHaveBeenCalled();
    });

    it('al confirmar en el modal, navega a "/dashboard" y cierra el diálogo', () => {
      render(<BotonRegresarAdmin />);
      fireEvent.click(screen.getByRole('link', { name: 'Regresar al panel de administración' }));

      fireEvent.click(screen.getByRole('button', { name: 'Ir a admin' }));
      expect(rutaMock.push).toHaveBeenCalledWith('/dashboard');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('al marcar el checkbox y confirmar, guarda la preferencia para omitir en visitas posteriores', () => {
      render(<BotonRegresarAdmin />);
      fireEvent.click(screen.getByRole('link', { name: 'Regresar al panel de administración' }));

      fireEvent.click(screen.getByLabelText('No volver a mostrar este aviso'));
      fireEvent.click(screen.getByRole('button', { name: 'Ir a admin' }));

      expect(window.localStorage.getItem(CLAVE_OMITIR_MODAL_ADMIN)).toBe('true');
    });

    it('si está omitido, al hacer clic no abre el modal', () => {
      guardarOmitirModalAdmin(true);
      render(<BotonRegresarAdmin />);

      fireEvent.click(screen.getByRole('link', { name: 'Regresar al panel de administración' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
