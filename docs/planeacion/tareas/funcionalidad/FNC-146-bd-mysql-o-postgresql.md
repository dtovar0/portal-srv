# FNC-146 — BD: MySQL o PostgreSQL según `DB_ENGINE`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Módulo / Área** | config |
| **Prioridad** | Alta |
| **Estatus** | Hecha |
| **Creada / Inicio / Finalizada** | 2026-11-17 |
| **Rama** | `fnc/FNC-146-motor-bd-postgresql` |
| **Requiere migración BD** | No |
| **Decisión** | ADR-010 |

## Cambios
- `app/utils/uri_bd.py`: `DB_ENGINE` = `mysql` o `postgresql` fuera de desarrollo; URI con `URL.create` (escapa `@`, `:`, `/` de la contraseña); `DB_PORT` vacío = puerto del motor; no numérico → `ErrorConfiguracionBD`.
- Revisión de portabilidad: migraciones sin SQL de MySQL; correos y nombres ya se comparan sin mayúsculas en la app; sin funciones SQL propias de un motor.

## Pruebas
- `tests/test_motor_bd_produccion.py`: URI de PostgreSQL, contraseña con caracteres especiales, puerto vacío y no numérico, motores no admitidos, y SQL de las migraciones de esquema (0001-0011, `alembic --sql`) para MySQL y PostgreSQL.

## Pendiente
- Correr la batería contra PostgreSQL y MySQL reales: en esta laptop no hay PostgreSQL ni acceso a Docker para el agente. Prueba de humo en el servidor: `alembic upgrade head`, login, crear área, plataforma y solicitud.
