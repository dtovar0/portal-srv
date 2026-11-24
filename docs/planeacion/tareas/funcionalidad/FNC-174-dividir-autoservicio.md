# FNC-174 — Dividir el monolito del autoservicio

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Contrato** | ninguno (sin cambio de API) |

## Contexto
- Revisión general: `app/modules/auth/autoservicio.py` tenía ~1000 líneas, tres copias del envío SMTP y variables leídas en varios puntos. Aprobada por el dueño el 2026-11-24.
- Alcance: dividir sin cambiar comportamiento ni respuestas HTTP.

## Módulos resultantes
| Módulo | Responsabilidad | Líneas |
|---|---|---|
| `autoservicio_errores.py` | `ErrorAutoservicio` | 10 |
| `autoservicio_config.py` | variables (principales y alias), constantes, política y configuración | ~160 |
| `autoservicio_correo.py` | SMTP, un solo envío, 3 correos (código MFA, confirmación, enlace) | ~400 (la mayoría es HTML movido sin cambios) |
| `autoservicio_mfa.py` | serializador, token de recuperación, código MFA, TOTP | ~220 |
| `autoservicio_externos.py` | sincronización con JumpServer | 27 |
| `autoservicio.py` | operaciones y re-exportación de nombres públicos | ~330 |
| `autoservicio_cuentas.py` | cuenta del portal (FNC-168, reutilizado) | 48 |

## Decisiones
- Alias heredados conservados; `.env.example` los lista vacíos (el validador exige `^NOMBRE=`).
- Loggers hijos `app.modules.auth.autoservicio.{correo,mfa,externos}`: la depuración de LDAP engancha el logger padre (revisor H1).
- Logs: solo `type(exc).__name__`; sin `exc_info`; el log «SMTP no activo» ya no escribe el token del enlace (antes sí).
- Se conservan a propósito (no cambiar respuestas): texto de excepción SMTP al cliente en `solicitar_codigo_mfa`, llaves de respaldo de `SECRET_KEY`, HTML con el nombre sin escapar.
- `AUTOSERVICIO_BRAND_NAME` no la lee ningún código (la marca es `MARCA_NOMBRE`); se marca «Sin uso».

## Pruebas
- Patches movidos al módulo nuevo sin cambiar aserciones: `enviar_correo_mfa` → `autoservicio_mfa`; `resolver_smtp_autoservicio` y el logger del enlace → `autoservicio_correo`; `enviar_correo_confirmacion_cambio` queda en `autoservicio`.
- Nuevas: el log del enlace no lleva `token=`; los tres loggers hijos llegan al archivo de depuración.

## Verificación
- Pruebas dirigidas (autoservicio, cuentas, oidc, protección por rol, guardia de rutas): 498 passed (antes de los ajustes de loggers); autoservicio + cuentas + depuración LDAP tras ellos: 47 passed.
- Suite completa: `pytest -q -p no:cacheprovider` → 3246 passed, 0 failed, código de salida 0 (18 min 19 s); misma cifra que la línea base de develop.
- `validar_proyecto.py`: 0 errores, 1 aviso (variables del frontend y del sistema: ENABLE_PORTADA, NEXT_PUBLIC_*, NODE_ENV, PATH; ajenas a la tarea). Sin avisos de autoservicio; ningún alias borrado.
- Plantillas HTML de los 3 correos comparadas con el original: idénticas.
- `revisor` (H1 corregido, H2/H4/H6/H7 atendidos; H3: el tablero sigue la instrucción del dueño), `auditor-seguridad`: Con observaciones, sin bloqueantes propios.
- No verificado: envío SMTP ni JumpServer reales.

## Hallazgos (tareas Propuesta)
| Tarea | Hallazgo | Severidad |
|---|---|---|
| FNC-175 | Desafío MFA por correo no ligado a la cuenta | Crítica (preexistente) |
| FNC-176 | MFA desactivado: restablecimiento directo sin factor | Crítica (preexistente) |
| FNC-177 | Llaves de respaldo, escape HTML, `compare_digest`, texto SMTP al cliente | Media/Baja |

## Impacto en elementos compartidos

Salida de `impacto.py` (2026-11-24). Las variables solo cambiaron de lugar de lectura en el autoservicio; su significado no cambió. `__init__`, `_entorno`, `quit` y `change_password` son coincidencias de nombre con código ajeno, no usos del autoservicio. A validar: logger del autoservicio y `directory/depuracion.py` (probado), `api/auth.py` (7 operaciones, probado) y `notifications/services.py` (comparte `SMTP_*` y `DEBUG_SMTP`).

**⚠ Impacto en elementos compartidos** (comparado contra `develop`): este cambio toca 22 elemento(s) usados en otras secciones: app, app/modules, app/utils, frontend, frontend/src, frontend/tests, migrations/versions, tests, tests/areas, tests/connectors, tests/deploy, tests/directory, tests/provisioning, tests/secretos, tests/users. Valida cada una antes de integrar.

