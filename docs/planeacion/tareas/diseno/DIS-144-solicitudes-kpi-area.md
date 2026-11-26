# DIS-144 — Solicitudes: KPI por área y espaciado

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26, captura de Solicitudes publicada): «falta un KPI de solicitudes por área y también tiene doble padding o porque no se adapta al contenedor».

## Cambios
- `dashboard/dona-kpi.tsx` (nuevo): tarjeta KPI con dona y leyenda, genérica (paleta constante por clave).
- `access/dona-estados.tsx`: usa `DonaKpi`. `access/dona-areas.tsx` (nuevo): «Solicitudes por área» con hasta 5 áreas; con más, 4 y «Otras».
- `components.css`: puntos `.nx-dona__punto--serie-1..5` con los tokens de los indicadores existentes (áreas, plataformas, visitas, usuarios, solicitudes).
- `access/approvals-resumen.tsx`: KPI en 4 columnas (`md:2`, `xl:4`); sección y segunda fila con `flex-1 min-h-0` para llenar el alto.
- `access/approvals-view.tsx`: `flex h-full flex-col gap-4` como el Dashboard; antes `space-y-6` sumaba 24 px arriba por el `h1` oculto del encabezado.

## Decisiones
- El KPI y la gráfica de barras comparten el título «Solicitudes por área» (pedido del dueño).
- Sin tokens nuevos: las series reutilizan colores de indicadores existentes.

## Pruebas
- `approvals-resumen.test.tsx` (+3: KPI por área, «Otras», espaciado/alto). Vitest 3649/3649; tsc y lint en 0.
