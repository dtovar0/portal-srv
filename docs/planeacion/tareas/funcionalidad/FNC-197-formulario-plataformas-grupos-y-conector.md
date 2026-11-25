# FNC-197 — Formulario de plataformas: grupos siempre y conector opcional

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Propuesta |
| **Creada** | 2026-11-24 |
| **Origen** | FNC-196 |

## Qué debe cambiar el frontend
- Los grupos LDAP (`ldap_group_user_dn`, `ldap_group_admin_dn`) se muestran siempre, con el DN derivado como valor sugerido (el backend los deriva si no se envían).
- El conector es opcional en cualquier plataforma (`PUT /platforms/<id>/connector` ya no da `409 plataforma_sin_conector`); `integration_type` deja de ser una elección excluyente (informativo).
- Sin «No disponible para solicitar»: `can_request`/`requestable_levels` ofrecen ambos niveles a toda plataforma activa.
- Contratos: `plataformas-integracion.md` 1.5, `solicitudes.md` 1.2, `conectores-y-ejecuciones.md` 1.5.
