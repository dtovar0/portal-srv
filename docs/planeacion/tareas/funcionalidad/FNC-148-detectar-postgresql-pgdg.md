# FNC-148 — Detectar PostgreSQL de PGDG

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-17 |
| **Rama** | `fnc/FNC-148-detectar-postgresql-pgdg` |

## Contexto
- El servidor del dueño corre PostgreSQL 17 de PGDG (`/usr/pgsql-17`); su unidad es `postgresql-17.service` y el preflight decía «sin servicio de BD local».

## Cambios
- `deploy/servicio_bd.sh`: con `DB_ENGINE=postgresql`, si no hay `postgresql.service` toma la `postgresql-NN.service` de versión mayor (no alias). `--db-service` sigue ganando.

## Pruebas
- `tests/deploy/test_servicio_bd_sh.py`: versión única, varias versiones (comparación numérica), preferencia del servicio del sistema, alias y nombres que no son versión, y que MySQL no la tome.
