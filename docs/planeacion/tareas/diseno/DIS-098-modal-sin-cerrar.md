# DIS-098 — `Modal` sin ✕ en diálogos obligatorios

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-098-modal-sin-cerrar` |

## Contexto
- Hallazgo M7 de la auditoría de accesibilidad de FNC-156: en la carta responsiva (obligatoria) la ✕ del `Modal` se anunciaba «Cerrar» pero solo avisaba que hay que firmar. Pedido del dueño: implementarlo.

## Cambios
- `Modal` (`form.tsx`, compartido por 17 usos): prop `cerrable` (por defecto `true`, sin cambio para los demás). Con `false` no pinta la ✕; Escape y el velo siguen llamando a `onClose`.
- `modal-responsiva.tsx`: `cerrable={false}`; quedan «Firmar» y «Cerrar sesión».

## Pruebas
- `tests/components/modal.test.tsx` (sin ✕ con `cerrable={false}`, con ✕ por defecto) y `tests/components/responsiva.test.tsx` (la responsiva no tiene botón «Cerrar»); fallaban antes del cambio.
