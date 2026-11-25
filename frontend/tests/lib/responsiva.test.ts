/** DIS-127: la responsiva aplica con un acceso aprobado aunque siga en proceso. */
import { describe, expect, it } from 'vitest';
import { responsivaAplica } from '@/lib/access/responsiva';
import type { CatalogItem } from '@/lib/access/types';

function item(estado: CatalogItem['my_access_status']): CatalogItem {
  return {
    platform: { id: 1, name: 'tacacs', description: '', icon: 'plataformas' },
    area: { id: 1, name: 'Packet' },
    my_level: estado ? 'usuario' : null,
    my_access_status: estado,
    pending_request_id: null,
    can_request: false,
    requestable_levels: [],
  } as CatalogItem;
}

describe('responsivaAplica', () => {
  it('acceso aprobado en proceso (esperando la firma) → aplica (regresión del bloqueo)', () => {
    expect(responsivaAplica([item('en_proceso')], new Map())).toBe(true);
  });
  it('acceso activo → aplica', () => {
    expect(responsivaAplica([item('activo')], new Map())).toBe(true);
  });
  it('sin accesos, o solo fallidos/revocados → no aplica', () => {
    expect(responsivaAplica([item(null)], new Map())).toBe(false);
    expect(responsivaAplica([item('fallido'), item('revocado')], new Map())).toBe(false);
  });
  it('con plataformas abribles → aplica', () => {
    expect(responsivaAplica([], new Map([[1, {}]]))).toBe(true);
  });
});
