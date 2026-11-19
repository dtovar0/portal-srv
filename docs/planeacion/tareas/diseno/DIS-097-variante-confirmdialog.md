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

## Correcciones de la auditoría de accesibilidad independiente (2026-11-19)
- B1 (bloqueante): encabezado de aviso/pregunta con texto blanco sobre ámbar 2,15:1. Token nuevo `--color-texto-sobre-aviso` (`--p-noche-900` en claro y oscuro; utilidad `texto-sobre-aviso`) para título, icono y cerrar. Medido: título 8,43:1; cerrar al 80% 5,86:1; con el degradado al 95%: 8,74:1 claro, 7,72:1 oscuro.
- B2 (preexistente): encabezado de error con `error` (239 68 68) y blanco 3,76:1. Ahora relleno `error-solid` (220 38 38): título 4,83:1; cerrar al 80% 3,52:1 (no textual, 3:1); degradado al 95%: 4,59:1 claro, 5,20:1 oscuro.
- Pares nuevos en `tests/accesibilidad/pares-contraste.ts` (`alert-aviso/*`, `alert-error/*`, en los 3 contextos de tema), token en `tokens-completitud` y registro en `VARIABLES.md`.
- Regresión: `tests/components/alert-dialog-encabezado.test.tsx` (4 pruebas; fallaban antes) y 3 pares de aviso que fallaban por token inexistente.
- `AlertDialog` es compartido (`alert-dialog.tsx`): cambia solo el color de texto del encabezado de aviso/pregunta y el relleno del de peligro; lo usan `ConfirmDialog`, aprobar, rechazar, eliminar conector y demás diálogos.
- Propuesta DIS-098: `Modal` compartido con ✕ que no cierra (M7).

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
