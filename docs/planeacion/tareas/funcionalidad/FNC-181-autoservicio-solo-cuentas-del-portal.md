# FNC-181 — Autoservicio solo para cuentas dadas de alta en el portal

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24): «por regla de negocio, un usuario que no esté dado de alta en Aduana no puede cambiar su cuenta de LDAP a través de recuperación de contraseña».

## Cambios
- `autoservicio_cuentas.cuenta_dada_de_alta(*identificadores)`: cuenta **activa** del portal por correo de LDAP, correo o usuario.
- `solicitar_codigo_mfa` y `solicitar_recuperacion`: sin alta → misma respuesta genérica, sin código ni enlace.
- `cambiar_contrasena` (tras verificar la contraseña actual), `restablecer_con_token` y `restablecer_directo_mfa`: sin alta → `403 MENSAJE_SIN_ALTA`, sin tocar LDAP.
- `docs/business_rules.md`: regla nueva.

## Decisión a validar
- Se aplicó también al cambio con contraseña actual: comparte el envío del código MFA y dejarlo abierto sería inconsistente. Si el dueño lo quiere abierto, se separa.
- Una cuenta inactiva en el portal tampoco puede.

## Pruebas
- `tests/test_autoservicio_solo_ldap.py` (7; sustituye la prueba de FNC-180, que validaba lo contrario). Área del autoservicio: 454 passed.
