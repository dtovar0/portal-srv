# DIS-080 — Menú de usuario en la parte inferior de la barra lateral

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | componentes |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Rama** | `dis/DIS-080-usuario-en-lateral` |
| **Creada** | 2026-10-28 |
| **Aprobada** | 2026-10-28, por el dueño al revisar DIS-078: «el menú del usuario va a la izquierda abajo, donde pusiste el botón de colapsar menú» |

## Objetivo
- Mover el menú de usuario de la barra superior al pie de la barra lateral (ajuste de DIS-078).

## Criterios de aceptación
- [x] Barra superior: ☰, ruta, buscador, tema, notificaciones y ayuda (sin menú de usuario)
- [x] Pie expandido: tarjeta (avatar, nombre, rol, chevron) con el menú accesible intacto + botón compacto de colapsar de 44 px
- [x] Menú hacia arriba; colapsada, solo avatar (`aria-label` y `title`), expandir debajo y menú arriba y a la derecha
- [x] Cajón móvil: tarjeta al pie
- [x] Solo tokens, sin estilos inline; foco visible; 44 px
- [ ] Revisión visual con Chromium (no hecha)

## Decisiones (decisión del orquestador, pendiente de validar)
- `MenuUsuario` gana la prop `colapsada`; el menú usa `bottom-full left-0` (expandida) o `bottom-0 left-full` (colapsada), `w-60`.
- Chevron de la tarjeta hacia arriba (`rotate-180`), porque el menú se abre arriba.
- Botón de colapsar con `BotonIcono` (icono `colapsar`, girado al colapsar), igual que los de la barra superior.
- Cajón: pie con `sticky bottom-0`; queda al fondo si la lista desborda y, si cabe, sigue a la navegación (el `Drawer` compartido no se tocó).
- La prueba de foco de `menu-movil.test.tsx` incluye la tarjeta como último enfocable del cajón.

## Impacto en elementos compartidos (validar)
- `Marco` (todas las pantallas con sesión): barra lateral, barra superior y cajón móvil.
- `BarraLateral`, `BarraSuperior` (props `session`, `segunSistema`, `onTemaSistema` fuera), `MenuUsuario` (prop `colapsada`): solo los usa `Marco`.
- `Drawer`, `MobileMenu`, tokens: sin cambios.

## Verificación (2026-10-28, en `frontend/`)
- typecheck 0; lint 0; vitest 0 (73 archivos, 2534 pruebas, accesibilidad incluida); build 0.
- Pruebas nuevas en `tests/components/marco-admin.test.tsx` (no está en la barra superior, pie expandido y colapsado, apertura hacia arriba, teclado, botón junto a la tarjeta, cajón).
- No verificado: Chromium claro/oscuro a 1440 y 390 (no se hizo), tablet, lectores de pantalla. Pendientes: `tester`, `revisor`, `auditor-accesibilidad`.

## Bitácora
- 2026-10-28: implementada; En revisión.
