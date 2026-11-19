# DIS-103 — Cuadrícula de áreas: 2×3, 3×2 y 3×3

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-103-cuadricula-areas` |

## Contexto
- Pedido del dueño (2026-11-19) tras DIS-102: «el grid tiene doble padding y evita que haga scroll; con 4 filas la cuadrícula se distorsiona: quita 4 filas y 4 columnas, solo 2×3, 3×2 y 3×3».

## Cambios (`frontend/src/components/platform-admin.tsx`)
- `CUADRICULAS` = 2×3, 3×2, 3×3 (filas × columnas); por omisión 2×3. Se quitan los selectores sueltos de filas y columnas (dejaban armar 2×2 o 4×4). Una combinación guardada que ya no se ofrece vuelve a 2×3.
- Filas `minmax(14rem, 1fr)`: llenan el alto disponible pero no bajan del mínimo de la tarjeta; si no caben, el contenedor hace scroll (antes se encimaban y no había scroll).
- Sin el `p-1` duplicado de la rejilla (el contenedor ya lo tiene) ni `h-full`/`min-h-0` que impedían crecer.

## Pruebas
- `tests/components/platform-admin.test.tsx`: solo las 3 combinaciones, ninguna de 4 filas/columnas, persistencia en `localStorage` y vuelta a 2×3 desde una guardada que ya no existe.
