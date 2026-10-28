# DIS-078 — Marco de administración: barra superior y barra lateral colapsable

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | marco |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
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
- [x] Claro y oscuro con contraste AA medido (pares existentes; la medición independiente la hace `auditor-accesibilidad`, pendiente); foco visible; teclado; sin saltos de diseño
- [ ] Sin estilos inline ni colores literales; componentes comunes (un patrón, un componente)
- [ ] Pruebas, `auditor-accesibilidad` y revisión visual en `http://localhost:3000` (pruebas y revisión visual hechas; falta `auditor-accesibilidad`)

## Impacto cruzado
- Depende de DIS-076, DIS-077
- Genera → FNC-133 (búsqueda de datos en el servidor, Propuesta)

## Implementación
- `AppShell` queda solo con la sesión; el marco vive en `components/marco/`, una responsabilidad por archivo: `nav-items.ts` (NAV con icono y sección, reglas), `nav-principal.tsx`, `barra-lateral.tsx`, `barra-superior.tsx`, `boton-icono.tsx`, `buscador-global.tsx`, `paleta-comandos.tsx`, `comandos.ts`, `menu-usuario.tsx`, `ayuda-marco.tsx`, `ruta-navegacion.tsx`, `use-indicadores.ts`, `marco.tsx`.
- Nuevos: `lib/use-menu-colapsado.ts` (estado recordado, `try/catch`) y `components/use-tema.ts` (lógica de `ThemeSelector` extraída).
- Menú: General, Gestión y Sistema; cada rol ve las mismas entradas que antes (misma lista, `RequireRole` sin cambios). Auditoría va en Gestión como en la maqueta, aunque la ve todo rol. «Conectores» (sin equivalente en la maqueta) va en Gestión con el icono `marca`.
- Barra lateral 264/76 px y barra superior 64 px por tokens `--marco-*` (utilidades `w-lateral`, `w-lateral-colapsada`, `h-barra-superior`, `max-w-buscador`); colores por `bg-barra-lateral`, `text-navegacion`, `bg-activo-fondo`, `text-activo-texto`, `bg-entrada-fondo`. `--color-header-bg/-text` apuntan a superficie y texto (ya no azul).
- Colapsada: solo iconos con `aria-label` y `title`; la etiqueta queda `sr-only`. Sin salto: el ancho solo depende del estado, que se lee al crearlo (el marco solo se pinta en el cliente, tras la sesión).
- Buscador global: campo (escritorio) o icono (móvil) + `Ctrl K` / `⌘K`. Paleta sobre `Modal` (foco atrapado y devuelto, Escape) con `combobox` + `listbox` (flechas, Inicio/Fin, Enter). Busca las pantallas del rol y 3 acciones (tema, colapsar menú, cerrar sesión), sin acentos.
- Tema: botón luna/sol que alterna claro/oscuro y «Tema: según el sistema» en el menú de usuario (`menuitemcheckbox`). `ThemeSelector` ya no se usa en el marco; se conserva el componente y sus pruebas (propuesta de retiro).
- Notificaciones: enlace a `/notifications` con punto y nombre «Notificaciones, N sin leer» (`GET /notifications`). Ayuda: diálogo (`Modal`) con los atajos de teclado.
- Contador de Aprobaciones: ya existe el dato (`pending_approvals` de `GET /home/summary`, contrato `inicio.md`); solo se pide a quien administra y se refresca al cambiar de pantalla. En colapsada, burbuja sobre el icono.
- Áreas táctiles de 44 px (`min-h-11 min-w-11`); la maqueta fija 40 px en los botones de la barra y 44 en las opciones.

