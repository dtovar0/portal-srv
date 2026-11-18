# FNC-141 — Autenticación: OIDC con Authelia (Authlib, PKCE), retiro del SSO por cabeceras y del login LDAP, y ruta de emergencia

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Agente** | desarrollador |
| **Fase** | 8 (propuesta) |
| **Módulo / Área** | auth |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | |
| **Finalizada** | |
| **Estatus Git** | Rama `fnc/FNC-141-oidc-authelia` (commit local, sin push) |
| **Rama** | `fnc/FNC-141-oidc-authelia` |
| **Commits / PR** | |
| **Requiere migración BD** | Sí (0014: users.oidc_sub) |
| **Requiere auditor-seguridad** | Sí (autenticación, sesión) |

## Contexto
- `app/modules/api/auth.py`: `/sso` confía en `Remote-*` (con `es_proxy_confiable`); `/login` con `method=directory` usa `authenticate_user_ldap` (`auth/services.py`); `method=local` solo emergencia (`auth/acceso_local.py`).
- Variables `AUTHELIA_*` en `.env.example:97-102`.

## Objetivo
- Todo inicio de sesión de personas pasa por Authelia con OIDC; queda solo la ruta local de emergencia.

## Alcance
- **Incluye:**
  - Cliente OIDC con Authlib: descubrimiento del emisor, código de autorización con PKCE S256, `state` y `nonce` en la sesión del servidor; validación del ID token (firma, `iss`, `aud`, `exp`, `nonce`); claims de userinfo (`email`, `name`; exigir `email_verified` si Authelia lo publica).
  - Enlace de cuenta por `sub` del token (ADR-009 3B: columna nueva con migración; la primera vez se vincula por correo) con `motivo_de_bloqueo` (cuenta local o desactivada → rechazo auditado); cuenta nueva como `usuario`, `auth_source='sso'`; rol nunca del token (SEG-10, SEC-AUTH-07); `avisar_usuario_creado` como hoy.
  - `session.clear()` antes de `login_user` (SEC-SES-03), conservando solo lo necesario.
  - `POST /auth/local`: solo `motivo_rechazo_login_local` (emergencia; y la bandera de desarrollo); respuesta única.
  - `POST /auth/logout`: `logout_user`, `session.clear()` y URL de cierre de Authelia desde configuración (SEC-AUTH-13).
  - Retiro: `/auth/sso`, `method=directory`, `_sso_enabled`, `AUTHELIA_*`; `authenticate_user_ldap` y `_sincronizar_cuenta` si no quedan usos.
  - Validación al arrancar: fuera de desarrollo, `OIDC_*` completas, `https`, sin IP.
  - Pruebas: retirar o reescribir `tests/test_sso.py`, `tests/test_login_directorio.py`, casos SSO de `tests/matriz_proteccion.py`, `tests/test_sesion_y_logout.py`, `tests/test_notificaciones.py` (SSO), `tests/test_humo.py`, `tests/peticiones_auth.py`, `tests/conftest.py` (prefijo `AUTHELIA_` → `OIDC_`); pruebas nuevas con un proveedor OIDC simulado (sin red).
  - Documentación: `docs/backend/README.md`, `docs/configuracion/VARIABLES.md` y `HISTORIAL.md`, `.env.example`, `requirements.txt` (`Authlib`, `requests` fijados), SEC-AUTH-01/02/13 en `docs/seguridad/LINEAMIENTOS.md`.
- **No incluye:** pantalla de login (FNC-142); nginx y la configuración de Authelia (FNC-143); límite de intentos (FNC-014); MFA (SEC-AUTH-14, se configura en Authelia).

## Archivos previstos
- `app/modules/api/auth.py` (o dividido: `app/modules/auth/oidc.py` para el cliente y `api/auth.py` para las rutas), `app/modules/auth/services.py`, `app/modules/auth/acceso_local.py`, `app/__init__.py` (registro del cliente y validación al arrancar)
- `tests/` listados arriba, `requirements.txt`, documentación listada

## Reutilización
- `motivo_de_bloqueo`, `avisar_bloqueo`, `normalizar_correo`, `motivo_rechazo_login_local`, `add_audit_log`, `avisar_usuario_creado`, `MENSAJE_CREDENCIALES`, patrón de validación de URL de `secretos/configuracion.py` y `es_ip_literal`.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| `api/auth.py` (rutas `/auth/*`) | blueprint | pantalla de login, `logout-view`, `session-provider` (vía `/me`); `tests/matriz_proteccion.py` | ☐ |
| `es_proxy_confiable` (deja de usarse en auth) | función | sigue en `audit/ip_cliente.py` (IP real); no se borra | ☐ |
| `authenticate_user_ldap` (retiro) | función | `api/auth.py`, `tests/test_login_directorio.py`, `tests/peticiones_auth.py` | ☐ |
| `motivo_de_bloqueo` / `ORIGENES_VINCULADOS` | función/constante | `auth/services.py`, `auth/acceso_local.py`, `api/auth.py` | ☐ |
| `acceso_local.py` | módulo | `users/api.py` (`contrasena_local_permitida`, `origen_de_alta`) | ☐ |
| `tests/conftest.py` (prefijos externos) | prueba | toda la suite | ☐ |

