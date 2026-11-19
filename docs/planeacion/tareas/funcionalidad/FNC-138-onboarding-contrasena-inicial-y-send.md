# FNC-138 — Usuarios: onboarding con contraseña inicial entregada por Send (política, estado, reintento y reenvío)

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Agente** | desarrollador |
| **Fase** | 8 (propuesta) |
| **Módulo / Área** | usuarios (alta en el directorio y entrega de credenciales) |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | 2026-11-18 |
| **Finalizada** | |
| **Estatus Git** | Rama local `fnc/FNC-138-onboarding-send`; sin merge ni push |
| **Rama** | `fnc/FNC-138-onboarding-send` |
| **Commits / PR** | |
| **Requiere migración BD** | Sí (tabla de entregas; plantilla de correo) |
| **Requiere auditor-seguridad** | Sí (contraseñas, LDAP, permisos, correo) |

## Contexto
- `app/modules/users/directory_accounts.py:8` y `:55`: `password` → `400 campo_no_permitido` (P8); la cuenta nace sin `userPassword`.
- `app/modules/directory/writer.py`: `DatosCuenta.password` y `userPassword` en el `add` existen **solo en cambios sin commit de otra sesión** (no en `develop`), y escriben la contraseña **en claro** (ADR-008, decisión 5).
- P8 también en: `writer.py:18`, `docs/backend/README.md:301`, `tests/users/test_alta_directorio.py:5` y `:195`, `docs/contratos/usuarios-directorio.md:29`, SEC-LDAP-09 y SEC-AUTHZ-06 de `docs/seguridad/LINEAMIENTOS.md`.
- Notificaciones: `send_notification_by_slug` (`notifications/services.py:233`) devuelve `{"status": "error"}` en lugar de lanzar.

## Objetivo
- Al crear la cuenta, el portal fija la contraseña inicial en LDAP y entrega usuario, contraseña y URL del portal por un Send con el enlace por correo; si algo falla, la cuenta queda con credenciales pendientes y se reintenta.

## Alcance
- **Incluye:**
  - Política de contraseña (módulo único, `app/modules/users/politica_contrasena.py`): longitud y clases desde variables; generador de servidor con `secrets`; endpoint de lectura de la política (contrato FNC-135).
  - `POST /users/directory`: `password` obligatorio y validado; se escribe en LDAP con Password Modify (RFC 3062) tras el alta (ADR-008 5A); nunca en BD, auditoría, logs, mensajes de error ni `repr`.
  - Primer intento síncrono: Send (FNC-136) + correo (plantilla nueva `credenciales_iniciales`, solo enlace, sin contraseña; SEC-MAIL-05). Éxito → `enviadas`.
  - Falla de Vaultwarden, del correo o `ENABLE_NOTIFICATIONS=false` → `pendientes`, entrega encolada (FNC-137); cada reintento genera contraseña nueva, la reescribe en LDAP, crea Send nuevo y manda el correo (ADR-008, decisión 4). Agotados los intentos: aviso al superadmin (mismo patrón que `avisar_fallo`).
  - Tabla de entregas (`app/modules/users/models.py`): usuario, estado, intentos, siguiente intento, id del último Send (no secreto), error saneado; migración siguiente a `0012`.
  - `POST /users/<id>/credentials` (Reenviar): contraseña nueva + Send nuevo; borra el Send anterior si existe; solo cuentas `ldap` creadas en el directorio; permisos según contrato v2.
  - `credentials_status` en `usuario_gestionado`.
  - Auditoría: `credenciales_enviadas`, `credenciales_pendientes`, `credenciales_reenviadas` (sin contraseña ni enlace).
  - Documentación: `docs/backend/README.md`, `docs/configuracion/VARIABLES.md` y `HISTORIAL.md`, `.env.example`, SEC-LDAP-09 y SEC-AUTHZ-06 en `docs/seguridad/LINEAMIENTOS.md`, y el cambio de `docs/business_rules.md` descrito abajo.
- **No incluye:** el formulario web (FNC-139); Sends en `secretos/` (FNC-136); el worker (FNC-137); `POST /users` (cuentas locales); cambio de contraseña por el usuario (sigue en Authelia); `delete_user`/`change_password` del trabajo sin commit (fuera de alcance).

