# FNC-154 — Bloqueo a propósito de la cuenta de emergencia

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Agente** | desarrollador |
| **Fase** | 8 |
| **Módulo / Área** | auth |
| **Prioridad** | Media |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-18 |
| **Estatus Git** | Rama local, sin push ni merge |
| **Rama** | `fnc/FNC-154-bloqueo-cuenta-emergencia` |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (autenticación) |
| **Origen** | Revisión de seguridad de FNC-141; preexistente desde FNC-014 |

## Contexto
- FNC-014: `POST /auth/local` responde 429 con 10 fallos por cuenta en 15 min (`LOGIN_MAX_INTENTOS_CUENTA`) o 30 por IP.
- Quien conozca el nombre de la cuenta de emergencia podía bloquearla a propósito justo cuando Authelia está caído.

## Cambios
- `app/modules/auth/limite_intentos.py`: `bloqueado(correo, omitir_limite_de_cuenta=False)`; con `True` solo cuenta el límite por IP.
- `app/modules/api/auth.py` (`local_login`): busca la cuenta antes del límite y pasa `es_cuenta_de_emergencia(user)` (superadmin local, FNC-077).
- Sin variable nueva; `LOGIN_MAX_INTENTOS_CUENTA` cambia de significado (HISTORIAL, VARIABLES).
- Docs: `docs/backend/README.md`, `docs/contratos/autenticacion.md`, `docs/seguridad/LINEAMIENTOS.md` (SEC-AUTH-10), CHANGELOG.

## Decisiones del orquestador (pendiente de validar)
- Sin bloqueo por cuenta para la de emergencia; solo IP (opción más simple y sin valores nuevos; el atacante queda bloqueado por su IP y el admin entra desde otra).
- Sin variable nueva ni ventana más corta: evita un valor mágico y una segunda política.
- Riesgo residual aceptado: la fuerza bruta contra esa cuenta solo la frena el límite por IP (30/15 min por IP); mitiga la política de contraseña (SEC-AUTH-12). Además, como las demás cuentas dan 429 tras 10 fallos y esta no, se puede inferir que un nombre es la cuenta de emergencia. Alternativa si el dueño lo prefiere: un tope por cuenta más alto para ella.
- Cuenta desactivada o de otro rol: sin cambio (límite normal).

## Verificación
- `tests/test_login_local.py`: `test_la_cuenta_de_emergencia_no_se_bloquea_por_fallos_de_cuenta` falló antes del cambio (1 failed, 31 passed) y pasa después; `test_la_cuenta_de_emergencia_si_se_bloquea_por_ip`; los de cuentas normales (429 a los 10, configurable, pocos fallos) sin cambio. Total del archivo: 32 passed.
- Batería de auth (`-k "auth or login or sso or oidc or emergencia or matriz"`): 276 passed, 2749 deselected, código de salida 0.
- Suite completa (`python -m pytest -q -p no:cacheprovider`): 3025 passed, código de salida 0 (971 s).
- `revisor` y `auditor-seguridad` no se ejecutaron en esta sesión (subagente): pendientes para el orquestador.
- No verificado: despliegue real ni IP detrás de proxy en producción.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en | ¿Validado? |
|---|---|---|---|
| `limite_intentos.bloqueado` (parámetro opcional nuevo) | función | solo `POST /auth/local`; con el valor por defecto se comporta igual | ☐ |

`impacto.py` marcó `bloqueado` como usado en `frontend/src` y `tests`: falso positivo por coincidir con la palabra común; la importación real de `limite_intentos` es solo `app/modules/api/auth.py`.

## Auditoría de seguridad
- Pendiente: el dueño decidió (2026-11-19) hacerla al terminar la plataforma, en una auditoría completa. Integrada sin ella.
