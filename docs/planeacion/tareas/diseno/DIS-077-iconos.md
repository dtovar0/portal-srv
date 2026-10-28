# DIS-077 — Catálogo de iconos de trazo detrás de `Icono`

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | componentes |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
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
- [x] Fiel a la maqueta aprobada en estructura, iconos, jerarquía y colores (vía tokens)
- [ ] Claro y oscuro con contraste AA medido; foco visible; teclado; sin saltos de diseño
- [x] Sin estilos inline ni colores literales; componentes comunes (un patrón, un componente)
- [ ] Pruebas, `auditor-accesibilidad` y revisión visual en `http://localhost:3000`

## Impacto cruzado
- Depende de DIS-078, DIS-079

## Decisión del orquestador (pendiente de validar)
- Opción (a): SVG propios en `components/icono-trazos.ts` (solo datos, un icono = lista de trazos `d`); `icono.tsx` solo pinta.
- Motivo: sin dependencias nuevas, trazos tomados de la maqueta aprobada, un solo archivo ordenado; `NombreIcono` se deriva de las claves.
- `lucide-react` descartada: dependencia extra para 42 iconos y el estilo ya está definido por la maqueta.

## Implementación
- `NombreIcono` pasa de 8 a 42 nombres (se conservan los 8 existentes). `TamanoIcono` suma `xl` (22 px por atributos; no existe en la escala Tailwind y la prueba de escala prohíbe valores arbitrarios).
- Trazo 2, punta y unión redondeadas ahora en el `<svg>`; `currentColor`; sin estilos inline.
- `alerta` de la ficha = `aviso` existente; `abrir` = `abrir-externo`; `favorito` ya existía.
- Pruebas: `frontend/tests/components/icono.test.tsx` (catálogo de 42, cada nombre pinta svg 24 con `aria-hidden`, `role="img"` con `ariaLabel`, tamaños).

## Impacto en elementos compartidos
- `Icono` (`components/icono.tsx`): API compatible; se agrega `xl` y se mueve el trazo del `<path>` al `<svg>` (mismo resultado visual).
- Usos: `note.tsx`, `alert-dialog.tsx`, `form.tsx`; `platform-save-errors.ts` solo referencia el nombre. Validar visualmente notas, diálogos de alerta y cierre de formulario.

## Verificación
- typecheck 0, lint 0, vitest 70 archivos / 2273 pruebas 0 fallos (incluye accesibilidad y escala), build 0.
- Revisión visual en `localhost:3000` en claro y oscuro: no realizada (sin pantallas nuevas; se cubre en DIS-078/079).
- Pendiente: `auditor-accesibilidad` y `revisor`.