## Variables y configuración
| Variable | Por defecto | Sensible | Notas |
|---|---|---|---|
| `OIDC_ISSUER_URL` | — | No | `https://<host de authelia>`; obligatoria fuera de dev |
| `OIDC_CLIENT_ID` | `portal` | No | |
| `OIDC_CLIENT_SECRET` | — | **Sí** | solo `.env` (dev) o el gestor; nunca en el repo |
| `OIDC_REDIRECT_URI` | — | No | `https://<host del portal>/api/v1/auth/oidc/callback`; igual a la registrada en Authelia |
| `OIDC_SCOPES` | `openid profile email` | No | sin `groups` (SEG-10) |
| `OIDC_LOGOUT_URL` (propuesta, ADR-009 4B) | — | No | reemplaza `AUTHELIA_SLO_URL` |
| `OIDC_CA_CERT_FILE` (propuesta) | vacía (CA del sistema) | No | si Authelia usa CA interna |
- Obsoletas (HISTORIAL con motivo): `AUTHELIA_ENABLED`, `AUTHELIA_SLO_URL`, `AUTHELIA_HEADER_USER`, `AUTHELIA_HEADER_NAME`; `AUTHELIA_SSO_URL` (ya sin uso).
- `LOGIN_LOCAL_TODAS_LAS_CUENTAS` sigue igual (solo `development`).

## Criterios de aceptación
- [ ] Callback sin `state`, con `state` distinto, `nonce` distinto, token vencido, `aud` ajeno o firma inválida → sin sesión y error genérico auditado (una prueba por caso).
- [ ] La petición de autorización lleva `code_challenge_method=S256` y `nonce`; el `code_verifier` nunca sale del servidor.
- [ ] Grupos en el token no cambian el rol; cuenta nueva = `usuario`; cuenta local con el mismo correo → rechazo auditado.
- [ ] `Remote-Email` en cualquier petición ya no autentica (prueba de regresión SEG-04).
- [ ] `method=directory` y `/auth/sso` responden según contrato; la cuenta de emergencia entra por `/auth/local`; cualquier otra cuenta local, no (fuera de dev).
- [ ] Logout borra la sesión y devuelve la URL de cierre de la configuración, nunca del `Host`.
- [ ] Tokens, `code`, `state` y secreto nunca en logs ni auditoría.
- [ ] Fuera de dev, la app no arranca sin `OIDC_*` válidas; mensaje sin valores.
- [ ] Suite completa en verde (`pytest`, código de salida 0); pruebas retiradas listadas en la ficha con su reemplazo.
- [ ] VARIABLES, HISTORIAL, `.env.example`, `docs/backend/README.md` y LINEAMIENTOS de seguridad actualizados.
- [ ] Pruebas mínimas del lineamiento de pruebas, ejecutadas
- [ ] Cumple `docs/estandarizacion/` y no duplica código existente
- [ ] Sin direcciones IP ni secretos
- [ ] Actualiza `docs/operacion/ENTORNOS.md` (dev entra por la ruta de emergencia)
- [ ] Cierra con `auditor-seguridad`

## Impacto cruzado
- Origen ← ADR-009
- Genera → FNC-142 (web), FNC-143 (infra)
- Depende de → FNC-140 (contrato)
- Deja sin objeto → FNC-006 (secreto del proxy para `Remote-*`) y la parte de login LDAP de FNC-002; aplica a FNC-014 (límite de intentos) solo en `/auth/local`

## Riesgos y reversión
- Authelia caído = nadie entra salvo la cuenta de emergencia.
- Versión de Authelia: claims en userinfo y no en el ID token; `end_session_endpoint` puede faltar (ADR-009 4).
- Reversión: revertir la rama devuelve `/auth/sso` y el login LDAP; las variables `AUTHELIA_*` siguen en HISTORIAL.

## Verificación
Comandos (laptop con carga limitada: no se corrió la batería completa; sí lo que toca la tarea). Nada se probó contra un Authelia real: el proveedor es simulado (`tests/oidc_simulado.py`, ID tokens RS256 firmados de verdad, sin red).

