# DIS-135 — Mensaje para `sin_permiso_en_directorio`

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- Pendiente web de FNC-206: el backend responde `503 sin_permiso_en_directorio` cuando la cuenta de servicio no tiene permiso en LDAP; la web lo mostraba como «intenta más tarde».

## Cambios
- `lib/access/sin-permiso-directorio.ts`: `MENSAJE_SIN_PERMISO_EN_DIRECTORIO` (un solo texto).
- `users/directory-account-errors.ts` (alta de cuenta del directorio) y `users/admin-role-errors.ts` (cambio de rol): mensaje por código.
- Sin cambio: autoservicio muestra el texto del servidor (ya es el nuevo); la prueba de conexión de Ajustes solo lee.

## Pruebas
- `tests/lib/access/sin-permiso-directorio.test.ts` (3; 2 fallaban sin el cambio). Vitest 3557/3557; tsc, lint y build en 0.
