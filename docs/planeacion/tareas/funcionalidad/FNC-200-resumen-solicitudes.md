# FNC-200 — Resumen de la bandeja de solicitudes (`inbox/stats`)

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada** | 2026-11-25 |
| **Origen** | Pedido del dueño: tablero de Solicitudes (DIS-131) |

## Alcance
- `GET /api/v1/access-requests/inbox/stats` (contrato `solicitudes.md` v1.3): `total`, `by_status` (3 claves siempre), `by_area` y `by_platform` (solo `count > 0`, orden `count` desc y nombre asc).
- Mismo alcance que `inbox` (`approvals.bandeja`, sin las propias), todos los estados; `@login_required` + `@any_admin_required`.
- Consultas agregadas (GROUP BY) en `access_requests/resumen.py`; el endpoint solo serializa.

## Archivos
| Archivo | Cambio |
|---|---|
| `app/modules/access_requests/resumen.py` | Nuevo: agregación |
| `app/modules/access_requests/api.py` | Ruta `inbox_stats` |
| `tests/access_requests/test_resumen.py` | Nuevo: 4 pruebas |
| `tests/matriz_proteccion.py` | Caso de la ruta nueva (guardia de rutas) |
| `docs/contratos/solicitudes.md` | Sección v1.3 (commit previo) |

## Impacto en elementos compartidos
- Ninguno modificado (`approvals.bandeja` solo se reutiliza).

## Verificación
- Pruebas: 403 usuario; admin de área solo sus áreas; superadmin todas y sin las propias; 3 claves en 0 sin datos; orden y agregados.
- Suite completa: 3438 verdes y 1 roja (guardia de rutas: ruta sin caso en la matriz), corregida; tras ello pasan guardia, solicitudes y todos los archivos que usan la matriz (589 + 110 pruebas).

## Bitácora
- 2026-11-25: implementada y cerrada.
