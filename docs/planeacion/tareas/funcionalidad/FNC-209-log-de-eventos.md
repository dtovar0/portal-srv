# FNC-209 — Log de eventos activable por `DEBUG_EVENTOS`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- Dueño (2026-11-25): ver en un log solicitudes, aprobaciones, altas/bajas en grupos, correos y quién fue; activarlo con una variable del `.env`.

## Cambios
- `audit/log_eventos.py` (nuevo): con `DEBUG_EVENTOS=true`, una línea `clave=valor` por evento en `logs/eventos.log` (`resolver_carpeta_logs`; `RotatingFileHandler` 5 MB × 5) y en consola/journald. Resuelve usuario, plataforma y área por id (lecturas por PK, solo encendido). Sin `before`/`after`; detalle sin secretos ni enlaces y recortado a 300.
- `audit/services.py::add_audit_log`: punto único del log; parámetro nuevo `solo_log` (no toca la BD).
- Eventos nuevos (catálogo + contrato `auditoria.md`, aditivo): `miembro_agregado`/`miembro_quitado` (`audit/miembros.py`; BD + log desde `provisioning/ldap_provider.py`, solo log desde `users/grupos_de_rol.py`) y `correo_enviado` (solo log, `notifications/services.py`, correos enmascarados `a***@dominio`).
- Variable en `VARIABLES.md`, `HISTORIAL.md`, `.env.example`; `docs/backend/README.md` y `deploy/README.md`.

## Decisiones
- `correo_enviado` solo log: sería mucho ruido en la BD y se envía desde puntos con cambios sin guardar.
- `grupos_de_rol` solo log: quien llama puede tener cambios sin guardar; un commit ahí los guardaría antes de tiempo.
- Actor = correo de la sesión (`sistema` para el worker); usuario = correo de la cuenta afectada.

## Pruebas
- `tests/audit/test_log_eventos.py`: 11 (apagado sin archivo, una línea con actor y nombres, sin secretos, fallo del log, correo, miembros).
- Bloque `audit`, `provisioning`, `users`, `notifications`, `directory`, `alta`: 926 passed (antes de agregar las 11).

## Impacto en elementos compartidos
- `add_audit_log` (usado en todo el backend): firma con un parámetro opcional nuevo; comportamiento igual con la variable apagada.
- `Evento` (catálogo): +3 valores; la pantalla de Auditoría del frontend necesita etiquetas para ellos.
