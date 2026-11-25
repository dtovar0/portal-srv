/** DIS-128: tras firmar, el catálogo se refresca solo mientras haya accesos en proceso. */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INTERVALO_REFRESCO_MS, MAX_REFRESCOS, useRefrescoTrasFirma,
} from '@/components/access/use-refresco-tras-firma';
import { EVENTO_ACCESOS_CAMBIADOS } from '@/lib/access/eventos';
import type { CatalogItem } from '@/lib/access/types';

function item(estado: CatalogItem['my_access_status']): CatalogItem {
  return {
    platform: { id: 1, name: 'tacacs', description: '', icon: 'plataformas' },
    area: { id: 1, name: 'Packet' }, my_level: 'usuario', my_access_status: estado,
    pending_request_id: null, can_request: false, requestable_levels: [],
  } as CatalogItem;
}

let avisos = 0;
const contar = () => { avisos += 1; };
beforeEach(() => {
  vi.useFakeTimers();
  avisos = 0;
  window.addEventListener(EVENTO_ACCESOS_CAMBIADOS, contar);
});
afterEach(() => {
  window.removeEventListener(EVENTO_ACCESOS_CAMBIADOS, contar);
  vi.useRealTimers();
});

describe('useRefrescoTrasFirma', () => {
  it('avisa al firmar y sigue avisando mientras el acceso esté en proceso', () => {
    const { result } = renderHook(() => useRefrescoTrasFirma([item('en_proceso')]));
    act(() => result.current());
    expect(avisos).toBe(1);
    act(() => { vi.advanceTimersByTime(INTERVALO_REFRESCO_MS); });
    expect(avisos).toBe(2);
    for (let i = 0; i < MAX_REFRESCOS + 5; i += 1) {
      act(() => { vi.advanceTimersByTime(INTERVALO_REFRESCO_MS); });
    }
    expect(avisos).toBe(1 + MAX_REFRESCOS);  // tope: no consulta para siempre
  });

  it('cuando el acceso ya se activó, deja de consultar', () => {
    const { result, rerender } = renderHook(
      ({ estado }) => useRefrescoTrasFirma([item(estado)]),
      { initialProps: { estado: 'en_proceso' as CatalogItem['my_access_status'] } });
    act(() => result.current());
    act(() => { vi.advanceTimersByTime(INTERVALO_REFRESCO_MS); });
    rerender({ estado: 'activo' });
    for (let i = 0; i < 5; i += 1) {
      act(() => { vi.advanceTimersByTime(INTERVALO_REFRESCO_MS); });
    }
    expect(avisos).toBe(2);
  });
});
