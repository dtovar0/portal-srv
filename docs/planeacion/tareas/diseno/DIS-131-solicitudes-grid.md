# DIS-131 — Solicitudes en cuadrícula con resumen y una tabla por estado

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- Dueño: Solicitudes con grid como el dashboard; fila 1 tarjetas (pendientes, aprobadas, rechazadas), gráficas por área y por plataforma y dona por estado donde iba la actividad reciente. Luego: cada tarjeta lleva «Abrir» a la tabla de su estado (como Plataformas) y la vista principal queda sin lista.
- Datos: `GET /access-requests/inbox/stats` (FNC-200, contrato solicitudes 1.3).

## Cambios
- `app/approvals/page.tsx` + `access/approvals-view.tsx`: sin `?status=` el resumen; con `?status=pendiente|aprobada|rechazada` la tabla de ese estado, `PageHeader` con Volver (`backHref`). Valor inválido = resumen.
- `access/approvals-resumen.tsx`: tarjetas (`TarjetaIndicador`), 2 `GraficaBarras` (máx. `MAX_BARRAS` = 10) y `DonaEstados`; `usePolling` con el intervalo de preferencia; carga, error con Reintentar y vacíos. Se recarga al volver (se monta de nuevo tras decidir en la tabla).
- `dashboard/grafica-barras.tsx` (nuevo, Card + barras + `DataTable srOnly` + vacío) y `access/dona-estados.tsx` (recharts `Pie` con `innerRadius`, leyenda con cifras y %).
- `ApprovalsInbox`: prop `estadoFijo` (oculta el selector de estado; el de área se queda; el foco tras decidir va al filtro de área).
- `TarjetaIndicador`: props opcionales `base` y `accion`; `ClaveIndicador` e `INDICADORES` + `pendientes|aprobadas|rechazadas`; clases `.nx-ind--pendientes|aprobadas|rechazadas` con tokens semánticos aviso/éxito/peligro (sin tokens nuevos); `.nx-dona__punto--*`.
- `lib/access`: `requestsApi.inboxStats`, `InboxStats`, `MOCK_INBOX_STATS`.

## Impacto en elementos compartidos
- `TarjetaIndicador`, `INDICADORES`, `ClaveIndicador`: solo se agregan opciones; el dashboard no cambia.
- `ApprovalsInbox`: prop opcional; sin ella igual que antes (usos: `/approvals`).
- `dashboard.tsx` no se tocó.

## Enlaces a /approvals
- `solicitudes-pendientes`, `role-summary` («Por aprobar»): ya llevan `?status=pendiente`; sin cambios. Menú lateral y contador (`/approvals`) abren el resumen (decisión: es la vista principal).

## Pruebas
- `tests/components/access/approvals-resumen.test.tsx` (14): cifras y % de tarjetas, leyenda de la dona, gráficas, recorte, vacío, error, sin tabla en el resumen, «Abrir» por estado, pendientes con Aprobar/Rechazar, aprobadas/rechazadas sin acciones, Volver, estado inválido. `sin-estilos-inline` registra las dos gráficas.
- Vitest 3510/3510, tsc, eslint y `next build` en 0.

## Verificación
- No se levantó la app: tema claro/oscuro y móvil no se vieron en pantalla (solo clases responsive y tokens). Pendiente auditoría de contraste de las tres tarjetas.

## Propuesta
- Unificar las gráficas de barras de `dashboard.tsx` con `GraficaBarras`.

## Corrección tras auditoría de accesibilidad
- Ámbar de «Pendientes» en claro = 2,15:1: tokens nuevos `--color-indicador-{pendientes,aprobadas,rechazadas}[-fin|-icono]` por tema (claro pendientes `180 83 9`, 5,02:1; oscuro conserva `245 158 11`), usados por tarjeta, punto y segmento de la dona. Registrados en `docs/configuracion/VARIABLES.md`.
- Icono: en oscuro, negro sobre ámbar y verde (`-icono`); `.nx-ind__icono` lo lee con `--ind-icono`.
- `tests/accesibilidad/indicadores-contraste.test.ts` cubre las tres clases nuevas (con el valor anterior fallaban 2 pruebas en claro).
- «Abrir»: `.nexus-btn` fija `height: 3rem !important` (48 px); se quitó el `min-h-9 px-4` inerte.
