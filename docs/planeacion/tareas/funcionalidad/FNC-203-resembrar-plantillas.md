# FNC-203 — Resembrar las plantillas de correo que falten

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada** | 2026-11-25 |
| **Origen** | Pedido del dueño: faltaban plantillas en pegasus |

## Alcance
- Migración `0022_resembrar_plantillas` (down `0021`): inserta solo las plantillas cuyo `slug` no existe; nunca toca una existente (puede estar editada).
- Sin cambiar el contenido de las plantillas ni las migraciones 0003, 0016 y 0020.

## Decisiones
| Tema | Decisión |
|---|---|
| Fuente del texto | Se cargan por ruta (`importlib.util`, el nombre del archivo no es importable) `PLANTILLAS` de 0003 y 0016 y `ONBOARDING` y `CUERPO_INICIALES` de 0020; no se copia texto |
| `credenciales_iniciales` | Se siembra con el cuerpo vigente de 0020 (el que deja `upgrade head`), no el de 0016 |
| `downgrade` | No-op documentado: no se borran plantillas que pudieron editarse |
| Motores | Solo SQLAlchemy Core (`select` + `bulk_insert`); igual en SQLite y MySQL |
| Arranque | Sin cambios (ver causa) |

## Causa probable (sin confirmar en el servidor)
- Faltaban justo las 4 de 0003 y estaban las de 0016 y 0020: la BD corrió 0016 y 0020 pero no 0003.
- Antes de FNC-160 `create_app()` hacía `create_all` al arrancar (por eso 0016 tiene `_quitar_tabla_vacia_creada_al_arrancar`): la BD nació con las tablas pero sin los datos que siembran las migraciones.
- Después se marcó con `alembic stamp` en una revisión entre 0003 y 0015 (el instalador solo documenta `stamp 0001`, que sí correría 0003); `upgrade head` ya no la ejecutó y sí 0016 y 0020.
- `app/__init__.py` (`_crear_tablas`) hoy solo hace `create_all` con `APP_ENV=development`; no siembra plantillas. La restauración de respaldo solo crea o actualiza por `slug`, no borra. No hay bug claro en el arranque; no se cambia.

## Archivos
| Archivo | Cambio |
|---|---|
| `migrations/versions/0022_resembrar_plantillas.py` | Nuevo |
| `tests/test_migracion_0022_plantillas.py` | Nuevo: 4 pruebas (faltantes, editada intacta, idempotente, downgrade no-op) |
| `docs/backend/README.md`, `TABLERO.md`, `docs/logs/2026-11-25.md` | Documentación |

## Impacto en elementos compartidos
Ninguno: no se modificó ningún elemento compartido; `notification_templates` solo recibe filas faltantes.

## Verificación
- `tests/test_migracion_0022_plantillas.py`, `test_migraciones.py`, `0016`, `0020`, `test_notificaciones.py` y `tests/notifications`: 91 passed (SQLite). MySQL no probado (solo Core).
- Suite completa: 3479 passed, 0 fallas (13 min 31 s).

## Bitácora
- 2026-11-25: migración, pruebas y documentación.
