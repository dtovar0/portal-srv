# FNC-164 — `GET /stats`: desglose `parte`/`resto`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `fnc/FNC-164-desglose-stats` |
| **Contrato** | `docs/contratos/inicio.md` v1.1 |

## Contexto
- Pedido del dueño (2026-11-19): el panel necesita, por indicador, cuánto es «parte» (activo/resuelto) y cuánto «resto». Lo consume DIS-112 (web, en paralelo).

## Cambios
- `app/modules/api/desglose_stats.py` (nuevo): `desglose(areas_q, platforms_q, requests_q, users_q=None)`; solo `count()` y `sum()`; `resto = total - parte` (la suma siempre cuadra).
- `app/modules/api/routes.py` (`stats`): la consulta de solicitudes por rol pasa a una variable reutilizada para contar y desglosar; agrega `payload['desglose']`. Claves existentes sin cambio.
- Constantes existentes: `ESTADO_ACTIVO` (`access_requests/catalogo.py`) y `ESTADO_PENDIENTE` (`access_requests/tipos.py`); sin literales ni variables nuevas.
- `docs/contratos/inicio.md` v1.1 e índice de `docs/contratos/README.md`.

## Pruebas
- `tests/home/test_stats_desglose.py` (fallaron antes de implementar: 5 de 5; el usuario inactivo no se prueba como sesión porque no puede iniciarla): superadmin (cada indicador y suma), admin de área (solo lo suyo), usuario normal (solicitudes propias, sin `users`), `users` solo para administradores, claves existentes presentes.

## Verificación
- `python -m pytest -q -p no:cacheprovider tests/home/test_stats_desglose.py`: 8 passed. Suite completa: 3095 passed, código de salida 0.
- No verificado: sin PostgreSQL real (pruebas con la BD de pruebas del proyecto); el `sum` y `order_by(None)` son SQL estándar.

## Impacto en elementos compartidos
Salida de `impacto.py` (contra `develop`):

| Elemento modificado | Tipo | Definido en | Usado en | ¿Validado? |
|---|---|---|---|---|
| `stats` | función | `app/modules/api/routes.py` | `home/api.py`, `home/services.py`, `frontend/src/components/dashboard.tsx`, `plantillas/pantalla-panel.tsx`, `lib/api.ts` y sus pruebas (+4) | Cambio solo aditivo (clave `desglose`); sin validar en pantalla |

- `scoped_areas`, `scoped_platforms`, `scoped_users` y `bandeja` solo se reutilizan.

## Bitácora
- 2026-11-19: pruebas primero (fallan), implementación, contrato v1.1, cierre.
