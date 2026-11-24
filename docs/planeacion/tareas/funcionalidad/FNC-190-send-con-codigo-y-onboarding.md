# FNC-190 — Send con código, onboarding Aduana, rotar y enviar, y JumpServer en un punto

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Genera** | FNC-191 (web, `Propuesta`: botón «Rotar y enviar» en Editar usuario) |

## Contexto
- Dueño (2026-11-24): migrará sus usuarios de LDAP a Aduana (`flask alta migrar-ldap`, FNC-182) y les enviará un onboarding y su contraseña por Send; el enlace lleva un código de 6 dígitos para que quien dé con la liga no pueda abrirlo; igual para toda rotación (portal o CLI). El código va en el mismo correo, en un bloque aparte.
- Ajuste del dueño (mismo día): cada cambio de contraseña actualiza los secretos de JumpServer para su autologin; antes solo lo hacía el autoservicio.

## Cambios
- `secretos/cifrado.py`: `clave_de_acceso_send` (`base64(PBKDF2-HMAC-SHA256(código, material de 16 bytes, 100000, 32))`, constantes `ITERACIONES_CODIGO_SEND`, `LARGO_HASH_CODIGO_SEND`); fuente: `SendService.encrypt` de `bitwarden/clients` (`SEND_KDF_ITERATIONS = 100000`).
- `secretos/sends.py`: `codigo=` en `construir_send` (campo `password`), `SendsPorCli` (JSON de la CLI) y `crear_send_texto`; `codigo_de_acceso()` con `secrets`, `LARGO_CODIGO_SEND = 6`.
- `users/entrega_credenciales.py`: toda entrega crea el Send con código nuevo y lo manda en el correo (`codigo` en la lista blanca); `plantilla` elegible (`credenciales_iniciales` u `onboarding_aduana`); el worker usa la de la fila.
- Migración `0020`: columna `credential_deliveries.plantilla`, plantilla `onboarding_aduana`, bloque del código en `credenciales_iniciales` (solo si seguía idéntica a 0016; `downgrade` simétrico).
- `alta/` (CLI): `--plantilla` en `migrar-ldap` y `usuarios` (por omisión `onboarding_aduana`); el alta del portal sigue con `credenciales_iniciales`.
- `users/rotar_contrasena.py` + `users/api.py`: `POST /users/<id>/rotar-contrasena`; contrato `usuarios-directorio.md` v3.2; caso en `tests/matriz_proteccion.py`.
- JumpServer: `integraciones/jumpserver.py` (`sincronizar_contrasena`, oyente) y `directory/writer.py` (`registrar_oyente_cambio_contrasena`; se avisa tras `change_password` y tras el alta con contraseña en `HECHO`); se registra en `app/__init__.py`. Se quitan las llamadas directas del autoservicio de LDAP (las cuentas `local` llaman directo) y `auth/autoservicio_externos.py`.

- Tercer ajuste del dueño: `--enviar-a CORREO` (+ `--si`) y `--solo UID` en `migrar-ldap`; `--enviar-a` también en `usuarios`; columna `credential_deliveries.destinatario` (en 0020); auditoría «CREDENCIALES REDIRIGIDAS»; confirmación `¿Continuar? [s/N]`; solo CLI (el portal borra el destinatario al rotar). Documentado en `scripts/alta/README.md`; pruebas en `tests/alta/test_enviar_a_cli.py`.

## Decisiones
- El código nunca se guarda: vive en variables locales entre el Send y el correo; cada reintento del worker crea Send y código nuevos.
- El alta con contraseña también avisa a JumpServer (el alta fija la contraseña con Password Modify dentro de `create_user`, no con `change_password`): el mismo helper del escritor, un solo aviso por camino.
- Falla de JumpServer: no revierte LDAP; log con el tipo de error y auditoría en una sesión de BD propia (no confirma ni deshace lo pendiente de quien cambia la contraseña); no sigue redirecciones (3xx = fallo).
- Una plantilla `credenciales_iniciales`/`onboarding_aduana` editada sin `{codigo}` no crea el Send (`plantilla_sin_codigo`, la entrega queda pendiente).
- URL de JumpServer: https y nombre de host (sin IP); si no, no se llama y se audita.
- `rotar_y_enviar` repite ~25 líneas de `alta/rotacion.rotar` para no hacer depender `users/` de `alta/`; unificarlas queda como mejora posible.

