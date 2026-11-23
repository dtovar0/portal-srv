# DIS-111 — Cuadrícula: menú de vuelta y 2×2

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-111-cuadricula-2x2` |

## Contexto
- El dueño: «en la cuadrícula falta la combinación 2x2» y «vi que me cambiaste el diseño, estaba bien, solo tenías que quitarme el texto de combinaciones». DIS-110 (selector en la barra) fue una mala interpretación del orquestador.

## Cambios
- `platform-admin.tsx` vuelve a la versión de DIS-109 (menú desplegable sin «Combinaciones») y `CUADRICULAS` suma 2×2 (opciones en 2 columnas). Por omisión sigue 2×3.

## Pruebas
- `tests/components/platform-admin.test.tsx`: 2×2, 2×3, 3×2 y 3×3; 2×2 deja 3 huecos.
