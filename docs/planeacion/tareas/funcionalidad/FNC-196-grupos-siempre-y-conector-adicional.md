# FNC-196 — Grupos LDAP siempre y conector como paso adicional

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Genera** | FNC-197 (web, `Propuesta`: formulario de plataformas), FNC-198 (backend, `Propuesta`: rol por conector) |

## Contexto
- Dueño (2026-11-24): «Independientemente del conector, cuando se acepte la solicitud se agregará a los grupos según el nivel `app-{plataforma}-{nivel}`. El conector funcionará solo cuando la integración con LDAP no pueda crear el usuario» y «Flujo: agrega al usuario al grupo LDAP → revisa si la plataforma tiene conector asignado → si no, termina; si sí, crea el usuario local».
- Antes `integration_type` era `ldap` O `conector`; el dueño no podía solicitar `tacacs` (sin DN ni conector → «No disponible para solicitar»).

## Cambios
- `provisioning/compuesto.py` (nuevo, registrado como proveedor `ldap`): un solo trabajo por operación = grupo (`ProveedorLdap`) y, si hay conector disponible, su `otorgar`/`revocar`. Conserva cola, reintentos y estados.
- `platforms/grupos.py`: `dn_del_nivel`, `completar_dns` (deriva y guarda los DN faltantes, con auditoría `plataforma_editada` actor sistema) y `es_grupo_reservado`. Se llama al otorgar (`access/services._encolar`).
- `directory/configuracion.py`: `PLANTILLA_GRUPO_POR_OMISION = cn=app-{plataforma}-{nivel}` cuando `LDAP_PLATFORM_GROUP_TEMPLATE` está vacía.
- `provisioning/ldap_provider.py`: ya no exige `integration_type = ldap`; `auto_crear_grupos()` (por omisión se crea el grupo faltante).
- `provisioning/queue.py`: el proveedor del trabajo es siempre `ldap`.
- `access_requests/catalogo.py`: `niveles_integrados` = ambos niveles si plataforma y área están activas.
- `access/area_admin_sync.py`: se quita `aprovisionable` (todo admin recibe `admin`).
- `access/services.py::registro_manual`: solo si no hay grupo (ni derivable) ni conector disponible.
- `connectors/`: `conector_disponible` y `ProveedorConector` ya no exigen tipo `conector`; `PUT /platforms/<id>/connector` funciona en cualquier plataforma (retirado `409 plataforma_sin_conector`).
- `platforms/api.py`: las plataformas `conector` aceptan y derivan DN; sin directorio solo `conector` sin DN se guarda sin grupos; DN de rol del portal rechazados (`422`). `ubicacion_grupos.aplica` ya no exige tipo `ldap`.
- Migración `0021` (solo datos): rellena DN faltantes si `LDAP_GROUPS_BASE_DN` está en el entorno; `downgrade` sin cambios.
- Docs: contratos `plataformas-integracion` 1.5, `solicitudes` 1.2, `conectores-y-ejecuciones` 1.5; `business_rules.md`; `backend/README.md`; VARIABLES/HISTORIAL; `.env.example`; CHANGELOG.

## Decisiones
- **`integration_type`**: se conserva la columna y la API (informativo/compatibilidad); la existencia del conector la da `has_connector`. El formulario web lo cambia FNC-197.
- **Migración + derivación**: migración `0021` para que el admin vea los DN, y además `completar_dns` al otorgar (cubre entornos sin variables en la migración). Se derivó también en alta/edición (ya existía).
- **Orden**: otorgar y revocar: grupo primero, conector después. Un solo trabajo (lo más simple que conserva reintentos y estados); ambos pasos idempotentes.
- **Fallo del conector**: acceso `fallido`/`fallo_revocacion` con su error; el grupo NO se revierte (pedido del dueño). Riesgo residual (auditor-seguridad H3, Media): un otorgar que agota intentos deja a la persona en el grupo con el acceso `fallido`; se corrige con reintento o revocación. Sin compensación automática.
- **Revocar**: «sin grupo», «grupo inexistente» y «persona inexistente» cuentan como no miembro y el conector igual da de baja (auditor-seguridad H1 y revisor ALTA 1).
- **Cambio de nivel**: solo cambia el grupo; el conector no se ejecuta en la baja reemplazada ni en el alta que la reemplaza (revisor MEDIA 2); FNC-198 lo completa.
- **Grupos de rol**: un DN derivado igual a `OIDC_GROUP_*` (p. ej. plataforma «Aduana» → `app-aduana-admins`) no se guarda ni se acepta (auditor-seguridad H2).
- **Grupo creado al otorgar** por omisión (`LDAP_PROVISIONING_AUTO_CREATE_GROUPS` sin definir = `true`).