| Elemento modificado | Tipo | Definido en | Usado en (fuera de la tarea) | Áreas afectadas | ¿Validado? |
|---|---|---|---|---|---|
| `AUTHELIA_URL` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/api/auth.py` | app/modules | ☐ |
| `DEBUG_SMTP` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/notifications/services.py` | app/modules | ☐ |
| `ErrorAutoservicio` | clase | `app/modules/auth/autoservicio.py`, `app/modules/auth/autoservicio_errores.py` | `app/modules/api/auth.py` | app/modules | ☐ |
| `OIDC_ISSUER_URL` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/api/auth.py`, `app/modules/auth/oidc.py`, `app/modules/auth/oidc_configuracion.py`, `tests/deploy/test_oidc_sh.py`, `tests/oidc_simulado.py`, `tests/test_oidc_configuracion.py` | app/modules, tests, tests/deploy | ☐ |
| `PASSWORD_POLICY_GENERATED_LENGTH` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/users/politica_contrasena.py` | app/modules | ☐ |
| `SECRET_KEY` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/__init__.py`, `app/modules/provisioning/saneo.py`, `tests/conftest.py`, `tests/deploy/test_puertos_sh.py`, `tests/secretos/test_sends.py`, `tests/test_arranque.py` | app, app/modules, tests, tests/deploy, tests/secretos | ☐ |
| `SMTP_ENCRYPTION` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/notifications/services.py`, `tests/test_notificaciones.py` | app/modules, tests | ☐ |
| `SMTP_PASSWORD` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/notifications/api.py`, `app/modules/notifications/models.py`, `app/modules/notifications/services.py`, `app/modules/provisioning/saneo.py`, `frontend/src/components/settings/smtp-tab.tsx`, `migrations/versions/0013_vaciar_contrasena_smtp.py`, `tests/test_notificaciones.py`, `tests/test_secretos_en_respuestas.py` | app/modules, frontend/src, migrations/versions, tests | ☐ |
| `SMTP_PORT` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/notifications/services.py`, `tests/test_notificaciones.py` | app/modules, tests | ☐ |
| `SMTP_SERVER` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/notifications/api.py`, `app/modules/notifications/services.py`, `tests/test_notificaciones.py`, `tests/test_secretos_en_respuestas.py` | app/modules, tests | ☐ |
| `SMTP_USER` | variable de entorno | `app/modules/auth/autoservicio.py` | `app/modules/notifications/services.py`, `tests/test_notificaciones.py`, `tests/test_secretos_en_respuestas.py` | app/modules, tests | ☐ |
| `__init__` | función | `app/modules/auth/autoservicio.py`, `app/modules/auth/autoservicio_errores.py` | `app/modules/access/errores.py`, `app/modules/audit/parametros.py`, `app/modules/auth/oidc.py`, `app/modules/connectors/api_http.py`, `app/modules/connectors/base.py`, `app/modules/connectors/base_de_datos.py`, `app/modules/connectors/credenciales.py`, `app/modules/connectors/http_transporte.py` (+36) | app/modules, app/utils, tests, tests/areas, tests/connectors, tests/directory, tests/provisioning, tests/secretos, tests/users | ☐ |
| `_entorno` | función | `app/modules/auth/autoservicio_correo.py` | `app/modules/connectors/credenciales.py`, `app/modules/secretos/sends.py`, `tests/test_oidc_configuracion.py` | app/modules, tests | ☐ |
| `cambiar_contrasena` | función | `app/modules/auth/autoservicio.py` | `app/modules/api/auth.py`, `tests/connectors/test_credenciales_vaultwarden.py`, `tests/secretos/test_vaultwarden.py`, `tests/secretos/vaultwarden_falso.py` | app/modules, tests/connectors, tests/secretos | ☐ |
| `change_password` | función | `tests/test_autoservicio_cuentas_directorio.py` | `app/modules/directory/writer.py`, `app/modules/users/directory_accounts.py`, `app/modules/users/entrega_credenciales.py`, `tests/directory/test_writer.py` | app/modules, tests/directory | ☐ |
| `obtener_configuracion_autoservicio` | función | `app/modules/auth/autoservicio.py`, `app/modules/auth/autoservicio_config.py` | `app/modules/api/auth.py` | app/modules | ☐ |
| `quit` | función | `tests/test_autoservicio.py` | `app/modules/notifications/services.py`, `frontend/tailwind.config.ts`, `frontend/tests/accesibilidad/colores-literales.excepciones.ts`, `tests/smtp_falso.py` | app/modules, frontend, frontend/tests, tests | ☐ |
| `restablecer_con_token` | función | `app/modules/auth/autoservicio.py` | `app/modules/api/auth.py` | app/modules | ☐ |
| `restablecer_directo_mfa` | función | `app/modules/auth/autoservicio.py` | `app/modules/api/auth.py` | app/modules | ☐ |
| `solicitar_codigo_mfa` | función | `app/modules/auth/autoservicio.py`, `app/modules/auth/autoservicio_mfa.py` | `app/modules/api/auth.py` | app/modules | ☐ |
| `solicitar_recuperacion` | función | `app/modules/auth/autoservicio.py` | `app/modules/api/auth.py` | app/modules | ☐ |
| `verificar_codigo_mfa_paso2` | función | `app/modules/auth/autoservicio.py`, `app/modules/auth/autoservicio_mfa.py` | `app/modules/api/auth.py` | app/modules | ☐ |

## Bitácora
- 2026-11-24: división, pruebas, revisión y auditoría de seguridad; cierre.
