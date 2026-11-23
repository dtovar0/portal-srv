import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLAVE_OMITIR_MODAL_PORTAL,
  ModalTransicionPortal,
  guardarOmitirModalPortal,
  leerOmitirModalPortal,
} from '@/components/marco/modal-transicion-portal';

describe('ModalTransicionPortal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('no renderiza nada si abierto es false', () => {
    render(
      <ModalTransicionPortal
        abierto={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renderiza título, mensaje, checkbox de omisión y botones cuando abierto es true', () => {
    render(
      <ModalTransicionPortal
        abierto={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Ir al Portal de Usuario')).toBeTruthy();
    expect(screen.getByText(/Estás por salir de la consola de administración técnica/i)).toBeTruthy();
    expect(screen.getByLabelText('No volver a mostrar este aviso')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ir al portal' })).toBeTruthy();
  });

  it('llama a onCancel al pulsar el botón Cancelar', () => {
    const onCancel = vi.fn();
    render(
      <ModalTransicionPortal
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
      <ModalTransicionPortal
        abierto={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ir al portal' }));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it('llama a onConfirm con true si el checkbox fue marcado', () => {
    const onConfirm = vi.fn();
    render(
      <ModalTransicionPortal
        abierto={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const checkbox = screen.getByLabelText('No volver a mostrar este aviso');
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Ir al portal' }));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('persiste y lee correctamente la preferencia en localStorage', () => {
    expect(leerOmitirModalPortal()).toBe(false);

    guardarOmitirModalPortal(true);
    expect(leerOmitirModalPortal()).toBe(true);
    expect(window.localStorage.getItem(CLAVE_OMITIR_MODAL_PORTAL)).toBe('true');

    guardarOmitirModalPortal(false);
    expect(leerOmitirModalPortal()).toBe(false);
    expect(window.localStorage.getItem(CLAVE_OMITIR_MODAL_PORTAL)).toBeNull();
  });
});
