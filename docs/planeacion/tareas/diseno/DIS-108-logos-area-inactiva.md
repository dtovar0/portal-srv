# DIS-108 — Logos inactivos en un área inactiva

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-108-logos-area-inactiva` |

## Contexto
- El dueño: «cuando se pone inactiva el área, falta poner los iconos de las plataformas como inactivos».

## Cambios
- `components.css`: en `.nx-area-card[data-state=inactiva]`, los logos del pie van en escala de grises y al 55 % de opacidad (son decorativos, `aria-hidden`; el estado se anuncia en la etiqueta «Inactiva» y en el `aria-label`).

## Pruebas
- `tests/components/tarjeta-area.test.tsx` (fallaba antes del cambio).
