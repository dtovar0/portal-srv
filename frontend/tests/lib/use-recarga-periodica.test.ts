/** DIS-129: recarga periódica del Portal y del contador, pausada con la pestaña oculta. */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecargaPeriodica } from '@/lib/use-recarga-periodica';
import { INTERVALO_POLLING_MIN_S } from '@/lib/use-polling';

let estado: DocumentVisibilityState = 'visible';
beforeEach(() => {
  vi.useFakeTimers();
  estado = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => estado);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useRecargaPeriodica', () => {
  it('recarga cada intervalo de las preferencias', () => {
    const recargar = vi.fn();
    renderHook(() => useRecargaPeriodica(recargar, 30));
    vi.advanceTimersByTime(30_000);
    expect(recargar).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(recargar).toHaveBeenCalledTimes(3);
  });

  it('respeta el mínimo de 15 s aunque la preferencia sea menor', () => {
    const recargar = vi.fn();
    renderHook(() => useRecargaPeriodica(recargar, 1));
    vi.advanceTimersByTime(INTERVALO_POLLING_MIN_S * 1000 - 1);
    expect(recargar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('con la pestaña oculta no consulta; al volver, recarga de inmediato', () => {
    const recargar = vi.fn();
    renderHook(() => useRecargaPeriodica(recargar, 15));
    estado = 'hidden';
    vi.advanceTimersByTime(60_000);
    expect(recargar).not.toHaveBeenCalled();
    estado = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('inactivo no hace nada', () => {
    const recargar = vi.fn();
    renderHook(() => useRecargaPeriodica(recargar, 15, false));
    vi.advanceTimersByTime(60_000);
    expect(recargar).not.toHaveBeenCalled();
  });
});
