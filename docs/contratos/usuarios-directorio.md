# Contrato — Alta de cuentas en OpenLDAP

| Campo | Valor |
|---|---|
| Versión | 3.1 (2026-11-24) |
| Proveedor | backend (FNC-064; cliente FNC-040, FNC-041; v2: FNC-138) |
| Consumidores | web (FNC-069; pantalla DIS-019; v2: FNC-139) |
| Solicitudes | — |
| Aprobación v2 | Dueño, 2026-11-18 (ADR-008, decisiones 1 a 11) |

Convenciones comunes: [README.md](README.md). P2: superadmin y admins (para sus áreas). `POST /users` (cuenta local) no cambia aquí; el rol: [areas-y-roles.md](areas-y-roles.md).

## Endpoints

| Método y ruta | Usuario | Admin (sus áreas) | Admin (ajena) | Superadmin |
|---|---|---|---|---|
| `POST /users/directory` | 403 | 201 | 404 (`area_ids` ajenas) | 201 |
| `GET /users/password-policy` | 403 | 200 | 200 | 200 |
| `POST /users/<id>/credentials` (retirado, v3) | 403 | 403 | 403 | 410 |

- El reenvío está retirado (v3, FNC-161): conserva la protección por rol (un admin recibe `403`) y el superadmin recibe `410 endpoint_retirado` con `use: "PUT /users/<id>"`.

## `POST /users/directory`
| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `uid` | string | Sí | 3–64; `^[a-z][a-z0-9._-]*$`; único en el directorio y en la BD |
| `email` | string | Sí | Correo válido, solo ASCII, ≤ 120 (columna `users.email` `String(120)`); único en la BD y en el directorio |
| `given_name` | string | Sí | 1–100 |
| `surname` | string | Sí | 1–100 |
| `area_ids` | int[] | Sí para admin | 1–50; todas en alcance del actor (superadmin: cualquiera, puede ir vacío) |
| `password` | string | **Sí (v2)** | Cumple la política de `GET /users/password-policy`; el servidor siempre la valida |

- Rol siempre `usuario`; `auth_source = "sso"` (v3.1, FNC-168; antes `"ldap"`); `password_hash` NULL (SEC-AUTH-04). Elevar: solo superadmin, aparte.
- Entrada en la OU de personas de la convención `LDAP_*` (ADR-004); DN escapado (SEC-LDAP-06).
- Contraseña (P8, modificada el 2026-11-18, ADR-008): el portal fija **solo la contraseña inicial** (alta y reenvío); el resto de su ciclo sigue en Authelia. Se escribe en OpenLDAP con Password Modify (RFC 3062): el servidor la cifra y aplica su `ppolicy`. **Nunca** se guarda en la BD, la auditoría ni los logs, ni aparece en respuestas o correos.
- Escritura síncrona al directorio; si falla (incluida la contraseña), no se crea nada en la BD y la entrada recién creada se retira.
- Entrega: el portal crea un Send de Vaultwarden (usuario, contraseña y URL del portal) y manda por correo solo el enlace. Si Vaultwarden o el correo fallan, o las notificaciones están desactivadas, la cuenta **se crea igual** con `credentials_status: "pendientes"`: el worker reintenta la entrega, y cada reintento genera una contraseña nueva (la escrita por el administrador solo se usa en el primer intento).
- Respuesta `201`: `{"status": "success", "user": ManagedUser}`; `user.credentials_status` es `enviadas` o `pendientes`. Auditoría `cuenta_directorio_creada` (sin datos sensibles) y, aparte, `credenciales_enviadas` o `credenciales_pendientes`.

```json
{ "uid": "ana.ruiz", "email": "ana@ejemplo.local", "given_name": "Ana", "surname": "Ruiz", "area_ids": [3], "password": "<contraseña que cumple la política>" }
```

## `GET /users/password-policy`
Lo lee el generador y la validación del formulario web (sin valores fijos en el cliente).

```json
{ "status": "success", "policy": { "min_length": 16, "max_length": 128,
  "required_classes": ["mayusculas", "minusculas", "digitos", "simbolos"],
  "symbols": "!#$%&()*+,-./:;<=>?@[]^_{}~" } }
```
- `required_classes`: subconjunto de `mayusculas`, `minusculas`, `digitos`, `simbolos`.
- Solo se admiten letras ASCII, dígitos y los `symbols` publicados (sin espacios ni comillas).

## `POST /users/<id>/credentials` (retirado, v3)
- `410 endpoint_retirado` (`use: "PUT /users/<id>"`): la contraseña de una cuenta del directorio la cambia el superadmin en «Editar usuario» ([areas-y-roles.md](areas-y-roles.md) v3).
- Quedan el alta con Send y el worker de entregas automáticas; `credentials_status` sigue en `ManagedUser`.

## Errores
| HTTP | `code` | Mensaje |
|---|---|---|
| 409 | `uid_duplicado` | Ese identificador ya existe en el directorio o en el portal. |
| 409 | `correo_duplicado` | El correo ya está registrado. |
| 422 | `validacion` | `fields.uid`: "Usa minúsculas, números, punto, guion o guion bajo." |
| 422 | `validacion` | `fields.password` (v2): "Es obligatoria.", "Entre {min} y {max} caracteres.", "Falta al menos una mayúscula / minúscula / un número / un símbolo.", "Usa solo letras, números y los símbolos permitidos." |
| 422 | `validacion` | `fields.password` (v2): "El directorio rechazó la contraseña por su política de seguridad." (rechazo de `ppolicy`; sin el texto del servidor; no se crea nada) |
| 503 | `directorio_no_disponible` | No se pudo crear la cuenta en el directorio; intenta más tarde. |

