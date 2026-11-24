# FNC-177 — Endurecimiento del autoservicio

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Origen** | auditor-seguridad durante FNC-174 (Medios/Bajos) |

## Cambios
| Hallazgo | Corrección |
|---|---|
| Claves de firma de respaldo fijas (`authelia-fallback-secret`, `authelia-key`) | `clave_secreta()` usa solo `SECRET_KEY` (la app no arranca sin ella) |
| Nombre (de LDAP o del portal) sin escapar en el HTML de los correos | `html.escape` de marca, nombre y enlace en las 3 plantillas |
| Comparación del TOTP con `==` | `hmac.compare_digest` (el desafío por correo ya lo usa desde FNC-175) |
| Texto de la excepción SMTP (servidor y puerto internos) devuelto al cliente | `ENVIO_FALLIDO_MENSAJE` genérico; el detalle queda en el log solo por tipo |
| `VARIABLES.md` decía `false` por omisión para `AUTOSERVICIO_MFA_ENABLED` | Corregido a `true` (lo que hace el código) |

## Pruebas
- `tests/test_autoservicio_endurecimiento.py` (5). Área del autoservicio: 57 passed.

## Verificación
- Suite completa: ver bitácora del cierre.
