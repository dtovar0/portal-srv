# FNC-189 — Regreso a `usuario` sin exigir membresía

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24) sobre FNC-185: «si es admin y se le quita el admin pasa a ser usuario: cambia de `app-{plataforma}-admins` a `app-{plataforma}-users`», sea o no miembro del área.

## Cambios
- `access/area_admin_sync.py`: `_nivel_objetivo(cuenta, plataforma, con_base)`: quien deja de administrar queda en `usuario` si es del área, si se le quitó el área o el rol (`con_base`) o mientras conserve su automático de `usuario`. Plataforma movida a otra área: su automático `admin` se sigue revocando.
- `access/rules.py`: el regreso (solo el sistema) ya no exige ser miembro.

## Pruebas
- `tests/access/test_area_admin_nivel.py`: prueba de no-miembro invertida (ahora regresa a `usuario`) y una nueva de quitar el rol a un no-miembro (queda activo en `usuario` tras el worker). access/provisioning/users/alta: 638 passed.

## Nota
- Ese `usuario` de un no-miembro solo lo revoca el superadmin (aceptado por el dueño).
