# FNC-137 — Aprovisionamiento: el worker admite el trabajo de entrega de credenciales

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Agente** | desarrollador |
| **Fase** | 8 (propuesta) |
| **Módulo / Área** | provisioning (worker) |
| **Prioridad** | Alta |
| **Estatus** | Hecha |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | 2026-11-18 |
| **Finalizada** | 2026-11-18 |
| **Estatus Git** | Rama local, sin merge ni push |
| **Rama** | `fnc/FNC-137-worker-entregas` |
| **Commits / PR** | |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (lista blanca de mensajes RQ) |

## Contexto
- `app/modules/provisioning/worker.py:61` `mensaje_valido`: solo acepta `ejecutar_trabajo(<int>)` (Redis no es de confianza, FNC-049).
- `barrer()` solo barre `provisioning_jobs`.
- ADR-008 3B: las entregas de credenciales usan su propia tabla con el mismo worker y la misma cola.

## Objetivo
- Que el worker ejecute y barra un segundo tipo de trabajo registrado, sin aflojar la lista blanca.

## Alcance
- **Incluye:**
  - Registro explícito de tipos de trabajo: nombre de función → función de barrido (`vencidos`); la lista blanca valida contra ese registro (función exacta, un argumento `int`, sin kwargs ni *callbacks*).
  - `barrer()` recorre los tipos registrados.
  - El registro lo hace el módulo dueño al iniciar la app (como `registrar_proveedor`).
- **No incluye:** la tabla, la función de entrega ni su lógica (FNC-138); cambios en `provisioning_jobs`, Ejecuciones o su contrato.

## Archivos previstos
- `app/modules/provisioning/worker.py`, `app/modules/provisioning/queue.py` (si `enviar` necesita el nombre de función), `tests/provisioning/`

## Reutilización
- `SimpleWorker`, `enviar`, `segundos_de_espera`, `PROVISIONING_*` y el patrón de registro de `providers.registrar_proveedor`.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| `mensaje_valido`, `WorkerAprovisionamiento`, `barrer`, `vencidos` | funciones | worker de otorgar/revocar (todos los accesos LDAP y conectores); `provisioning/cli.py`; `tests/provisioning/*`, `tests/access/test_punta_a_punta.py` | ☐ |
| `queue.enviar` (si cambia firma) | función | `queue.despertar_tras_commit`, `reintento.py`, `worker.barrer` | ☐ |

## Variables y configuración
- Ninguna nueva (usa `PROVISIONING_*`).

## Criterios de aceptación
- [ ] Un mensaje con función no registrada, kwargs, varios argumentos, argumento no entero o *callbacks* se rechaza sin ejecutar (pruebas existentes + nuevas).
- [ ] Un tipo registrado de prueba se ejecuta y se barre; los trabajos de acceso se comportan igual (suite `tests/provisioning` y `tests/access` en verde).
- [ ] Pruebas mínimas del lineamiento de pruebas, ejecutadas
- [ ] Cumple `docs/estandarizacion/` y no duplica código existente
- [ ] Sin direcciones IP ni secretos
- [ ] Cierra con `auditor-seguridad`

## Impacto cruzado
- Origen ← ADR-008 (3B)
- Genera → FNC-138
- Depende de → ADR-008 aprobado con 3B (con 3A esta tarea se sustituye por cambios en `provisioning_jobs` y una tarea web de Ejecuciones)

## Riesgos y reversión
- Toca el worker de todos los accesos: regresión cubierta por la suite completa; reversión limpia (el registro queda vacío).

## Verificación
- `python -m pytest -q -p no:cacheprovider -W ignore tests/provisioning tests/access` → 328 passed (incluye `tests/provisioning/test_tipos_de_trabajo.py`: función no registrada, argumentos, kwargs, *callbacks* y nombres inventados rechazados; tipo registrado de prueba se ejecuta y se barre; un tipo que falla no frena a los demás; `enviar` solo admite funciones registradas; las pruebas existentes de mensajes RQ y de accesos siguen en verde).
- No verificado: un worker RQ real con Redis (las pruebas usan dobles, como las de FNC-049).
- Pendiente: `auditor-seguridad` sobre el bloque (se pide al cerrar FNC-138).

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
| 2026-11-18 | Implementada: tipos_de_trabajo.py, barrido por tipo y enviar con función registrada |