`503 gestor_no_disponible` no existe: la caída de Vaultwarden o del correo no falla la petición, deja `credentials_status: "pendientes"`.

## `credentials_status` en `ManagedUser` (v2, aditivo para quien lo ignore)
| Campo | Tipo | Valor |
|---|---|---|
| `credentials_status` | string \| null | `enviadas`, `pendientes` o `null` (cuenta sin onboarding del portal) |
| `credentials_sent_at` | string \| null | ISO 8601 del último envío exitoso; `null` si no hay |

- Lo devuelve toda respuesta con `ManagedUser` (`GET /users`, escrituras de usuarios, áreas y accesos).
- `enviadas` significa que el correo con el enlace salió; no que la persona lo abrió ni que su red alcance a Vaultwarden.

## Refresco
- Sin polling: el estado cambia en el worker, pero el volumen es bajo y lo consulta un admin; se lee al cargar la lista y tras las escrituras propias (alta y reenvío).

## Datos simulados
```json
{ "status": "success", "user": { "id": 31, "email": "ana@ejemplo.local", "name": "Ana Ruiz", "role": "usuario",
  "is_active": true, "auth_source": "ldap", "areas": [ { "id": 3, "name": "Finanzas" } ], "managed_areas": [],
  "last_login_at": null, "credentials_status": "pendientes", "credentials_sent_at": null } }
```

## Configuración del directorio (FNC-043; consumidor DIS-023)
Solo superadmin (resto: 401/403). Fuente única: variables `LDAP_*` (ADR-004); sin edición desde la interfaz.

| Método y ruta | Respuesta |
|---|---|
| `GET /auth-config` | `200` `{active, source: "env", editable: false, config, origins, variables, error}` |
| `PUT /auth-config` | `{}` → `200 {"status": "success", "config": <igual que GET>}`; cualquier campo → `400 campo_no_permitido` |
| `POST /auth-config/test` | Sin cuerpo. `200 {"status": "success", "message"}`; campos → `400 campo_no_permitido`; inactivo → `409 directorio_no_configurado`; fallo → `503 directorio_no_disponible` |
| `GET /directory/search?q=` | `q` 2–64 → `200 {count, users: [{name, email, account, exists}]}` (máx. 50); fuera de rango → `400 parametro_invalido`; `409`/`503` como la prueba |

- `config` (o `null` si inactivo o inválido): `url`, `host`, `port`, `tls` (`ldaps`/`starttls`), `ca_cert` (`custom`/`system`), `bind_dn`, `users_base_dn`, `groups_base_dn`, `user_attr`, `group_object_class`, `group_member_attr`, `timeout_seconds`, `user_object_classes[]`, `placeholder_member`.
- `origins`: por campo, `env` o `default`; `variables`: campo → nombre de la variable `LDAP_*`.
- `error`: `null` o `configuracion_invalida` (el detalle va al log).
- Nunca incluye la contraseña de bind ni la ruta de la CA (SEC-LDAP-11).

## Historial
| Versión | Fecha | Cambio |
|---|---|---|
| 1 | 2026-10-14 | Versión inicial (FNC-038) |
| 1 | 2026-10-18 | Sección "Configuración del directorio" agregada (FNC-043): documenta endpoints que no tenían contrato. **Aditivo** para el contrato (sigue v1): no cambia ningún endpoint ya contratado. Sí cambia la forma heredada de NEXUS que lee `settings-panel.tsx`; la adapta DIS-023. Decisión del orquestador (pendiente de validar en la prueba de concepto) |
| 1 | 2026-10-19 | `email` ≤ 120 en lugar de ≤ 254 (motivo: `users.email` es `String(120)`; más largo daría 500 en Postgres), solo ASCII y único también en el directorio (FNC-064, revisión de seguridad). **Restrictivo** (un valor antes válido ahora da `422`/`409`); sigue v1 porque ningún cliente lo usaba en producción (FNC-069 solo en simulado). Decisión del orquestador (pendiente de validar en la prueba de concepto) |
| 2 | 2026-11-18 | **Incompatible**: `password` pasa de prohibido (`400 campo_no_permitido`, P8) a obligatorio; nuevos `GET /users/password-policy`, `POST /users/<id>/credentials`, `credentials_status` y `credentials_sent_at` en `ManagedUser`. Motivo: ADR-008 (onboarding con Send de Vaultwarden), aprobado por el dueño el 2026-11-18. El cliente v1 deja de funcionar sin `password`: FNC-138 (backend) y FNC-139 (web) se integran juntas (FNC-135) |
| 3 | 2026-11-19 | FNC-161 (pedido del dueño): `POST /users/<id>/credentials` (reenviar) se retira (`410`); su función la cumple el cambio de contraseña de `PUT /users/<id>`. **Incompatible** para quien llamaba la ruta (solo la web, ya ajustada). Decisión del orquestador (pendiente de validar) |
| 3.1 | 2026-11-24 | FNC-168: la cuenta del portal nace `auth_source="sso"` (vive en LDAP y entra por Authelia); migración 0019 |
