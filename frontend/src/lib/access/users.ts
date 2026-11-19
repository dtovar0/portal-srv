/**
 * Usuarios del gestor: áreas administradas (`docs/contratos/areas-y-roles.md`)
 * y alta en OpenLDAP con contraseña inicial, política y reenvío de credenciales
 * (`docs/contratos/usuarios-directorio.md` v2). El alta local
 * y la edición siguen en `api.createUser` / `api.updateUser` de `lib/api.ts`.
 */

import { accessRequest } from './client';
import { MOCK_PASSWORD_POLICY, MOCK_USER } from './mocks';
import { jsonBody } from './query';
import type { DirectoryAccountInput, PasswordPolicyResult, UserWriteResult } from './types';

export const usersApi = {
  /** Reemplaza las áreas que administra un `admin_area`. Solo superadmin. */
  setManagedAreas: (userId: number, areaIds: number[]) =>
    accessRequest<UserWriteResult>(
      `/users/${userId}/managed-areas`, jsonBody('PUT', { area_ids: areaIds }),
      () => ({ status: 'success', user: { ...MOCK_USER, id: userId, role: 'admin_area' } })),

  /** Política de la contraseña inicial (la usan el generador y la validación del alta). */
  passwordPolicy: () =>
    accessRequest<PasswordPolicyResult>(
      '/users/password-policy', undefined,
      () => ({ status: 'success', policy: MOCK_PASSWORD_POLICY })),

  /** Crea la cuenta en el directorio y en el portal con su contraseña inicial (rol `usuario`). */
  createDirectoryAccount: (input: DirectoryAccountInput) =>
    accessRequest<UserWriteResult>(
      '/users/directory', jsonBody('POST', input),
      () => ({ status: 'success', user: { ...MOCK_USER, email: input.email } })),
};