## Verificación
- Hash del `password` del Send: comparado en prueba con un cálculo independiente de `hashlib.pbkdf2_hmac` (mismo material que el enlace). **No** se probó contra un Vaultwarden ni una CLI `bw` reales: que el servidor acepte el hash y que `bw send create` procese `password` en claro se tomó del código de Bitwarden/Vaultwarden, no de una ejecución.
- Pruebas nuevas: `tests/secretos/test_send_con_codigo.py` (9), `tests/users/test_rotar_contrasena.py` (16), `tests/alta/test_plantilla_cli.py` (5), `tests/test_migracion_0020_onboarding.py` (5), `tests/integraciones/test_jumpserver.py` (19). Resultados finales: ver la bitácora.

- Corrección tras revisión del orquestador: `jumpserver.py` usa `directory.configuracion.es_ip_literal` (cubre IPv4 abreviada, decimal y IPv6; sin duplicar) y la prueba rechaza `https://[2001:db8::1]`, `127.1`, `2130706433` y `10.1.2` (convención de `tests/directory/test_config.py`); no se quitó ningún caso.

## Revisión de seguridad (`auditor-seguridad`, modo cambio): Aprobado
- M1 (Media, corregido): `add_audit_log` confirmaba la sesión de quien llama → auditoría con sesión propia.
- B1 (Baja, corregido): redirecciones del POST a JumpServer (`allow_redirects=False`). Plantilla editada sin `{codigo}` (corregido).
- B2 (Baja, abierto): 6 dígitos = 10^6 combinaciones; sin verificar si Vaultwarden limita intentos por Send. Decisión del dueño.
- B3 (Baja, abierto): la contraseña aleatoria que invalida una entrada huérfana también va a JumpServer; `_es_ip` no detecta formas no canónicas (`127.1`).

## Impacto en elementos compartidos
- `impacto.py` (última corrida) también lista `Respuesta`, `_clave_ldap`, `_como`, `_cuerpo`, `_entrega` y `_fallos`: son helpers privados de las pruebas nuevas, con el mismo nombre que otros de otros archivos de prueba; ningún código compartido cambia por ellos.
- También listados por `impacto.py`: `_plantillas`, `_registrar`, `_url`, `_volcado`, `cliente_como` (fixtures locales de mis pruebas que sobrescriben el de `conftest.py` solo en su archivo, como ya hace `tests/users`) y `crear_texto` (parámetro opcional `codigo`, ya listado). Los de nombre repetido son privados de cada módulo; sin efecto en otras áreas.
- Tabla de `impacto.py`: casi todo son coincidencias de nombre (`crear`, `usuarios`, `rotar`...); los reales son `EntregaCredenciales`, `enviar_credenciales`, `crear_send_texto`, `change_password` y `cambiar_contrasena`/`restablecer_*` (autoservicio).
- `EscritorDirectorio.change_password` y `create_user`: ahora avisan a oyentes (usan el escritor: autoservicio, «Editar usuario», alta, entrega/worker, CLI, rotación).
- `enviar_credenciales` / `crear_send_texto` / `construir_send`: parámetro nuevo opcional (`codigo`, `plantilla`).
- `CLAVES_POR_PLANTILLA`, `credenciales_iniciales` (texto con el código) y la tabla `credential_deliveries` (columna `plantilla`).
- `auth/autoservicio.py` (sin la llamada a JumpServer en la rama LDAP) y `autoservicio_externos.py` (eliminado).

## Bitácora
- 2026-11-24: implementada en `fnc/FNC-190-send-con-codigo-y-onboarding`; ajuste de JumpServer incorporado a mitad de la tarea.
