# DIS-109 — Menú de cuadrícula sin «Combinaciones»

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-109-sin-texto-combinaciones` |

## Contexto
- El dueño: «quítame el texto de combinaciones, no es necesario».

## Cambios
- `platform-admin.tsx`: se quita la etiqueta; las tres opciones (2×3, 3×2, 3×3) quedan igual.

## Pruebas
- `tests/components/platform-admin.test.tsx`: el texto ya no aparece.