### Cambio a `docs/business_rules.md` (no aplicado aquí)
- El archivo tiene cambios sin commit de otra sesión; esta tarea agrega al integrarse una sección:
  - **Regla:** el portal fija solo la contraseña inicial (alta y reenvío), con la política vigente, y la entrega por un Send de Vaultwarden con el enlace por correo; nunca la guarda ni la manda en claro; si la entrega falla, la cuenta queda «credenciales pendientes» y se reintenta con contraseña nueva.
  - **Ejemplo:** alta de `ana.ruiz` con Vaultwarden caído → cuenta creada, estado pendiente; al volver el servicio, el worker genera otra contraseña, la escribe en LDAP y manda el enlace.
  - **Impacto:** `POST /users/directory`, `POST /users/<id>/credentials`, `credentials_status`, worker, plantilla `credenciales_iniciales`, modal de alta.
- Y corrige la sección «Operaciones de Directorio LDAP» de ese archivo si se integra con `userPassword` en claro.

## Archivos previstos
- `app/modules/users/directory_accounts.py`, `app/modules/users/api.py`, `app/modules/users/serializacion.py`, nuevos en `app/modules/users/`: `politica_contrasena.py`, `entrega_credenciales.py`, `models.py`
- `app/modules/directory/writer.py` (solo la operación de contraseña; ver pregunta sobre el trabajo sin commit)
- `migrations/versions/0013_*.py`, `tests/users/`, `tests/matriz_proteccion.py`
- Documentación listada en Alcance

## Reutilización
- `EscritorDirectorio`/`ClienteDirectorio`, `cliente_del_entorno()` y Sends de FNC-136, cola y worker (FNC-137), `segundos_de_espera`, `send_notification_by_slug`, `add_audit_log`, `saneo.sanear_error`, `validar_area_ids`, `BASE_URL`.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| `usuario_gestionado` (+`credentials_status`) | función | `users/api.py`, `api/routes.py`; en web todas las vistas de `ManagedUser` (Usuarios, Áreas → administradores, Plataformas → accesos, diálogo de rol) | ☐ |
| `DatosCuenta` / `EscritorDirectorio` (operación de contraseña) | clase | `users/directory_accounts.py`, `provisioning/ldap_provider.py` (membresías), `tests/directory/test_writer.py` | ☐ |
| `send_notification_by_slug` (se lee su resultado) | función | `notifications/access_notifications.py`, `avisar_usuario_creado` (login), pruebas de notificaciones | ☐ |
| Plantillas de notificación (+`credenciales_iniciales`) | datos | Ajustes → Plantillas (`templates-tab.tsx`), respaldo/restauración (`settings/respaldo_api.py`) | ☐ |
| `tests/matriz_proteccion.py` (rutas nuevas) | prueba | guardia de rutas sin clasificar (FNC-020) | ☐ |