## Hallazgos abiertos (no corregidos; alcance)
- Revisor MEDIA 3: sin directorio y sin conector, los accesos automáticos de admin en una plataforma `ldap` sin DN quedan `fallido` y bloquean editar el DN hasta revocarlos (antes no se otorgaban). Entorno sin directorio = mal configurado.
- Revisor MEDIA 5: una plataforma puede adoptar un grupo LDAP ya existente con el mismo nombre derivado si no está en otra plataforma ni es de rol.
- Revisor BAJA 6/7/8: migración compara DN como texto; `MENSAJE_SIN_CONVENCION` ya inalcanzable; con directorio y conector ausentes el catálogo ofrece la plataforma y el trabajo falla.

## Pruebas
- Nuevas: `tests/access/test_grupos_y_conector.py` (15) y `tests/test_migracion_0021_grupos.py` (5); en `tests/platforms/test_integracion_y_grupos.py` 3 nuevas.
- Ajustadas (cada una por el modelo nuevo; ninguna aserción de seguridad borrada):
  - `access_requests/test_crear.py::test_nivel_sin_grupo_es_409`, `::test_plataforma_con_conector_sin_configurar_es_409` y `test_approvals.py::test_aprobar_nivel_no_integrado_409`: ya no hay «nivel no integrado»; ahora 201/200 y se encola el trabajo.
  - `access/test_area_admin_nivel.py` (3) y `test_area_admin_sync.py` (1): sin grupo admin/usuario el admin igual recibe acceso `admin`; se eliminó `test_completar_el_grupo_admin_sube_a_los_admins` (su premisa, grupo faltante, ya no existe).
  - `provisioning/test_ldap_provider.py`: `grupo_inexistente` ahora con autocreación apagada explícitamente; `test_plataforma_que_ya_no_es_ldap` → una `conector` con grupo se aprovisiona.
  - `provisioning/test_encolado.py`: proveedor siempre `ldap`. `test_ejecucion.py::test_conector_sin_proveedor_falla_controlado`: ahora sin proveedor `ldap` registrado.
  - `connectors/test_api.py`: PUT en `ldap` ahora 200. `test_estado_y_registro.py`: `tiene_conector` depende de la configuración. `test_proveedor_conector.py::test_configuracion_no_utilizable_es_permanente` (2 casos): con conector inutilizable el trabajo falla por falta de directorio, permanente igual; el caso de host no autorizado propaga el error del conector. Las aserciones de credencial en bitácora/logs siguen intactas y pasan.
  - `platforms/test_integracion_y_grupos.py` (4): alta sin DN usa la plantilla por omisión (antes 422), `conector` acepta DN, plantilla vacía = por omisión.
- Resultados en la sección Verificación.

## Impacto en elementos compartidos (`impacto.py`)
| Elemento | Definido en | Usado en |
|---|---|---|
| `_encolar`, `registro_manual` | `access/services.py` | `api/routes.py` (firma de responsiva), `access/api.py`, `access/salida_de_area.py` |
| `encolar` | `provisioning/queue.py` | `provisioning/consultas.py`, pruebas de accesos/conectores/plataformas |
| `niveles_integrados` | `access_requests/catalogo.py` | `approvals.py`, `services.py`, catálogo (`can_request`, `requestable_levels`: web FNC-197) |
| `conector_disponible` | `connectors/consultas.py` | `platforms/estado.tiene_conector` (`has_connector` en `GET /platforms`) |
| `aplica` | `platforms/ubicacion_grupos.py` | traslado de grupos a inactivos (plataformas `conector` con DN) |
| `_grupo`, `_configuracion` | `ldap_provider.py`, `connectors/provider.py` | traslado de grupos, `connectors/ssh.py` |
| `plantilla_grupo` (nunca `None`) | `directory/configuracion.py` | alta/edición de plataformas, migración 0021 |

## Verificación
- `pytest -q -p no:cacheprovider` (suite completa, sin `-x`, `--basetemp` en `/dev/shm`): **3435 passed, 0 failed** (exit 0), 293 s. Línea base de develop ≈3413.
- Las pruebas de grupos/conector (`tests/access/test_grupos_y_conector.py`) y la migración 0021 (`tests/test_migracion_0021_grupos.py`) pasan 20/20 solas.
- Un intento anterior de la suite dio 6 fallas en `tests/connectors/test_proveedor_conector.py` solo en la suite completa: los fixtures `proveedor_simulado` (accesos y aprovisionamiento) restauraban `ProveedorLdap` como proveedor `ldap` en lugar del compuesto, contaminando las pruebas siguientes. Era un defecto de las pruebas (corregido), no del código.
- Sin verificar: ejecución contra un LDAP/Zabbix reales; que las pruebas nuevas fallen sobre develop (comprobado por razonamiento, no ejecutado); la migración sobre PostgreSQL/MySQL (solo SQLite).

## Bitácora
- 2026-11-24: implementación, revisión (`revisor`) y auditoría (`auditor-seguridad`: Bloqueante por H1 y H2, corregidos; H3 aceptado y documentado).
