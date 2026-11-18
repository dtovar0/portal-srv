# Authelia como proveedor OIDC del portal

> FNC-143 (ADR-009). **No se ha probado contra un Authelia real**: el bloque de abajo sigue la documentación de Authelia 4.38 y debe validarse en la instalación del dueño (ver «Prueba de humo»).

## 1. Versión de Authelia

El portal se implementó para **Authelia 4.38 o mayor** (OIDC estable). Para saber cuál tienes, en el servidor de Authelia:

```
authelia --version
```

(con Docker: `docker exec <contenedor> authelia --version`).

| Versión | Qué cambia |
|---|---|
| 4.38 o mayor | Sintaxis del bloque de abajo: `client_id`, `client_secret` (digest), `jwks`. Los claims de perfil y correo van en el endpoint userinfo, que es de donde los lee el portal |
| 4.37 o menor | `id` en lugar de `client_id`; `secret` en lugar de `client_secret`; `issuer_private_key` en lugar de `jwks`; `userinfo_signing_algorithm` en lugar de `userinfo_signed_response_alg`. La clave del emisor y la forma del digest cambian; revisa la documentación de esa versión. **Recomendado: actualizar a 4.38 o mayor antes de conectar el portal** |

Ninguna versión menor a 4.38 se ha probado con el portal.

## 2. Variables del portal

Se ponen en el `.env` del servidor (permisos 600); el detalle está en [VARIABLES.md](../configuracion/VARIABLES.md).

| Variable | Valor | Debe coincidir con |
|---|---|---|
| `OIDC_ISSUER_URL` | `https://auth.<dominio>` (nombre de host, nunca IP; sin barra final) | `issuer` que publica `https://auth.<dominio>/.well-known/openid-configuration` |
| `OIDC_CLIENT_ID` | `portal` | `client_id` del cliente en Authelia |
| `OIDC_CLIENT_SECRET` | el secreto **en claro** que generaste (no el digest) | el digest guardado en `client_secret` en Authelia |
| `OIDC_REDIRECT_URI` | `https://portal.<dominio>/api/v1/auth/oidc/callback` | `redirect_uris` del cliente, carácter por carácter |
| `OIDC_LOGOUT_URL` | `https://auth.<dominio>/logout` (opcional) | URL de cierre de sesión de Authelia |
| `OIDC_SCOPES` | vacía (`openid profile email`) | `scopes` del cliente. Sin `groups`: el rol no sale del token |

Fuera de desarrollo, el portal no arranca sin `OIDC_ISSUER_URL`, `OIDC_CLIENT_SECRET` y `OIDC_REDIRECT_URI`, ni con `http` o una IP. `deploy/preflight.sh` lo comprueba antes de instalar.

## 3. Bloque del cliente `portal` (Authelia 4.38)

En `configuration.yml` de Authelia. `hmac_secret` y `jwks` (la llave de firma) los configura el dueño de Authelia y nunca van en este repositorio.

```yaml
identity_providers:
  oidc:
    # hmac_secret y jwks: los configura quien administra Authelia
    clients:
      - client_id: 'portal'
        client_name: 'Portal de accesos'
        client_secret: '<digest generado con «authelia crypto hash generate»>'
        public: false
        authorization_policy: 'two_factor'
        require_pkce: true
        pkce_challenge_method: 'S256'
        redirect_uris:
          - 'https://portal.<dominio>/api/v1/auth/oidc/callback'
        scopes:
          - 'openid'
          - 'profile'
          - 'email'
        response_types:
          - 'code'
        grant_types:
          - 'authorization_code'
        token_endpoint_auth_method: 'client_secret_basic'
        userinfo_signed_response_alg: 'none'
        consent_mode: 'implicit'
```

| Clave | Por qué |
|---|---|
| `require_pkce` + `pkce_challenge_method: 'S256'` | El portal siempre envía PKCE S256; Authelia debe exigirlo |
| `redirect_uris` | Una sola, igual a `OIDC_REDIRECT_URI`; Authelia rechaza cualquier otra |
| `scopes` sin `groups` | El rol no sale del token (SEG-10); quien administra el portal lo asigna ahí |
| `token_endpoint_auth_method: 'client_secret_basic'` | Es lo que usa el cliente del portal |
| `userinfo_signed_response_alg: 'none'` | El portal lee userinfo como JSON; si lo firmas, no lo podrá leer |
| `consent_mode: 'implicit'` | Es un portal corporativo: sin pantalla de consentimiento |
| `authorization_policy: 'two_factor'` | Doble factor, configurado en Authelia (el portal no lo implementa). Usa `one_factor` solo si el dueño lo decide |

El correo (`email`) debe existir en el usuario de Authelia (su fuente de usuarios, p. ej. OpenLDAP `mail`): sin él el portal rechaza el acceso con `identidad_incompleta`.

