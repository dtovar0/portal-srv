# FNC-133 — Búsqueda global de datos para el buscador de la barra superior

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 7 |
| **Módulo / Área** | busqueda |
| **Prioridad** | Baja |
| **Estatus** | Propuesta |
| **Creada** | 2026-10-28 |

## Contexto
- La maqueta aprobada muestra el buscador como «Buscar usuarios, plataformas, solicitudes…».
- DIS-078 lo entrega solo con pantallas y acciones del rol, resueltas en el cliente (paleta de comandos `Ctrl K`).
- Buscar datos en la base necesita un endpoint nuevo, con permisos por rol y áreas.

## Propuesta
- Endpoint de solo lectura (p. ej. `GET /api/v1/search?q=`) que devuelva usuarios, plataformas y solicitudes visibles para el rol y las áreas de la sesión, con tope de resultados y sin datos sensibles.
- Contrato en `docs/contratos/` antes de implementar; después, tarea `DIS` para mostrar los resultados en la paleta.

## Impacto cruzado
- Origen ← DIS-078
- Genera → una tarea `DIS` para pintar los resultados en la paleta (por crear al aprobar esta).
