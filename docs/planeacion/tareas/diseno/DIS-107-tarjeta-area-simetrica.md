# DIS-107 — Tarjeta de área simétrica

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-107-tarjeta-area-simetrica` |

## Contexto
- El dueño: «no está simétrica, le falta un poquito, no sé por qué lo pusiste». Causa: DIS-105 puso un borde en degradado diagonal (intenso arriba a la izquierda) y una mancha de color solo en la esquina superior derecha.

## Cambios (`components.css`)
- Borde del color del área (40 %) igual en los cuatro lados; 70 % al pasar el ratón.
- Resplandor centrado a todo lo ancho de la parte superior (pico 8 %) en lugar de la mancha de esquina; se quita también el resplandor de esquina del encabezado (queda el halo del icono y el degradado vertical).
- Se mantienen el halo de color bajo la tarjeta, el brillo del icono, los logos y la píldora.

## Pruebas
- `tests/components/tarjeta-area.test.tsx`: sin borde diagonal (`border-box`), resplandor centrado, sin esquina en el encabezado.
