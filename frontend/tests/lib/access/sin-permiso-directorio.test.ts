import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { MENSAJE_SIN_PERMISO_EN_DIRECTORIO } from '@/lib/access/sin-permiso-directorio';
import { describeDirectoryAccountError } from '@/components/users/directory-account-errors';
import { describeRoleError } from '@/components/users/admin-role-errors';

// DIS-135: `503 sin_permiso_en_directorio` (FNC-206) no se confunde con una caída.
const sinPermiso = () =>
  new ApiError(503, 'texto del servidor', { code: 'sin_permiso_en_directorio' });

describe('sin_permiso_en_directorio (DIS-135)', () => {
  it('alta de cuenta del directorio: mensaje de permisos, no «intenta más tarde»', () => {
    const vista = describeDirectoryAccountError(sinPermiso());
    expect(vista.message).toBe(MENSAJE_SIN_PERMISO_EN_DIRECTORIO);
  });

  it('cambio de rol: mensaje de permisos', () => {
    expect(describeRoleError(sinPermiso()).message).toBe(MENSAJE_SIN_PERMISO_EN_DIRECTORIO);
  });

  it('una caída sigue con su mensaje', () => {
    const caida = new ApiError(503, 'x', { code: 'directorio_no_disponible' });
    expect(describeDirectoryAccountError(caida).message).toContain('intenta más tarde');
  });
});
