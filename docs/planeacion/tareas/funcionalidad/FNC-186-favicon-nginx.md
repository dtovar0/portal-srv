# FNC-186 — Favicon servido por nginx

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24): «nginx no muestra el favicon»; «¿install.sh configura las páginas de error y el favicon?».
- Páginas de error: ya las configura la plantilla (`error_page` 403-504 y `location ^~ /errors/`). Favicon: lo servía solo Next.js.

## Cambios
- `deploy/nginx.conf.tmpl`: `location = /favicon.ico` → `@PREFIX@/frontend/public/favicon.ico` (7 días de caché, sin registro).
- `deploy/install.sh`: el resumen final ya no pide migrar a mano (FNC-178) ni habla de cabeceras SSO (retiradas, ADR-009); numeración corregida.

## Pruebas
- `tests/deploy/test_nginx_error_pages.py` (+2). `tests/deploy`: 265 passed.

## Aplicación en el servidor
- `install.sh` (o `--nginx-conf reemplazar`) regenera el `.conf`; si se editó a mano, el instalador pregunta antes de reemplazarlo (FNC-153). `--actualizar` no toca nginx.
