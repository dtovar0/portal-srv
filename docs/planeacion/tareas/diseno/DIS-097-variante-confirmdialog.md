# DIS-097 — `ConfirmDialog`: variante del botón de confirmar según el tipo

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 8 |
| **Módulo / Área** | componentes (global) |
| **Prioridad** | Baja |
| **Estatus** | Hecha |
| **Rama** | `dis/DIS-097-variante-confirmdialog` (creada desde `dis/DIS-096-botones-deshabilitados-accesibles` solo para no chocar en TABLERO, CHANGELOG y log; no comparten archivos de código) |
| **Creada** | 2026-11-18 |
| **Aprobada** | 2026-11-18, por el dueño (modo autónomo: decisiones marcadas «del orquestador, pendiente de validar») |
| **Origen** | Auditoría de accesibilidad de FNC-139 |

## Objetivo
- El botón de confirmar de `ConfirmDialog` era siempre de peligro, también en acciones no destructivas (Reenviar credenciales); ahora la variante sale del `type`.

## Criterios de aceptación
- [x] Sin `confirmVariant="danger"` fijo: peligro solo para `type` `aviso` (valor por defecto) y `error`; el resto, primario
- [x] Prop opcional `variant` ('primary' | 'danger') que prevalece sobre el tipo
- [x] Usos revisados uno a uno (tabla abajo)
- [x] Regresión que falla primero: `ConfirmDialog` no destructivo sin clase de peligro

## Usos revisados
| Uso | `type` | Resultado |
|---|---|---|
| Eliminar áreas (`areas-list`), usuarios (`users-list`), plataformas y áreas (`platform-admin`) | por defecto `aviso` | peligro (sin cambio) |
| Vaciar notificaciones, Purgar cuentas, Quitar administradores | por defecto `aviso` | peligro (sin cambio) |
| Reenviar credenciales (`users-list`) | `pregunta` | primario (**cambia**; antes peligro) |

## Decisiones del orquestador (pendiente de validar)
- El valor por defecto de `AlertDialog` para `pregunta` es peligro (`TYPE_CONFIG`); no se cambió porque lo usan otros diálogos (aprobar, etc.): la decisión vive solo en `ConfirmDialog`.
- Lista `TIPOS_DESTRUCTIVOS = ['aviso', 'error']` en `form.tsx`; un tipo nuevo no es destructivo salvo que se agregue.
- El encabezado del diálogo sigue la variante (degradado de error con peligro; de advertencia con `pregunta` y primario): Reenviar pasa a encabezado de advertencia. No verificado visualmente.

## Impacto en elementos compartidos (validar)
- `ConfirmDialog` (`components/form.tsx`, prop `variant` opcional): lo usan areas-list, users-list, platform-admin (2), notifications-list, purge-panel y area-admins-panel. Solo cambia el botón y el encabezado de **Reenviar credenciales**; los demás conservan peligro por usar `type` por defecto.
- `AlertDialog`, `Button`, tokens: sin cambios.
- `impacto.py` (2026-11-18): marca `ConfirmDialog` (sus 6 usos, listados arriba y verificados) y falsos positivos por nombres genéricos en pruebas.

## Verificación (2026-11-18, en `frontend/`)
- Regresión que falló primero: `confirmdialog-variante.test.tsx` (2 de 5 fallaban antes del cambio: `pregunta` e `info`).
- Prueba de `users-list` ampliada: el confirmar de «Reenviar» no tiene `nexus-btn-danger`.
- `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`: vitest 0 (92 archivos, 2783 pruebas), tsc 0, lint 0, build 0.
- No verificado: Chromium (claro/oscuro) del diálogo de Reenviar. Contraste: el botón primario y el encabezado de advertencia ya estaban en uso y medidos por las pruebas de contraste existentes (`tests/accesibilidad`).

## Bitácora
- 2026-11-18: implementada y cerrada en modo autónomo.
