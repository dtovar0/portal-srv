# FNC-160 — Sin `create_all` fuera de desarrollo

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `fnc/FNC-160-sin-create-all-fuera-de-dev` |

## Contexto
- En el servidor del dueño (PostgreSQL) los servicios arrancaron con código nuevo antes de migrar; `create_app()` corrió `db.create_all()` y creó `credential_deliveries` vacía. `alembic upgrade head` falló con DuplicateTable en 0016 y se revirtió todo (BD en 0012).
- Pedido del dueño: que la actualización sea transparente (la parte de `install.sh` es FNC-159).

## Cambios
- `app/__init__.py`: `db.create_all()` solo con `APP_ENV=development`; fuera, el esquema es solo por migraciones.
- Migración 0016: si `credential_deliveries` ya existe vacía, se quita y se crea con su esquema; con filas, se detiene con mensaje (nunca borra datos).
- `docs/backend/README.md`.

## Pruebas
- `tests/test_arranque.py` (sin `create_all` fuera de desarrollo; sí en desarrollo) y `tests/test_migracion_0016_entregas.py` (tabla vacía previa no detiene el upgrade; con filas sí). Fallaban antes del cambio.
