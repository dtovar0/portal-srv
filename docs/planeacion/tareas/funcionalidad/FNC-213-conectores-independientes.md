# FNC-213 — Conectores independientes (crear y asociar después)

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

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

## Cambios
- Migración `0024_conectores_independientes.py`: `platform_id` nulo con `ON DELETE SET NULL`; `name` (100) y `name_norm` (300) NOT NULL con único `uq_platform_connectors_name_norm`; `batch_alter_table`; `name` = nombre de la plataforma (si choca sin mayúsculas, `"<plataforma> (<id>)"` recortado a 100); `downgrade` borra los sin plataforma.
- `connectors/models.py`: `name`, `name_norm` (calculada por `validates('name')`), relación `platform` de solo lectura, `to_dict` con `id` y `name`, `to_dict_v2` (`ConnectorV2`). `tipos.py`: `LARGO_NOMBRE`, `LARGO_CLAVE_NOMBRE`.
- `connectors/api_independientes.py` (nuevo): `/connectors` (lista, crear, leer, reemplazar, eliminar), `/connectors/<id>/platform` (asociar, desasociar) y `/connectors/<id>/test`. `connectors/servicio.py` (nuevo): estado auditado, `auditar_cambio`, `nombre_para_plataforma`, `validar_conector`. `api.py`: rutas por plataforma usan el servicio (crean con nombre de la plataforma).
- `consultas.py`: `referencias_de_otras(conector_id)` excluye por id; `nombre_en_uso`. `provider.py` la llama con el id del conector. `validacion.py`: `validar_nombre`.
- `platforms/baja.py`: desasocia el conector en lugar de borrarlo.
- `audit/events.py`: `conector_creado`, `conector_asociado`, `conector_desasociado` (la web quizá necesite etiquetas). Docs: `docs/backend/README.md`, `docs/contratos/auditoria.md`.

## Decisiones
- **Único sin distinguir mayúsculas:** columna normalizada `name_norm = name.casefold()` con único corriente. MySQL lo hace por colación pero PostgreSQL y SQLite no; `lower(name)` indexado o `COLLATE NOCASE` no son portables a los tres. La migración calcula la clave en Python (igual que la app), no con `LOWER()` del motor.
- `name`: se rechazan caracteres de categoría Unicode «C» (control y formato, p. ej. espacio de ancho cero) para que dos nombres no parezcan iguales sin serlo.
- `credential_ref` conserva la regla de antes: la misma referencia se admite entre conectores; una distinta que dé la misma variable de dev, no (ahora contra todos los conectores, asociados o no).
- Lista ordenada por `name_norm` (insensible a mayúsculas), luego `id`.
- `PUT /connectors/<id>/platform` con cuerpo sin entero (ausente, `null`, texto, booleano) → `422 fields.platform_id`.
- La columna se llama `name_norm` (no `name_key`): `test_la_tabla_solo_tiene_referencias...` prohíbe columnas con «key».
- Limitación conocida: `casefold()` no ignora acentos; MySQL con colación `_ai_ci` sí, así que «Café»/«Cafe» chocarían allí y no en SQLite/PostgreSQL (la migración podría fallar en MySQL si dos plataformas difieren solo en acentos). Sin probar en MySQL/PostgreSQL.
- Desde `PUT /platforms/<id>/connector`, si el nombre de respaldo también está ocupado se usa `"<plataforma> (<id>-2)"`, etc.
- Auditoría: la baja de plataforma no emite `conector_desasociado` (queda en el evento de baja); asociar no revisa accesos del destino (lo permite el contrato). Ambos como observaciones de seguridad (Bajas).
- Sin desviaciones del contrato 1.6.

## Pruebas
- `tests/connectors/test_conectores_independientes.py` (79): permisos por rol, lista, `ConnectorV2`, 404/409/422/400, auditoría, caché, compatibilidad de las rutas por plataforma, modelo. Escritas antes que el código (fallaban por importación).
- `tests/test_migracion_0024_conectores_independientes.py`: relleno de nombres, choque sin mayúsculas, recorte, `NULL` y único, FK `SET NULL`, downgrade. Solo SQLite se ejecutó; MySQL y PostgreSQL no (sin servidor aquí).
- `tests/matriz_proteccion.py`: las 8 rutas nuevas (superadmin 200/201, resto 403). Ajustadas: `test_esquema_y_modelo`, `test_baja_plataforma` (desasocia), conftest de conectores.

## Impacto en elementos compartidos
- `Evento` (solo 3 valores nuevos; la web quizá necesite etiquetas), `PlatformConnector` (`platform_id` nulo, `name`, `name_norm`, `to_dict` con `id` y `name`), `referencias_de_otras` (ahora recibe el id del conector), `limpiar_historial` (desasocia en vez de borrar), `crear_conector` de pruebas (acepta `plataforma=None`). `impacto.py` marcó además `_estado`, `_guardar`, `_plataforma`, `to_dict` y `validar_nombre`: son coincidencias de nombre con funciones privadas de otros módulos, sin impacto real.
- Validar: Conectores (web), consulta de Auditoría, baja de plataforma.

## Verificación
- Revisor y auditor-seguridad ejecutados; hallazgos de la revisión corregidos (`name_norm`, nombre de respaldo ocupado). Seguridad: aprobado, 4 Bajas anotadas arriba.
- Suite completa (`python -m pytest -q -p no:cacheprovider`): 3700 pasadas, 0 fallidas, código de salida 0 (18 min).
