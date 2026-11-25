# FNC-206 — `sin_permiso_en_directorio` cuando LDAP rechaza por permisos

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada** | 2026-11-25 |
| **Origen** | Prometido al dueño: robustez de rotaciones (ACL sin `write` a la cuenta de servicio sobre `userPassword` se veía como «directorio no disponible») |

## Alcance
- Un `insufficientAccessRights` (código 50) al escribir (contraseña, alta, miembro de grupo, grupo) se reporta como `sin_permiso_en_directorio`, no como `directorio_no_disponible`; la caída de conexión no cambia.
- Sin tocar el frontend.

## Decisiones
| Tema | Decisión |
|---|---|
| Origen del motivo | `errors.motivo_de_error(exc)` en `writer._ejecutar`: único punto donde un `LDAPException` se vuelve `ResultadoEscritura`; resultado sigue `error_permanente` |
| Otros rechazos de permisos | Solo se cubre `LDAPInsufficientAccessRightsResult`; `strongerAuthRequired` y similares quedan como `directorio` (no se vieron en la práctica) |
| HTTP | Se mantiene `503` (contrato vigente para escrituras al directorio; el frontend ya trata `503` como error y un `403` se confundiría con falta de permiso de la persona) con `code: sin_permiso_en_directorio` y el mensaje «La cuenta de servicio del portal no tiene permiso para esta operación en el directorio.» (sin DN) |
| Worker de entregas | Antes reintentaba con backoff hasta `max_attempts` cualquier error (acotado, no infinito). Ahora `marcar_pendiente` agota los intentos con `sin_permiso_en_directorio` (`CODIGOS_SIN_REINTENTO`): no se reintenta, se avisa a los superadmins y la entrega queda `pendientes` para intervención |
| Aprovisionamiento | Ya trataba `error_permanente` sin reintento; solo se agrega el mensaje saneado del motivo |
| Grupo del rol | `sincronizar_grupo_de_rol` devuelve `Sincronizacion` (verdadera/falsa como antes, con `sin_permiso`); los llamadores que no la usan siguen igual |
| Traslado de grupos | Sin cambios de código: ya guarda el motivo del escritor como `last_error` (ahora `sin_permiso_en_directorio`) y no reintenta lo no transitorio |
| No aplicado | `platforms/grupos.py` y `directory/api.py` solo leen (aviso/prueba de conexión), no hay escritura |

## Archivos
| Archivo | Cambio |
|---|---|
| `app/modules/directory/errors.py`, `writer.py` | Motivo y mensaje; `_ejecutar` |
| `app/modules/users/entrega_credenciales.py`, `rotar_contrasena.py`, `restablecer_contrasena.py`, `directory_accounts.py`, `rol_en_directorio.py`, `grupos_de_rol.py` | Código y respuesta `503` propios; worker sin reintento |
| `app/modules/alta/grupo_portal.py`, `app/modules/provisioning/saneo.py` | Texto del motivo |
| `tests/directory/test_sin_permiso.py`, `tests/users/test_sin_permiso_entrega.py`, `test_sin_permiso_cuentas.py`, `tests/provisioning/test_sin_permiso.py`, `tests/alta/test_sin_permiso.py`, `tests/directory/test_writer.py` | 20 pruebas nuevas y 1 actualizada (el motivo esperado de código 50); los tests de comportamiento fallan sin el cambio (10 de 13 verificados en `tests/users`, `provisioning` y `alta`; 3 son controles de caída) |
| `docs/contratos/README.md`, `usuarios-directorio.md` (3.3), `areas-y-roles.md` (3.4), `docs/backend/README.md` | Contratos y documentación |

## Pendiente web (no editado)
- `frontend/src/components/users/directory-account-errors.ts` (`MENSAJES_POR_CODIGO` solo conoce `directorio_no_disponible`), `components/settings/directory-errors.ts` y `lib/access/directory.ts` (comentario): agregar el mensaje por código `sin_permiso_en_directorio`; mientras tanto el `503` cae en el mensaje genérico por estado.

## Impacto en elementos compartidos
`EscritorDirectorio._ejecutar` / `ResultadoEscritura.motivo` (todas las escrituras al directorio), `entrega_credenciales.marcar_pendiente` y `fijar_contrasena_en_directorio` (API, CLI y worker) y `grupos_de_rol.sincronizar_grupo_de_rol` (rol, alta, CLI). Ver tabla de `impacto.py` en el cierre.

## Verificación
- Pruebas por tarea y suite completa: ver reporte de cierre. Sin LDAP real (MOCK_SYNC).

## Bitácora
- 2026-11-25: implementación, contratos y pruebas.
