# FNC-179 — Autoservicio: por qué no se encontró la cuenta

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend (DIS-120, web, en el mismo commit de rama) |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24, captura): al guardar la nueva contraseña, «No se encontró la cuenta de usuario especificada».
- Causa: la búsqueda en LDAP no halló a la persona (o el directorio no está activo) y, desde FNC-168, una cuenta `sso` ya no recibe hash local (antes «funcionaba» sin cambiar LDAP y la cuenta quedaba bloqueada en Authelia).

## Cambios
- `auth/autoservicio.py`: `_sin_cuenta` → `503 MENSAJE_DIRECTORIO_INACTIVO` (cuenta del portal y LDAP sin configurar), `404 MENSAJE_NO_EN_DIRECTORIO` (LDAP activo, no está en `LDAP_USERS_BASE_DN`), `404` genérico si tampoco existe en el portal. Solo tras verificar la identidad (enlace o MFA): no revela cuentas ajenas. Log con el motivo, sin datos personales.
- DIS-120: `autoservicio-view.tsx`, «Actualizando…».

## Pruebas
- `tests/test_autoservicio_cuentas_directorio.py`: 2 nuevas; la de FNC-168 con LDAP inactivo pasa de `404` a `503`. Área: 49 passed; `autoservicio-view.test.tsx` 2 passed.

## Pendiente del dueño
- Revisar en el servidor `LDAP_URL`/`LDAP_BIND_*`/`LDAP_USERS_BASE_DN` y que el `mail` de la persona coincida con su correo en el portal.
