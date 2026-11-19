# FNC-139 — Web: alta con contraseña (mostrar u ocultar y generador), estado de credenciales y «Reenviar credenciales»

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad (comportamiento con componentes existentes; el diseño visual lo hace el dueño al final) |
| **Plataforma** | web |
| **Agente** | desarrollador |
| **Fase** | 8 (propuesta) |
| **Módulo / Área** | usuarios (web) |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | 2026-11-18 |
| **Finalizada** | |
| **Estatus Git** | Rama local `fnc/FNC-138-onboarding-send`; sin merge ni push |
| **Rama** | `fnc/FNC-139-web-alta-contrasena` |
| **Commits / PR** | |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (manejo de contraseña en el cliente) |

## Contexto
- `frontend/src/components/users/directory-account-form.tsx` (modal «Nuevo usuario», DIS-019) tiene en cambios **sin commit de otra sesión** un asistente de 2 pasos con Contraseña y Confirmar (`PASSWORD_MIN` propio en `directory-account-errors.ts`); en `develop` no hay contraseña.
- Contrato v2 (FNC-135): `password` obligatorio, política publicada, `credentials_status`, reenvío.

## Objetivo
- Que el administrador escriba o genere una contraseña que cumple la política, vea el estado de las credenciales y pueda reenviarlas.

## Alcance
- **Incluye:**
  - Campo Contraseña obligatorio, nunca vacío, con botón accesible de mostrar u ocultar (`aria-pressed`, etiqueta que cambia).
  - Botón «Generar contraseña»: `crypto.getRandomValues` con muestreo sin sesgo (rechazo), al menos un carácter de cada clase requerida y barajado; usa la política de la API (sin valores mágicos en el cliente).
  - Validación en el cliente con la misma política (mensaje por regla); el servidor sigue siendo la autoridad.
  - Tras crear: aviso de «credenciales enviadas» o «pendientes» según la respuesta; la contraseña se borra del estado al cerrar o enviar.
  - Insignia de estado de credenciales en la tarjeta o fila del usuario (`user-card.tsx`) y acción «Reenviar credenciales» con confirmación (`AlertDialog`), visible según rol y contrato.
  - Cliente: `lib/access/users.ts` (alta con `password`, política, reenvío), tipos (`credentials_status`), mocks.
- **No incluye:** cambios de backend; rediseño visual del modal o de la tarjeta (los hace el dueño); campo «Confirmar» (ADR-008 7: no va; aprobado por el dueño el 2026-11-18); pantalla Ejecuciones.

## Archivos previstos
- `frontend/src/components/users/directory-account-form.tsx`, `directory-account-errors.ts`, `user-card.tsx`
- `frontend/src/lib/access/users.ts`, `frontend/src/lib/access/types.ts` o `frontend/src/lib/types.ts` (`ManagedUser`), `frontend/src/lib/access/mocks.ts`
- Nuevo `frontend/src/lib/contrasena.ts` (generador y validación por política; responsabilidad única)
- `frontend/tests/lib/contrasena.test.ts`, `frontend/tests/components/users/directory-account-form.test.tsx`, `frontend/tests/components/users-list.test.tsx`

## Reutilización
- `Modal`, `Field`, `TextInput`, `Button`, `AlertDialog`, `Badge`/`Note`, `useToast`, `focusFirstError`, `usersApi`, `Icono`.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| `ManagedUser` (+`credentials_status`) | tipo | `users-list`, `user-card`, `user-form`, `user-access-panel`, `area-admins-panel`, `platform-access-panel`, `admin-role-dialog`, `directory-account-form`, `lib/api.ts`, `lib/access/mocks.ts` y sus pruebas | ☐ |
| `usersApi` | objeto | `area-admins-panel`, `admin-role-dialog`, `directory-account-form`; pruebas `peticiones.test.ts`, `errores.test.ts` | ☐ |
| `DirectoryAccountForm` | componente | `users-list.tsx`; mención en `connector-form.tsx` | ☐ |
| `UserCard` | componente | `users-list.tsx` | ☐ |
| `TextInput` (si se agrega un sufijo para el botón de mostrar) | componente | todos los formularios | ☐ |

