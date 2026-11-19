# FNC-157 — Instalar sin Authelia (`OIDC_HABILITADO=false`)

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `fnc/FNC-157-instalar-sin-oidc` |

## Contexto
- El preflight del servidor daba `FALTA OIDC_*` y detenía la instalación: el dueño aún no configura Authelia.
- Decisión del dueño (2026-11-19): mientras tanto, «solo emergencia».

## Cambios
- `oidc_configuracion.py`: `OIDC_HABILITADO` (`false`/`0`/`no` = apagado; vacía/`true` = como antes; otro valor = error de arranque). Apagado → `leer_configuracion()` devuelve `None` y la app arranca; `OIDC_HABILITADO` no cuenta como variable OIDC definida.
- `deploy/oidc.sh`: apagado = `AVISO` y sale 0; valor inválido = `FALTA`.
- `.env.example`, `VARIABLES.md`, `HISTORIAL.md`, guía `AUTHELIA-OIDC.md`.

## Decisiones
- Por defecto sigue encendido (lo seguro); apagarlo es explícito.
- Valor mal escrito detiene el arranque en vez de apagar Authelia en silencio.

## Pruebas
- `tests/test_oidc_configuracion.py` y `tests/deploy/test_oidc_sh.py`: 8 pruebas nuevas que fallaban antes del cambio.

## Auditoría de seguridad
- Diferida a la auditoría completa al terminar la plataforma (decisión del dueño 2026-11-19).
