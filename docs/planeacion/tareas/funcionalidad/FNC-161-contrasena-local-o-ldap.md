# FNC-161 — Contraseña de «Editar usuario»: local en la BD, LDAP en el directorio

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend (con el ajuste web del formulario, pedido explícito del dueño) |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `fnc/FNC-161-contrasena-local-o-ldap` |
| **Contrato** | `docs/contratos/areas-y-roles.md` v3 |

## Contexto
- Pedido del dueño (2026-11-19): el botón de contraseña de «Editar usuario» debe identificar si la cuenta es local (guarda en BD) o LDAP (actualiza el LDAP).
- Antes: `PUT /users/<id>` aceptaba `password` solo para la cuenta de emergencia (o la bandera de desarrollo) y nunca tocaba LDAP.

## Cambio de alcance (pedido del dueño, 2026-11-19)
- «Si ya el botón de editar puede cambiar la contraseña ya no es necesario el botón de reenviar»: se retira «Reenviar credenciales».
- Web: fuera el botón, su `ConfirmDialog`, `resendOf`/`resending`, `usersApi.resendCredentials` y `describeResendError`; el indicador «credenciales pendientes» se queda.
- Backend: `POST /users/<id>/credentials` responde `410 endpoint_retirado` (`use: PUT /users/<id>`, mismo patrón que `/auth/login`) y conserva `admin_required`; fuera `reenviar_credenciales`, `_tomar_para_reenvio`, `_liberar_reenvio` y sus constantes. El worker de entregas y el alta con Send se quedan.
- Matriz de protección: la ruta pasa a `solo_superadmin(410)`; contratos `usuarios-directorio` v3 y `areas-y-roles` v3, `business_rules`, `docs/backend`, SEC-AUTHZ-06 y `auditoria` ajustados.
- Consecuencia a validar: agotados los intentos de una entrega, ya no hay botón que los reabra; el superadmin fija la contraseña con «Editar usuario» pero el estado queda «pendientes». Propuesta: marcar la entrega como resuelta al cambiar la contraseña en LDAP.

## Cambios
- `app/modules/users/restablecer_contrasena.py` (nuevo): `validar_cambio` y `aplicar_cambio` según `auth_source`.
  - `local`: `set_password` (hash en BD) para cualquier cuenta gestionable.
  - `ldap`: política (`mensaje_de_incumplimiento`) y Password Modify con `fijar_contrasena_en_directorio`; ubica al usuario por el `uid` de su `credential_delivery` o, si no hay, por `buscar_por_correo`. Nunca guarda hash.
  - `sso`/`oidc`: `400 campo_no_permitido`.
- `app/modules/users/api.py`: `update_user` delega en ese módulo; si el cambio falla no se aplica ningún otro campo del `PUT`.
- `frontend/src/components/users/user-form.tsx`: Contraseña en Editar para cuentas `local` y, solo superadmin, `ldap`; ayuda según el tipo; política (`descripcionPolitica`) ligada con `aria-describedby`; vacío no se envía; errores por toast.
- Contrato `areas-y-roles.md` v3.

## Decisiones del orquestador (pendientes de validar)
- Cambio en LDAP solo del superadmin (`403 solo_superadmin`); admin de área sí cambia cuentas locales de sus áreas (`can_manage_user`). El campo no se muestra al admin de área en cuentas LDAP.
- La contraseña local no pasa por la política `PASSWORD_POLICY_*` (como hasta hoy); solo se exige texto no vacío. Propuesta abierta si el dueño la quiere igual.
- Directorio inactivo, caído o con correo ambiguo: `503`; correo sin cuenta en el directorio: `409` (el actor ya administra la cuenta, no se revela nada nuevo, SEG-05).
- Sin cambios en auditoría: sigue `EDITAR USUARIO` sin la contraseña.
- Sin generador de contraseña en este formulario (no pedido); `Reenviar credenciales` se retiró por pedido posterior del dueño (ver arriba).
- Sin variables nuevas.

## Pruebas
- `tests/users/test_contrasena_local_o_ldap.py` (20): local no emergencia guarda hash; ldap por correo y por `uid` de la entrega cambia en el directorio y no guarda hash; política incumplida 400; ppolicy 400; directorio inactivo/caído 503; sin cuenta 409; admin de área no cambia LDAP; fuera de alcance 404; sso/oidc rechazado; sin secretos en BD, auditoría ni logs.
- Pruebas anteriores actualizadas por el cambio de regla: `test_contrasenas_locales.py` y `test_roles_y_areas_administradas.py` (antes 400, ahora guarda / 403 `solo_superadmin`), `users-list.test.tsx`.
- `tests/components/users/user-form.test.tsx` (6).
- Matriz de protección: `PUT /users/<id>` no cambia; `POST /users/<id>/credentials` pasa a 410 para el superadmin. `test_entrega_credenciales.py`: retiradas las pruebas de reenvío y agregada la del `410`; `users-list.test.tsx` comprueba que ya no hay botón.

## Verificación
- Ver el reporte de cierre (comandos y códigos de salida).
- No verificado: LDAP real (solo `MOCK_SYNC` con Password Modify simulado), navegador en tema claro/oscuro. `auditor-accesibilidad` y `auditor-seguridad`: no ejecutados en esta sesión (no se podía lanzar subagentes).

## Impacto en elementos compartidos
- Ninguno compartido modificado; `ConfirmDialog` ya no lo usa «Reenviar» (sus otros usos no cambian) (`Field`, `TextInput`, `contrasena.ts`, `fijar_contrasena_en_directorio` solo se reutilizan).

## Bitácora
- 2026-11-19: implementada en rama propia, sin push ni merge.
