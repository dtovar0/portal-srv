# DIS-077 — Catálogo de iconos de trazo detrás de `Icono`

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | componentes |
| **Prioridad** | Alta |
| **Estatus** | Pendiente |
| **Rama** | `dis/DIS-077-iconos` |
| **Creada** | 2026-10-28 |
| **Aprobada** | 2026-10-28, por el dueño: «exacto, ese sí es un diseño correcto, impleméntalo» |

## Contexto
- El resultado visual de la fase 7 (propuesta neutra) no convenció al dueño.
- Aprobó la maqueta del panel de administración: https://claude.ai/artifact/1SE1acTsMBkPsWpXcbrF6i (tablero «Panel»). Referencia local para los agentes: `/tmp/claude-1000/-home-dtovar-bayblade-pokemon/22e8923d-3d0a-4daf-9a12-07cd92cbd821/scratchpad/maqueta/project/Main.dc.html` (colores y estructura; no se copia tal cual: todo va con tokens y componentes).

## Objetivo
- Ampliar `components/icono.tsx` con los iconos de la maqueta: navegación (panel, catálogo, solicitudes, aprobaciones, áreas, plataformas, usuarios, inventario, ejecuciones, auditoría, ajustes), barra superior (menú, buscar, sol, luna, campana, ayuda, chevrons), acciones (ver, aprobar, rechazar, editar, eliminar, exportar, abrir, favorito) y estados (reloj, escudo, alerta, éxito, error, info).
- Mismo estilo: trazo 2, 24×24, `currentColor`, `aria-hidden` salvo con `ariaLabel`.
- Decidir con motivo: SVG propios en el catálogo o la librería `lucide-react` envuelta en `Icono` (un solo punto de entrada; registrar la dependencia).

## Criterios de aceptación
- [ ] Fiel a la maqueta aprobada en estructura, iconos, jerarquía y colores (vía tokens)
- [ ] Claro y oscuro con contraste AA medido; foco visible; teclado; sin saltos de diseño
- [ ] Sin estilos inline ni colores literales; componentes comunes (un patrón, un componente)
- [ ] Pruebas, `auditor-accesibilidad` y revisión visual en `http://localhost:3000`

## Impacto cruzado
- Depende de DIS-078, DIS-079
