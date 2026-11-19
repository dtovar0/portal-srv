# DIS-102 — Tarjeta de área rediseñada (icono a la izquierda)

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-102-tarjeta-de-area` |

## Contexto
- El dueño aprobó (2026-11-19) la opción «1 · Icono a la izquierda» del mockup `tarjetas-de-area.html` para las áreas de Admin › Plataformas. La tarjeta de plataforma del mockup y el icono a la derecha **no** se aprobaron y no se hicieron.

## Cambios
- Nuevo `components/areas/tarjeta-area.tsx` (`TarjetaArea`): cabecera con icono en cuadro de degradado del color del área, nombre y descripción (2 líneas) y resplandor; cuerpo con recuadros de personas (`users_count`) y plataformas; pie con 3 logos, «+N», «Sin plataformas», aviso «Inactiva» y «Ver plataformas →».
- `platform-admin.tsx`: solo cambia el render de la tarjeta; memo `plataformasPorArea` (mismo alcance que `conteoPorArea`) para los logos; se retiran `CLASES_ROWS`, `lg:grid-rows-*`, `auto-rows-fr`, `h-full` y los imports sin uso (`Badge`, `NombreIcono`).
- `components.css`: clases `.nx-area-card*` (hover con elevación y borde del color del área, `prefers-reduced-motion`, estado inactivo).
- Logo: `logo_url` solo si es `https://` (`enlaceSeguro`; el backend ya solo devuelve https); si no, iniciales sobre `bg_color` (`.nx-chip-solid`, como `PlatformCard`).

## Decisiones
- **Color del área**: dato libre; viaja como `--area-color` con `variablesCss()` (patrón DIS-012). El texto del icono se elige por luminancia (`data-texto`, DIS-048). «Ver plataformas» mezcla 35 % del color del área con el texto del tema: AA con cualquier color.
- **Resplandor al 8 %** (el mockup usa 12 %): con 14 % y área blanca la descripción bajaba a 3,8:1 en tema oscuro.
- **Rejilla**: sin filas fijas, el alto lo da el contenido; la paginación (`filas × columnas`) no cambia. Los huecos punteados ahora solo completan la última fila y solo en escritorio (antes rellenaban toda la rejilla).
- Aria-label sin cambios (no suma personas), por mandato del dueño.
- Cuando el área es inactiva se muestra el aviso «Inactiva» y el pie sigue diciendo «Ver plataformas» (antes «Ver plataformas (Inactiva)»; el estado ya está en el aviso y en el aria-label).

## Impacto en elementos compartidos
- Compartidos modificados: `styles/components.css` (clases nuevas `.nx-area-card*`, sin tocar las existentes). Reutilizados sin cambios: `Icono`, `Badge`, `variablesCss`, `.nx-chip-solid`, `atributoTexto`, `enlaceSeguro`, `.foco-visible`.
- `impacto.py` (contra `develop`) marca 2 elementos; ambos son falsos positivos (no se modifican, el fragmento del diff cae junto a su definición):

| Elemento | Tipo | Usado en | Resultado |
|---|---|---|---|
| `handleKeyDown` | función | `select-premium.tsx` | Falso positivo: no se toca |
| `nexus-btn-con-motivo` | clase CSS | `button.tsx`, `motivo-boton-deshabilitado.test.ts` | Falso positivo: no se toca |

- Vista afectada: Admin › Plataformas (`/admin/platforms`), sección de áreas. Ninguna otra pantalla usa la tarjeta.

## Verificación
- `npx vitest run`: 95 archivos, 2839 pruebas, código 0. `npx tsc --noEmit`: 0. `npm run lint`: 0 (solo avisos previos). `npm run build`: 0.
- Pruebas nuevas `tests/components/tarjeta-area.test.tsx` (11) y ajustadas las de `platform-admin.test.tsx` (huecos, aria-label, inactiva).
- Contraste medido con `tests/utils/wcag.ts` sobre los tokens de cada tema, con áreas blanca, negra, azul y amarilla (mínimo entre ambos temas): nombre/encabezado 12,62; descripción/encabezado 4,65; cifra/recuadro 16,61; etiqueta de cifra 6,12; «Ver plataformas»/panel 5,52; icono pequeño 5,32.
- `auditor-accesibilidad`: 0 fallas confirmadas (contraste, tamaño, foco, táctil). Observación: el `aria-label` no incluye personas (se conserva por mandato). `revisor`: sin hallazgos de código; sus pendientes de documentación y lint corregidos.
- Seguridad: es la primera vez que la interfaz pinta `logo_url` (`<img>` de hosts https externos: revela la IP del cliente y puede chocar con una CSP). **Pendiente**: `auditor-seguridad` en modo cambio / decisión del dueño sobre logos externos.
- Lint: `eslint-disable-next-line @next/next/no-img-element` con motivo (como `portal-tab.tsx`), sin avisos nuevos.
- **No verificado**: captura visual en tema claro/oscuro, móvil y escritorio (no se levantó la app con navegador); hover y reducción de movimiento solo comprobados por CSS en prueba.

## Ajustes tras revisión del dueño (2026-11-19)
- «Me quitaste el grid responsivo, ya no utiliza todo el ancho»: se restaura la rejilla de filas fijas que ocupa todo el alto (`CLASES_ROWS`, `auto-rows-fr`) con los huecos de toda la página; la tarjeta llena su celda y las cifras se centran en el espacio sobrante (sin hueco vacío).
- «No veo el efecto de color»: halo fuerte del color del área alrededor del icono (se apaga antes del texto), sombra del color bajo el icono y en el hover. El color es el que se elige en Diseño al crear el área (`area.color`). Contraste de la descripción medido en el peor caso (área blanca en oscuro): 4.95:1.