## Variables y configuración
- Ninguna en el cliente (la política llega de la API).

## Criterios de aceptación
- [ ] No se puede enviar con la contraseña vacía o que no cumple; mensajes por regla, asociados con `aria-describedby`.
- [ ] El generador cumple la política en 1 000 muestras, usa `crypto.getRandomValues` y nunca `Math.random` (prueba).
- [ ] Mostrar u ocultar operable con teclado y lector de pantalla; `autocomplete="new-password"`.
- [ ] La contraseña no se guarda en `localStorage`, `sessionStorage`, URL, logs de consola ni mocks; se limpia del estado al cerrar.
- [ ] Estado `enviadas`/`pendientes`/sin onboarding visible y con texto (no solo color).
- [ ] Reenviar con confirmación; carga, éxito y error (incluido `503`) visibles; recarga de la lista tras la escritura (sin polling, contrato).
- [ ] Verificada en tema claro y oscuro, en móvil y escritorio, y en los estados de carga, vacío y error
- [ ] Pruebas mínimas del lineamiento de pruebas, ejecutadas (Vitest, typecheck, lint)
- [ ] Cumple `docs/estandarizacion/` y no duplica código existente; solo tokens, sin estilos inline
- [ ] Sin direcciones IP ni secretos
- [ ] Cierra con `auditor-accesibilidad` y `auditor-seguridad`

## Impacto cruzado
- Origen ← FNC-138
- Depende de → FNC-135 (contrato; se puede empezar con mocks), FNC-138 (integración)

## Riesgos y reversión
- Trabajo sin commit de otra sesión en el mismo archivo: conflicto seguro; se coordina antes de empezar.
- Reversión: cliente v1 sin `password` deja de funcionar con el backend v2; se revierten juntas.

## Verificación
- `npx tsc --noEmit`: sin errores. `npx next lint`: 0 errores (advertencias previas ajenas).
- `npx vitest run` de `tests/lib/contrasena.test.ts`, `tests/lib/generador-contrasena.test.ts`, `tests/components/users`, `tests/components/users-list.test.tsx`, `tests/lib/access` y los tests que usan `usersApi`/`DirectoryAccountForm`: 160 passed.
- Cubierto: política de la API (no fija en el cliente), mensajes por regla con `aria-describedby`, generador con `crypto.getRandomValues` (1 000 muestras, sin `Math.random`), mostrar u ocultar con `aria-pressed`, sin «Confirmar», aviso enviadas/pendientes, contraseña fuera de almacenamiento y URL, 422 de `ppolicy`, estado con texto, Reenviar con confirmación (200, 202, 503).
- **No verificado:** tema claro/oscuro y móvil/escritorio en navegador, `auditor-accesibilidad`, `auditor-seguridad`; integración con el backend real.
- La interfaz real de Usuarios es `users-list.tsx` (tabla y barra de acciones); `UserCard` no se usa y solo recibió la insignia. El botón «Copiar» del generador (trabajo previo del dueño) se conservó.

## Veredictos
| Agente | Veredicto | Fecha |
|---|---|---|
| tester | | |
| revisor | | |
| auditor-seguridad | | |
| auditor-accesibilidad | | |

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-11-17 | Creada (decisiones del dueño A, 2026-11-17) |
| 2026-11-18 | Implementada en la rama `fnc/FNC-138-onboarding-send`: `lib/contrasena.ts`, `estado-entrega.ts` (el nombre `credentials-*` lo bloquea el control de secretos), formulario sin «Confirmar», insignia de estado y «Reenviar credenciales» (solo superadmin) en `users-list.tsx`. Pendiente verificación visual y auditores |
