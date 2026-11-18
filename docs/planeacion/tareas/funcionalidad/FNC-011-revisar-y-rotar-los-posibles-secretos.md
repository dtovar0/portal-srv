# FNC-011 — Revisar y rotar los posibles secretos del historial de git

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Agente** | devops |
| **Fase** | 5 |
| **Módulo / Área** | repositorio |
| **Prioridad** | Alta |
| **Estatus** | Propuesta |
| **Responsable** | |
| **Creada** | 2026-10-13 |
| **Inicio** | |
| **Finalizada** | |
| **Estatus Git** | — |
| **Rama** | `fnc/FNC-011-revisar-y-rotar-los-posibles-secretos` |
| **Commits / PR** | |
| **Requiere migración BD** | Por definir |
| **Requiere auditor-seguridad** | Sí |

## Contexto
Posibles secretos en el commit `24b12b5` (`scratch/api_example.py`, `migrate_portafolio.py`). Requiere al dueño: confirmar si son reales y rotarlos. Bloquea el primer push al repositorio nuevo.

Origen (diagnóstico inicial, FNC-001):
- [`docs/seguridad/auditorias/2026-10-13-auditoria-inicial.md`](../../../seguridad/auditorias/2026-10-13-auditoria-inicial.md): SEG-20

> **Regla de fases (2026-10-13):** esta corrección se hace en la fase 5 (seguridad final), **salvo** que una tarea anterior modifique este módulo: en ese caso la tarea debe dejarlo cumpliendo `docs/seguridad/LINEAMIENTOS.md` y corrige este hallazgo de paso.

## Objetivo
_Se completa al aprobar la tarea._

## Alcance
- **Incluye:** lo descrito en el contexto.
- **No incluye:** _se precisa al aprobar._

## Criterios de aceptación
- [ ] Hallazgos de origen corregidos y verificados
- [ ] Prueba de regresión que primero falla (si corrige un defecto)
- [ ] Pruebas mínimas del lineamiento de pruebas, ejecutadas
- [ ] Cumple `docs/estandarizacion/` y no duplica código existente
- [ ] Sin direcciones IP ni secretos

## Impacto cruzado
- Depende de → —

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-10-13 | Creada como Propuesta desde el diagnóstico inicial |

## Nota 2026-11-17
- El dueño confirma que PSX5K ya no aplica: el token (`API_TOKEN` de `scratch/api_example.py`) y la contraseña de `migrate_portafolio.py` son de sistemas anteriores, no del portal. El código actual no los usa.
- El repositorio nuevo `portal-srv` (público) se sube **sin historial** (un commit con el estado de `develop`): esos valores no se publican.
- Siguen en el historial local y en el repositorio anterior (`mingob0t/user_permision_manager`). Rotarlos solo importa si esos sistemas siguen activos.
