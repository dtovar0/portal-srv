# FNC-147 — Despliegue según el motor de BD

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Fase** | 8 |
| **Módulo / Área** | deploy |
| **Prioridad** | Alta |
| **Estatus** | Hecha |
| **Creada / Inicio / Finalizada** | 2026-11-17 |
| **Rama** | `fnc/FNC-146-motor-bd-postgresql` |
| **Depende de** | FNC-146 |

## Cambios
- `deploy/motor_bd.sh`: acepta `mysql` o `postgresql`; `motor_bd_de_env` (sin `.env` imprime vacío, no corta `set -e`).
- `deploy/servicio_bd.sh`: detección por motor (`postgresql.service`); cliente `psql` (paquete `postgresql`).
- `install.sh` y `preflight.sh`: servicio, cliente y puerto por defecto (3306/5432) según `DB_ENGINE`; plantillas y README.

## Pruebas
- `tests/deploy/test_motor_bd_sh.py` y `tests/deploy/test_servicio_bd_sh.py`: casos de PostgreSQL con `systemctl` y `dnf` falsos.
