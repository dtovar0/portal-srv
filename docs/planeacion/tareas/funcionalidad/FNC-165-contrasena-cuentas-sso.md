# FNC-165 — Contraseña de cuentas `sso` en el directorio

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Rama** | `fnc/FNC-165-contrasena-cuentas-sso` |
| **Contrato** | `docs/contratos/areas-y-roles.md` v3.1 |

## Contexto
- Pedido del dueño (2026-11-24): «no puedo cambiar la contraseña de un usuario; todos están en `ou=users,dc=vivaro,dc=local`».
- Causa: la cuenta creada al primer login por Authelia queda `auth_source='sso'` (`oidc_cuentas.py`) y `PUT /users/<id>` con `password` la rechazaba (`400 campo_no_permitido`). Authelia autentica contra el mismo OpenLDAP, así que la contraseña sí vive en `LDAP_USERS_BASE_DN`.

## Cambios
- `app/modules/users/restablecer_contrasena.py`: `ORIGENES_EN_DIRECTORIO = {ldap, sso}`; `_cuenta_en_directorio` devuelve el `uid` de la entrega o el **DN real** encontrado por correo (antes se reconstruía con `LDAP_USER_ATTR`).
- Contrato `areas-y-roles` v3.1 y SEC-AUTHZ-06 actualizados. Sin variables nuevas.

## Decisión
- Más permisivo que v3, acotado: solo superadmin, con la política `PASSWORD_POLICY_*` y la `ppolicy` del servidor; nunca hash en la BD.

## Pruebas
- `tests/users/test_contrasena_local_o_ldap.py`: `test_sso_cambia_en_el_directorio_regresion_fnc_165` y `test_sso_solo_lo_cambia_el_superadmin` (fallaron sin el cambio), `test_origen_desconocido_se_rechaza`.

## Verificación
- Archivo: 22 passed. Suite completa: 2196 passed, 1 failed preexistente (`test_guardia_rutas.py`: rutas `/auth/autoservicio/*` sin caso en la matriz; igual en `develop`).
- No verificado contra el OpenLDAP real: la cuenta de bind necesita permiso de escritura sobre `userPassword` en `ou=users`.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Definido en | Usado en | ¿Validado? |
|---|---|---|---|---|
| `aplicar_cambio` | función | `users/restablecer_contrasena.py` | `users/api.py` (`PUT /users/<id>`) | Sí, por las pruebas del endpoint |

## Bitácora
- 2026-11-24: diagnóstico, prueba de regresión (falla), arreglo, documentación.
