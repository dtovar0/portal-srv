# DIS-130 — Avisos por correo en Ajustes de vista

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- Dueño (2026-11-25): la opción «Notificaciones por correo» solo estaba en `/settings` (admins); pidió que cada usuario la active o desactive desde Ajustes de vista, dentro de «Mensajes de bienvenida», renombrada a «Notificaciones», como toggle.

## Cambios
- `user-view-settings.tsx`: tarjeta «Mensaje de Bienvenida» → «Notificaciones»; nuevo interruptor `role="switch"` «Recibir avisos por correo» (mismo patrón y tokens que el de bienvenida).
- Guarda `email_notifications` con `PUT /api/v1/me/preferences` (ya permitido a cualquier usuario) y actualiza la sesión; deshabilitado mientras guarda; aviso de éxito o error.
- Sin cambios de backend: `access_notifications._quiere_correo` ya respeta `pref_email_notifications` para aprobado y rechazado.

## Pruebas
- `tests/components/platforms-shell.test.tsx` (+3; fallaban sin el cambio). Vitest 3458/3458; tsc, lint y build en 0; pytest de preferencias 13/13.
