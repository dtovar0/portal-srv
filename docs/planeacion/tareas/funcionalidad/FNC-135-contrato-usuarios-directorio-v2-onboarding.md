# FNC-135 — Contrato `usuarios-directorio` v2: contraseña inicial, política, estado de credenciales y reenvío

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend (proveedor del contrato; solo `docs/contratos/`) |
| **Agente** | desarrollador |
| **Fase** | 8 (propuesta: onboarding y OIDC) |
| **Módulo / Área** | contratos (usuarios) |
| **Prioridad** | Alta |
| **Estatus** | Propuesta |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | |
| **Finalizada** | |
| **Estatus Git** | — |
| **Rama** | `fnc/FNC-135-contrato-onboarding` |
| **Commits / PR** | |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (contraseñas) |

## Contexto
- `docs/contratos/usuarios-directorio.md` v1: `password` → `400 campo_no_permitido` (P8).
- ADR-008 cambia P8; backend (FNC-138) y web (FNC-139) necesitan el acuerdo antes de implementar.

## Objetivo
- Publicar la v2 del contrato y aprobarla con el dueño antes de FNC-138 y FNC-139.

## Alcance
- **Incluye:**
  - `POST /users/directory`: `password` obligatorio (política), respuesta con `credentials_status`.
  - `GET /users/password-policy` (o equivalente): `min_length`, `max_length`, clases requeridas, símbolos permitidos; lo lee el generador web.
  - `credentials_status` en `ManagedUser`: `enviadas` \| `pendientes` \| `null` (cuentas sin onboarding); fecha del último envío.
  - `POST /users/<id>/credentials` (reenviar): permisos por rol, `202`/`200`, errores (`409` cuenta no `ldap`, `503`).
  - Errores: `422 validacion` con `fields.password` (mensaje de política), `503 gestor_no_disponible` no aplica al alta (queda pendiente, no falla).
  - Fila P8 de `docs/contratos/README.md` e índice de versiones; Historial del contrato.
- **No incluye:** implementación; contrato de autenticación (FNC-140); cambios en `conectores-y-ejecuciones` (ADR-008 3B no lo toca).

## Archivos previstos
- `docs/contratos/usuarios-directorio.md`, `docs/contratos/README.md`

## Reutilización
- Convenciones comunes de `docs/contratos/README.md` (errores, lista blanca, refresco).

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| Forma `ManagedUser` (+`credentials_status`) | contrato | `users/serializacion.py` (`usuario_gestionado`: `users/api.py`, `api/routes.py`); web: `lib/types.ts`, `lib/access/types.ts`, `users-list`, `user-card`, `user-form`, `user-access-panel`, `area-admins-panel`, `platform-access-panel`, `admin-role-dialog`, `directory-account-form`, `lib/access/mocks.ts` | ☐ |
| `POST /users/directory` (`password` pasa a obligatorio) | contrato | `DirectoryAccountForm` (Usuarios → Nuevo) | ☐ |

## Variables y configuración
- Ninguna en esta tarea (las nombra FNC-138).

## Criterios de aceptación
- [ ] v2 con versión y fecha, cambio **incompatible** marcado (campo antes prohibido ahora obligatorio) y aprobación del dueño registrada.
- [ ] Tabla de permisos por rol de cada endpoint nuevo, alineada con SEC-AUTHZ-06 (o con su cambio aprobado; ver preguntas de ADR-008).
- [ ] Ejemplos sin contraseñas reales ni IPs; datos simulados para la web.
- [ ] Sección Refresco: sin polling; lectura al cargar y tras escrituras propias (lineamiento 11: el estado cambia en el worker, pero el volumen es bajo y lo consulta un admin).
- [ ] Revisado por `auditor-seguridad` (contraseña en el cuerpo, nunca en respuestas).

## Impacto cruzado
- Origen ← ADR-008
- Genera → FNC-138 (proveedor), FNC-139 (consumidor)
- Depende de → aprobación de ADR-008

## Riesgos y reversión
- Contrato incompatible: el alta actual del cliente deja de funcionar sin `password` → FNC-138 y FNC-139 se integran juntas.

## Verificación

## Veredictos
| Agente | Veredicto | Fecha |
|---|---|---|
| tester | | |
| revisor | | |
| auditor-seguridad | | |

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-11-17 | Creada (decisiones del dueño A, 2026-11-17) |
