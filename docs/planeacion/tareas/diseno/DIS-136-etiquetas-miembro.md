# DIS-136 — Etiquetas de eventos de grupos en Auditoría

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- Pendiente web de FNC-209 (`miembro_agregado`, `miembro_quitado`); de paso, `grupos_movidos` y `grupos_traslado_fallido` (FNC-163) tampoco tenían etiqueta y se mostraban crudos.

## Cambios
- `audit/audit-actions.ts::ACCIONES`: «Miembro agregado», «Miembro quitado», «Grupos movidos», «Fallo traslado de grupos».
- `home/actividad-reciente.tsx`: íconos existentes (`usuarios`, `plataformas`).

## Pruebas
- `tests/components/audit/audit-actions-dis136.test.ts` (4; fallaban sin el cambio). Vitest 3561/3561; tsc, lint y build en 0.
