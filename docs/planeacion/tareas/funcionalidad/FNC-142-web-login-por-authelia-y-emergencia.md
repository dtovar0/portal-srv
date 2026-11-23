# FNC-142 — Web: entrada por Authelia (OIDC), pantalla de acceso de emergencia y cierre de sesión

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad (flujo con componentes existentes; el diseño visual lo hace el dueño al final) |
| **Plataforma** | web |
| **Agente** | desarrollador |
| **Fase** | 8 (propuesta) |
| **Módulo / Área** | auth (web) |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | |
| **Finalizada** | |
| **Estatus Git** | Rama `fnc/FNC-141-oidc-authelia` (commit local, sin push) |
| **Rama** | `fnc/FNC-142-web-login-oidc` |
| **Commits / PR** | |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (autenticación en el cliente) |

## Contexto
- `frontend/src/components/login-form.tsx`: formulario de correo y contraseña con «directorio/local» y botón SSO por cabeceras (`api.ssoLogin`).
- `frontend/src/lib/api.ts:256-266`: `authContext`, `ssoLogin`, `login(method)`, `logout`.
- `frontend/src/components/logout-view.tsx`: ya sigue `redirect`.

## Objetivo
- `/login` ofrece solo «Entrar con Authelia»; la cuenta de emergencia entra por una ruta aparte.

## Alcance
- **Incluye:**
  - `/login`: botón «Entrar con Authelia» (navegación completa a `/api/v1/auth/oidc/login`); errores del callback (`?error=`) con mensaje genérico; con sesión, redirige a `/`.
  - Nueva ruta `/acceso-emergencia` (o la que fije el contrato): formulario de correo y contraseña contra `POST /auth/local`; visibilidad según ADR-009 6.
  - Cliente y tipos: `AuthContext` nuevo, `loginLocal`, retiro de `ssoLogin` y `login(method)`.
  - `logout-view.tsx`: sin cambios de flujo salvo textos («Con SSO» → Authelia) si el contrato cambia la forma.
  - Desarrollo: el rewrite de `/api` (FNC-005) cubre `/api/v1/auth/oidc/*`; verificar que la cookie se fija en el mismo origen.
- **No incluye:** backend (FNC-141); nginx (FNC-143); rediseño visual de la pantalla.

## Archivos previstos
- `frontend/src/components/login-form.tsx`, nuevo `frontend/src/components/acceso-emergencia-form.tsx`, nueva `frontend/src/app/acceso-emergencia/page.tsx`
- `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts`
- `frontend/tests/components/` (login y emergencia)

## Reutilización
- `PageHeader`, `Card`, `Button`, `Field`, `TextInput`, `ErrorNote`, `Spinner`, `Icono`, `LogoutView`; el formulario de emergencia reutiliza el bloque de credenciales que hoy está en `login-form.tsx` (se mueve, no se copia).

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| `AuthContext` | tipo | `login-form.tsx`, `lib/api.ts` | ☐ |
| `api.login` / `api.ssoLogin` (retiro) | funciones | `login-form.tsx` | ☐ |
| `LoginForm` | componente | `app/login/page.tsx` | ☐ |
| Rutas públicas sin marco (`/login`, `/logout` + `/acceso-emergencia`) | configuración | `layout.tsx`/`marco.tsx` si distinguen rutas públicas; `session-provider` (redirección a `/login`) | ☐ |

## Variables y configuración
- Ninguna.

## Criterios de aceptación
- [ ] `/login` sin campos de contraseña; un solo botón que inicia el flujo; error del callback visible sin detalles técnicos.
- [ ] `/acceso-emergencia` funciona con la cuenta de emergencia y muestra la respuesta única en cualquier fallo.
- [ ] Cerrar sesión lleva al cierre de Authelia cuando el backend lo devuelve.
- [ ] Sin tokens ni parámetros del callback en `localStorage`, consola ni historial (la URL de error se limpia).
- [ ] Verificada en tema claro y oscuro, en móvil y escritorio, y en los estados de carga, vacío y error
- [ ] Pruebas mínimas del lineamiento de pruebas, ejecutadas (Vitest, typecheck, lint)
- [ ] Cumple `docs/estandarizacion/` y no duplica código existente; solo tokens, sin estilos inline
- [ ] Sin direcciones IP ni secretos
- [ ] Cierra con `auditor-accesibilidad` y `auditor-seguridad`

## Impacto cruzado
- Origen ← FNC-141
- Depende de → FNC-140 (contrato; se puede empezar con mocks), FNC-141 (integración)

## Riesgos y reversión
- `login-form.tsx` tiene cambios sin commit de otra sesión: coordinar antes de empezar.
- Reversión junto con FNC-141.

## Verificación
| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | salida 0 |
| `npx vitest run tests/components/auth tests/lib/api.test.ts` | 17 passed |
| `npx next lint` | sin errores; avisos previos ajenos a esta tarea |

- Pruebas (`tests/components/auth/login-oidc.test.tsx`): botón que navega a `/api/v1/auth/oidc/login`, sin campos de contraseña ni enlace a emergencia, OIDC sin configurar, redirección con sesión, error del callback por toast y URL limpia, código desconocido genérico, formulario de emergencia (éxito y fallo único), logout hacia la URL de Authelia.
- No verificado: contra un backend y un Authelia reales; tema claro/oscuro y móvil en navegador (solo componentes y tokens existentes, sin estilos nuevos); `auditor-accesibilidad` y `auditor-seguridad` pendientes.
- Retirados: `ssoLogin`, `login(method)`, campos `sso_*` y `ldap_available`.

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
| 2026-11-17 | Creada (decisiones del dueño B, 2026-11-17) |
| 2026-11-18 | Implementada sobre la rama de FNC-141 (integración con el backend); sin Authelia real |
