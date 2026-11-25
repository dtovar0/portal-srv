# FNC-207 — `migrar-usuario`: `--plataforma-admin` y `--admin-area`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada** | 2026-11-25 |
| **Origen** | Pedido del dueño |

## Alcance
- `--plataforma-admin NOMBRE` (repetible, alias `--platform-admin`): acceso de nivel `admin` con el mismo flujo y validaciones de `--plataforma`; reemplaza un `usuario` activo; ya `admin` → `OMITIDO`.
- `--admin-area NOMBRE` (repetible): la persona queda administradora del área con el servicio del portal.
- `--dry-run` muestra ambos.

## Decisiones
| Tema | Decisión |
|---|---|
| `--nivel` | Se mantiene (compatibilidad) y aplica solo a `--plataforma`; `--plataforma-admin` siempre es `admin` |
| Misma plataforma en ambas | `UsageError` (código 2) en la CLI, antes de tocar nada |
| Rol y grupo | `migracion.migrar(rol_forzado=admin_area, actualizar_rol=True)`: `cambiar_rol` + `grupo_portal` con `quitar_del_otro` (queda en `app-aduana-admins`, fuera de `-users`); reutiliza lo de `migrar-ldap` |
| Áreas administradas | `asignar_areas_administradas` con la **unión** (el servicio reemplaza); no exige actor y fuera de petición audita como «sistema»; el servicio genera los accesos automáticos `admin_de_area` (FNC-055) |
| `user.areas` | El portal no agrega las áreas administradas a `user.areas`; la CLI tampoco. Los accesos `migracion` siguen exigiendo `--area` (P1) |
| Orden | cuenta → áreas → admin-area → responsiva → accesos → aviso → rotación: admin-area antes de la firma para que esta active los automáticos |
| `--plataforma-admin` de un área administrada | Sale `OMITIDO` porque el automático ya es `admin` |
| Reemplazo usuario→admin | Regla de `otorgar`: exige el acceso `usuario` `activo`; si está `en_proceso` es `ERROR` (`estado_invalido`) |
| Grupo fallido | Línea `ERROR` detiene la corrida; repetirla lo completa (el rol ya cambió) |

## Archivos
| Archivo | Cambio |
|---|---|
| `app/modules/alta/migrar_usuario.py` | Opciones nuevas, validación por pares `(plataforma, nivel)`, paso de áreas administradas, simulación |
| `app/modules/alta/cli.py` | Flags `--plataforma-admin`/`--platform-admin`, `--admin-area`, conflicto de uso |
| `tests/alta/test_migrar_usuario_admins.py` | Nuevo: 19 pruebas |
| `scripts/alta/README.md` | Flags, decisiones y ejemplo |

## Impacto en elementos compartidos
Ninguno modificado: `asignar_areas_administradas`, `cambiar_rol`, `grupo_portal` y `services.otorgar` se reutilizan sin cambios. Solo cambia la firma interna de `migrar_usuario.validar_catalogo` (único uso en el módulo).

## Verificación
- Pruebas nuevas en rojo antes (18 de 18 por opción desconocida) y en verde después.
- `tests/alta tests/users tests/access`: 595 passed.
- Suite completa: 3531 passed, 0 fallos (19 min 39 s).
- No verificado: LDAP, Authelia ni Vaultwarden reales (dobles de prueba).

## Bitácora
- 2026-11-25: implementada y cerrada.
