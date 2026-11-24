# FNC-168 — Autoservicio con cuentas del directorio y altas `sso`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Contrato** | `areas-y-roles` v3.2, `usuarios-directorio` v3.1 |

## Contexto
- Dueño (2026-11-24): «confírmame que va a funcionar el autoservicio para restablecer la contraseña»; «las cuentas creadas en el portal se crean en LDAP, con Authelia en medio: deben ser `sso`»; «al restablecer, actualiza el password de LDAP, ahí residen mis usuarios».
- Revisión general: `test_guardia_rutas` fallaba (8 rutas de autoservicio sin caso en la matriz).

## Hallazgos y correcciones
| # | Hallazgo | Severidad | Corrección |
|---|---|---|---|
| 1 | Cambiar/restablecer copiaba la contraseña como hash local a la cuenta del portal; una cuenta `sso` con hash queda bloqueada en Authelia (`motivo_de_bloqueo` → `cuenta_local_en_conflicto`) | Crítica | `auth/autoservicio_cuentas.py`: solo cuentas `local` guardan hash |
| 2 | Si la persona no estaba en LDAP, se fijaba un hash local a cualquier cuenta (también `sso`) | Alta | El respaldo local solo aplica a cuentas `local`; si no, 404 |
| 3 | Búsqueda local con `ilike` y el texto del usuario: `%` era comodín | Media | Búsqueda exacta; por usuario, `LIKE` con escape |
| 4 | Enlace de recuperación armado con `request.host_url` (cabecera `Host`) | Alta | Solo `BASE_URL` (`url_del_portal`); sin ella no se envía; consulta con `urlencode`; sin dominio fijo de respaldo |
| 5 | Altas del portal como `ldap` | Decisión del dueño | `ORIGEN_DIRECTORIO = ORIGEN_SSO`; migración 0019 (`ldap`→`sso` y sin hash en `sso`) |
| 6 | Rutas `/auth/autoservicio/*` sin caso en la matriz | Media | 8 casos públicos (GET 200, POST sin cuerpo 400) |

## Pruebas
- `tests/test_autoservicio_cuentas_directorio.py` (12; 6 fallaron sin el arreglo), `tests/test_migracion_0019_sso.py`, casos nuevos en `tests/matriz_proteccion.py`; pruebas de alta ajustadas de `ldap` a `sso`.

## Verificación
- Ver bitácora del cierre (suite completa).
- No verificado contra el OpenLDAP real: la cuenta de bind necesita escritura sobre `userPassword` en `ou=users`.

## Impacto
| Elemento | Usado en | ¿Validado? |
|---|---|---|
| `ORIGEN_DIRECTORIO` (ahora `sso`) | `directory_accounts.py`, `acceso_local.origen_de_alta` | Sí, pruebas de alta |
| `ORIGENES_VINCULADOS` | `motivo_de_bloqueo`, `restablecer_contrasena.py` | Sí |
| `solicitar_recuperacion` (sin `base_url`) | `api/auth.py` | Sí |
| `auth_source` mostrado en la web | lista y tarjeta de usuarios | FNC-169 |
