# FNC-170 — Grupo de Authelia por rol, variables documentadas y `logs/`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Hallazgos de la revisión general pedida por el dueño (2026-11-24).

## Cambios
- `users/grupos_de_rol.py` (nuevo): nombre y DN del grupo de Authelia por rol (constantes de `oidc_cuentas`, alias heredados `LDAP_APP_*`), alta en el grupo y baja del otro. Reemplaza 3 copias en `users/api.py` (alta y cambio de rol) y `users/directory_accounts.py`. El log solo lleva el tipo de error.
- `platforms/grupos.py`: `_nivel_en_plantilla` con constantes (`VAR_GRUPO_PLURAL`, prefijo `app-`, niveles); sin `import` dentro de la función.
- `VARIABLES.md` (21 variables), `HISTORIAL.md`, `.env.example` (solo las principales; los alias no), `.gitignore` (`logs/`).

## Pruebas
- `tests/users/test_grupos_de_rol.py` (4).
- Corrección (BUG de FNC-165): `test_cuenta_de_emergencia_no_local_no_recibe_contrasena` y `test_nadie_cambia_la_contrasena_de_cuentas_de_sso[sso]` esperaban `campo_no_permitido`; con FNC-165 una cuenta `sso` va a LDAP con la política y responde `contrasena_invalida`. Se conserva la aserción clave: nunca queda hash local.

## Verificación
- `tests/users` y `tests/platforms`: 374 passed. `validar_proyecto.py`: 0 errores, 2 avisos (alias heredados fuera de `.env.example` a propósito; sin pre-commit para personas).

## Impacto
| Elemento | Usado en | ¿Validado? |
|---|---|---|
| `create_user`, `update_user` (`users/api.py`) | `POST/PUT /users` | Sí, pruebas de usuarios |
| `crear_cuenta` (`directory_accounts.py`) | alta en el directorio | Sí, `test_alta_directorio.py` |
| `derivar_dn` (`platforms/grupos.py`) | plataformas, aprovisionamiento | Sí, pruebas de plataformas |
