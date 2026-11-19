# DIS-101 — Quitar el buscador global de la barra superior

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-101-quitar-buscador-global` |

## Contexto
- Pedido del dueño (2026-11-19): «yo no pedí ese botón de búsqueda que está en la topbar, elimínalo». Venía de DIS-078 (y DIS-094 lo estabilizó).

## Cambios
- Fuera `marco/buscador-global.tsx`, `marco/paleta-comandos.tsx` y `marco/comandos.ts` (botón «Buscar», atajo Ctrl K/⌘K y paleta).
- `barra-superior.tsx` sin el buscador ni la prop `comandos`; `marco.tsx` ya no arma comandos; la Ayuda ya no menciona Ctrl K.
- Token `--marco-buscador-max` y utilidad `max-w-buscador` retirados (sin uso).
- Documentación: `docs/frontend/README.md`, catálogo de reutilización, VARIABLES e HISTORIAL.

## Pruebas
- `marco-admin.test.tsx`: sin botón «Buscar», Ctrl K no abre nada, la Ayuda sin Ctrl K; se quitaron las pruebas de la paleta. `marco-nav.test.ts`: sin pruebas de comandos.
