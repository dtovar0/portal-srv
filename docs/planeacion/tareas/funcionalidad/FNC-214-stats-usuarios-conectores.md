# FNC-214 — `GET /stats`: usuarios por rol y conectores

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26): en Solicitudes quiere un KPI con la cantidad de conectores y otro del total de usuarios separado en usuarios y administradores. Web en DIS-141.

## Cambios
- `api/desglose_stats.py`: `users_by_role` (rol `usuario` / administradores, mismo alcance que `users`) y `conectores()` (total; asociados / sin asociar).
- `api/routes.py::stats`: `connectors` y `desglose.connectors` solo para el superadmin (SEC-CON-11).
- Contrato `inicio.md` 1.2.

## Decisiones
- Administradores = `admin_area` + `administrador`.
- «Sin asociar» usa `platform_id` nulo: hoy siempre 0; cobra sentido con FNC-213.

## Pruebas
- `tests/home/test_stats_usuarios_conectores.py` (3; fallaban sin el cambio) y `test_stats_desglose.py` con las claves nuevas.
