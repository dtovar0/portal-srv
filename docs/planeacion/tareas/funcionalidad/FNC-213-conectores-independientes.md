# FNC-213 — Conectores independientes (crear y asociar después)

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Aprobada |
| **Creada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26): «es un conector por aplicación/plataforma, pero primero deja crearlo y después hacemos la asociación». Respondió «adelante» a hacer conectores independientes.
- Vinculada: DIS-140 (web).

## Alcance
- Contrato `conectores-y-ejecuciones.md` 1.6 (§ Conectores independientes): endpoints `/connectors`, asociar/desasociar, `name`, errores nuevos, compatibilidad de las rutas por plataforma.
- Migración `0024`: `platform_connectors.platform_id` nulo, `ON DELETE SET NULL`; columna `name` (100, única sin distinguir mayúsculas) rellenada con el nombre de la plataforma; MySQL, PostgreSQL y SQLite.
- `platforms/baja.py`: desasociar en vez de borrar.
- `consultas.referencias_de_otras`: por id de conector (con `platform_id` nulo `!=` no sirve).
- Auditoría: `conector_creado`, `conector_asociado`, `conector_desasociado`.

## Criterios de aceptación
- Todo lo del contrato 1.6 con pruebas (permisos por rol, 404/409/422, auditoría, migración arriba y abajo).
- Las pruebas existentes de conectores siguen en verde.
