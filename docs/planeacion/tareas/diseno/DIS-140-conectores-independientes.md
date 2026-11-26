# DIS-140 — Pantalla Conectores: crear, editar, asociar y desasociar

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Aprobada |
| **Creada** | 2026-11-26 |

## Contexto
- Pedido del dueño (ver FNC-213). Contrato `conectores-y-ejecuciones.md` 1.6.

## Alcance
- `/admin/connectors` lista **conectores** (`GET /connectors`): nombre, tipo, host, plataforma (o «Sin asociar») y estado de la credencial.
- «Nuevo»: formulario del conector con «Nombre» y sin plataforma (`POST /connectors`). «Editar» (`PUT`), «Eliminar» con confirmación (`DELETE`).
- «Asociar»: elegir una plataforma sin conector (`GET /platforms`, `has_connector` falso) → `PUT /connectors/<id>/platform`. «Desasociar» con confirmación.
- «Probar conexión» solo asociado; sin plataforma se explica por qué no.
- Mensajes por código (`plataforma_con_conector`, `conector_sin_plataforma`, `plataforma_con_accesos`, `validacion` con `fields.name`).
- Reutilizar `connector-form`, `connector-panel`, `connector-param-fields` y la barra de herramientas actual; bitácora de ejecuciones sin cambios.
