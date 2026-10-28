# DIS-079 — Panel e iconos en indicadores, tablas, acciones e insignias

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | pantallas |
| **Prioridad** | Alta |
| **Estatus** | Pendiente |
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
- [ ] Fiel a la maqueta aprobada en estructura, iconos, jerarquía y colores (vía tokens)
- [ ] Claro y oscuro con contraste AA medido; foco visible; teclado; sin saltos de diseño
- [ ] Sin estilos inline ni colores literales; componentes comunes (un patrón, un componente)
- [ ] Pruebas, `auditor-accesibilidad` y revisión visual en `http://localhost:3000`

## Impacto cruzado
- Depende de DIS-076, DIS-077, DIS-078
