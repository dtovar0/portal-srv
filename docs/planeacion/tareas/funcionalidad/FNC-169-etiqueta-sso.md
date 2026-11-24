# FNC-169 — Etiqueta del origen de cuenta (`sso`)

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Pedido del dueño (2026-11-24): las cuentas creadas en el portal viven en LDAP y entran por Authelia; deben ser `sso` (servidor en FNC-168). La interfaz solo reconocía `ldap`.

## Cambios
- `src/lib/origen-cuenta.ts` (nuevo): `ORIGENES_DEL_DIRECTORIO`, `esCuentaDelDirectorio`, `etiquetaOrigen`.
- `users-list.tsx`, `users/user-card.tsx`, `users/user-form.tsx` la reutilizan (se retira la constante local de FNC-166).

## Pruebas
- `tests/lib/origen-cuenta.test.ts`. Suites de usuarios: 87 passed.

## Verificación
- `tsc` 0, `eslint` 0/0, `next build` 0.

## Impacto
| Elemento | Usado en | ¿Validado? |
|---|---|---|
| `lib/origen-cuenta.ts` (nuevo) | lista, tarjeta y formulario de usuarios | Sí, pruebas de usuarios |
