# ADR-009 — Inicio de sesión con OIDC por Authelia

- **Estatus:** Aceptada (2026-11-17: decisión principal del dueño; subdecisiones 3B, 4B, 5A y 6A recomendadas por el orquestador y aceptadas por el dueño con «continua»; pendientes de validar en la prueba de concepto) · **Fecha:** 2026-11-17 · **Tareas:** FNC-140, FNC-141, FNC-142, FNC-143
- **Reemplaza:** el SSO por cabeceras `Remote-*` (forward-auth) y el login directo contra LDAP (FNC-042). **Deja sin objeto:** FNC-006 y SEC-AUTH-01/02 en lo que toca a `Remote-*`

## Contexto
- Hoy: `POST /api/v1/auth/sso` confía en `Remote-Email`/`Remote-Name` si el origen está en `TRUSTED_PROXIES` (`app/modules/api/auth.py`); `POST /api/v1/auth/login` con `method=directory` hace bind contra OpenLDAP; `method=local` solo para la cuenta de emergencia (`app/modules/auth/acceso_local.py`, FNC-077).
- Cabeceras de proxy: suplantables si el proxy falla o se salta (SEG-04, FNC-004/006 aún en Propuesta).

## Decisión del dueño (2026-11-17, confirmada)
| # | Tema | Decisión |
|---|---|---|
| 1 | Protocolo | OIDC, flujo de código de autorización con PKCE (S256), `state` y `nonce`, con Authlib |
| 2 | Acceso | Todo por Authelia; se retira el login LDAP directo; se conserva una ruta separada para la cuenta local de emergencia |
| 2a | Rol | Se mantiene SEG-10: el rol no sale de los grupos del token; la cuenta nueva entra como `usuario` |
| 2b | Cierre | Borra la sesión del portal y redirige al cierre de Authelia |
| 2c | Variables | `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (secreto), `OIDC_REDIRECT_URI`, `OIDC_SCOPES` |

## Decisión 3 — Con qué se enlaza la cuenta del portal
| Alternativa | Pros | Contras |
|---|---|---|
| **A. Correo (`email` de userinfo), como hoy** | Sin migración; misma regla `motivo_de_bloqueo` | Un cambio de correo en LDAP crea otra cuenta |
| B. `sub` del token en una columna nueva | Identificador estable | Migración y vinculación inicial de las cuentas existentes |

## Decisión 4 — URL de cierre
| Alternativa | Pros | Contras |
|---|---|---|
| A. `end_session_endpoint` del descubrimiento | Estándar | Authelia puede no publicarlo (según versión) |
| **B. Variable `OIDC_LOGOUT_URL` (reemplaza `AUTHELIA_SLO_URL`), con `end_session_endpoint` si existe** | Funciona con cualquier versión | Una variable más |

## Decisión 5 — Origen (`auth_source`) de las cuentas que entran por OIDC
| Alternativa | Pros | Contras |
|---|---|---|
| **A. Se conserva `sso`** | Sin migración; `ORIGENES_VINCULADOS` igual | El nombre no dice OIDC |
| B. Nuevo `oidc` | Explícito | Migración de datos y de todas las comparaciones |

## Decisión 6 — Ruta de emergencia
| Alternativa | Pros | Contras |
|---|---|---|
| **A. Siempre disponible en una ruta aparte (`/acceso-emergencia` y `POST /api/v1/auth/local`), sin enlace visible en el login** | Útil cuando Authelia cae | Superficie expuesta (pendiente el límite de intentos, FNC-014) |
| B. Enlace visible en el login | Fácil de encontrar | Invita a intentos |
| C. Activable por variable | Cerrada por defecto | Si Authelia cae, hay que editar el `.env` y reiniciar |

## Decisión final (2026-11-17)
| # | Elegida |
|---|---|
| 3 | B — `sub` del token en columna nueva; en el primer inicio por OIDC se vincula por correo (con `motivo_de_bloqueo`) y se guarda el `sub`; después solo por `sub` |
| 4 | B — `OIDC_LOGOUT_URL`, con `end_session_endpoint` si existe |
| 5 | A — se conserva `auth_source='sso'` |
| 6 | A — `/acceso-emergencia` siempre disponible, sin enlace visible |
| — | Versión de Authelia desconocida: FNC-143 documenta la sintaxis de 4.38+ y anota la diferencia con versiones previas |

## Recomendación original
- 3A, 4B, 5A, 6A. `OIDC_SCOPES` por defecto `openid profile email` (sin `groups`: SEG-10).

## Consecuencias
- Dependencias nuevas: `Authlib` y `requests` (cliente Flask de Authlib).
- Se retiran `AUTHELIA_ENABLED`, `AUTHELIA_SLO_URL`, `AUTHELIA_HEADER_USER`, `AUTHELIA_HEADER_NAME` y `/auth/sso`; `/auth/login` deja de aceptar `method=directory`.
- `TRUSTED_PROXIES` sigue para la IP real del cliente (`audit/ip_cliente.py`).
- nginx: sin `auth_request`; se mantiene el borrado de `Remote-*` como defensa (FNC-143).
- Configuración del cliente `portal` en Authelia documentada en `docs/operacion/` (FNC-143).
- Desarrollo sin Authelia: entra por la ruta de emergencia (y `LOGIN_LOCAL_TODAS_LAS_CUENTAS` solo en `development`).
