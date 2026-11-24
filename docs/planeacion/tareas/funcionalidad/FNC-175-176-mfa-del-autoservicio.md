# FNC-175 y FNC-176 — Segundo factor del autoservicio

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Prioridad** | Crítica |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Origen** | auditor-seguridad durante FNC-174 (preexistentes) |

## Hallazgos
| ID | Falla | Ataque |
|---|---|---|
| FNC-175 | `validar_desafio_mfa` solo comparaba el hash del código, no el correo del desafío | Pedir un código para la cuenta propia y usarlo con `identifier` de otra en `restablecer-mfa` → contraseña ajena cambiada en LDAP |
| FNC-176 | Con `AUTOSERVICIO_MFA_ENABLED=false` (valor de `.env.example`) `validar_desafio_mfa` devuelve `True` | `restablecer-mfa` con cualquier código no vacío → cualquier contraseña cambiada |

## Cambios
- `autoservicio_mfa.py`: `correo_de_la_cuenta(identificador)` (extraída de `solicitar_codigo_mfa`, misma resolución LDAP → portal); el desafío vale solo si su correo es el de esa cuenta; `hmac.compare_digest` en código y correo; mismo mensaje `401` (sin enumeración).
- `autoservicio.py`: `restablecer_directo_mfa` responde `403` (`MENSAJE_SIN_MFA_DIRECTO`) si el MFA está apagado.

## Pruebas
- `tests/test_autoservicio_mfa_ligado.py` (5): 4 fallaron sin el arreglo (el ataque funcionaba); el código propio sigue funcionando.
- `test_restablecer_con_mfa_cuenta_sso_solo_cambia_ldap` activa MFA (con MFA apagado ahora es `403`).

## Verificación
- Área (autoservicio, cuentas, guardia, protección por rol): 435 passed. Suite completa: ver bitácora del cierre.

## Pendiente del dueño
- Producción debe tener `AUTOSERVICIO_MFA_ENABLED=true` para ofrecer el restablecimiento directo; con `false` solo funciona el enlace por correo.
- El modo `authenticator` no es utilizable: el secreto TOTP nunca se muestra para darlo de alta (no es explotable sin `SECRET_KEY`).
