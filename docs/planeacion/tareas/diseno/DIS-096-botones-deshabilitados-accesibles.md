# DIS-096 — Botones deshabilitados de las barras con motivo accesible

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 8 |
| **Módulo / Área** | componentes (global) |
| **Prioridad** | Baja |
| **Estatus** | Hecha |
| **Rama** | `dis/DIS-096-botones-deshabilitados-accesibles` |
| **Creada** | 2026-11-18 |
| **Aprobada** | 2026-11-18, por el dueño (modo autónomo: decisiones marcadas «del orquestador, pendiente de validar») |
| **Origen** | Auditoría de accesibilidad de FNC-139 |

## Objetivo
- El motivo por el que una acción de barra está deshabilitada llega al teclado y al lector de pantalla (hoy solo en `title`, y con `disabled` nativo el botón ni recibe foco).

## Criterios de aceptación
- [x] `Button` acepta `motivoDeshabilitado`: con `disabled` queda `aria-disabled="true"`, enfocable, sin ejecutar el clic y con la misma apariencia deshabilitada
- [x] Motivo asociado con `aria-describedby` (se conserva el del llamador) y sin `title` duplicado
- [x] Motivo visible al foco (`:focus-visible`) y con el puntero, descartable con Esc (WCAG 1.4.13); solo tokens de tooltip
- [x] Aplicado en las barras de áreas (4 botones), usuarios (5), plataformas (3) y conectores (2)
- [x] Sin motivo, `disabled` sigue siendo nativo (envíos en curso, paginadores, etc.)
- [x] Pruebas de regresión (fallaban antes) y contraste medido

## Decisiones del orquestador (pendiente de validar)
- API en el componente compartido (`motivoDeshabilitado`) en vez de repetir sr-only en cada barra; reemplaza el patrón sr-only de «Eliminar» en áreas (DIS-089) y su id fijo `areas-eliminar-motivo`.
- Se activa solo si hay `disabled` **y** motivo: así no cambia ningún botón que hoy deba quedar nativo.
- «Nuevo» de plataformas (`disabled` por áreas cargando o sin áreas) queda nativo: no tiene un texto de motivo definido; proponerlo si el dueño lo quiere.
- Se agregó el motivo «No tienes permisos para editar esta área» (antes «Editar» deshabilitado por permisos no tenía motivo).
- El motivo se ancla a la derecha del botón (`right: 0`, máx. 18 rem) por estar las barras a la derecha; no verificado en móvil muy estrecho.

## Impacto en elementos compartidos (validar)
- `Button` (`components/button.tsx`, prop nueva opcional; sin ella nada cambia): lo usan ~58 archivos; solo cambia el comportamiento en los botones que reciben `motivoDeshabilitado`.
- Vistas con botones afectados: Áreas (`areas-list`), Usuarios (`users-list`), Plataformas (`platform-admin`), Conectores (`connectors-admin`).
- CSS nuevo `.nexus-btn-con-motivo` / `.nexus-motivo-boton` en `components.css`; sin tokens nuevos (usa `--color-tooltip-*`).
- `impacto.py` (2026-11-18): `Button` (usado en 58 archivos de `frontend/src` y `frontend/tests`, sin cambio de comportamiento sin la prop nueva). El resto de filas de la tabla son falsos positivos por nombres genéricos (`abrir`, `boton`, `icono`, `tarjeta`, `dialogo`) o elementos de DIS-097 en el árbol de trabajo.

## Verificación (2026-11-18, en `frontend/`)
- Regresión que falló primero: `boton-deshabilitado-accesible.test.tsx` (4 de 7 fallaban antes del cambio).
- `npx vitest run`: 0 (92 archivos, 2783 pruebas). `npx tsc --noEmit`: 0. `npm run lint`: 0 (solo advertencias previas). `npm run build`: 0.
- Pruebas existentes de las barras migradas de `.disabled`/`title` a `aria-disabled`/`aria-describedby` (areas-list, users-list, platform-admin, connectors-admin).
- Contraste medido (`tests/accesibilidad/motivo-boton-deshabilitado.test.ts`): motivo (tooltip) 17,32:1 claro y 13,57:1 oscuro (AA 4,5). Estado deshabilitado, texto/fondo: 2,38:1 claro y 3,80:1 oscuro; exento de WCAG 1.4.3 (componente inactivo), sin cambios respecto a hoy.
- No verificado: Chromium (claro/oscuro, móvil, posición del motivo), lector de pantalla real.

## Bitácora
- 2026-11-18: implementada y cerrada en modo autónomo.
