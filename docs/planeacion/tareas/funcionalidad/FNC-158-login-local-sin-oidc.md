# FNC-158 — Login local en `/login` con Authelia apagado

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend (incluye el cambio web del formulario, pedido explícito del dueño) |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `fnc/FNC-158-login-local-sin-oidc` |

## Contexto
- Pedido del dueño (2026-11-19): «regresa el login, omite emergencia; el login solo entrará si es usuario local, no tiene manera de entrar si es un usuario OIDC o LDAP».

## Cambios
- `acceso_local.py`: con `OIDC_HABILITADO=false`, `motivo_rechazo_login_local` acepta cualquier cuenta local; las no locales siguen rechazadas y las inactivas también (respuesta única).
- `GET /auth/context`: campo `local_login`.
- Web: `FormularioLoginLocal` (extraído de `/acceso-emergencia`, reutilizado); `/login` lo muestra con `local_login`.
- `oidc.sh`, `.env.example`, contrato de autenticación y guía de Authelia.

## Decisiones (orquestador, pendientes de validar)
- Con Authelia encendido nada cambia (botón de Authelia; emergencia en su ruta).
- Límite de intentos de FNC-014 sigue aplicando a estas cuentas.
- Deshace en parte ADR-009 mientras Authelia esté apagado: auditoría de seguridad diferida a la completa.

## Pruebas
- `tests/test_login_local.py` (cuentas locales entran, no locales e inactivas no, `local_login` en el contexto) y `frontend/tests/components/auth/login-oidc.test.tsx` (formulario en `/login`); fallaban antes del cambio.
