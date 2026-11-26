# FNC-212 — Pendientes por área en el resumen de Solicitudes

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26): la tarjeta de área (Plataformas → Áreas) debe indicar cuántas solicitudes hay por aprobar y llevar a Solicitudes de esa área. `by_area` de `inbox/stats` cuenta todos los estados.
- Vinculada: DIS-137 (web).

## Cambios
- `access_requests/resumen.py`: `_por_area` (extraído de `by_area`) y campo `pending_by_area` (solo `pendiente`, mismo alcance de `approvals.bandeja`).
- Contrato `solicitudes.md` 1.4.

## Pruebas
- `tests/access_requests/test_resumen.py`: 2 nuevas (superadmin y alcance del admin de área) + la de vacío con la clave nueva; fallaban sin el cambio.
