# DIS-133 — Interruptor «Omitir enlace» en plataformas

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-25 |

## Contexto
- Dueño (2026-11-25, captura del paso 1 de «Nueva plataforma»): «quiero que pongas un toggle omitir el enlace».

## Decisión
- Apagado: el enlace es **obligatorio** («Escribe el enlace o activa «Omitir enlace».»). Encendido: el campo se oculta y se guarda sin enlace (la tarjeta se ve pero no se abre).
- Al editar una plataforma sin enlace, el interruptor nace encendido.

## Cambios
- `platform-form.tsx`: `Toggle` existente (`components/form.tsx`) en el paso 1; el campo Enlace solo se muestra con el interruptor apagado.
- `platform-payload.ts::validate`: opción `enlaceObligatorio` (por omisión `false`; solo la usa este formulario).
- Sin cambios de backend: `direct_link` vacío ya era válido.

## Pruebas
- `tests/components/platform-admin.test.tsx` (+3; fallaban sin el cambio). Ayudantes de alta llenan el enlace; `avanzarYGuardar` con límite de pasos (antes un bloqueo de validación dejaba la prueba en bucle infinito).
- Vitest 3541/3541; tsc, lint y build en 0.
