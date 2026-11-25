# FNC-205 — Verificar Vaultwarden antes de tocar LDAP en las rotaciones por CLI

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada** | 2026-11-25 |
| **Origen** | Prometido al dueño: robustez de rotaciones (ya pasó con `VAULTWARDEN_EMAIL` de otra cuenta) |

## Alcance
- `usuarios --crear-en-ldap`, `migrar-ldap --rotar-contrasena` y `migrar-usuario --rotar-contrasena`: login real a Vaultwarden antes de cualquier escritura; si falla, error claro y nada escrito.
- `--dry-run` también verifica (solo lectura) e informa.
- Fuera de alcance: rotaciones por API/worker (`users/rotar_contrasena.py`).

## Decisiones
| Tema | Decisión |
|---|---|
| Punto único | `importacion.exigir_entrega(dry_run)` (ya lo llaman los 3 comandos antes de escribir) → `rotacion.motivo_sin_entrega()` |
| Reutilización | `ClienteVaultwarden.verificar_acceso()` = `sesion_de_usuario()` (token + claves, el flujo del Send); `SendsPorApi.verificar_acceso()` lo delega; `SendsPorCli` (modo `bw`) no tiene login propio: no-op |
| Una vez por corrida | `exigir_entrega` se llama una vez por comando; no hay memo |
| Mensajes | `GestorMalConfigurado` → «Vaultwarden no acepta las credenciales configuradas: {causa}»; `GestorCaido` → «Vaultwarden no responde: {causa}». La causa es el texto de los errores del cliente (solo tipo y estado HTTP, sin secretos) |
| Dry-run | Éxito imprime «Vaultwarden acepta las credenciales configuradas (verificado; no se creó ningún Send).» |
| Pruebas existentes | El doble `con_entrega` devuelve `ServicioDeSendsFalso` (login correcto) en lugar de `object()` |

## Archivos
| Archivo | Cambio |
|---|---|
| `app/modules/secretos/vaultwarden.py`, `sends.py` | `verificar_acceso` |
| `app/modules/alta/rotacion.py`, `importacion.py`, `migracion.py`, `migrar_usuario.py` | Verificación y paso de `dry_run` |
| `tests/alta/test_verificar_vaultwarden.py` (nuevo), `tests/alta/conftest.py` | 10 pruebas; 7 fallan sin el cambio |
| `scripts/alta/README.md`, `TABLERO.md`, `docs/logs/2026-11-25.md` | Documentación |

## Impacto en elementos compartidos
`exigir_entrega` y `rotacion.motivo_sin_entrega` (usados por los 3 comandos de alta con rotación) ahora pueden fallar por Vaultwarden. `ClienteVaultwarden` y `SendsPorApi`/`SendsPorCli` ganan un método; sin cambio en los existentes.

## Verificación
- `tests/alta` y `tests/secretos`: 224 passed; suite completa en el cierre de FNC-206. Sin Vaultwarden real (mocks).

## Bitácora
- 2026-11-25: implementación y pruebas.
