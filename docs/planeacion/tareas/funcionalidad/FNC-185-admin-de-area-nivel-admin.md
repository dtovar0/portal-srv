# FNC-185 — Admin de área con nivel `admin` en las plataformas de sus áreas

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24; reemplaza P6 de 2026-10-14): «cada plataforma tiene su group mapping (`app-{plataforma}-users` / `-admins`); todos entran en -users; al pasar a admin debe cambiar a -admins».
- Antes el automático del admin era nivel `usuario` y se revocaba al dejar de administrar.

## Cambios
- `access/area_admin_sync.py` (reescrito): `ajustar_nivel` (motor único), `ajustar_al_confirmar` (reemplaza a `revocar_si_ya_no_administra`), `sincronizar_plataforma(area_cambio)`, `sincronizar_cuenta(areas_nuevas, areas_quitadas)`. Constantes `NIVEL_AUTOMATICO = admin`, `NIVEL_BASE = usuario`.
  - Admin de área activo: `admin` en las plataformas de sus áreas. Si tenía `usuario` sube con el reemplazo de nivel de P5 (`services.otorgar`: el `usuario` pasa a `revocando` y el `admin` a `en_proceso`, juntos).
  - Deja de administrar: el `admin` automático pasa a `revocando` y se otorga `usuario` (origen `admin_de_area`); conserva el acceso. Un `admin` por solicitud no se baja.
  - `ldap` sin `ldap_group_admin_dn`: queda `usuario` y aviso en el log; al completar el grupo sube. `ldap` sin grupo `usuario`: sin accesos.
  - Superadmin, cuenta inactiva o sin vínculo con el área (P1): sus automáticos se revocan (antes de esta corrección, un admin desactivado conservaba `admin`).
  - Un acceso `en_proceso` o `fallido` se ajusta al confirmarse; si el nivel destino aún sale (`revocando`) no se hace nada (sin error).
- `access/rules.py`: se quita la restricción «automático = `usuario`»; `validar_otorgamiento(..., regreso)`: el regreso a `usuario` no exige administrar pero sí ser del área (P1). `services.otorgar(regreso_de_admin)`; audita «sistema dejó a X con acceso de usuario…» (el de `admin` conserva el texto anterior). `provisioning/reintento.py` pasa `regreso` en automáticos de nivel `usuario`.
- `access/manejadores.py`, `access/salida_de_area.py` (ahora revoca los automáticos de quien ya no administra el área), `users/roles.py` y `users/areas_administradas.py` (pasan las áreas quitadas), `platforms/api.py` (`area_cambio`).
- Docs: contratos `accesos` 1.2, `plataformas-integracion` 1.4, `areas-y-roles` 3.3 (+README), `backend/README.md`, `business_rules.md`, catálogo de reutilización.

## Pruebas
- Nuevas `tests/access/test_area_admin_nivel.py` (22): 17 de regla del dueño y 5 de hallazgos de revisión; sobre el código anterior fallan 10 y 3 dan error de preparación.
- Ajustadas por el cambio de regla (P6 nueva):
  - `test_area_admin_sync.py` (4): esperaban `usuario` y revocación; ahora `admin`, y el retiro baja a `usuario` (en las de retiro y `en_proceso` se comprueba el `usuario` conservado); renombradas.
  - `test_servicio.py` (4): el automático es de nivel `admin` (se quitó el caso «admin automático → validación»; el no-admin sigue en 404); las de revocar usan nivel `admin` porque un `usuario` automático de un admin sube al confirmarse.
- Ver Verificación.

## Decisiones
- Cambio de nivel: se reutiliza P5 (revocar el anterior y otorgar el nuevo en la misma transacción, dos trabajos en cola); no espera la confirmación del nuevo para encolar la revocación.
- Validado con el dueño (2026-11-24): se conserva P1. Para ver plataformas hay que ser miembro del área, así que un admin no miembro no aplica (FNC-189 se revirtió). Plataformas `conector` sin conector disponible siguen con trabajo, como antes.
- Limitación: un automático `admin` `fallido` de quien deja de administrar no baja ni se reintenta hasta resolverlo el superadmin (raro).
- Frontend (fuera de alcance): `my-access.tsx` dice «Automático: administras el área» también a un ex admin; solo el superadmin revoca ese `usuario`.

## Impacto en elementos compartidos
Funciones modificadas y quién las usa, para validar:

| Elemento | Usado en |
|---|---|
| `services.otorgar` (parámetro `regreso_de_admin`, texto de auditoría) | `access/api.py`, `access_requests/approvals.py`, conectores y ~45 usos más |
| `rules.validar_otorgamiento` (`regreso`), `rules.validar_datos` | `access/api.py`, `access_requests/services.py`, `provisioning/reintento.py` |
| `cambiar_rol` | `users/api.py`, `auth/oidc_cuentas.py`, `users/rol_en_directorio.py` |
| `asignar_areas_administradas` | `users/api.py`, `demo/carga.py` |
| `sincronizar_plataforma` | `platforms/api.py`, `bulk_import/services.py` |
| `revocar_por_salida` | `areas/api.py`, `api/routes.py` |
| `manejadores.al_exito` | ejecutor, en cada otorgar confirmado |
| Web (sin cambio de código) | accesos de `admin_de_area` nivel `admin` y `usuario` en `my-access`, `user-access-panel`, inventario |
(`impacto.py` también lista `pertenece`: coincidencia de nombre, es la función nueva.)

## Verificación
- Seguridad: `auditor-seguridad` (modo cambio) halló 1 Alto (admin desactivado conservaba `admin`) y 2 Medios (P1 en el regreso y en la confirmación), corregidos con prueba; `revisor` pidió además no lanzar errores con el nivel destino saliendo, `ldap` solo con grupo admin y la documentación, corregidos.
- Módulos access, provisioning y users: 604 passed. Suite completa: 3297 passed, 0 failed (exit 0).

## Bitácora
- 2026-11-24: implementada y documentada.
