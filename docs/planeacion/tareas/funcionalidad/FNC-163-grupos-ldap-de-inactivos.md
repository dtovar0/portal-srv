# FNC-163 — Grupos LDAP de áreas y plataformas inactivas

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Agente** | desarrollador |
| **Fase** | 8 |
| **Módulo / Área** | plataformas |
| **Prioridad** | Alta |
| **Estatus** | Hecha |
| **Creada / Inicio / Finalizada** | 2026-11-19 |
| **Estatus Git** | Rama local, sin push ni merge |
| **Rama** | `fnc/FNC-163-grupos-inactivos` |
| **Requiere migración BD** | Sí (0018) |
| **Requiere auditor-seguridad** | Sí (hecho; hallazgo Alto corregido) |

## Contexto
- Pedido del dueño: al pasar un área o plataforma a `Inactivo`, sus grupos LDAP se **mueven** a una OU de inactivos (no se sacan usuarios ni se renombra el `cn`); al reactivar, regresan.
- Antes, `status` solo cambiaba en la BD y `EscritorDirectorio` no movía entradas.
- Estructura del dueño: activos `ou=groups,dc=<base>`, inactivos `ou=groups,ou=inactive,dc=<base>`.

## Cambios
- Variable `LDAP_GROUPS_INACTIVE_BASE_DN` (vacía = apagada), validada al arrancar (DN válido; ni igual, ni dentro, ni conteniendo `LDAP_GROUPS_BASE_DN`).
- `directory/writer.py`: `mover_grupo` (ModifyDN `new_superior`, mismo RDN; idempotente; solo entre las dos bases); `directory/dn.py`: `separar_dn`.
- `platforms/models.py` + migración 0018: `platform_group_moves` (ubicación por nivel, estado, intentos, reserva).
- `platforms/ubicacion_grupos.py`: estado deseado (plataforma y área `Activo`), `dn_actual`, `resumen`.
- `platforms/traslado_grupos.py`: `conciliar` (en la transacción de la petición), `despertar`, `ejecutar_traslado` (worker, tipo de trabajo registrado), auditoría `grupos_movidos` / `grupos_traslado_fallido`.
- `platforms/api.py`, `areas/api.py`: concilian al guardar; `409 grupos_en_inactivos`; RDN de grupo único entre plataformas si la función está encendida.
- `provisioning/ldap_provider.py`: otorgar/revocar/consultar usan el DN actual.
- API de plataformas: `groups_location`, `groups_move_status` (contrato 1.3). Evento de auditoría nuevo (contrato auditoría).
- Docs: `docs/operacion/GRUPOS-INACTIVOS.md`, VARIABLES, HISTORIAL, `.env.example`, ENTORNOS (ACL), backend README, catálogo de reutilización, CHANGELOG.

## Decisiones (orquestador, pendientes de validar)
- Mover lo hace el worker (fila `pendiente` + barrido; despertar best-effort), no la petición.
- `Platform.ldap_group_*_dn` queda como DN original; el actual se calcula (no se adivina al regresar).
- Con la plataforma inactiva, otorgar/revocar siguen operando sobre el grupo en inactivos (revocar debe poder); no bloquea.
- Cambiar tipo o grupos con los grupos movidos o el traslado sin cerrar: `409 grupos_en_inactivos`.
- Origen inexistente = `NO_EXISTE` aunque el destino exista (evita adoptar el grupo homónimo de otra plataforma; hallazgo de seguridad).
- Grupo inexistente, OU destino inexistente o nombre ocupado: `fallido`; guardar de nuevo la plataforma rearma.
- `mover_grupo` agregado a la lista de operaciones públicas del escritor (prueba actualizada).

## Verificación
- `python -m pytest -q -p no:cacheprovider tests/platforms/test_traslado_grupos_inactivos.py`: 29 pruebas (mover/regresar, área, reactivar área respetando plataformas, variable vacía, idempotencia, reintento, agotado, permanente, colisión homónima, rearmado, configuración).
- Regresión: con `conciliar` simulando el comportamiento previo, 14 pruebas fallan; con el código, pasan.
- Suite completa: ver bitácora (resultado y código de salida).
- No verificado: OpenLDAP ni Authelia reales (solo `ldap3` MOCK_SYNC); ACL; `refint`/`memberof`.

## Revisiones
- `revisor`: requería cambios; corregidos prueba del escritor, pendiente atascado, guía, constantes y contrato. No corregido y registrado: carrera petición/worker al cierre, `IntegrityError` posible en carrera, auditoría `grupos_movidos` sin movimiento real, `despertar`/reserva repiten el patrón de FNC-137, `Platform.to_dict` importa `platforms` (diferido).
- `auditor-seguridad`: Alto (adoptar grupo homónimo) corregido con prueba. Bajos pendientes: reintento de revocación coincidente con traslado, `_fuera_de_base` acepta toda la OU de inactivos, validar la OU contra `LDAP_USERS_BASE_DN`.

## Impacto en elementos compartidos
`impacto.py` (por nombre, con ruido); los reales: `Platform.to_dict` (campos nuevos; `POST/PUT /platforms`), `EscritorDirectorio._fuera_de_base` (todo otorgar/revocar LDAP), `ProveedorLdap._grupo`, `ConfiguracionDirectorio`/`cargar_configuracion` (arranque con valor inválido), `PUT /areas/<id>`, `Evento` (2 valores), registro en `app/__init__.py`. Frontend: sin cambios (el `409` nuevo se muestra con el mensaje genérico).

## Tareas generadas
- Propuestas (sin crear fila): los pendientes de la sección Revisiones.
