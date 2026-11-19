# DIS-110 — Cuadrícula en la barra de Áreas

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-110-cuadricula-en-barra` |

## Contexto
- El dueño: «agrega las 3 opciones en el topbar»; el encabezado del menú le era redundante («no lo quiero ver»); solo en Áreas.

## Cambios (`platform-admin.tsx`)
- El botón «Cuadrícula» con menú desplegable se reemplaza por un grupo de tres botones (2×3, 3×2, 3×3) con `aria-pressed`, en la barra de herramientas de Áreas. Se quita el encabezado «Cuadrícula · N slots» y el estado/referencias del menú.

## Pruebas
- `tests/components/platform-admin.test.tsx`: grupo con las 3 opciones, sin menú ni «slots», elección y persistencia.
