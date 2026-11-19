# DIS-104 — Tarjeta de área con más color

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-104-tarjeta-area-con-color` |

## Contexto
- Pedido del dueño sobre DIS-102: «el diseño de la card está bien, pero le falta un poco más de color, está muy plana».

## Cambios (`components.css`, `tarjeta-area.tsx`)
- Borde de la tarjeta con 28 % del color del área.
- Recuadros de cifras: fondo 8 % y borde 30 % del color; las cifras en el color legible del área.
- Encabezado: además del halo, un degradado vertical del 5 %.
- Pie: fondo 6 % y separador 22 %; «Ver plataformas» como píldora del 14 % (20 % al pasar el ratón).
- El área inactiva sigue neutra.

## Contraste (prueba `tarjeta-area.test.tsx`, áreas blanca, negra, azul y amarilla, ambos temas)
- Todo texto >= 4.5:1; peor caso: etiqueta sobre recuadro teñido con área blanca en oscuro, 4.65:1.

## No verificado
- Navegador real.