## Variables y configuración
| Variable | Por defecto | Notas |
|---|---|---|
| `PASSWORD_POLICY_MIN_LENGTH` | 16 | 16–128; menor que 16 → no arranca |
| `PASSWORD_POLICY_MAX_LENGTH` | 128 | ≥ mínimo |
| `PASSWORD_POLICY_REQUIRED_CLASSES` | `mayusculas,minusculas,digitos,simbolos` | subconjunto de esas cuatro |
| `PASSWORD_POLICY_SYMBOLS` | conjunto ASCII imprimible sin espacio (definir en contrato) | sin comillas ni `\` si el LDAP lo exige |
| `ONBOARDING_MAX_ATTEMPTS` (o reutilizar `PROVISIONING_MAX_ATTEMPTS`) | 5 | decidir al implementar; registrar |
- `BASE_URL` pasa a ser obligatoria con onboarding (va en el Send).
- Todas a VARIABLES.md; HISTORIAL.md con motivo (decisión del dueño 2026-11-17).

## Criterios de aceptación
- [ ] Política: 15 caracteres o falta de una clase → `422 validacion` con `fields.password`; el generador de servidor siempre cumple (prueba con 1 000 muestras).
- [ ] La contraseña no aparece en BD (consulta a todas las tablas), auditoría, logs (`caplog`), respuestas ni excepciones (prueba con un valor centinela).
- [ ] LDAP: la contraseña se fija con Password Modify; la entrada no lleva `userPassword` en claro (doble de LDAP verifica la operación).
- [ ] Vaultwarden caído → `201` con `credentials_status: pendientes`, sin contraseña en el correo ni en la respuesta; el reintento genera otra contraseña y deja `enviadas`.
- [ ] Correo fallido o notificaciones desactivadas → `pendientes` (no `enviadas`).
- [ ] Reenviar: contraseña y Send nuevos, Send anterior borrado; 404 fuera de alcance; 403 por rol según contrato; cuenta local o `sso` → `409`.
- [ ] Reintentos agotados → aviso al superadmin; estado sigue `pendientes`.
- [ ] Matriz de protección con las rutas nuevas (401/403/404/2xx por rol).
- [ ] Prueba de regresión de P8 actualizada (`test_alta_directorio.py`): sin `password` → `422`.
- [ ] Migración probada en SQLite y MySQL (o motivo si MySQL no está disponible).
- [ ] VARIABLES, HISTORIAL, `.env.example`, `docs/backend/README.md`, LINEAMIENTOS de seguridad y `business_rules.md` actualizados.
- [ ] Pruebas mínimas del lineamiento de pruebas, ejecutadas
- [ ] Cumple `docs/estandarizacion/` y no duplica código existente
- [ ] Sin direcciones IP ni secretos
- [ ] Actualiza `docs/operacion/` (SECRETOS: dependencia de Vaultwarden para el alta)
- [ ] Cierra con `auditor-seguridad`

## Impacto cruzado
- Origen ← ADR-008
- Genera → FNC-139 (web)
- Depende de → FNC-135 (contrato), FNC-136 (Sends), FNC-137 (worker)

## Riesgos y reversión
- Trabajo sin commit en `writer.py` (otra sesión): conflicto al integrar; se resuelve antes de empezar (ver preguntas).
- Política del servidor (`ppolicy`) o de Authelia más estricta que la del portal → la escritura falla; alinear valores.
- Usuarios sin acceso de red al dominio de Vaultwarden → el enlace no abre; el estado dice `enviadas`.
- Admin de área reiniciando contraseñas ajenas (SEC-AUTHZ-06): se limita según la respuesta del dueño.
- Reversión: la migración tiene `downgrade`; el contrato v1 vuelve a rechazar `password`.

## Verificación
- `pytest tests/users tests/secretos tests/provisioning tests/directory tests/notifications tests/test_guardia_rutas.py tests/test_migracion_0015.py`: 752 passed (con un 0014 de relleno temporal, ver abajo).
- `pytest tests/test_guardia_rutas.py tests/test_proteccion_por_rol.py -k "users or credentials or guardia or directory or password"`: 75 passed.
- Cubierto con dobles (`tests/users/conftest.py`, `directorio_falso`): política y variables, alta 201 enviadas/pendientes (Vaultwarden caído, correo fallido, notificaciones desactivadas, sin `BASE_URL`), rechazo de `ppolicy` (422 y entrada retirada), contraseña ausente de BD, auditoría, logs y respuestas (centinela), reintento con contraseña nueva, agotamiento con aviso, reserva exclusiva, reenvío (200/202/503/403/404/409/400).
- Migración 0015 probada en SQLite con un 0014 de relleno temporal (la 0014 real está en la rama OIDC; el relleno no se versiona). **Falta** correr `tests/test_migraciones.py` y `tests/test_migracion_0015.py` tras integrar con 0014, y probar en MySQL.
- **No verificado:** Vaultwarden real (modos `api` y `bw`), CLI `bw`, OpenLDAP real con `ppolicy`, SMTP real, worker RQ con Redis real, política «Deshabilitar Send» de la organización.
- No se corrió la batería completa de pytest (instrucción del coordinador).

## Veredictos
| Agente | Veredicto | Fecha |
|---|---|---|
| tester | | |
| revisor | | |
| auditor-seguridad | | |

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-11-17 | Creada (decisiones del dueño A, 2026-11-17) |
| 2026-11-18 | Implementada: `entrega_credenciales.py`, `GET /users/password-policy`, `POST /users/<id>/credentials`, `credentials_status`, auditoría, migración 0015 (renumerada), plantillas `credenciales_iniciales` y `credenciales_no_entregadas`, matriz de protección, documentación. Decisiones: se reutiliza `PROVISIONING_MAX_ATTEMPTS` (sin `ONBOARDING_MAX_ATTEMPTS`); la fila de entrega nace en la transacción de la alta; sin barrido tras agotar. Pendiente `revisor` y `auditor-seguridad` |
