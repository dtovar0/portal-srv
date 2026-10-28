# DIS-076 — Paleta del diseño aprobado (claro y oscuro) en los tokens

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | tokens |
| **Prioridad** | Alta |
| **Estatus** | Pendiente |
| **Rama** | `dis/DIS-076-paleta-aprobada` |
| **Creada** | 2026-10-28 |
| **Aprobada** | 2026-10-28, por el dueño: «exacto, ese sí es un diseño correcto, impleméntalo» |

## Contexto
- El resultado visual de la fase 7 (propuesta neutra) no convenció al dueño.
- Aprobó la maqueta del panel de administración: https://claude.ai/artifact/1SE1acTsMBkPsWpXcbrF6i (tablero «Panel»). Referencia local para los agentes: `/tmp/claude-1000/-home-dtovar-bayblade-pokemon/22e8923d-3d0a-4daf-9a12-07cd92cbd821/scratchpad/maqueta/project/Main.dc.html` (colores y estructura; no se copia tal cual: todo va con tokens y componentes).

## Objetivo
- Llevar a los tokens semánticos los colores de la maqueta aprobada: fondo, superficie, barra lateral, borde, texto, texto secundario, navegación, entrada, encabezado de tabla, acento, activo (fondo y texto) y estados aviso/éxito/error (fondo y texto), en claro y oscuro.
- Contraste AA medido en los 2 temas; pruebas de pares actualizadas.
- Sin cambiar estructura de componentes (eso es DIS-078/079).

## Criterios de aceptación
- [ ] Fiel a la maqueta aprobada en estructura, iconos, jerarquía y colores (vía tokens)
- [ ] Claro y oscuro con contraste AA medido; foco visible; teclado; sin saltos de diseño
- [ ] Sin estilos inline ni colores literales; componentes comunes (un patrón, un componente)
- [ ] Pruebas, `auditor-accesibilidad` y revisión visual en `http://localhost:3000`

## Impacto cruzado
- Depende de DIS-078, DIS-079
