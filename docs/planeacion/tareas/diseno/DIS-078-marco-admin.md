# DIS-078 — Marco de administración: barra superior y barra lateral colapsable

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | marco |
| **Prioridad** | Alta |
| **Estatus** | Pendiente |
| **Rama** | `dis/DIS-078-marco-admin` |
| **Creada** | 2026-10-28 |
| **Aprobada** | 2026-10-28, por el dueño: «exacto, ese sí es un diseño correcto, impleméntalo» |

## Contexto
- El resultado visual de la fase 7 (propuesta neutra) no convenció al dueño.
- Aprobó la maqueta del panel de administración: https://claude.ai/artifact/1SE1acTsMBkPsWpXcbrF6i (tablero «Panel»). Referencia local para los agentes: `/tmp/claude-1000/-home-dtovar-bayblade-pokemon/22e8923d-3d0a-4daf-9a12-07cd92cbd821/scratchpad/maqueta/project/Main.dc.html` (colores y estructura; no se copia tal cual: todo va con tokens y componentes).

## Objetivo
- Barra superior: botón colapsar menú, ruta de navegación, buscador global con `Ctrl K` (navega entre pantallas y acciones en el cliente), botón de tema claro/oscuro, notificaciones con indicador, ayuda y menú de usuario (avatar, rol, «Según el sistema», cerrar sesión).
- Barra lateral: iconos en cada opción, secciones General/Gestión/Sistema, contador de aprobaciones, botón «Colapsar menú» abajo; colapsada = solo iconos con nombre accesible y `title`; estado recordado en el navegador.
- Móvil: el menú lateral se vuelve cajón (`mobile-menu`).
- Sin saltos al colapsar (sin CLS), foco visible, AA, teclado.

## Criterios de aceptación
- [ ] Fiel a la maqueta aprobada en estructura, iconos, jerarquía y colores (vía tokens)
- [ ] Claro y oscuro con contraste AA medido; foco visible; teclado; sin saltos de diseño
- [ ] Sin estilos inline ni colores literales; componentes comunes (un patrón, un componente)
- [ ] Pruebas, `auditor-accesibilidad` y revisión visual en `http://localhost:3000`

## Impacto cruzado
- Depende de DIS-076, DIS-077
