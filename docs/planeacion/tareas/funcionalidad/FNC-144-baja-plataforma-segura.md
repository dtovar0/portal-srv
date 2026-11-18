# FNC-144 — Baja de plataforma segura

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 7 |
| **Módulo / Área** | plataformas |
| **Prioridad** | Crítica |
| **Estatus** | Hecha |
| **Creada / Inicio / Finalizada** | 2026-11-17 |
| **Rama** | `fnc/FNC-144-baja-plataforma-segura` |
| **Requiere migración BD** | No |

## Contexto
- El trabajo del dueño (DIS-088) hizo que `DELETE /platforms/<id>` borrara accesos, solicitudes, conector y trabajos para quitar solicitudes pendientes huérfanas del inicio.
- Borraba accesos vigentes sin revocarlos en LDAP ni en el conector: la gente quedaba en los grupos sin rastro (contra `access/models.py`).

## Decisión (modo autónomo, registrada)
| Caso | Resultado |
|---|---|
| Accesos vigentes | `409 plataforma_con_accesos`; no se borra nada |
| Solicitudes (pendientes o cerradas) y accesos `revocado` | Se borran (la FK no permite conservarlos sin la plataforma); el rastro queda en la auditoría de cada evento |
| Trabajos | Se conservan con `platform_id` y `access_id` en NULL |
| Conector | Se borra (como `DELETE /connector` sin vigentes) y se limpia la caché de credenciales |
| Auditoría | `before` con los conteos |

## Pruebas
- `tests/platforms/test_baja_plataforma.py`: 8 casos (5 estados vigentes → 409; pendientes; historial cerrado y trabajos; conector). Las 5 de 409 fallan con el código anterior.
- Se mantienen las uniones con `Platform` del dueño en `access/consultas.py`, `access_requests/consultas.py` y `/stats` (sin efecto con datos íntegros).
