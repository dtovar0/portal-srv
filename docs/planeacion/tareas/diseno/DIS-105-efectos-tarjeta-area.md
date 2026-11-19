# DIS-105 — Efectos de color en la tarjeta de área

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-105-efectos-tarjeta-area` |

## Contexto
- Pedido del dueño tras DIS-104: «con falta de color me refería a que le faltan más efectos de color».

## Cambios (`components.css`; `tarjeta-area.tsx` solo agrega `nx-area-card__logos`)
- Borde en degradado (color del área en la esquina del icono, se apaga hacia el lado opuesto) y halo de color permanente bajo la tarjeta.
- Aurora del color del área en la esquina superior derecha (pico 10 %, centro a 10px del borde).
- Al pasar el ratón: halo más intenso, la aurora se desplaza y crece, el icono se eleva y gira con un brillo que lo cruza, los logos del pie se abren.
- Área inactiva sin efectos; `prefers-reduced-motion` sin animaciones.

## Contraste
- La aurora deja la descripción en <= 8 % de mezcla: >= 4.5:1 aun con áreas blancas en tema oscuro (4.65).

## Pruebas
- `tests/components/tarjeta-area.test.tsx`: reglas de los efectos, inactiva sin aurora y reducción de movimiento.
