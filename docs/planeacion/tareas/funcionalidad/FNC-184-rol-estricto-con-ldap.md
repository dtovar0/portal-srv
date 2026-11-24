# FNC-184 — Cambio de rol estricto con el grupo de Authelia

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24): si no se puede mover el grupo en LDAP, que no cambie el rol («es mejor tener el control»).
- Authelia recalcula el rol en cada login por el grupo: un rol cambiado sin mover el grupo se revertía.

## Cambios
- `users/rol_en_directorio.py` (nuevo): `mover_grupo_de_rol` (antes de `cambiar_rol`; solo cuentas `sso`/`ldap`) y `revertir_grupo_de_rol` (si falla otra parte de la misma petición, p. ej. la contraseña).
- `users/api.py` (`PUT /users/<id>`): usa lo anterior; errores `503 directorio_no_disponible`, `409 cuenta_no_encontrada_en_directorio`, `503 grupo_no_actualizado`.
- `users/grupos_de_rol.py`: **bug** — los fallos que LDAP devuelve como resultado (no excepción) pasaban como éxito; ahora se revisa cada paso, salir de un grupo ajeno o inexistente es éxito, y si no puede salir del otro grupo deshace la entrada.

## Pruebas
- `tests/users/test_rol_estricto_con_ldap.py` (6, incluido último miembro sin `LDAP_GROUP_PLACEHOLDER_MEMBER`), `tests/users/test_grupos_de_rol.py` (+3). Usuarios/auth: 706 passed.

## Nota operativa
- Si un grupo de rol puede quedar con un solo miembro, configurar `LDAP_GROUP_PLACEHOLDER_MEMBER`; sin él, LDAP no deja quitar al último y el cambio de rol se rechaza.
