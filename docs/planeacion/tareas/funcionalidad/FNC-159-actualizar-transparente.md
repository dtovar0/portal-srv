# FNC-159 — Actualizar sin sobresaltos (`install.sh --actualizar`)

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `fnc/FNC-159-actualizar-transparente` (desde `develop` 334a1dc; sin push ni merge) |
| **Vínculos** | Origen ← FNC-153 (modo `--actualizar`); complementa FNC-160 (backend: sin `create_all` fuera de dev, 0016 tolerante) |

## Contexto
- Pedido del dueño (2026-11-19): «corrige que el upgrade baje los servicios, haga las validaciones, corrija y todo para que sea transparente».
- Caso real (PostgreSQL 17, systemd, `/opt/portal`): los servicios arrancaron con código nuevo antes de migrar; `db.create_all()` creó `credential_deliveries`; `alembic upgrade head` falló con DuplicateTable (todo revertido, BD en 0012).
- Antes, `--actualizar` hacía pip y `npm ci`/build con los servicios en marcha, migraba y reiniciaba; un reinicio de systemd durante ese tiempo arrancaba código nuevo sobre el esquema viejo.

## Cambios
| Archivo | Qué |
|---|---|
| `deploy/actualizar.sh` (nuevo) | Orquestación `actualizar_despliegue`: validar → detener → respaldo (aviso) → dependencias → migrar → arrancar + salud; mensajes `[n/6]`; aviso de salida por fase con el comando para reintentar; constantes `ACTUALIZAR_*` |
| `deploy/install.sh` | Pasos 4 y 5 en `instalar_dependencias` (los usan ambos modos); en `--actualizar` define `actualizar_validar` (unidades + `preflight.sh --actualizar`), `actualizar_dependencias`, `actualizar_migrar` y llama a la orquestación antes de cualquier dependencia; `trap actualizar_aviso_salida EXIT` desde que se cargan los módulos |
| `deploy/preflight.sh` | Opción `--actualizar`: unidades obligatorias (FALTA si no existen), puertos en uso aceptados solo si los ocupa la unidad propia activa, venv/node_modules sin aviso; opción desconocida sale con 2 |
| `tests/deploy/test_actualizar_sh.py` (nuevo) | 10 pruebas con `systemctl`, `journalctl`, `curl` y `sleep` falsos |
| Docs | `deploy/README.md` (tabla de pasos), `docs/operacion/ENTORNOS.md`, `docs/operacion/RELEASES.md`, `VARIABLES.md`, `HISTORIAL.md`, `CHANGELOG.md`, tablero, `docs/logs/2026-11-19.md` |

## Comportamiento
| Falla en | Servicios | Mensaje |
|---|---|---|
| Validaciones (instalador o preflight) | Siguen en marcha con la versión anterior | «No se detuvo ningún servicio» + comando para repetir |
| Detener, dependencias o migración | **Detenidos** a propósito | Error de arriba (p. ej. de Alembic) + «quedan DETENIDOS… no se borró ningún dato» + comando |
| Arranque o salud | Los que arrancaron siguen | Journal (30 líneas) de la unidad que falló + comando (repetir es seguro) |

- nginx editado: sin cambios (`--actualizar` no toca nginx, igual que en FNC-153).
- Nada imprime secretos; el comando de reintento no repite las opciones (`--proxy` puede llevar credenciales).

## Decisiones del orquestador (pendientes de validar)
1. **Respaldo:** no existe mecanismo de respaldo de BD en el proyecto (`RESPALDOS.md` vacío; `/api/v1/backup` solo exporta configuración). El paso 3 solo avisa. **Propuesta** (sin ID, para que el orquestador la registre y evitar choques con tareas en paralelo): respaldo automático `pg_dump`/`mysqldump` antes de migrar en `--actualizar`, con retención y prueba de restauración (llena `RESPALDOS.md`).
2. **Si fallan las dependencias** (pip/npm) tras detener, los servicios también quedan detenidos: el código en disco ya es el nuevo y el esquema el viejo.
3. **Salud del backend:** `GET http://localhost:<API_PORT>/api/v1/auth/context` (pública, sin sesión) con 2xx/3xx; sin `curl` se omite con aviso. No hay ruta de salud dedicada.
4. **Preflight completo** como validación previa (no solo TCP a la BD): también exige salida a Internet (pip/npm la necesitan) y disco.
5. **Orden de parada:** frontend, worker, backend; de arranque: backend, worker, frontend.
6. **Valores** de espera (15×2 s), estabilización (3 s), journal (30 líneas) y salud (15 intentos, 5 s máx.).
7. **Fuera de alcance:** la instalación completa (sin `--actualizar`) sigue reiniciando sin migrar, como antes (la migración ahí es manual, documentada en su resumen). Con FNC-160 el arranque ya no crea tablas fuera de dev. Si se quiere el mismo orden también ahí, sería otra tarea.

## Verificación
| Comando | Resultado |
|---|---|
| `python -m pytest -q -p no:cacheprovider tests/deploy/test_actualizar_sh.py` **sin** `deploy/actualizar.sh` y con install/preflight sin cambiar | 10 failed, exit 1 (fallan antes del cambio) |
| Mismo, con el módulo y sin cambiar install/preflight | 3 failed (las de install.sh y preflight), exit 1 |
| `python -m pytest -q -p no:cacheprovider tests/deploy` | 239 passed, exit 0 |
| Batería completa `python -m pytest -q -p no:cacheprovider` | 3052 passed, exit 0 (15 min 48 s) |
| `bash -n deploy/install.sh deploy/preflight.sh deploy/actualizar.sh` | sin errores |
| `preflight.sh --actualizar` en una carpeta vacía (sin `.env`, sin unidades) | FALTA por unidades inexistentes y por puertos ocupados por procesos que no son las unidades; exit 1 (esperado) |

**No verificado:** revisión de `revisor` (el agente se cortó por límite de uso; queda para la validación independiente); auditoría de seguridad diferida a la auditoría completa, como en FNC-157; `install.sh --actualizar` real como root con systemd, PostgreSQL y alembic (exige root y servidor); `shellcheck` (no instalado); frontend sin cambios (no se corrió vitest).

## Impacto en elementos compartidos
`impacto.py`: «ninguno detectado (comparado contra `develop`; 11 archivos cambiados)». Revisión manual: `deploy/install.sh` y `deploy/preflight.sh` son compartidos por todos los servidores (dev de pruebas, `portal-srv`, producción del dueño): cambia el flujo `--actualizar` (ahora detiene y arranca en lugar de reiniciar) y `preflight.sh` acepta `--actualizar` (sin opción, igual que antes; una opción desconocida ahora sale con 2). La instalación completa no cambia de comportamiento (solo se movieron pip/npm a `instalar_dependencias`).

## Bitácora
- 2026-11-19: implementada en el worktree del agente devops; pruebas que fallan antes del cambio; docs y tablero.
- 2026-11-19: retomada tras corte por límite de uso; batería completa rehecha (3052 passed, exit 0) y commit.

## Corrección tras la primera prueba real (2026-11-19)
- En el servidor del dueño `--actualizar` dio `FALTA portal-backend.service no existe` con la unidad activa. Causa: `systemctl list-unit-files X | grep -q X` con `set -o pipefail`: grep sale en la primera coincidencia y systemctl muere por SIGPIPE al escribir el pie. Arreglo: `deploy/unidades.sh` (`unidad_systemd_existe`, guarda la salida antes de buscar) y `grep … >/dev/null` en las otras tuberías del preflight. Regresión: `tests/deploy/test_unidades_sh.py` (reproduce el falso negativo con el patrón viejo).
