# FNC-166 — Contraseña de cuentas `sso` en el formulario; typecheck y lint limpios

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Rama** | `fnc/FNC-166-formulario-y-typecheck` |
| **Contrato** | `docs/contratos/areas-y-roles.md` v3.1 (FNC-165) |

## Contexto
- Pedido del dueño (2026-11-24): errores al compilar, no puede cambiar la contraseña de un usuario y limpiar las advertencias.

## Cambios
- `users/user-form.tsx`: `ORIGENES_EN_DIRECTORIO = ['ldap', 'sso']` decide si el superadmin ve el campo.
- `tests/components/platforms-shell.test.tsx`: `Session.id`, `PlatformsSidebarView` sin props retiradas, `CatalogItem` tipado, sin `any`.
- `any` → `never` en 4 pruebas; imports, constantes, variables y props sin uso retirados en 13 archivos de `src` y 10 de pruebas (las props siguen en el tipo: los llamadores no cambian); `solicitudes` en `useMemo` (`user-requests-table.tsx`); `layout.tsx`: `no-page-custom-font` desactivada en la línea con su motivo (falso positivo en el layout raíz del App Router).

## Pruebas
- `user-form.test.tsx`: `cuenta sso, superadmin` (falló sin el cambio) y `cuenta sso, admin de área: sin campo`.

## Verificación
- `tsc --noEmit`: 0. `eslint .`: 0 errores, 0 advertencias. `next build`: código 0.
- `vitest run`: 66 fallas, **las mismas 66 en `develop`** (pruebas de accesibilidad y otras preexistentes); ninguna nueva.
- auditor-accesibilidad: sin fallas confirmadas (contraste no medido; estilo existente).

## Impacto en elementos compartidos
| Elemento | Usado en | ¿Validado? |
|---|---|---|
| `UserForm` | `users-list.tsx` | Sí, pruebas del formulario |
| Props retiradas de la desestructuración (`onVolver`, `onVolverPlataformas`, `session` de `ModalResponsiva`) | llamadores en `platforms-*` | Sí: siguen en el tipo; `tsc` en 0 |

## Bitácora
- 2026-11-24: diagnóstico, regresión en rojo, arreglo, limpieza de lint, cierre.
