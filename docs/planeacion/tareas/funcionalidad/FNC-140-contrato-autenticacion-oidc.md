# FNC-140 — Contrato `autenticacion` v1: OIDC con Authelia y ruta de emergencia

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend (proveedor del contrato; solo `docs/contratos/`) |
| **Agente** | desarrollador |
| **Fase** | 8 (propuesta) |
| **Módulo / Área** | contratos (auth) |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | |
| **Finalizada** | |
| **Estatus Git** | Rama `fnc/FNC-140-contrato-autenticacion` (commit local, sin push) |
| **Rama** | `fnc/FNC-140-contrato-autenticacion` |
| **Commits / PR** | |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (autenticación) |

## Contexto
- `/api/v1/auth/*` (`context`, `sso`, `login`, `logout`) no tiene contrato en `docs/contratos/`; la web lo consume en `lib/api.ts:256-266` y `login-form.tsx`.
- ADR-009 cambia el flujo.

## Objetivo
- Contrato nuevo `docs/contratos/autenticacion.md` aprobado antes de FNC-141 y FNC-142.

## Alcance
- **Incluye:**
  - `GET /auth/context`: `oidc_enabled`, `authenticated`, `emergency_available` (se retiran `sso_enabled`, `sso_user`, `ldap_available`).
  - `GET /auth/oidc/login` (302 a Authelia) y `GET /auth/oidc/callback` (302 al portal o a `/login?error=<codigo>`); códigos de error sin detalle.
  - `POST /auth/local` (cuenta de emergencia): cuerpo, respuesta única de fallo (SEC-AUTH-09).
  - `POST /auth/logout`: `{status, redirect}` con la URL de cierre de Authelia.
  - Retirados: `POST /auth/sso` y `method=directory` en `POST /auth/login` (`410 endpoint_retirado` o 404, a decidir en el contrato); fila en «Endpoints retirados» del README.
  - Índice de `docs/contratos/README.md`.
- **No incluye:** implementación; configuración de Authelia (FNC-143).

## Archivos previstos
- `docs/contratos/autenticacion.md` (plantilla `~/.claude/plantillas/coordinacion/CONTRATO.md`), `docs/contratos/README.md`

## Reutilización
- Convenciones comunes del README de contratos.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| Forma de `/auth/context` (`AuthContext`) | contrato | `login-form.tsx`, `lib/types.ts`, `lib/api.ts`; `tests/test_humo.py` | ☐ |
| `/auth/logout` | contrato | `logout-view.tsx` (menú de usuario y paleta «Cerrar sesión» enlazan a `/logout`) | ☐ |

## Variables y configuración
- Ninguna en esta tarea.

## Criterios de aceptación
- [ ] Tabla por endpoint: público o con sesión, respuestas y errores; sin tokens en respuestas ni URLs del portal.
- [ ] `state`, `nonce` y `code_verifier` documentados como datos de sesión del servidor, nunca expuestos.
- [ ] Datos simulados para la web.
- [ ] Aprobado por el dueño; revisado por `auditor-seguridad`.

## Impacto cruzado
- Origen ← ADR-009
- Genera → FNC-141, FNC-142
- Depende de → aprobación de ADR-009

## Riesgos y reversión
- Contrato incompatible con la pantalla de login actual: FNC-141 y FNC-142 se integran juntas.

## Verificación
- Solo documentación: `docs/contratos/autenticacion.md` v1 y su fila en el README de contratos; sin código ni pruebas. Se implementa y prueba en FNC-141 (backend) y FNC-142 (web). Sin Authelia real.

## Veredictos
| Agente | Veredicto | Fecha |
|---|---|---|
| tester | | |
| revisor | | |
| auditor-seguridad | | |

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-11-17 | Creada (decisiones del dueño B, 2026-11-17) |
| 2026-11-18 | Contrato v1 escrito; códigos de error del callback, 410 para /auth/sso y /auth/login |
