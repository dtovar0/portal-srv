# FNC-143 — Despliegue: nginx sin forward-auth, cliente `portal` en Authelia documentado y preflight de `OIDC_*`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Agente** | devops |
| **Fase** | 8 (propuesta) |
| **Módulo / Área** | deploy |
| **Prioridad** | Alta |
| **Estatus** | Propuesta |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | |
| **Finalizada** | |
| **Estatus Git** | — |
| **Rama** | `fnc/FNC-143-despliegue-oidc` |
| **Commits / PR** | |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (proxy, secretos de cliente) |

## Contexto
- `deploy/nginx.conf.tmpl:39-58`: bloque `auth_request` comentado y borrado de `Remote-*` (FNC-004/027); `tests/deploy/test_nginx_cabeceras.py` lo verifica.
- Con OIDC (ADR-009) el portal no depende de cabeceras de Authelia.

## Objetivo
- Que el despliegue y su documentación correspondan a OIDC y el dueño sepa qué poner en Authelia.

## Alcance
- **Incluye:**
  - nginx: quitar el bloque `auth_request` comentado; **conservar** el borrado de `Remote-*` en cada `location` (defensa); `/api/v1/auth/oidc/callback` llega a Flask como el resto de `/api/`.
  - `deploy/preflight.sh`: `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI` con valor y `https`; `OIDC_CLIENT_SECRET` solo con valor (nunca se imprime); `deploy/secretos.sh` si aplica.
  - `docs/operacion/` (nuevo `AUTHELIA-OIDC.md` o sección en `ENTORNOS.md`): bloque de configuración del cliente `portal` (abajo), alta del secreto (hash en Authelia, valor en `.env`/gestor), rotación, prueba de humo y vuelta atrás.
  - `deploy/README.md`.
- **No incluye:** código de la app (FNC-141); instalar o configurar Authelia en el servidor (lo hace el dueño).

### Bloque de referencia para Authelia (a validar contra la versión instalada)
```yaml
identity_providers:
  oidc:
    # hmac_secret y jwks: los configura el dueño; nunca en el repo
    clients:
      - client_id: 'portal'
        client_name: 'Portal de accesos'
        client_secret: '<digest pbkdf2 generado con «authelia crypto hash generate»>'
        public: false
        authorization_policy: 'two_factor'
        require_pkce: true
        pkce_challenge_method: 'S256'
        redirect_uris:
          - 'https://<host del portal>/api/v1/auth/oidc/callback'
        scopes: ['openid', 'profile', 'email']
        response_types: ['code']
        grant_types: ['authorization_code']
        token_endpoint_auth_method: 'client_secret_basic'
        userinfo_signed_response_alg: 'none'
        consent_mode: 'implicit'
```

## Archivos previstos
- `deploy/nginx.conf.tmpl`, `deploy/preflight.sh`, `deploy/README.md`, `docs/operacion/AUTHELIA-OIDC.md` (o `ENTORNOS.md`), `tests/deploy/`

## Reutilización
- Patrones de `preflight.sh` (`FALTA`, sin imprimir valores) y de `docs/operacion/SECRETOS.md`.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| `deploy/nginx.conf.tmpl` | plantilla | todas las rutas del portal (`/`, `/api/`, `/_next/static/`); `install.sh` | ☐ |
| `deploy/preflight.sh` | script | `install.sh`, instalación en `/opt/portal` | ☐ |
| `tests/deploy/test_nginx_cabeceras.py` | prueba | regresión FNC-004/027 | ☐ |

## Variables y configuración
- Solo comprobación de las `OIDC_*` registradas por FNC-141; ninguna nueva.

## Criterios de aceptación
- [ ] `test_nginx_cabeceras.py` sigue en verde (borrado de `Remote-*` intacto); `nginx -t` sobre la plantilla renderizada, o motivo si no hay nginx local.
- [ ] `preflight.sh` da `FALTA` sin `OIDC_*` fuera de dev y nunca imprime el secreto; `bash -n` en 0.
- [ ] Documento de operación con el bloque, sin secretos ni IPs, con `consent_mode`, `require_pkce` y `redirect_uris` alineados con `OIDC_REDIRECT_URI`.
- [ ] Pruebas mínimas del lineamiento de pruebas, ejecutadas
- [ ] Sin direcciones IP ni secretos
- [ ] Actualiza `docs/operacion/`
- [ ] Cierra con `auditor-seguridad`

## Impacto cruzado
- Origen ← ADR-009
- Depende de → FNC-141 (ruta del callback y variables)

## Riesgos y reversión
- Sintaxis de Authelia según versión (`client_id`/`id`, `client_secret` con hash): el documento indica la versión validada.
- Reversión: la plantilla anterior queda en git.

## Verificación

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
