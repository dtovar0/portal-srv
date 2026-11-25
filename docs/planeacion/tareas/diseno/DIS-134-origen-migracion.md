# DIS-134 — Origen de acceso «Migración» en la web

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- FNC-202 (contrato `accesos.md` v1.3) agregó el origen `migracion` (sistema, sin actor). La web no lo conocía.

## Decisión
- Etiqueta «Migración» en Mis accesos, inventario y filtro del inventario.
- Origen desconocido: se muestra el valor crudo, nunca vacío.
- `user-access-panel`: **sin cambio**. El backend (`rules.py`) bloquea al admin de área solo para `admin_de_area`; `migracion` se revoca como uno por solicitud.

## Cambios
- `lib/access/origen.ts` (nuevo): etiquetas únicas (`propio` / `admin`) + `etiquetaOrigenAcceso` con respaldo; sustituye los mapas duplicados.
- `types.ts`: `AccessOrigin` + `migracion`. `my-access.tsx`, `inventory-table.tsx`, `inventory-filters.tsx`: usan el módulo (se eliminan `ORIGENES` y `ORIGENES_INVENTARIO`).

## Impacto en elementos compartidos
- `AccessOrigin` (tipo): lo usan Mis accesos, inventario y filtro. `ORIGENES_INVENTARIO` eliminado (sin otros usos).

## Pruebas
- `tests/lib/access/origen.test.ts` (nuevo), `inventory.test.tsx` (+2), `my-requests-view.test.tsx` (+1), `user-access-panel.test.tsx` (+1). Las 3 de interfaz fallaban antes.
- Vitest 3553/3553; tsc, lint y build en 0.
- No verificado visualmente (sin captura); solo texto en clases existentes.
