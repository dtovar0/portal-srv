# ADR-010 — Base de datos: MySQL o PostgreSQL según `DB_ENGINE`

- **Estatus:** Aceptada (pedido del dueño, 2026-11-17) · **Fecha:** 2026-11-17 · **Tareas:** FNC-146, FNC-147
- **Modifica:** ADR-001 («MySQL es la BD objetivo») y la regla de FNC-134 (`DB_ENGINE=mysql` obligatorio fuera de desarrollo)

## Contexto
- El dueño pidió: «que funcione con mysql y postgresql y con el .env yo configuro qué motor quiero».
- El código ya era casi portable: migraciones con SQLAlchemy/Alembic (sin SQL de MySQL), `psycopg2-binary` ya instalado por los conectores, comparaciones de correos y nombres sin distinguir mayúsculas en la app (`lower`, `ilike`, `casefold`).

## Decisión
| Tema | Decisión |
|---|---|
| Motores admitidos fuera de desarrollo | `DB_ENGINE=mysql` (PyMySQL; MySQL o MariaDB) o `DB_ENGINE=postgresql` (psycopg2) |
| Desarrollo | Sin cambio: SQLite, MySQL o PostgreSQL |
| URI | `URL.create` (escapa usuario y contraseña); `DB_PORT` vacío = puerto del motor |
| Despliegue | `install.sh` y `preflight.sh` eligen servicio systemd, cliente y puerto por defecto según `DB_ENGINE` |
| Cambio de motor con datos | Fuera del alcance: se migra aparte (p. ej. `pgloader`) con respaldo previo |

## Consecuencias
- Las tareas nuevas no pueden usar SQL ni funciones propias de un motor; los datos en migraciones van con SQLAlchemy Core.
- Las pruebas corren en SQLite; el SQL de las migraciones de esquema se genera para MySQL y PostgreSQL en `tests/test_motor_bd_produccion.py`. Falta una corrida de la batería contra servidores reales (pendiente registrado en FNC-146).
- Riesgo residual: la restricción única de `users.email` distingue mayúsculas en PostgreSQL; la app ya compara en minúsculas antes de guardar.
