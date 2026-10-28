# FNC-134 — Producción exige base de datos real (MySQL); SQLite solo en desarrollo

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend (con scripts de `deploy/`) |
| **Agente** | desarrollador |
| **Fase** | 6 |
| **Módulo / Área** | config |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Creada** | 2026-10-28 |
| **Inicio** | 2026-10-28 |
| **Rama** | `fnc/FNC-134-bd-real-en-produccion` |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (configuración) |

## Contexto
- Decisión del dueño (2026-10-28): «puedo seguir usando SQLite, pero en producción tiene que ser una db».
- Sin `DB_ENGINE=mysql` el portal caía en SQLite en silencio (`app/utils/uri_bd.py`).
- Es la parte de `DB_ENGINE` de FNC-009 (fase 5, en pausa); el dueño la pidió antes.

## Alcance
- **Incluye:** validación en `construir_uri_bd()` (la usan `create_app` y Alembic); `deploy/motor_bd.sh` en `preflight.sh` e `install.sh`; documentación y variables.
- **No incluye:** `SECRET_KEY`, `debug`, `BASE_URL`, `DB_ENGINE` desconocido en desarrollo (siguen en FNC-009).

## Criterios de aceptación
- [x] Con `APP_ENV` distinto de `development` (incluido vacío), la app no arranca si `DB_ENGINE` no es `mysql`, con mensaje sin secretos.
- [x] Con `APP_ENV=development`, SQLite sigue igual.
- [x] `preflight.sh` e `install.sh`: `FALTA` y se detienen; solo se lee `APP_ENV` y `DB_ENGINE`.
- [x] VARIABLES.md, HISTORIAL.md (con motivo), `.env.example` y `deploy/README.md`.
- [x] Pruebas escritas primero (fallaban por `ImportError`) y ahora pasan.

## Impacto cruzado
- Parte de → FNC-009 (anotado en su ficha).
- `tests/conftest.py` fija `APP_ENV=development` (SQLite de la suite); las pruebas que necesitan otro valor ya lo fijan con `monkeypatch`.

## Impacto en elementos compartidos
- `construir_uri_bd()` (`app/utils/uri_bd.py`): lo usan `create_app()` y `migrations/env.py`; ambos ahora fallan fuera de dev sin MySQL.
- `tests/conftest.py`: afecta a toda la suite (`APP_ENV=development` por defecto).

## Verificación
- Pruebas nuevas escritas primero: fallaron en recolección (`ImportError` de `ErrorConfiguracionBD`) antes de implementar.
- `pytest` completo de `tests/` (venv del proyecto): código de salida **0**, 2619 passed, 13 xfailed.
- Una primera corrida completa dio 2 fallos, corregidos: `test_noop_solo_se_registra_en_dev_o_pruebas` y `test_arranque_fuera_de_dev_con_vaultwarden_incompleto_falla` arrancaban la app fuera de dev sin `DB_ENGINE=mysql`; ahora lo fijan con `monkeypatch`.
- `bash -n` de `preflight.sh`, `install.sh` y `motor_bd.sh`: 0.
- No verificado: `preflight.sh` e `install.sh` completos en un servidor (solo `motor_bd.sh` con `.env` sintéticos y que ambos lo cargan y llaman); `revisor` y `auditor-seguridad` no ejecutados desde esta sesión.
- `impacto.py`: `construir_uri_bd` (usada por `app/__init__.py` y `migrations/env.py`); `_es_desarrollo` (nueva, privada; el aviso por `demo/cli.py` es un nombre homónimo propio).

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-10-28 | Creada y aprobada (decisión del dueño); implementada; `xfail` de `test_sin_db_engine_no_arranca` retirado (ahora con `APP_ENV=production`); `test_db_engine_invalido_no_arranca` sigue `xfail` (desconocido en dev, FNC-009) |
