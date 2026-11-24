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
| Elemento | Usado en | ¿Validado? |
|---|---|---|
| Logger `app.modules.auth.autoservicio` (+ hijos) | `directory/depuracion.py`, `tests/test_depuracion_ldap.py` | Sí, prueba nueva |
| `ErrorAutoservicio` y 7 operaciones | `api/auth.py` | Sí, pruebas de API |
| Variables `SMTP_*`, `DEBUG_SMTP`, `SECRET_KEY`, `OIDC_ISSUER_URL`, `AUTHELIA_URL`, `PASSWORD_POLICY_GENERATED_LENGTH` | otros módulos las leen también; solo cambió dónde las lee el autoservicio | Sí |
| `.env.example` | quien lo copie: variables del autoservicio activas y vacías | Sí |

## Bitácora
- 2026-11-24: división, pruebas, revisión y auditoría de seguridad; cierre.
