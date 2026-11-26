# FNC-210 — Aviso al desactivar plataforma o área

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- Dueño (2026-11-25): «cuando se desactiva una plataforma, ¿se notifica a los miembros?» (no).

## Cambios
- `notifications/desactivacion.py` (nuevo): `notificar_plataformas_desactivadas(plataformas, area)`; un correo por persona con acceso `activo`/`en_proceso`, cuenta activa y `pref_email_notifications`; interruptor `NOTIFY_PLATFORM_DEACTIVATION` (+ `ENABLE_NOTIFICATIONS`).
- `platforms/api.py::update_platform` y `areas/api.py::update_area`: llaman al aviso tras el commit, en `try`, solo al pasar de activa a `Inactivo`. Se definió `logger` en ambos (en `platforms/api.py` faltaba y lo usaba una rama de error).
- `notifications/access_notifications.py`: `avisos_activos(variable)` y `_enviar(interruptor=)` con la variable por omisión de siempre.
- Migración `0023`: plantilla `plataforma_desactivada` (solo inserta si falta). Variable en `VARIABLES.md`, `HISTORIAL.md`, `.env.example`; `docs/backend/README.md`.

## Decisiones
- Reactivar no avisa. Una plataforma ya inactiva, o de un área inactiva, no repite el aviso.
- Área con varias plataformas: `{plataforma}` lista las de esa persona separadas por coma.
- No se agregó a la resiembra de 0022: está publicada y sus pruebas fijan siete plantillas. Una BD marcada en `head` sin 0023 no tendrá la plantilla (el fallo queda en `notificacion_fallida`).
- El aviso queda en auditoría solo si falla (`notificacion_fallida`); el éxito sale en el log (`correo_enviado`, FNC-209).

## Pruebas
- `tests/platforms/test_aviso_desactivacion.py`: 10 (4 fallan sin el cambio en las APIs); `tests/test_migracion_0023_plantilla.py`: 3.
