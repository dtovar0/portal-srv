# DIS-121 — Login simplificado

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24, captura de `/login`): «cámbiame el diseño del login, lo veo muy saturado».

## Cambios (`frontend/src/components/login-form.tsx`)
| Antes | Ahora |
|---|---|
| Nota «Autenticación federada Single Sign-On (SSO)» | Retirada |
| «Abrir portal de Authelia directamente ↗» | «Portal de Authelia ↗», en la línea de ayuda |
| Caja «¿Tu contraseña caducó…?» con 3 textos y enlace | Enlace «¿Olvidaste o caducó tu contraseña?» en la línea de ayuda |
| Separador + «Conoce Aduana: Guía y Presentación…» + lema «Vivaro • Gobernanza…» | Solo «Conoce Aduana» si la portada está activa |
| Subtítulo «Ingresa con tu cuenta corporativa para continuar.» | «Usa tu cuenta corporativa.» |
- Sin cambios: botón, foto, login local, rutas.

## Pruebas
- `login-oidc.test.tsx`: nombres de enlaces actualizados y prueba nueva de la versión simple. Vitest 3428/3428; tsc, lint y build en 0.
- auditor-accesibilidad: sin fallas (contraste medido en ambos temas, foco, 48 px, separador oculto).
