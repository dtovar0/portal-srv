# FNC-201 — `migrar-ldap --solo` con personas fuera de los grupos

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada** | 2026-11-25 |
| **Origen** | Pedido del dueño: migrar usuario por usuario |

## Alcance
- Un uid de `--solo` que no es miembro de los grupos de la corrida se busca directo en LDAP (`buscar_usuario`, solo bajo `LDAP_USERS_BASE_DN`) y se procesa como cualquier otro (rol por grupo de admins o `--rol`; superadmin se omite siempre).
- No existe en LDAP → `ERROR` «no está en LDAP_USERS_BASE_DN»; fallo del directorio → `ERROR` «no se pudo consultar a la persona en el directorio».
- Funciona con o sin `--grupo`. Caso real: `--grupo app-aduana-users --solo dmartinez`.

## Archivos
| Archivo | Cambio |
|---|---|
| `app/modules/alta/migracion.py` | `_limitar_a` recibe el cliente y busca a los ausentes; se retira `DETALLE_SOLO_AUSENTE` |
| `tests/alta/test_enviar_a_cli.py` | 4 pruebas nuevas (fuera de grupo, sin grupo, superadmin, inexistente) |
| `scripts/alta/README.md` | Fila `--solo` |

## Impacto en elementos compartidos
- Ninguno (`_limitar_a` es privada del comando).

## Verificación
- Las 4 pruebas nuevas fallan sin el cambio (4 failed) y pasan con él; `tests/alta`: 57 verdes.

## Bitácora
- 2026-11-25: implementada y cerrada.
