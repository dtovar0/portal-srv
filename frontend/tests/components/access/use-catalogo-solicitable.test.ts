import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Platform } from '@/lib/types';
import type { CatalogItem } from '@/lib/access/types';

vi.mock('@/lib/access/requests', () => ({
  requestsApi: {
    catalog: vi.fn().mockResolvedValue([
      {
        platform: { id: 10, name: 'AWS Console', description: 'Cloud', icon: 'aws' },
        area: { id: 2, name: 'Infraestructura' },
        my_level: null,
        my_access_status: 'activo',
        pending_request_id: null,
        can_request: false,
        requestable_levels: [],
      } satisfies CatalogItem,
    ]),
  },
}));

import { useCatalogoSolicitable, type MisPlataformas } from '@/components/access/use-catalogo-solicitable';

describe('useCatalogoSolicitable: reactividad de favoritos en caliente', () => {
  it('actualiza el estado de is_favorite inmediatamente en la colección mias sin requerir recargar la página', async () => {
    const reloadMock = vi.fn();
    const plataformaInicial: Platform = {
      id: 10,
      name: 'AWS Console',
      description: 'Cloud',
      area_id: 2,
      area_name: 'Infraestructura',
      status: 'Activo',
      is_favorite: false,
      direct_link: 'https://aws.amazon.com',
    } as unknown as Platform;

    const mias: MisPlataformas = {
      data: [plataformaInicial],
      loading: false,
      error: null,
      reload: reloadMock,
    };

    const { result } = renderHook(() => useCatalogoSolicitable(mias));

    // Estado inicial: no es favorita
    expect(result.current.mias.get(10)?.is_favorite).toBe(false);

    // Usuario marca como favorita
    act(() => {
      result.current.marcarFavorito(10, true);
    });

    // Se actualiza en caliente inmediatamente
    expect(result.current.mias.get(10)?.is_favorite).toBe(true);
    // Y solicita recarga en segundo plano a la API
    expect(reloadMock).toHaveBeenCalledTimes(1);

    // Usuario desmarca la favorita
    act(() => {
      result.current.marcarFavorito(10, false);
    });

    expect(result.current.mias.get(10)?.is_favorite).toBe(false);
    expect(reloadMock).toHaveBeenCalledTimes(2);
  });
});

