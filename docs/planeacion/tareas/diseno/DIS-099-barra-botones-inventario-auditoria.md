# DIS-099 — Barra de botones de Inventario y Auditoría

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-099-barra-botones-inventario-auditoria` |

## Contexto
- Trabajo de otro agente a pedido del dueño, sin commit en la carpeta base; guardado sin cambios (`2c84d7f`).

## Cambios (otro agente)
- Inventario y Auditoría: barra de filtros y acciones reordenada; el contador de registros pasa junto a los filtros (`AuditFilters` acepta `badge`).

## Correcciones de la auditoría de accesibilidad
- Contador: `text-label` → `text-body-text` (era 4.15:1 en oscuro sobre `panel-border/30`). Pares `contador/*` en `pares-contraste.ts` (el par anterior fallaba).
- Búsqueda de Inventario: formulario `w-full min-w-0` y campo `flex-1 min-w-0` (no desborda en 360 px); `pr-12` para no tapar texto con «Borrar»; `text-sm`, `pl-11` y `placeholder:text-placeholder` como Auditoría.

## No verificado
- Navegador real (360 px, claro/oscuro).
