# Altas por CLI (`flask alta`, FNC-182)

Da de alta áreas, plataformas y usuarios desde la terminal del servidor y migra personas de LDAP a Aduana. Los comandos viven en `app/modules/alta/` y reutilizan las validaciones de la importación masiva (`bulk_import`).

## Cómo se corre
```bash
./scripts/alta/alta.sh <comando> [opciones]     # como la cuenta de servicio, desde la carpeta del código
./scripts/alta/alta.sh --help
```
`alta.sh` ejecuta `venv/bin/flask --app run:app alta "$@"`: usa la cuenta dueña de `instance/` (la de servicio) con `sudo -u`; sin ella, corre como quien lo invoca. Lee la configuración (`.env`) igual que el backend.

## Orden recomendado
1. **Áreas** → 2. **Plataformas** (necesitan su área) → 3. **`migrar-ldap`** o **`usuarios`** (las áreas del CSV deben existir).

Empieza **siempre** con `--dry-run`: lee, valida y muestra qué haría, pero no escribe en la BD ni en LDAP.

```bash
./scripts/alta/alta.sh areas scripts/alta/areas.ejemplo.csv --dry-run
./scripts/alta/alta.sh areas scripts/alta/areas.ejemplo.csv
./scripts/alta/alta.sh plataformas scripts/alta/plataformas.ejemplo.csv --dry-run
./scripts/alta/alta.sh migrar-ldap --grupo <cn> --dry-run
./scripts/alta/alta.sh migrar-ldap --grupo <cn>
./scripts/alta/alta.sh usuarios scripts/alta/usuarios.ejemplo.csv --dry-run
```

## Comandos

### `areas ARCHIVO.csv [--dry-run]`
Columnas: `nombre,descripcion,color,icono` (ver `areas.ejemplo.csv`).

### `plataformas ARCHIVO.csv [--dry-run]`
Columnas: `nombre,descripcion,area,enlace,icono` (ver `plataformas.ejemplo.csv`).

### `usuarios ARCHIVO.csv [opciones]`
Columnas: `nombre,correo,rol,areas` y, solo para LDAP, `uid` y `apellido` opcionales (ver `usuarios.ejemplo.csv`). `rol`: `usuario` o `admin_area` (nunca `administrador`); `areas` por nombre, separadas con `;`.

| Flag | Efecto |
|---|---|
| `--dry-run` | No escribe nada |
| `--crear-en-ldap` | Crea también la entrada en LDAP con contraseña generada (política vigente) y la entrega por Send de Vaultwarden + correo; la persona queda en el grupo de Authelia de su rol |
| `--omitir-si-existe-en-ldap` | Si el correo ya está en LDAP no lo crea: solo vincula la cuenta del portal (`sso`) y la deja en el grupo de su rol. Sin el flag es un **conflicto** |
| `--plantilla` | Plantilla del correo de la rotación: `onboarding_aduana` (por omisión) o `credenciales_iniciales` |
| `--enviar-a CORREO`, `--si` | Ver «Probar el envío con otro destinatario» (exige `--rotar-contrasena`) |
| `--rotar-contrasena` | Rota la contraseña de LDAP de las personas que **ya existían** en LDAP (las creadas en la corrida ya recibieron una nueva) |

`--omitir-si-existe-en-ldap` y `--rotar-contrasena` exigen `--crear-en-ldap`. Sin `--crear-en-ldap` no se toca LDAP (cuenta del portal con el origen que fija la instalación).

### `migrar-ldap [opciones]`
Importa a Aduana las personas de uno o más grupos de LDAP. Crea cuentas `sso`, activas y sin contraseña propia.

