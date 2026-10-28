# DIS-081 — Quitar el botón de colapsar del pie de la barra lateral

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | componentes |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Rama** | `dis/DIS-081-sin-colapsar-en-pie` |
| **Creada** | 2026-10-28 |
| **Aprobada** | 2026-10-28, por el dueño al revisar DIS-080: «¿por qué sigue estando el botón de colapsar menú ahí, al lado del menú del usuario?» |

## Objetivo
- El menú se colapsa y expande solo con el ☰ de la barra superior; el pie de la barra lateral queda solo con el menú de usuario.

## Criterios de aceptación
- [x] `BarraLateral` sin botón de colapsar ni prop `onAlternar`; `Marco` ya no la pasa
- [x] Pie expandido: tarjeta de usuario a lo ancho; colapsado: solo avatar centrado
- [x] ☰ conserva `aria-expanded` y `aria-controls` (`ID_BARRA_LATERAL`)
- [x] Cajón móvil: no tenía botón de colapsar (confirmado), sin cambios
- [x] Pruebas: el pie no tiene botón de colapsar/expandir, expandido ni colapsado
- [ ] Revisión visual con Chromium (no hecha)

## Impacto en elementos compartidos (validar)
- `BarraLateral` (prop `onAlternar` eliminada): solo la usa `Marco`, es decir todas las pantallas con sesión.
- `MenuUsuario`, `BarraSuperior`, cajón móvil, tokens: sin cambios.

## Verificación (2026-10-28, en `frontend/`)
- typecheck 0; lint 0; vitest 0 (73 archivos, 2534 pruebas, accesibilidad incluida); build 0.
- Pruebas de `marco-admin.test.tsx` migradas al ☰ de la barra superior sin perder aserciones; nuevas aserciones de ausencia en el pie (expandido y colapsado) y en `aria-controls`.
- No verificado: Chromium claro/oscuro, móvil. Pendientes: `revisor`, `auditor-accesibilidad`.

## Bitácora
- 2026-10-28: implementada; En revisión.