| Comando | Resultado |
|---|---|
| `python -m pytest tests/test_oidc.py tests/test_login_local.py tests/test_sesion_y_logout.py tests/test_humo.py tests/test_notificaciones.py tests/test_cuerpo_validado.py tests/users/test_contrasenas_locales.py tests/test_guardia_rutas.py tests/audit/test_regresion_seg25.py tests/test_arranque.py tests/test_rutas_retiradas.py` | 301 passed, salida 0 |
| `python -m pytest tests/test_oidc_configuracion.py tests/test_migracion_0014.py` | 34 passed |
| `python -m pytest tests/test_proteccion_por_rol.py -k auth` | 45 passed (matriz de las 7 rutas `/auth`) |
| `python -m pytest tests/test_migraciones.py tests/demo tests/test_secretos_en_respuestas.py tests/test_respaldo.py tests/test_csrf.py tests/test_guardia_rutas.py tests/test_linea_base_cubre_sql_heredadas.py tests/test_proteccion_por_rol.py::test_entrada_invalida_devuelve_400` | 85 passed |
| `python -m pytest tests/test_motor_bd_produccion.py` | 33 passed |

Pruebas retiradas y su reemplazo:
| Retirada | Reemplazo |
|---|---|
| `tests/test_sso.py` (cabeceras `Remote-*`, `TRUSTED_PROXIES`, secreto del proxy) | `tests/test_oidc.py`: regresión SEG-04 (`Remote-Email` no autentica, `/auth/sso` 410, `AUTHELIA_ENABLED` ya no se lee), rol nunca del token, cuenta local/desactivada, enlace por `sub` y por correo |
| `tests/test_login_directorio.py` (LDAP: filtro escapado, mapeo de grupos, usuario sombra) | Sin reemplazo: el login LDAP se retiró (ADR-009). El cliente del directorio conserva sus pruebas propias |
| Casos SSO y `method=directory` de `test_notificaciones.py`, `test_cuerpo_validado.py`, `users/test_contrasenas_locales.py` | Reescritos con el fixture `oidc` (aviso de bienvenida tolerante a fallos, enlace a `/login`, vinculación de la cuenta dada de alta por correo) |

Casos de aceptación cubiertos en `tests/test_oidc.py`: callback sin `state`, `state` distinto o repetido, `nonce` distinto o ausente, token vencido, `aud` ajeno, `iss` ajeno, firma inválida, sin ID token, `sub` de userinfo distinto, error del endpoint de token, `access_denied`; petición de autorización con `S256`, `state`, `nonce` y sin `code_verifier`; canje con el verificador del desafío; secreto, `code`, `state` y token ausentes de la auditoría y de las respuestas; logout con `OIDC_LOGOUT_URL`, con `end_session_endpoint` y sin ninguno, ignorando el `Host`; fuera de desarrollo la app no arranca sin `OIDC_*` válidas (`tests/test_oidc_configuracion.py`); migración 0014 sube y baja (`tests/test_migracion_0014.py`).

No verificado: Authelia real (versión, claims reales de userinfo, `end_session_endpoint`, comportamiento de `rd`); PostgreSQL/MySQL con la migración 0014 (solo SQLite); suite completa (se evitó por carga). `auditor-seguridad` y `revisor`: se piden sobre la rama integrada (ver veredictos).

Impacto (`impacto.py`, resumen de lo relevante; el resto de coincidencias son homónimos sin relación):
| Elemento | Tipo | Usado en | Validado |
|---|---|---|---|
| `/api/v1/auth/*` (`api/auth.py`) | blueprint | `frontend/src/lib/api.ts`, `login-form.tsx`, `logout-view.tsx` (FNC-142); `tests/matriz_proteccion.py` | ☐ |
| `User.oidc_sub` + migración 0014 | modelo | `auth/oidc_cuentas.py`; el respaldo no la exporta | ☐ |
| `auth/services.py` (retiro de `authenticate_user_ldap`) | módulo | `auth/oidc_cuentas.py`, `acceso_local.py`, `users/directory_accounts.py` (constantes y reglas, sin cambio) | ☐ |
| `tests/conftest.py` (`OIDC_` en prefijos, fixture `oidc`) | prueba | toda la suite | ☐ |
| `tests/peticiones_auth.py` (`iniciar_sesion_api` a `/auth/local`, sin `metodo`) | prueba | `test_login_local`, `test_sesion_y_logout`, `test_contrasenas_locales`, `audit/test_regresion_seg25`, `demo/test_demo_cargar` | ☐ |

## Veredictos
| Agente | Veredicto | Fecha |
|---|---|---|
| tester | | |
| revisor | | |
| auditor-seguridad | | |

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-11-17 | Creada (decisiones del dueño B, 2026-11-17) |
| 2026-11-18 | Implementada: OIDC con Authlib (PKCE S256), enlace por sub (migración 0014), /auth/local, 410 en /auth/sso y /auth/login, OIDC_* validadas al arrancar; pendiente validar contra un Authelia real |
