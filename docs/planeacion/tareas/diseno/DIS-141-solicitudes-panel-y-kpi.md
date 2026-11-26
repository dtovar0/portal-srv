# DIS-141 — Solicitudes: panel de pendientes y nuevos KPI

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26, captura de «Actividad reciente»): en Solicitudes, cambiar «Solicitudes por estado» por «Solicitudes» con 8 registros por página como Actividad reciente: usuario, área/plataforma, fecha y botones aceptar/rechazar.
- Después: quitar los KPI de aprobadas y rechazadas y el botón «Abrir»; un KPI con dona de pendientes/aprobadas/rechazadas, otro con la cantidad de conectores y otro con el total de usuarios separado en usuarios y administradores. Datos de FNC-214.

## Cambios
- `components/panel-tabla.tsx` (nuevo): encabezado de columnas, filas fantasma y pie con paginador del estilo de «Actividad reciente».
- `access/solicitudes-panel.tsx` (nuevo): pendientes (`inbox?status=pendiente&per_page=8`), columnas Usuario, Área / Plataforma, Fecha y Acciones (rechazar/aprobar con los diálogos de la bandeja; la propia dice «Tu solicitud»), «Ver todo» a la tabla de pendientes.
- `access/approvals-resumen.tsx`: KPI = `DonaEstados` (compacta) + `TarjetaIndicador` `connectors` (si `GET /stats` trae `connectors`, solo superadmin) + `users_by_role`; sin «Abrir»; el panel ocupa el lugar de la dona (2/5).
- `access/dona-estados.tsx`: formato KPI (dona a la izquierda, leyenda a la derecha, subtítulo con el total).
- `lib/types.ts` y `dashboard/indicadores.ts`: claves `connectors` (asociados / sin asociar) y `users_by_role` (usuarios / administradores).

## Decisiones (pendientes de validar con el dueño)
- Las tarjetas de conectores y usuarios reutilizan los colores de plataformas y usuarios (sin tokens nuevos).
- Las claves `pendientes`, `aprobadas` y `rechazadas` del catálogo de indicadores quedan sin uso en pantalla; no se borraron (sus tokens y clases son del catálogo).
- «Actividad reciente» no se migró a `panel-tabla` (sería tocar el Dashboard): DIS-142 Propuesta.

## Pruebas
- `approvals-resumen.test.tsx` reescrito (KPI, panel, paginación, propia, aprobar). Vitest 3592/3592; tsc y lint en 0.
