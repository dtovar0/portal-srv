# DIS-140 — Pantalla Conectores: crear, editar, asociar y desasociar

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Pedido del dueño (ver FNC-213). Contrato `conectores-y-ejecuciones.md` 1.6.

## Alcance
- `/admin/connectors` lista **conectores** (`GET /connectors`): nombre, tipo, host, plataforma (o «Sin asociar») y estado de la credencial.
- «Nuevo»: formulario del conector con «Nombre» y sin plataforma (`POST /connectors`). «Editar» (`PUT`), «Eliminar» con confirmación (`DELETE`).
- «Asociar»: elegir una plataforma sin conector (`GET /platforms`, `has_connector` falso) → `PUT /connectors/<id>/platform`. «Desasociar» con confirmación.
- «Probar conexión» solo asociado; sin plataforma se explica por qué no.
- Mensajes por código (`plataforma_con_conector`, `conector_sin_plataforma`, `plataforma_con_accesos`, `validacion` con `fields.name`).
- Reutilizar `connector-form`, `connector-panel`, `connector-param-fields` y la barra de herramientas actual; bitácora de ejecuciones sin cambios.

## Cambios
- `lib/access/types.ts`, `connectors.ts`, `mocks.ts`: `ConnectorItem`/`ConnectorItemInput` (1.6); `connectorsApi` agrega `list`, `create`, `update`, `destroy`, `associate`, `dissociate`, `testById` (las rutas por plataforma siguen); datos simulados.
- `connectors/connectors-admin.tsx`: lista conectores; barra Editar, Asociar, Desasociar, Eliminar y Nuevo (habilitadas según selección y estado de asociación, con motivo); búsqueda por nombre, host o plataforma.
- `connectors/connector-list.tsx`: columnas Nombre, Tipo, Host, Plataforma («Sin asociar»), Credencial, Acciones.
- `connectors/connector-panel.tsx`: detalle/alta sin plataforma; «Probar conexión» deshabilitado sin plataforma con «Asocia el conector a una plataforma para probarlo.» (botón con motivo y texto visible).
- `connectors/connector-form.tsx`, `connector-catalog.ts`: campo «Nombre» (1-100, sin control), `POST`/`PUT /connectors`; `conectorId` sustituye a `platformId`.
- Nuevos: `connector-associate-dialog.tsx` (selector de plataformas sin conector) y `connector-dissociate-dialog.tsx` (confirmación). `connector-delete-dialog.tsx` recibe el conector.
- `connector-errors.ts`: mensajes por código (`plataforma_con_conector`, `conector_sin_plataforma`, `plataforma_con_accesos`, `validacion` con `fields.name`).

## Decisiones
- Sin estilo nuevo: solo `Button`, `Modal`, `AlertDialog`, `ResponsiveList`, `Badge`, `EmptyNote` y clases existentes.
- Los datos del panel salen de `GET /connectors`; no se pide `GET /connectors/<id>` (menos peticiones; la lista se recarga tras cada escritura).
- «Asociar» carga `api.platforms()` al abrir el selector y filtra `has_connector` falso; un `409 plataforma_con_conector` actualiza la lista.
- Un `404`/`409` desfasado cierra el diálogo, avisa y recarga la lista.
- `422 fields.name` usa el mensaje fijo «Ya existe un conector con ese nombre.» (único caso del servidor tras validar largo en cliente).
- Dudas del contrato: ver informe (sin bloqueo).

## Pruebas
- Rojo antes: 26/26 de `connectors-admin.test.tsx` fallaban con el código anterior.
- Actualizadas: `connectors-admin`, `connector-params`, `dialogos-descripcion`, `lib/access/peticiones`.
- Vitest 3605/3605 en verde; tsc y eslint en 0 (resultado final en el informe).
- Verificación visual de tema claro/oscuro y móvil: no hecha (sin app levantada); solo clases y tokens existentes.

## Impacto en elementos compartidos
- Sin tokens ni CSS nuevos. `ConnectorDeleteDialog` cambia de props (`connector` en lugar de `platform`); solo lo usan `connector-panel` y `connectors-admin`. `connectorsApi` solo suma funciones.
