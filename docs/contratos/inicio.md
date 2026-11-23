# Contrato — Resumen de inicio por rol

| Campo | Valor |
|---|---|
| Versión | 1.1 (2026-11-19) |
| Proveedor | backend (FNC-066) |
| Consumidores | web (FNC-069; pantalla DIS-024; DIS-112 para `desglose`) |
| Solicitudes | — |

Convenciones comunes: [README.md](README.md). `GET /stats` solo suma la clave `desglose` (v1.1); lo demás no cambia.

## Endpoints

| Método y ruta | Usuario | Admin | Superadmin |
|---|---|---|---|
| `GET /home/summary` | 200 (`scope: "propio"`) | 200 (`scope: "areas"`) | 200 (`scope: "global"`) |

Sin parámetros. Los contadores respetan el alcance del rol.

## Salida
| Campo | Tipo | Usuario | Admin | Superadmin |
|---|---|---|---|---|
| `scope` | `"propio"` \| `"areas"` \| `"global"` | Sí | Sí | Sí |
| `my_access` | `{ "activo": int, "en_proceso": int, "fallido": int }` | Sí | Sí | — |
| `my_requests` | `{ "pendiente": int, "aprobada": int, "rechazada": int }` | Sí | Sí | — |
| `pending_approvals` | int | — | Sus áreas | Todas |
| `failed_access` | int (`fallido` + `fallo_revocacion`) | — | Sus áreas | Todas |
| `oldest_pending_at` | fecha \| null | — | Sí | Sí |
| `totals` | `{ "areas": int, "platforms": int, "active_access": int }` | — | Sus áreas | Global |

Campos que no aplican al rol se omiten.

## `GET /stats` — clave `desglose` (v1.1, FNC-164)
Se agrega a la respuesta existente (`areas`, `platforms`, `visits`, `requests`, `users`, `most_visited`, `platforms_by_area` no cambian). Mismo alcance que cada contador; `parte + resto` = contador del mismo nombre.

| Clave | `parte` | `resto` | Aparece |
|---|---|---|---|
| `areas` | áreas con `status` `Activo` | las demás | Siempre |
| `platforms` | plataformas con `status` `Activo` | las demás | Siempre |
| `requests` | solicitudes ya resueltas (`aprobada`, `rechazada`) | pendientes | Siempre |
| `visits` | visitas de plataformas activas | visitas de las demás | Siempre |
| `users` | usuarios activos (`is_active`) | inactivos | Solo con `users` (admin y admin de área) |

Todos los valores son enteros >= 0. Usuario normal: sin `users` en el desglose.

```json
"desglose": { "areas": { "parte": 2, "resto": 1 }, "platforms": { "parte": 2, "resto": 2 },
  "requests": { "parte": 2, "resto": 2 }, "visits": { "parte": 10, "resto": 16 },
  "users": { "parte": 4, "resto": 1 } }
```

## Refresco
- Polling: sí, con el intervalo del usuario (README).

## Datos simulados
```json
{ "scope": "areas", "my_access": { "activo": 2, "en_proceso": 0, "fallido": 0 },
  "my_requests": { "pendiente": 1, "aprobada": 3, "rechazada": 0 },
  "pending_approvals": 4, "failed_access": 1, "oldest_pending_at": "2026-10-13T09:00:00Z",
  "totals": { "areas": 2, "platforms": 7, "active_access": 35 } }
```

## Historial
| Versión | Fecha | Cambio |
|---|---|---|
| 1 | 2026-10-14 | Versión inicial (FNC-038) |
| 1.1 | 2026-11-19 | `GET /stats` agrega `desglose` (`parte`/`resto` por indicador); sin cambios incompatibles (FNC-164) |
