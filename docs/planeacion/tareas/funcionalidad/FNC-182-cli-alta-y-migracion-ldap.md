# FNC-182 — CLI de altas (áreas, plataformas, usuarios) y migración desde LDAP

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Genera** | FNC-183 (Propuesta) |

## Contexto
- Dueño (2026-11-24): «una carpeta con scripts para dar de alta por CLI usuarios, áreas, plataformas… migrar los usuarios que ya tengo en mi LDAP; rotar contraseñas solo si yo lo decido; todo por flag».
- Decisiones del dueño: comandos `flask` dentro del servidor (el cliente HTTP queda en FNC-183); entrega por Vaultwarden Send + correo; `--grupo` acepta cualquier grupo; superadmin siempre se omite; la persona debe quedar también en el grupo de Authelia de su rol.

## Cambios
- `app/modules/alta/` (módulo nuevo, una responsabilidad por archivo): `cli.py` (grupo `flask alta`), `importacion.py` (áreas, plataformas, usuarios), `migracion.py` (`migrar-ldap`), `grupos_ldap.py` (errores de CLI y conjuntos; la lectura con `ldap3` vive en `directory/grupos.py`), `grupo_portal.py` (grupo de Authelia por rol), `rotacion.py` (rotación con entrega), `resumen.py`, `csv_carga.py`. Registrado en `app/__init__.py` como los otros `AppGroup`.
- Comandos: `areas`, `plataformas`, `usuarios` (`--crear-en-ldap`, `--omitir-si-existe-en-ldap`, `--rotar-contrasena`) y `migrar-ldap` (`--grupo`, `--rol`, `--actualizar-rol/--omitir-existentes`, `--sin-grupo-del-portal`, `--rotar-contrasena`); todos con `--dry-run`.
- Reutilizado sin duplicar: `bulk_import.services` (validación y alta), `directory_accounts.crear_cuenta_directorio`, `entrega_credenciales` (`fijar_contrasena_en_directorio`, `enviar_credenciales`, `marcar_*`), `politica_contrasena.generar`, `grupos_de_rol.sincronizar_grupo_de_rol`, `ClienteDirectorio`, `roles.cambiar_rol`.
- `bulk_import/services.procesar_usuarios`: parámetros opcionales `auth_source` y `actor` (por omisión, el comportamiento anterior). La CLI no tiene sesión, por lo que sin `actor` ningún rol era «asignable».
- `scripts/alta/`: `README.md`, `alta.sh` y tres CSV de ejemplo ficticios.

## Decisiones (a validar)
- Preflight de entrega (LDAP, `ENABLE_NOTIFICATIONS`, `BASE_URL`, Vaultwarden) antes de escribir: si falla, el comando aborta entero (también con `--crear-en-ldap`).
- Fallo a mitad de una rotación (LDAP cambió, Send/correo no): fila `pendientes` para que el worker rote de nuevo; se reporta `ERROR`.
- `migrar-ldap --rotar-contrasena` rota a todos los procesables de la corrida (nuevos y existentes en el portal, salvo superadmin).
- Código de salida `1` también con `CONFLICTO`.
- `--grupo` con DN solo bajo `LDAP_GROUPS_BASE_DN` o `LDAP_GROUPS_INACTIVE_BASE_DN`; grupo pedido que no existe → error; un grupo por omisión ausente se ignora.
- Superadmin: se lee `OIDC_GROUP_SUPERADMIN` y sus miembros se excluyen aunque estén en otro grupo importado.
- `usuarios`: `apellido` (columna opcional) o la última palabra del nombre; `uid` opcional o la parte local del correo.
- Variables: ninguna nueva (por eso `VARIABLES.md`/`HISTORIAL.md`/`.env.example` no cambian).

## Pruebas
- `tests/alta/test_migrar_ldap.py` (16) y `tests/alta/test_alta_csv.py` (17): ver Verificación.

## Verificación
- `pytest -q -p no:cacheprovider tests/alta tests/users tests/test_guardia_rutas.py tests/test_bulk_import.py` → 291 passed, código 0 (antes de las correcciones de seguridad); tras ellas, `tests/alta tests/directory/test_aislamiento.py` → 35 passed.
- Suite completa `pytest -q -p no:cacheprovider` → **3299 passed, 0 failed**, código 0 (26 min). Una corrida intermedia falló `test_solo_el_paquete_del_directorio_importa_ldap3`: la lectura de grupos se movió a `app/modules/directory/grupos.py` (SEC-LDAP-01).
- `auditor-seguridad` (modo cambio): **Aprobado**; 1 Media (la vía `usuarios` podía rotar a un superadmin de LDAP sin cuenta), 3 Bajas (uid/nombre sin validar en `--crear-en-ldap`, rol sin normalizar, caracteres de control en la salida) → corregidas con pruebas de regresión.
- No verificado: ejecución real contra LDAP, Vaultwarden y SMTP; `alta.sh` (no se ejecutó: el `venv` no existe en el worktree); `revisor` no se lanzó.

## Impacto en elementos compartidos
`impacto.py`: ninguno detectado. Cambio manual: `bulk_import/services.procesar_usuarios` gana `auth_source` y `actor` opcionales; el API de importación masiva y `ejecutar_importacion_masiva` no los pasan (sin cambio de comportamiento). Nuevo `directory/grupos.py` (solo lectura).

## Bitácora
- 2026-11-24: implementada; ajustes del dueño (grupo arbitrario, `--rol`, grupo del portal) incorporados durante el desarrollo.