## Decisiones y desvíos
- Nombre en la barra lateral: «Nexus / Portal de accesos» (la maqueta dice «Portal de accesos / Vivaro»; Nexus es el nombre del proyecto).
- Las pruebas `menu-movil` y `tema-diseno` se ajustaron: 48 → 44 px (misma exigencia que `area-tactil.test.ts`) y el bloque derecho de la cabecera se mide ahora en `barra-superior.tsx`. Las demás siguen igual.
- El botón «Menú» móvil pasó de texto a icono con `aria-label="Menú"`; sigue con `aria-expanded` y `aria-controls`.
- El buscador de escritorio es un botón que abre la paleta (no un `<input>` en la barra): un solo patrón de combobox.
- La ruta de navegación sale de la ruta actual (`entradaDeRuta`), visible desde `lg`.

## Impacto en elementos compartidos
- `AppShell` (`components/app-shell.tsx`): usado por todas las pantallas autenticadas (`app/*/page.tsx`: panel, plataformas, solicitudes, favoritos, notificaciones, aprobaciones, administrar plataformas, conectores, ejecuciones, áreas, usuarios, inventario, auditoría y sus historiales, ajustes). Cambia el marco completo: barra lateral, barra superior y cajón móvil. Validar cada pantalla en claro y oscuro, móvil y escritorio.
- `MobileMenu`: botón de texto → icono; mismo contrato de foco. `ThemeSelector`: ahora usa `useTema` (mismo comportamiento); ya no se muestra en el marco.
- Tokens `--color-header-bg/-text` y utilidades Tailwind `header`/`header-text`: sin otros consumidores que `pares-contraste.ts`. Tokens nuevos `--marco-*` (ver VARIABLES.md y HISTORIAL.md).
- Salida de `impacto.py` (comparado con `develop`, tabla de la herramienta; los nombres genéricos `abrir`, `elegir` y `esquema` son coincidencias por nombre, no usos reales):

| Elemento modificado | Tipo | Definido en | Usado en (fuera de la tarea) | ¿Validado? |
|---|---|---|---|---|
| `--color-header-bg` | token CSS | `frontend/src/styles/tokens.css` | `frontend/tests/accesibilidad/pares-contraste.ts` | ☐ |
| `--color-header-text` | token CSS | `frontend/src/styles/tokens.css` | `frontend/tests/accesibilidad/pares-contraste.ts` | ☐ |
| `ThemeSelector` | función | `frontend/src/components/theme-selector.tsx` | `frontend/tests/components/theme-selector-cuenta.test.tsx`, `frontend/tests/lib/tema.test.tsx` | ☐ |
| `abrir` / `elegir` / `esquema` | función | pruebas y `theme-selector.tsx` | coincidencias por nombre | ☐ |

## Verificación (2026-10-28, en `frontend/`)
- `npm run typecheck` → 0; `npm run lint` → 0; `npx vitest run` → 0 (72 archivos, 2436 pruebas; incluye accesibilidad, escala, área táctil, patrones únicos, sin estilos inline y colores literales); `npm run build` → 0.
- Pruebas nuevas: `tests/components/marco-admin.test.tsx` (colapsar y recordar, menú por rol, `aria-current`, contador, paleta `Ctrl K`/filtro/Enter/Escape/foco, botón de tema, menú de usuario con teclado, ayuda, cajón móvil) y `tests/lib/marco-nav.test.ts`.
- Revisión visual con Chromium (Playwright, servidor `next dev` de esta rama en el puerto 3100, API simulada con rutas de red): claro y oscuro, 1440×900 y 390×800; expandida, colapsada, paleta, menú de usuario y cajón. Capturas revisadas a ojo: sin desbordes; el contraste medido lo valida `auditor-accesibilidad`.
- No verificado: tablet (768–1023 px: la ruta de navegación se oculta bajo `lg`), lectores de pantalla reales, backend real (indicadores con datos simulados) y `localhost:3000`.
- Pendiente: `tester`, `revisor` y `auditor-accesibilidad` (no los ejecutó el implementador).

## Bitácora
- 2026-10-28: implementación completa en la rama; En revisión. Genera FNC-133 (Propuesta).