| Flag | Efecto |
|---|---|
| `--grupo NOMBRE` (repetible) | Grupo a importar: su `cn` (bajo `LDAP_GROUPS_BASE_DN`) o su DN completo (bajo esa base o `LDAP_GROUPS_INACTIVE_BASE_DN`; fuera, error). Sin él: `OIDC_GROUP_AREA_ADMIN` y `OIDC_GROUP_USER` |
| `--rol usuario\|admin_area` | Fuerza el rol. Sin él: `admin_area` si la persona es miembro de `OIDC_GROUP_AREA_ADMIN`; si no, `usuario` |
| `--omitir-existentes` (por omisión) / `--actualizar-rol` | Cuenta ya existente en el portal: se omite, o se le ajusta el rol (y sale del grupo del otro rol) |
| `--sin-grupo-del-portal` | No agrega a las personas al grupo de Authelia de su rol (`OIDC_GROUP_USER` u `OIDC_GROUP_AREA_ADMIN`). Por omisión **sí** se agregan; sin eso Authelia las rechaza al entrar |
| `--rotar-contrasena` | Rota la contraseña de LDAP de **todas** las personas procesadas en la corrida (nuevas y ya existentes en el portal) |
| `--solo UID` (repetible) | Limita la corrida a esas personas; las del grupo que no se piden salen «omitido: fuera de --solo». Quien no es miembro de los grupos de la corrida (o sin `--grupo`) se busca directo en LDAP bajo `LDAP_USERS_BASE_DN`; si no existe, `ERROR` |
| `--plantilla` | Plantilla del correo de la rotación: `onboarding_aduana` (por omisión) o `credenciales_iniciales` |
| `--enviar-a CORREO`, `--si` | Ver «Probar el envío con otro destinatario» (exige `--rotar-contrasena`) |
| `--dry-run` | No escribe nada («se agregaría a …», «se rotaría») |

Reglas:
- Solo personas bajo `LDAP_USERS_BASE_DN`; las de otra rama se reportan y omiten. Sin `mail`: se reportan y omiten.
- Los miembros de `OIDC_GROUP_SUPERADMIN` se omiten **siempre** («omitido: superadmin»): ni alta, ni grupo, ni rotación. Una cuenta existente con rol `administrador` en el portal tampoco se modifica.
- Un fallo al agregar al grupo del portal no deshace la cuenta; se reporta como `ERROR`.

### `migrar-usuario UID [opciones]` (FNC-202)
Migra a **una** persona de LDAP y la deja lista en una corrida, en este orden: 1) cuenta `sso` + grupo del portal (lo mismo que `migrar-ldap --solo`; si la cuenta ya existe continúa); 2) áreas; 3) responsiva; 4) accesos; 5) rotación de contraseña. Sirve aunque la persona no esté en ningún grupo.

| Flag | Efecto |
|---|---|
| `--area NOMBRE` (repetible, **obligatorio**) | Agrega la cuenta a esas áreas si no está; inexistente o inactiva → `ERROR` antes de escribir nada |
| `--responsiva-firmada` | Registra la carta responsiva como firmada (cuenta y accesos vigentes pendientes) y activa su aprovisionamiento. Auditoría `firma_responsiva` con actor «sistema/CLI», «registrada por migración» |
| `--plataforma NOMBRE` (repetible) | Otorga el acceso (origen `migracion`, sin actor): la plataforma debe estar activa, tener el nivel y ser de una de las áreas de la persona (las de `--area` o las que ya tenía) |
| `--nivel usuario\|admin` | Nivel de los accesos (por omisión `usuario`) |
| `--notificar` (apagado por omisión) | Por cada plataforma **otorgada en la corrida** (no las omitidas por ya vigentes) envía a la persona el correo existente «solicitud aprobada» (`notificar_solicitud_aprobada`, plantilla `solicitud_aprobada`), tras confirmar la transacción. Respeta `ENABLE_NOTIFICATIONS`, `NOTIFY_ACCESS_EVENTS` y su preferencia de correo (si no se envía, línea `OMITIDO`). Un fallo de correo se reporta `ERROR` sin deshacer ni detener la rotación. **`--enviar-a` solo aplica a la rotación**: este aviso va siempre a la persona. `--dry-run`: «se notificaría a …» |
| `--rotar-contrasena`, `--plantilla`, `--enviar-a`, `--si` | Como en `migrar-ldap`; rota **al final** y solo si ningún paso dio `ERROR` |
| `--dry-run` | Valida todo y muestra qué haría; no escribe |

