# FNC-202 — `flask alta migrar-usuario UID`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada** | 2026-11-25 |
| **Origen** | Pedido del dueño: migrar usuario por usuario |

## Alcance
- Una corrida, una persona de LDAP: cuenta `sso` + grupo del portal (reutiliza `migracion.migrar(solo=[uid])`), áreas, responsiva firmada, accesos (origen nuevo `migracion`) y rotación.
- `--dry-run` valida y muestra sin escribir; mismas líneas, `Resumen`, códigos de salida y auditoría por corrida.

- `--notificar` (agregado del dueño, apagado por omisión): correo «solicitud aprobada» existente por cada plataforma otorgada en la corrida, tras el commit.

## Decisiones
| Tema | Decisión |
|---|---|
| Validación previa | Áreas y plataformas (existe, activa, nivel integrado, de un área de la persona) se validan antes de escribir; un fallo detiene todo |
| Plataforma activa y nivel | Se valida en la CLI con `access_requests.catalogo.niveles_integrados`; `rules.py` solo suma P1, sin actor, cuenta activa y no superadmin (evita dependencia circular) |
| Responsiva | Servicio `access/responsiva.py` (`registrar_firma`, `firmar_accesos`); la ruta de firma lo usa con el mismo comportamiento. Modo `por_plataforma`: el acceso nuevo se firma al crearlo si hay `--responsiva-firmada` |
| Acceso manual | `manual=registro_manual(plataforma)`, igual que la asignación directa del portal |
| Errores por acceso | Savepoint por acceso; nivel vigente → `OMITIDO`; otro rechazo → `ERROR` (no se rota) |
| Sin `mail` | `ERROR` (la persona pidió migrarse y no se puede) |
| `--notificar` | Reutiliza `access_notifications.notificar_solicitud_aprobada` (sin plantilla nueva); fallo de correo = `ERROR` sin deshacer ni frenar la rotación; `--enviar-a` no lo redirige (el aviso toma el correo de la cuenta), aplica solo a la rotación |
| Reintento de trabajos | `provisioning/reintento.py` revalida `migracion` como sistema (sin actor), igual que `admin_de_area` |

## Archivos
| Archivo | Cambio |
|---|---|
| `app/modules/alta/migrar_usuario.py` | Nuevo: la corrida |
| `app/modules/alta/cli.py` | Comando `migrar-usuario` |
| `app/modules/access/responsiva.py` | Nuevo: servicio de firma extraído de la ruta |
| `app/modules/api/routes.py` | `sign_responsiva` usa el servicio |
| `app/modules/access/tipos.py`, `rules.py`, `services.py` | Origen `migracion` (validación y texto de auditoría) |
| `app/modules/provisioning/reintento.py` | Revalidación de `migracion` sin actor |
| `tests/alta/test_migrar_usuario.py` | Nuevo: 28 pruebas |
| `scripts/alta/README.md`, `docs/contratos/accesos.md` (v1.3), `docs/backend/README.md` | Documentación |

## Impacto en elementos compartidos
| Elemento | Cambio | Quién lo usa |
|---|---|---|
| `access.tipos.ORIGENES` | Valor `migracion` | `rules.validar_datos`, filtro `origin` del inventario (`inventario_api`), serialización |
| `access.rules.validar_otorgamiento` | Rama `migracion` (las demás no cambian) | `services.otorgar`, `access/api.py`, `provisioning/reintento.py` |
| `POST /me/firmar-responsiva` | Lógica movida a `access.responsiva` (mismo comportamiento) | Modal de responsiva (web) |
| Web (no editada) | `AccessOrigin` en `lib/access/types.ts` y mapas `ORIGENES` (`my-access.tsx`, `inventory-filters.tsx`, `inventory-table.tsx`) no conocen `migracion` | Pendiente tarea web |

## Verificación
- 28 pruebas nuevas (6 de `--notificar`: con, sin, ya vigente, dry-run, fallo de correo, interruptores): cada paso, dry-run, área inexistente/inactiva, plataforma de otra área, plataforma inactiva, ya existente, sin responsiva (espera firma), con responsiva (trabajo encolado), ambos modos, rotación solo sin errores, superadmin, reglas del origen y reintento.
- Pruebas de la ruta de firma (`tests/test_responsiva.py`) verdes.

## Bitácora
- 2026-11-25: implementada y cerrada.