## 4. Alta del secreto

1. Genera el secreto y su digest en el servidor de Authelia:
   ```
   authelia crypto hash generate pbkdf2 --variant sha512 --random --random.length 72 --random.charset rfc3986
   ```
   Imprime dos valores: **Random Password** (el secreto) y **Digest**.
2. El **Digest** va en `client_secret` de Authelia (paso 3). Reinicia Authelia.
3. El **Random Password** va solo en el `.env` del servidor del portal, en `OIDC_CLIENT_SECRET` (sin comillas ni espacios sobrantes). No lo pegues en tickets, chats ni el repositorio.
4. Reinicia el backend del portal (`systemctl restart <nombre>-backend`).

### Rotación
1. Genera otro par (paso 1). Authelia solo admite un secreto por cliente: habrá un corte breve de los inicios de sesión.
2. Cambia el digest en Authelia y reinicia; cambia `OIDC_CLIENT_SECRET` en el `.env` del portal y reinicia el backend, en ese orden y seguidos.
3. Anota en [HISTORIAL.md](../configuracion/HISTORIAL.md) «rotado» (nunca el valor), con el motivo.
4. La cuenta de emergencia (`/acceso-emergencia`) sigue funcionando durante la rotación.

## 5. Cierre de sesión

- «Cerrar sesión» borra la sesión del portal y lleva a `OIDC_LOGOUT_URL?rd=https://portal.<dominio>/login`.
- Si `OIDC_LOGOUT_URL` está vacía, el portal usa el `end_session_endpoint` del descubrimiento, **si Authelia lo publica** (según versión puede no existir; entonces solo se cierra la sesión del portal y la de Authelia sigue abierta).
- Authelia solo respeta `rd` si el destino cae bajo su dominio de sesión: confírmalo en la prueba de humo.

## 6. Prueba de humo

1. `curl -s https://auth.<dominio>/.well-known/openid-configuration` responde JSON con `issuer` igual a `OIDC_ISSUER_URL`, `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint` y `jwks_uri`.
2. En el servidor del portal: `deploy/preflight.sh` sin líneas `FALTA` de `OIDC_*`.
3. Abrir `https://portal.<dominio>/login` y pulsar «Entrar con Authelia»: lleva a Authelia, pide el segundo factor y vuelve al portal ya con sesión.
4. Primera vez de una persona con cuenta ya existente (alta del portal por correo): entra a esa misma cuenta, con su rol; la persona nueva entra como `usuario`.
5. «Cerrar sesión» vuelve a `/login` y, al pulsar de nuevo «Entrar», Authelia pide credenciales (si no las pide, el cierre de Authelia no se aplicó: revisa `OIDC_LOGOUT_URL`).
6. `https://portal.<dominio>/acceso-emergencia` (sin enlace en el login) deja entrar a la cuenta de emergencia con Authelia detenido.
7. Auditoría del portal: `ACCESO SSO` en éxitos y `ACCESO OIDC FALLIDO` en fallos, sin tokens.

### Fallos frecuentes
| Síntoma | Causa probable |
|---|---|
| `/login?error=oidc_no_disponible` | El portal no alcanza a Authelia (DNS, firewall, certificado), o falta una variable `OIDC_*` |
| `/login?error=autenticacion_fallida` | `OIDC_REDIRECT_URI` distinta de la registrada; secreto o digest que no corresponden; reloj del servidor desfasado (el ID token se valida por hora); `issuer` distinto de `OIDC_ISSUER_URL` |
| `/login?error=identidad_incompleta` | El usuario de Authelia no tiene correo, o `email_verified` es falso |
| `/login?error=cuenta_no_disponible` | Cuenta local o desactivada con ese correo, o correo ya vinculado a otra identidad (ver la auditoría `ACCESO BLOQUEADO`) |
| Authelia muestra «invalid_redirect_uri» | El cliente no tiene exactamente esa `redirect_uris` |
| Authelia con CA interna | Apuntar `REQUESTS_CA_BUNDLE` (variable estándar de la biblioteca `requests`) al PEM de la CA en el `.env` del portal; el certificado siempre se valida |

## 7. Vuelta atrás

- Volver a la versión anterior del portal devuelve `/auth/sso` y el login por directorio. Las variables `AUTHELIA_*` retiradas están en [HISTORIAL.md](../configuracion/HISTORIAL.md).
- La migración `0014` (columna `users.oidc_sub`) se revierte con `alembic downgrade 0013`: se pierden los vínculos por `sub` y se rehacen por correo al volver a subir.
- Si Authelia queda caído, nadie entra salvo la cuenta de emergencia; no hay interruptor para reabrir el login LDAP.
