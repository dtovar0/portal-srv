/**
 * DIS-097: la variante del botón de confirmar de ConfirmDialog depende del tipo;
 * el peligro solo aparece en acciones destructivas.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfirmDialog } from '@/components/form';

afterEach(cleanup);

const comun = { title: 'Acción', message: 'Mensaje', onConfirm: () => undefined, onCancel: () => undefined };

describe('ConfirmDialog: variante según type (DIS-097)', () => {
  it('por defecto (aviso, destructiva): botón de peligro', () => {
    render(<ConfirmDialog {...comun} confirmLabel="Eliminar" />);
    expect(screen.getByRole('button', { name: 'Eliminar' }).className).toContain('nexus-btn-danger');
  });

  it('type="pregunta" (no destructiva, p. ej. Reenviar): sin peligro, botón primario', () => {
    render(<ConfirmDialog {...comun} confirmLabel="Reenviar" type="pregunta" />);
    const clases = screen.getByRole('button', { name: 'Reenviar' }).className;
    expect(clases).toContain('nexus-btn-primary');
    expect(clases).not.toContain('nexus-btn-danger');
  });

  it('type="info": primario', () => {
    render(<ConfirmDialog {...comun} confirmLabel="Entendido" type="info" />);
    expect(screen.getByRole('button', { name: 'Entendido' }).className).not.toContain('nexus-btn-danger');
  });

  it('type="error": peligro', () => {
    render(<ConfirmDialog {...comun} confirmLabel="Borrar" type="error" />);
    expect(screen.getByRole('button', { name: 'Borrar' }).className).toContain('nexus-btn-danger');
  });

  it('una variante explícita prevalece sobre el tipo', () => {
    render(<ConfirmDialog {...comun} confirmLabel="Purgar" type="pregunta" variant="danger" />);
    expect(screen.getByRole('button', { name: 'Purgar' }).className).toContain('nexus-btn-danger');
  });
});