- Con `--responsiva-firmada` el acceso encola el aprovisionamiento (grupo LDAP y conector, si existe); sin él queda `en_proceso` esperando la firma en el portal. Funciona con `RESPONSIVA_MODO=global` y `por_plataforma` (en este último los accesos de la corrida se marcan firmados).
- Acceso ya vigente con ese nivel (o superior) → `OMITIDO`, no error. Superadmin (grupo `OIDC_GROUP_SUPERADMIN` o cuenta `administrador` del portal) → `OMITIDO`, no se toca. Sin `mail` o fuera de `LDAP_USERS_BASE_DN` → `ERROR`.
- Mismas líneas, `Resumen` y códigos de salida que los demás comandos; una entrada de auditoría por corrida.

```bash
./scripts/alta/alta.sh migrar-usuario dmartinez --area Aduana --plataforma Zabbix --responsiva-firmada --rotar-contrasena --dry-run
./scripts/alta/alta.sh migrar-usuario dmartinez --area Aduana --plataforma Zabbix --responsiva-firmada --rotar-contrasena
```

## Rotación de contraseñas
- Contraseña generada con la política (`PASSWORD_POLICY_*`) → Password Modify en LDAP → Send de Vaultwarden → correo con el **enlace** (flujo FNC-138).
- La contraseña **nunca** se imprime, registra ni guarda.
- Antes de tocar nada se comprueba que existan LDAP, `ENABLE_NOTIFICATIONS=true`, `BASE_URL` y Vaultwarden configurados; si falta algo el comando termina con error y **no escribe nada** (nadie queda con una contraseña que nadie conoce).
- **Login real a Vaultwarden (FNC-205):** además de la configuración, antes de la primera escritura (en `usuarios --crear-en-ldap`, `migrar-ldap --rotar-contrasena` y `migrar-usuario --rotar-contrasena`) se hace una vez el mismo inicio de sesión que usa el Send (token y claves de la cuenta; no se crea ningún Send). Si Vaultwarden rechaza las credenciales (p. ej. `VAULTWARDEN_EMAIL` de otra cuenta) o no responde, el comando termina con «Vaultwarden no acepta las credenciales configuradas: …» (o «Vaultwarden no responde: …») y no escribe en la BD ni en LDAP. Con `--dry-run` también se verifica (solo lectura) y se informa «Vaultwarden acepta las credenciales configuradas».
- Si LDAP cambió pero el Send o el correo fallan a mitad, la persona queda `pendientes` en `credential_deliveries` y el worker de aprovisionamiento la rota otra vez con una contraseña nueva; el comando lo reporta como `ERROR`.

## Salida y código de salida
Una línea por persona o fila (`CREADO`, `ACTUALIZADO`, `ROTADO`, `OMITIDO`, `CONFLICTO`, `ERROR`) y un resumen con totales. Código `0` si no hubo `ERROR` ni `CONFLICTO`; `1` si los hubo; `2` por uso incorrecto. Cada corrida real deja una entrada de auditoría con actor «sistema/CLI».

## Límites
- Máximo 500 filas por CSV (el límite de la importación masiva); CSV en UTF-8 con encabezados.
- Sin variables nuevas: se usan las de LDAP (`LDAP_*`), grupos (`OIDC_GROUP_*`), política de contraseña (`PASSWORD_POLICY_*`), correo (`ENABLE_NOTIFICATIONS`), `BASE_URL` y Vaultwarden.

## Probar el envío con otro destinatario (`--enviar-a`)
Solo CLI (la API y el portal no lo exponen). Con `--rotar-contrasena`, el correo con el enlace del Send y su código de 6 dígitos va a `CORREO` en lugar del `mail` de la persona; el nombre y el usuario del cuerpo siguen siendo los de la persona.

```bash
./scripts/alta/alta.sh migrar-ldap --grupo <cn> --solo <uid> --rotar-contrasena --enviar-a yo@empresa --dry-run
./scripts/alta/alta.sh migrar-ldap --grupo <cn> --solo <uid> --rotar-contrasena --enviar-a yo@empresa
```
- **La contraseña REAL de la persona en LDAP cambia** (y se sincroniza JumpServer); la persona no recibe el correo. El comando lo advierte y pide `¿Continuar? [s/N]`; `--si` omite la pregunta y `--dry-run` no escribe («se enviaría a …»).
- El destinatario queda en la entrega: los reintentos del worker van al mismo buzón. Una rotación posterior desde el portal vuelve al correo de la cuenta.
- Auditoría por entrega: «CREDENCIALES REDIRIGIDAS: <uid> → <correo>» (sin secretos).
