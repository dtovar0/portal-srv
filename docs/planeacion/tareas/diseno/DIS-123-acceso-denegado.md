# DIS-123 — Pantalla «Sin acceso»

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24, captura de `/login?error=acceso_denegado`): «se quedó con un diseño anterior»; «Reintentar ahora es más ancho que Pausar».

## Cambios (`frontend/src/components/acceso-denegado-view.tsx`)
| Antes | Ahora |
|---|---|
| Tarjeta angosta con cabecera, pastilla «403 · SIN ACCESO» y dos cajas anidadas | Tarjeta dividida con la foto del login (DIS-121) |
| Caja «Soporte y solicitudes» + correo + botón | Botón «Escribir a soporte» y el correo debajo |
| Caja del temporizador; «Reintentar ahora» (primario, `flex-1`) y «Pausar» (secundario, angosto) | Una línea de estado (`aria-live`), barra fina y dos botones `secondary` en `grid-cols-2` (mismo ancho) |
| Pie con lema | Solo «← Volver al inicio de sesión» |
- Sin cambios de comportamiento: misma cuenta de 15 s, mismo `mailto`, misma URL de reintento.

## Pruebas
- `tests/components/acceso-denegado-view.test.tsx` (4, nuevas). Vitest 3433/3433; tsc, lint y build en 0.
