# DIS-119 — Pruebas de accesibilidad en verde

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Rama** | `dis/DIS-119-pruebas-accesibilidad` |
| **Origen ←** | Pedido del dueño: las 46 pruebas de `frontend/tests/accesibilidad/` que fallaban en `develop` (preexistentes) |

## Cambios (se corrigió el código; las pruebas no se debilitaron)
| Prueba (fallas) | Corrección |
|---|---|
| escala-simetria (11) | Sin `min-h-[460px]`, `w-[560px]`, etc.: escala 8pt extendida en `tailwind.config.ts` (`spacing` de 4 px en 4 px y medios pasos, `w-9/20`, `w-11/20`, `w-mitad-canal`, `w-progreso`); mismas medidas que antes |
| colores-literales (11) | Colores de paleta fija y `white`/`black` pasan a tokens `--color-arte-*` (mismo valor en ambos temas) con clases `text-arte-luz`, `bg-arte-sombra/60`, `from-arte-purpura-950`...; badges de estado a `success`/`warning` y `*-text`; `global.css` sin `black` (máscara con `--color-primary`); `bg-[#0f172a]` a `bg-arte-pizarra-900`; los datos de muestra con hex pasan a `src/lib/demo-tarjetas.ts` (son datos, no estilo) |
| patrones-unicos (7) | `<h1>` de login, logout, acceso denegado, emergencia, autoservicio y portada con `PageHeader` (nueva prop opcional `titleClassName`; por omisión sigue `sr-only`); pestañas de Ajustes de vista con `Tabs variant="pills"` |
| css-sin-uso (6) | Fuera `.nx-product-sheen`, `.nx-float-card`, `.nx-reveal`, `.nx-reveal-delay` y sus `@keyframes` (sin llamador) |
| texto-minimo (2) | `text-[5..11px]` a `text-xs` (12 px); los rótulos de 5–6 px de las miniaturas en cuadros de 8–12 px se quitaron (eran relleno decorativo); titular de portada en pantallas bajas con `--text-hero-compacto` (56 px) en vez de `clamp` con `vw` |
| texto-de-marca (2) | `text-primary` como texto a `text-primary-text`; textos de paleta fija a `*-arte-*` o a `*-text` por tema; sin variantes `dark:` |
| estados-con-token (2) | Sin `dark:` (6 archivos); `opacity-60` y `disabled:opacity-*` a `opacity-atenuada`/`opacity-deshabilitada`; `dark:opacity-20` a `opacity-decoracion` (por tema); 59 usos a 17 |
| area-tactil (2) | `min-h-12`/`min-w-12` en ~45 controles (portada, login, autoservicio, drawers, barras de plataformas, interruptores). Excepción de `tarjeta-area.tsx` de 1 a 10: es el mismo «Ver plataformas» de DIS-114 repetido en cada una de las 10 variantes de diseño |
| placeholder-contraste (1) | `placeholder:text-texto-secundario/60` a `/85` en `request-form-modal` y `modal-responsiva` |
| css-literales-y-variables (1) | `--color-primary-rgb` no existía (sombras sin efecto): `shadow-xl shadow-primary/25` y `shadow-md shadow-primary/20` |

## Tokens nuevos (`tokens.css`, documentados en `VARIABLES.md` y `HISTORIAL.md`)
`--text-hero-compacto`, `--opacidad-atenuada`, `--opacidad-deshabilitada`, `--opacidad-decoracion` (claro 0.4, oscuro 0.2), `--color-arte-luz`, `--color-arte-sombra` y 35 `--color-arte-<tono>-<n>`.

## Verificación
| Comando | Resultado |
|---|---|
| `npx vitest run tests/accesibilidad` | 22 archivos, 2306 pruebas, todas pasan |
| `npx tsc --noEmit` | salida 0 |
| `npx eslint .` | salida 0, 0 errores y 0 advertencias |
| `npx next build` | salida 0 |
| `npx vitest run` (completo) | 23 fallan, todas en `tests/components`; 21 son las mismas de `develop` (FNC-167) y 2 son nuevas por este cambio (abajo) |

**Fallas nuevas en `tests/components` (no se editaron por estar fuera del carril):**
- `autoservicio-view.test.tsx` espera la clase `md:h-[740px]`; ahora es `md:h-185` (misma medida).
- `platforms-shell.test.tsx` espera pestañas `w-36 sm:w-40`; `Tabs variant="pills"` usa `w-48 sm:w-52`.

## No verificado
- Captura visual en tema claro y oscuro, móvil y escritorio: no se levantó la app. Cambios visibles esperados: botones y enlaces más altos (48 px), textos de 5–11 px ahora de 12 px (puede desbordar en miniaturas y tarjetas densas), pestañas de Ajustes de vista más anchas, miniaturas sin letras diminutas, y colores de estado de los avisos por token de tema.
- `auditor-accesibilidad`, `revisor` y `tester` no se ejecutaron (el agente no puede lanzar subagentes): quedan pendientes antes del merge.

## Impacto en elementos compartidos
| Elemento | Qué cambió | Quién lo usa / qué validar |
|---|---|---|
| `PageHeader` | prop opcional `titleClassName` (sin ella, igual que antes) | todas las pantallas; validar solo login, logout, portada, autoservicio, acceso denegado y emergencia |
| `TarjetaArea`, `PlatformMockupCard`, `FavoriteButton` | colores por token, texto 12 px, `text-primary-text` | catálogo y admin de plataformas, favoritos: validar los 10 diseños de tarjeta en ambos temas |
| `PantallaCarga` | opacidad por token (`dark:` fuera) | todas las pantallas con carga |
| `tailwind.config.ts`, `tokens.css`, `global.css` | spacing extendido, colores `arte-*`, opacidades; fuera animaciones de la portada | todo el frontend |
| `area-tactil.excepciones.ts` | `tarjeta-area.tsx` de 1 a 10 | prueba de área táctil |
