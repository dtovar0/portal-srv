# DIS-112 — Tarjetas de contadores del dashboard con anillo

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-112-tarjetas-anillo-dashboard` |
| **Origen ←** | Pedido del dueño (mockup `tarjetas-del-dashboard.html`) |
| **Depende de** | FNC-164 (`desglose` en `GET /stats`, otro agente) |

## Contexto
- Las tarjetas de Áreas, Plataformas, Solicitudes, Visitas y Usuarios eran planas (etiqueta y número). El dueño aprobó tres diseños de anillo y pidió elegir cuál queda activo desde un modal.

## Cambios
- `frontend/src/components/dashboard/`: `tarjeta-indicador.tsx` (3 diseños + solo cifra), `anillo-indicador.tsx` (anillo y medidor SVG), `tarjetas-indicadores.tsx` (fila), `indicadores.ts` (catálogo, porcentaje, desglose válido), `diseno-tarjetas.ts` (diseños, llave y lectura/escritura en `localStorage`), `selector-diseno-tarjetas.tsx` (botón + `Modal`).
- `dashboard.tsx`: usa `TarjetasIndicadores` en lugar de `StatTile` y el botón «Diseño de tarjetas» en el encabezado (acciones de `PageHeader`); el estado del diseño vive en `Dashboard`.
- `types.ts`: `ClaveIndicador`, `DesgloseIndicador` y `Stats.desglose?`.
- `tokens.css`: 10 tokens `--color-indicador-*` en los 3 bloques de tema. `components.css`: clases `.nx-ind*`, `.badge-titulo`, `.nx-ind-opcion`.
- Fidelidad al mockup: «Anillo con brillo» (`brillo`), «Dos segmentos» con título como badge (`segmentos`, por omisión) y «Medidor» (`medidor`); sin variantes 2a/2b/2c ni «Original».
- Llenado: `@keyframes nx-ind-llenar` parte de vacío y termina en el valor de los atributos SVG (estado final siempre visible); se apaga con `prefers-reduced-motion`.
- Datos: `desglose[indicador]` solo se usa si `parte + resto` = contador; si falta o no cuadra, la tarjeta muestra solo la cifra. Total 0 = anillo vacío y «0 %».

## Correcciones de la auditoría de accesibilidad (2026-11-19)
- Trazo del segundo segmento sin `opacity` (texto-tenue daba 2,23:1 claro y 2,68:1 oscuro; ahora >= 3:1 contra panel).
- Extremos `-fin` de Plataformas y Visitas más oscuros en el tema claro (ver HISTORIAL); el oscuro no cambia.
- Lector de pantalla: texto `sr-only` con las dos partes en los tres diseños («9 activas, 3 inactivas»; en «Dos segmentos» la leyenda visible queda `aria-hidden` para no duplicar) y el porcentaje dice de qué es («92 % activas»).
- Modal: la opción elegida muestra icono de verificación y «Elegido» (además del color) y el foco inicial va a la opción actual (`autoFocus`).
- Prueba de contraste ampliada (trazo y `-fin` contra panel, resto contra panel, «Elegido»); el comentario de `components.css` apunta a ella.
- Recortes: la fila pasa a 5 columnas solo en `2xl` (en `xl` cada tarjeta quedaba con ~158 px útiles); en 3 columnas no hay recortes. Además el badge y la etiqueta truncan con `title`, y el anillo pasa debajo de la cifra si la tarjeta es angosta (`flex-wrap`).

## Diferencias deliberadas con el mockup
- Sin los chips de ejemplo («+2 esta semana», «5 por atender»): eran datos inventados.
- Etiquetas de las partes según la tarea (activas/inactivas, resueltas/pendientes, de plataformas activas/de las demás, activos/inactivos).
- Los textos usan la escala del proyecto (mínimo 12 px) en lugar de 9,5 y 11 px.
- «Anillo con brillo»: bajo la cifra va «N activas» (sin la etiqueta pequeña dentro del anillo, que no cabía a 12 px).
- Las tarjetas no son enlaces (el mockup las simulaba como `a`); conservan el efecto de elevación al pasar el ratón.
- El color por indicador va en clases (`nx-ind--*`) que leen tokens; no se usó `variablesCss` (no hay colores de datos).

## Pruebas
- `tests/components/dashboard-tarjetas-indicador.test.tsx` (18): los 3 diseños (cifra, porcentaje, partes), llenado, color por indicador, sin desglose, desglose incoherente, total 0, fila con desglose parcial, preferencia (omisión, valor desconocido, almacenamiento que falla), modal (`aria-pressed`, Aplicar, Cancelar, Escape, nombre, foco, `min-h-12`).
- `tests/components/dashboard.test.tsx` (+3): integración (omisión con desglose, modal cambia las 5 tarjetas y se recuerda tras remontar, sin desglose).
- `tests/accesibilidad/indicadores-contraste.test.ts` (48): contraste medido en los 3 contextos de tema.

## Verificación
| Comando | Resultado |
|---|---|
| `npx vitest run` | 97 archivos, 3006 pruebas, salida 0 |
| `npx tsc --noEmit` | salida 0 |
| `npx next lint` | salida 0, «No ESLint warnings or errors» |
| `npm run build` | salida 0 |
| Contraste (`tests/utils/wcag.ts`, claro, SO oscuro y `html.dark`) | texto legible de los 5 indicadores >= 4.5:1 sobre superficie, badge (13 %) y resplandor (10 %); etiquetas tenue y secundaria >= 4.5:1; icono blanco sobre su caja >= 3:1; trazo sobre superficie >= 3:1 |
| Captura estática (Chromium sin cabeza, CSS compilado, 1320 px, claro y oscuro, movimiento reducido) | los 3 diseños y la tarjeta sin desglose se ven como el mockup en ambos temas |

No verificado: la app contra un backend real con `desglose` (FNC-164 es de otro agente); móvil (1 columna) y tableta solo por clases (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5`), sin captura (sí hay capturas a 1280, 1440 y 1600 px, claro y oscuro); el modal solo con pruebas de componente, sin captura; la animación de llenado no se vio en movimiento (la captura se tomó con movimiento reducido).

## Impacto en elementos compartidos
| Elemento | Qué cambió | Quién lo usa / qué validar |
|---|---|---|
| `Dashboard` (`dashboard.tsx`) | Fila de contadores y botón en el encabezado | `dashboard-gate.tsx`, navegación; validar la pantalla Dashboard |
| `Stats` (`lib/types.ts`) | Campo opcional `desglose` | `lib/api.ts` (solo tipo; sin efecto si falta) |
| `tokens.css` | 10 tokens nuevos, nada existente cambiado | los 3 bloques de tema |
| `components.css` | Clases nuevas al final (`.nx-ind*`, `.badge-titulo`, `.nx-ind-opcion`) | sin usos previos |
| `StatTile` (`ui.tsx`) | No se modificó; el dashboard ya no lo usa | `role-summary.tsx` sigue usándolo |

## Estándares propuestos / tareas
- `badge-titulo` es una clase genérica pero hoy solo la usa este componente: si otra pantalla necesita un badge de título, extender `Badge` en lugar de copiarla.
- Tareas `FNC` creadas: ninguna (FNC-164 ya existe y es de otro agente).

## Bitácora
- 2026-11-19: implementada, probada y documentada en la rama `dis/DIS-112-tarjetas-anillo-dashboard`; sin push ni merge.
