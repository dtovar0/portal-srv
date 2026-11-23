# DIS-079 — Panel e iconos en indicadores, tablas, acciones e insignias

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | pantallas |
| **Prioridad** | Alta |
| **Estatus** | Hecha |
| **Rama** | `dis/DIS-079-contenido-panel` |
| **Creada** | 2026-10-28 |
| **Aprobada** | 2026-10-28, por el dueño: «exacto, ese sí es un diseño correcto, impleméntalo» |

## Contexto
- El resultado visual de la fase 7 (propuesta neutra) no convenció al dueño.
- Aprobó la maqueta del panel de administración: https://claude.ai/artifact/1SE1acTsMBkPsWpXcbrF6i (tablero «Panel»). Referencia local para los agentes: `/tmp/claude-1000/-home-dtovar-bayblade-pokemon/22e8923d-3d0a-4daf-9a12-07cd92cbd821/scratchpad/maqueta/project/Main.dc.html` (colores y estructura; no se copia tal cual: todo va con tokens y componentes).

## Objetivo
- Panel (inicio): indicadores con icono y color por estado, solicitudes pendientes con acciones con icono, actividad reciente con iconos, encabezado con acciones (exportar, revisar aprobaciones).
- `DataTable` y acciones de fila: avatar o icono en la primera columna cuando aplique, acciones con icono y nombre accesible contextual, insignias de estado con icono.
- Aplicar en todas las pantallas que usan esos componentes.

## Criterios de aceptación
- [x] Fiel a la maqueta aprobada en estructura, iconos, jerarquía y colores (vía tokens)
- [x] Claro y oscuro con contraste AA medido; foco visible; teclado; sin saltos de diseño
- [x] Sin estilos inline ni colores literales; componentes comunes (un patrón, un componente)
- [ ] Pruebas, `auditor-accesibilidad` y revisión visual en `http://localhost:3000`

## Impacto cruzado
- Depende de DIS-076, DIS-077, DIS-078

## Qué se hizo
- Panel: indicadores con icono en caja de color por estado (`StatTile` con `icon`/`tone`), «Solicitudes pendientes» (`DataTable` con avatar, plataforma, insignia con icono y acciones de solo icono ver/rechazar/aprobar) y «Actividad reciente» (auditoría), más «Revisar aprobaciones» en el encabezado.
- Comunes: `Badge` con `icon`; insignias de solicitud, acceso, auditoría y ejecución con icono y texto; `Avatar`/`CeldaUsuario`; `DataTable` con `encabezado`; `Button` variante `fila-primario`; clases `.nx-tono-*`.
- Datos reales (sin inventar): «Por aprobar» (`pending_approvals`, nota con `oldest_pending_at`), «Accesos con falla» (`failed_access`; cercano a «Ejecuciones fallidas»), «Accesos activos», «Plataformas» y «Áreas» (`totals`). Solicitudes: `GET /access-requests/inbox`; actividad: `GET /audit` (solo admin y admin de área).

## Desviaciones de la maqueta
- «Exportar» omitido: no existe exportación en la API.
- Los indicadores conservan los grupos con título («Pendientes», «Todo el sistema»…) del resumen por rol (DIS-024, con pruebas); no van en una sola fila de 4.
- Nota «En N plataformas / Wiki · Repositorio» omitida (la API no lo entrega).
- Actividad: el icono sale del resultado del evento (`solicitud_creada` = reloj), no de un tipo propio.
- Tabla y actividad en 2/3 y 1/3 desde `xl`; debajo, apiladas.

## Impacto en elementos compartidos (validar)
- `Badge` (+ `icon` opcional): todas las pantallas con insignias. `AccessStatusBadge`, `RequestStatusBadge`, `resultado`/`RESULTADOS` (auditoría) y `ESTADOS_EJECUCION` ahora llevan icono: Mis solicitudes, Mis accesos, Catálogo, Aprobaciones, Inventario, Usuarios (accesos), Auditoría y Ejecuciones.
- `StatTile` (+ `icon`, `tone`, `hintTone`): sin icono no cambia (`pantalla-panel.tsx`, Visitas y Usuarios).
- `DataTable`: nuevo `encabezado` opcional y `!p-0` en su tarjeta (antes `p-6` ganaba a `p-0`, con relleno de más): `platform-admin.tsx`, `pantalla-listado.tsx`. Validar visualmente.
- `Button`/`ButtonLink` + variante `fila-primario`; `components.css`: `.nx-tono-*`, `.nx-texto-*`, `.nexus-btn-fila-primario` (nuevas).
- `Contador` (`role-summary.tsx`) con `icono`/`tono`; `dashboard.tsx` (`/`).
- Coincidencias por nombre de `impacto.py` (`cuerpo`, `contadores`, `resultado` en backend): no son usos reales.

## Verificación (2026-10-28, en `frontend/`)
- typecheck 0; lint 0; vitest 0 (73 archivos, 2496 pruebas, accesibilidad incluida); build 0.
- Pruebas nuevas: `tests/components/home/panel-contenido.test.tsx` (indicadores reales, carga/vacío/error, nombres accesibles de acciones, insignias con icono y texto, avatar, actividad) y casos en `dashboard.test.tsx`.
- Visual con Chromium (`next dev` de la rama, API simulada): claro y oscuro, 1440 y 390; sin desbordes de página (la tabla se desplaza dentro de su región en móvil). Contraste medido por las pruebas de pares existentes (mismos tokens).
- No verificado: tablet, lectores de pantalla, backend real, `localhost:3000`.
- Pendientes: `tester`, `revisor`, `auditor-accesibilidad` (no los ejecutó el implementador).

## Bitácora
- 2026-10-28: implementada; En revisión.
- 2026-10-28: correcciones de `auditor-accesibilidad` («Requiere cambios», sin hallazgos de contraste), con prueba que primero falló: H1 la nota del indicador entra en el nombre accesible (`Por aprobar: 3. La más antigua: …. Ir a Aprobaciones`); H2 «Ver» se llama «Ver en aprobaciones: solicitud de X» (no existe detalle de solicitud); H3 `DataTable` con `filasEsperadas` y `claseFilaEsqueleto` (5 filas de `min-h-16`; celdas `py-2` para que la fila mida 64 px); `role="list"` en la actividad; pares de contraste de `.nx-tono-*`, `.nx-texto-*` y `.nexus-btn-fila-primario` en `pares-contraste.ts`.
- Decisión H6: `ResponsiveList` también pasa a `!p-0` (su cabecera `px-6` y sus filas `p-4 md:px-6` ya traen su propio relleno; con `p-6` de `Card` quedaba doble). Afecta a Aprobaciones, Mis solicitudes, Mis accesos, Inventario, Auditoría y Ejecuciones: validar visualmente.
- Verificación tras las correcciones (en `frontend/`): typecheck 0, lint 0, vitest 0 (73 archivos, 2528 pruebas), build 0.


- 2026-10-28: `auditor-accesibilidad` Aprobado tras corregir H1 (nota en el nombre del indicador), H2 («Ver en aprobaciones»), H3 (esqueleto con 5 filas de 64 px) y `role="list"`; contraste AA medido en claro y oscuro. Pendiente menor: salto residual de ~36 px entre el esqueleto (`p-5` + `space-y-3`) y la tabla cargada en el Panel. Hecha.
