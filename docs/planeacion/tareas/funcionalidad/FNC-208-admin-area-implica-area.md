# FNC-208 — `--admin-area` implica `--area`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- Dueño (2026-11-25): «para qué pongo 2 veces `--area Packet --admin-area Packet`; con `--admin-area` se da a entender».

## Cambios
- `alta/migrar_usuario.py::validar_catalogo`: las áreas de la persona son la unión (sin repetir, sin distinguir mayúsculas) de `--area` y `--admin-area`; error si no hay ninguna («falta --area o --admin-area»).
- `alta/cli.py`: ayudas de `--area` (ya no obligatoria con `--admin-area`) y `--admin-area`.
- Difiere del portal a propósito: `PUT /users/<id>/managed-areas` no agrega membresía; solo cambia la CLI.

## Pruebas
- `tests/alta/test_migrar_usuario_admins.py`: +4 (3 fallaban sin el cambio); se invirtió la que exigía lo contrario. `tests/alta`: 119 passed.
