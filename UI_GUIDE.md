# 🎨 UI_GUIDE — Memoria de Diseño y Tokens Reutilizables

Este documento registra los patrones de diseño, componentes consolidados, clases reutilizables de Tailwind y convenciones del sistema UI.

---

## 🧱 Sistema Base (8pt Grid)

- **Espaciados estándar**:
  - `gap-1` / `p-1` (4px - medio paso)
  - `gap-2` / `p-2` (8px - 1 paso)
  - `gap-3` / `p-3` (12px)
  - `gap-4` / `p-4` (16px - 2 pasos)
  - `gap-6` / `p-6` (24px - 3 pasos)
  - `gap-8` / `p-8` (32px - 4 pasos)
- **Áreas táctiles mínimas**: 44px a 48px en controles interactivos (`min-h-[44px]` o `min-h-[48px]`).
- **Layouts base**: `min-h-screen` o `h-full` para evitar cortes de scroll o fondos incompletos.

---

## 🎨 Tokens de Color y Temas

- **Temas soportados**: `claro` y `oscuro` (más `sistema` que resuelve a uno de ellos).
- **Consumo de tokens**:
  - Fondo de página: `bg-body-bg`
  - Texto principal: `text-body-text`
  - Texto secundario / etiquetas: `text-label-text`
  - Superficies / Contenedores: `bg-panel-fill`, `border-panel-border`
  - Primario / Acento: `bg-primary`, `text-primary-text`, `border-primary`

---

## 🧩 Patrones de Componentes Reutilizables (DRY)

| Patrón | Componente Único | Ubicación |
| --- | --- | --- |
| Encabezado de página | `PageHeader` | `components/page-header.tsx` |
| Botón principal/secundario/peligro | `Button` | `components/button.tsx` |
| Enlace con apariencia de botón | `ButtonLink` | `components/button-link.tsx` |
| Tabla y lista de datos responsiva | `DataTable` / `ResponsiveList` | `components/data-table.tsx` |
| Lista de usuarios administrados | `DataTable<ManagedUser>` | `components/users-list.tsx` |
| Mensaje de estado vacío premium | `PremiumEmptyState` | `components/premium-message.tsx` |
| Barra de filtros | `FilterBar` | `components/filter-bar.tsx` |
| Alerta / Confirmación modal | `AlertDialog` | `components/alert-dialog.tsx` |
| Control Select Premium | `Select` (`.nx-select-premium`) | `components/form.tsx` & `styles/components.css` |
| Notas de estado (error, éxito, info) | `Note`, `ErrorNote`, `SuccessNote` | `components/note.tsx` |
| Pestañas accesibles | `Tabs` | `components/tabs.tsx` |
| Paginador compacto en cápsula (`< 1/5 >`) | `CapsulePager` | `components/capsule-pager.tsx` |

---

## 💎 Convenciones de Punto Fino y Acabado Visual

- **Identidad Visual Canónica (Opción 1: Electric Cobalt & Violet — Tech / Modern SaaS)**:
  - Estándar visual del portal inspirado en productos SaaS de clase mundial (vibe Linear & Stripe).
  - Tríada cromática armónica: Primario Cobalto (`--color-primary`), Marca Índigo (`--color-brand`) y Acento Violeta (`--color-accent`), contrastados sobre fondos limpios o nocturnos.
  - Micro-relieves físicos y profundidad sutil: `shadow-xs` en controles interactivos e insignias, `shadow-1` en tarjetas, y `shadow-2` en elementos flotantes o en hover pronunciado.
- **Encabezados de Pantalla (`PageHeader` - Opción A)**: El título visual de la pantalla reside limpiamente en la `BarraSuperior` (`RutaNavegacion`). `PageHeader` garantiza accesibilidad con `h1.sr-only` vinculado al ref de navegación accesible (DIS-068/070), y provee una barra de herramientas compacta (`role="toolbar"`) para acciones a la derecha y botón volver a la izquierda sin duplicar visualmente el título en el body.
- **Encabezados de Contenedores y Tarjetas (`CardHeader` / `DataTable` encabezado / `PanelHeader`)**: Alto impacto visual y delimitación arquitectónica nítida:
  1. *Fondo de color distinguido*: `bg-gradient-to-r from-primary/10 via-brand/10 to-accent/10 border-b border-primary/20 px-4 py-2 min-h-16 rounded-t-xl`.
  2. *Pastilla de icono*: `flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-superficie text-primary-text shadow-xs`.
  3. *Tipografía*: Título rotundo `text-sm font-bold tracking-tight text-body-text` acompañado de subtítulo contextual descriptivo `text-xs text-label`.
  4. *Altura estandarizada*: `min-h-16` (64px en grid 8pt) asegurando alineación geométrica idéntica entre tarjetas con y sin acciones laterales.
  5. *Acciones integradas*: Botones o enlaces de navegación (`Ver todo >`) en pastilla interactiva con `text-primary-text hover:bg-surface-container`.
- **Cabeceras de Tabla y Listas (`ResponsiveList` / `DataTable` thead)**: Mayor presencia y diferenciación visual. Fondo `bg-superficie-hundida/95 border-b border-panel-border/90 px-6 py-4`, tipografía destacada `text-xs font-black uppercase tracking-wider text-label/90 select-none`. Altura mínima de 48px alineada al sistema ergonómico.
- **Iconos y Chips de Celdas (`size-8` / `h-8` y `rounded-lg`)**: Escala estándar unificada a 32 px para avatares de nombre, insignias de estado (activo/inactivo/LDAP) y contenedores de áreas/plataformas/usuarios, con iconos internos en escala estándar `tamano="sm"` (16 px), eliminando disparidades visuales en las filas.
- **Celdas y Espaciado de Filas (`DataTable` CELDA)**: Espaciado generoso `px-6 py-4` basado en el sistema 8pt, proporcionando alturas de fila ergonómicas (52–56px) para legibilidad óptima y accesibilidad táctil.
- **Micro-interacciones en Filas (`DataTable` y `ResponsiveRow`)**: Micro-borde izquierdo reactivo `border-l-2 border-l-transparent hover:border-l-primary/60 hover:bg-primary/[0.04] transition-colors` en filas interactivas, fila seleccionada con `bg-primary/10 font-medium border-l-2 border-l-primary`, y hover sutil `hover:bg-superficie-hundida/30 transition-colors` en estándar.
- **Pie de Tabla Informativo (`DataTable` footer)**: Franja inferior integrada (`border-t border-panel-border/80 bg-superficie-hundida/50 px-6 py-3.5`) con contador dinámico de registros, indicador de pulso primario y etiqueta contextual de la región para cierre visual limpio de la tarjeta.
- **Botones de Acción en Celdas (`Button` y `ButtonLink` fila / fila-peligro / fila-primario)**:
  - Eliminación de iconos flotantes en el vacío: cada botón de acción cuenta con contenedor físico estructurado (`rounded-xl` con radio de 10-12px, tamaño táctil accesible de 48px `min-h-12 min-w-12`).
  - *En reposo*: Fondo de superficie (`bg-superficie`), borde perimetral (`border border-panel-border`), y micro-sombra física (`shadow-xs`).
  - *En hover*: Elevación sutil `translate-y-[-1px]`, sombra `shadow-1`, y realce cromático del borde (`border-primary/40` o `border-error/40`) con tinte translúcido de acento (`bg-primary/12` o `bg-error/12`).
  - *En active*: Micro-contracción elástica `scale-[0.97]` para feedback táctil instantáneo.
  - *Agrupación*: Distribución en celdas con `inline-flex items-center justify-end gap-2` para separación armónica y simétrica.
- **Estructura Tripartita de Modales (`Modal`)**: Diálogos organizados en 3 capas visuales nítidas con jerarquía cromática premium:
  1. *Header con degradado Cobalt & Violet*: Fondo `bg-gradient-to-r from-primary via-brand to-accent text-texto-sobre-accion px-6 py-4`, pastilla de icono translúcida `size-9 rounded-xl bg-white/15 border border-white/25 text-texto-sobre-accion shadow-xs`, título destacado en negrita y botón de cierre accesible con hover translúcido `hover:bg-white/15 text-texto-sobre-accion`.
  2. *Body*: Fondo blanco limpio (`bg-panel-fill`), padding equilibrado y scroll vertical controlado (`max-h-96 overflow-y-auto`).
  3. *Footer*: Franja inferior claramente delimitada (`bg-superficie-hundida/80`, `border-t border-panel-border px-6 py-4`) con botones de acción alineados a la derecha. Todos los botones de confirmación, guardado, cancelación o cierre integran iconos vectoriales semánticos de apoyo (`<Icono nombre="aprobar" ... />` para Guardar/Aprobar/Confirmar, `<Icono nombre="cerrar" ... />` para Cancelar/Cerrar/Entendido, `<Icono nombre="eliminar" ... />` para Peligro/Eliminar). Diálogos informativos o de detalle incorporan botón de cierre/entendido para evitar modales truncados.
- **Controles de Formulario (`FIELD_BASE` y `Field`)**:
  - Inputs, selectores y textareas modernizados con `bg-superficie border border-borde rounded-xl px-3.5 py-2.5 text-sm font-medium shadow-xs hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`.
  - Etiquetas con espaciado consistente `space-y-1.5` y tipografía técnica `text-xs font-bold uppercase tracking-wider text-label`.
- **Selectores Premium Reutilizables (`.nx-select-premium` y `Select`)**:
  - Todos los desplegables del sistema consumen la clase `.nx-select-premium` y el componente unificado `<Select>` (`components/form.tsx`), garantizando una experiencia visual homogénea y de alta fidelidad:
    1. *Geometría y Ergonomía*: Altura estándar de 48px (`var(--control-alto, 48px)` / `h-12`), radio de curvatura de 12px (`var(--radius-base)`), y padding táctil generoso `px-4 pr-10 py-2.5`.
    2. *Superficie y Relieve*: Fondo de tarjeta `rgb(var(--color-superficie))`, texto legible `var(--color-body-text)`, borde perimetral `1px solid rgb(var(--color-panel-border) / 0.85)` y micro-sombra física `var(--sombra-xs)`.
    3. *Chevron Vectorial Reactivo*: Flecha chevron SVG estilizada con trazo suave (`%2364748b` claro / `%2394a3b8` oscuro) que cambia automáticamente al azul cobalto de marca (`%232563eb` / `%2360a5fa`) al posar el cursor o interactuar con el control.
    4. *Estados Interactivos Completos*: Hover con micro-elevación (`var(--sombra-1)`) y borde iluminado (`rgb(var(--color-primary) / 0.65)`); foco con anillo tokenizado `0 0 0 3px rgb(var(--color-primary) / 0.2)`; estado deshabilitado con opacidad reducida y fondo tenue; estado inválido (`aria-invalid="true"`) con borde y anillo en rojo semántico de error.
    5. *Opciones Estandarizadas (`Option` y `.nexus-option`)*: Elementos internos mediante el componente unificado `<Option>` (`components/form.tsx`) con clase `.nexus-option` y tokens `bg-input-bg text-input-text font-semibold`, padding ergonómico (`0.625rem 1rem`), opción seleccionada (`:checked`) con relleno primario cobalto y texto blanco sobre acción, y hover suave `rgb(var(--color-primary) / 0.15)`. Queda eliminado el uso de `<option>` desnudo sin clase en todo el sistema.
- **Tarjetas de Métricas (`StatTile`)**:
  - Contenedor con micro-sombra y feedback interactivo `shadow-xs hover:border-primary/40 transition-colors`.
  - Icono en caja de tono `size-11 rounded-xl border border-white/20 shadow-xs`.
  - Cifra destacada `text-3xl font-black tabular-nums tracking-tight text-bi-main`.
- **Atajos de Teclado Estilizados (KBD)**:
  - Teclas 3D físicas: `inline-flex items-center justify-center rounded-lg border border-borde border-b-2 bg-superficie-hundida px-2 py-0.5 font-mono text-xs font-bold text-body-text shadow-xs`.
- **Pestañas y Contenido de Pestañas (`Tabs` y `TabPanel`)**:
  - *Tab Buttons*: Contenedor segmentado encapsulado (`inline-flex rounded-2xl border border-panel-border bg-superficie-hundida/70 p-1.5 shadow-inner`). Pestaña activa elevada con relieve (`bg-superficie font-bold text-primary-text shadow-1 border border-panel-border/80 border-b-2 border-b-primary scale-[1.01]`), e inactivas con hover suave (`hover:bg-superficie/60 hover:text-body-text`). Soporta opcionalmente `icon` y `badge` integrados.
  - *Tab Content (`TabPanel`)*: Zona de contenido con micro-animación de entrada (`.nx-tab-panel`), espaciado simétrico (`mt-6`), foco visible anillado y soporte de variante en tarjeta de superficie (`variant="card"` con borde y `shadow-1`).
- **Encabezados de Sección (`h2`)**: Punto de anclaje visual (`size-2 rounded-pastilla bg-primary`), texto `text-lg font-bold tracking-tight text-body-text`.
- **Elevación de Superficies (`Card`)**: Sombra tokenizada `shadow-1` que aporta dimensión y relieve físico sobre el lienzo.
- **Nomenclatura Canónica**: La pantalla de inicio principal se denomina `Dashboard`.
- **Barra Lateral (`BarraLateral`)**: Fondo Navy profundo (`--color-barra-lateral: var(--p-noche-900)`, `#111621`) que provee contraste arquitectónico total contra la barra superior (`bg-header` / `#FFFFFF`) y el lienzo de contenido (`bg-fondo` / `#F5F6F8`). Cuenta con borde divisorio `--p-noche-500` (contraste 3.81:1, superando WCAG AA 3:1), textos de navegación `--p-noche-200` y título `--p-noche-50` (cumpliendo 4.5:1), botón de usuario con fondo `--color-barra-lateral-elemento` y estado activo de navegación `bg-activo-fondo text-activo-texto`.
- **Scrollbars Modernas y Sutiles (`global.css`)**:
  - Sustitución de barras nativas toscas por scrollbars finas estilizadas (`6px`, radio de borde circular, track transparente y pulgar `rgb(var(--color-panel-border))` con hover `rgb(var(--color-primary)/0.4)`).
- **Buscador Global Estilo Command Bar (`BuscadorGlobal`)**:
  - Contenedor con borde reactivo y micro-sombra `shadow-xs`, atajo de teclado destacado con tecla KBD física 3D (`border-b-2 shadow-xs`) e icono con tono primario.
- **Notificaciones Toast de Nivel de Producción (`Toast` y `Tarjeta`)**:
  - Icono de severidad en pastilla de acento translúcida (`exito`, `error`, `aviso`, `info`), botón de cierre accesible de 48px con icono cerrar, micro-animación CSS `@keyframes toast-entrada` con `cubic-bezier(0.16, 1, 0.3, 1)` y micro-sombra `shadow-xl`.
- **Estación de Filtrado Unificada (`FilterBar variant="card"`)**:
  - Superficie encapsulada `bg-panel-fill border border-panel-border rounded-2xl p-4 shadow-xs` que agrupa búsqueda y selectores, eliminando la dispersión visual.
- **Paginación Encapsulada (`ListPager`)**:
  - Contenedor de superficie `bg-panel-fill border border-panel-border rounded-2xl p-3 shadow-xs`, botones con chevrons semánticos (`chevron-izq` y `chevron-der`) y pastilla de texto con número de página y conteo total sin alterar contratos accesibles.
- **Insignias de Estado con Punto Vivo (`Badge dot={true}`)**:
  - Soporte de indicador visual de estado activo (*status dot* de 6px en `bg-current opacity-80`) para realzar estados de actividad o advertencia.
- **Modales en Flujo Guiado con Pasos (`WizardModal`)**:
  - Componente reutilizable (`components/wizard-modal.tsx`) que fragmenta formularios complejos en pasos secuenciales guiados con Stepper superior animado, navegación simétrica ("Atrás", "Cancelar", "Siguiente / Guardar") y trampa de foco WAI-ARIA.
- **Identidad de Marca y Avatar de Usuario (`BarraLateral` y `MenuUsuario`)**:
  - Pastilla de logotipo superior y avatar de cuenta con gradiente `bg-gradient-to-br from-primary via-brand to-accent text-texto-sobre-accion shadow-xs border border-white/20 rounded-xl`.
- **Diálogos de Confirmación (`AlertDialog`)**:
  - Caja de icono con marco doble elevado: exterior `size-14 rounded-2xl bg-gradient-to-br from-primary/10 via-brand/10 to-accent/10 border border-primary/20 shadow-xs` e interior `size-11 rounded-xl shadow-xs` con color semántico.
- **Botón de Retorno Canónico (`PageHeader`)**:
  - Enlace con icono semántico `chevron-izq` y micro-sombra `shadow-xs`, eliminando flechas de texto plano para mayor claridad técnica y accesibilidad.
- **Pantallas de Entrada y Error (`LoginForm` y `NotFound`)**:
  - Tarjetas de superficie amplia (`max-w-md`), sombras `shadow-2xl`, pastilla de isotipo con gradiente y cifras destacadas en tipografía gruesa tabular.
- **Sistema de Tooltips Instantáneos Accesibles (`[data-tooltip]` y `BotonIcono`)**:
  - Mecanismo CSS nativo de alta velocidad (150ms con micro-animación) activado en `:hover` y `:focus-visible` mediante `data-tooltip="..."`, eliminando la demora de 2000ms del `title` de los navegadores.
- **Gráficas de Dashboard con Degradado Técnico (`BarChart` / Recharts)**:
  - Barras con relleno degradado `linearGradient` (`url(#colorPlataformas)` con tokens `--color-serie`), radio superior suavizado a 6px y tooltips elevados con sombra `shadow-md` y bordes redondeados.
- **Estandarización de Mensajes Premium (`PremiumEmptyState`)**:
  - Enfoque SaaS de alta fidelidad para tablas o vistas sin datos o tras filtros vacíos:
    1. *Atmósfera cromática*: Fondo con degradado sutil Cobalt & Violet (`border border-primary/20 bg-gradient-to-b from-primary/[0.04] via-panel-fill to-panel-fill rounded-3xl p-10 shadow-1`).
    2. *Halo ambiental*: Resplandor superior sutil (`bg-primary/10 blur-2xl`).
    3. *Eyebrow Badge*: Insignia superior translúcida (`border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-primary-text`).
    4. *Caja de icono con marco doble*: Exterior `size-16 rounded-2xl border-primary/30 bg-gradient-to-br from-primary/15 via-brand/10 to-accent/15 text-primary-text shadow-xs` con icono de trazo nítido de 28px.
    5. *Jerarquía tipográfica y CTA*: Título contundente `text-lg font-black tracking-tight text-body-text`, descripción contextual `text-sm text-label max-w-md mx-auto` y botón de acción opcional (limpiar filtros / actualizar).
- **Simetría Visual con Ghost Rows (`JobsTable` y tablas paginadas)**:
  - Cuando una cuadrícula o tabla contiene menos filas que la altura simétrica de la página (mínimo 5 filas), se proyectan *Ghost Rows* semánticas con `role="presentation"` y `aria-hidden="true"` al 20% de opacidad (`select-none pointer-events-none`) para conservar una altura constante en el viewport y evitar saltos abruptos de diseño (*layout shifts*).
- **Footer Integrado de Tabla con Paginación Directa**:
  - Los botones de página (`ListPager`) y el indicador de conteo se incrustan directamente en la franja del pie de tabla (`border-t border-panel-border/80 bg-superficie-hundida/50 px-6 py-3.5`), cerrando visual y arquitectónicamente la tarjeta sin controles flotantes en el lienzo.
- **Cabeceras de Tabla con Color de Acento Cobalt & Violet**:
  - Los encabezados (`thead` y `ResponsiveList`) abandonan el fondo blanco plano y adoptan una distinción cromática canónica:
    - *Gradiente y Borde*: `border-b-2 border-primary/35 bg-gradient-to-r from-primary/15 via-brand/10 to-accent/10 dark:from-primary/25 dark:via-brand/20 dark:to-accent/15`.
    - *Tipografía de Contraste*: `text-xs font-black uppercase tracking-wider text-primary-text select-none`, con altura fija unificada a `h-12` (48px) según sistema 8pt.
- **Diseño Zebra Striping Estandarizado (`even:bg-fondo/75 odd:bg-panel-fill`)**:
  - Todas las tablas (`DataTable`) y listas adaptables (`ResponsiveList` / `ResponsiveRow`) implementan diseño alternado por defecto basado en tokens de diseño:
    - Filas pares: `bg-fondo/75 dark:bg-fondo/60` (sutil contraste frío perceptible y descansado).
    - Filas impares: `bg-panel-fill` (superficie base del panel).
    - Estados hover/focus: `hover:bg-primary/[0.06]` con micro-borde de anclaje `hover:border-l-primary/60`.
    - Las *Ghost Rows* replican la sincronía zebra en función del índice acumulado para no romper el ritmo visual.
- **Barra de Herramientas de Acciones Contextuales y Selección por Checkbox**:
  - En tablas de gestión densa con múltiples acciones por registro (p. ej. Usuarios con Editar, Accesos, Eliminar, Hacer admin, Áreas admin, Quitar admin):
    - *Eliminación de la Columna Acciones*: Se suprime la columna repetitiva de acciones que sobrecargaba la tabla horizontalmente.
    - *Columna de Selección con Checkbox*: Se añade una columna inicial (`Sel.`) con casilla de verificación accesible (`size-4.5` con foco visible `focus:ring-primary`).
    - *Barra de Herramientas Superior*: Ubicada sobre la tabla en tarjeta elevada (`border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1 p-4 rounded-2xl`). Muestra el usuario activo, su avatar y rol, y habilita de forma centralizada y contextual los botones de acción (`variant="fila"` y `variant="fila-peligro"` con altura estándar de 48px y accesibilidad WCAG AAA).
- **Distribución Armónica Responsiva de 2 Filas (`Dashboard`)**:
  - *Fila 1 (Métricas clave)*: Grid responsivo de 4 cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`) con métricas de Áreas, Plataformas, Visitas y Usuarios.
  - *Fila 2 (Grid simétrico de 2 columnas)*: Layout `grid-cols-1 lg:grid-cols-2 gap-6`:
    - *Columna 1 (Sub-grid de 2 filas)*: Tarjeta 1 con gráfica de barras *"Plataformas por área"* y Tarjeta 2 con listado de plataformas *"Más visitadas"*.
    - *Columna 2*: Tarjeta de *"Actividad reciente"* alineada con la altura de la columna izquierda.
  - *Comportamiento Responsivo*: En móviles y pantallas pequeñas se apila en una sola columna fluida vertical; en pantallas grandes (`lg:`, `xl:`) se divide en 2 columnas lado a lado manteniendo la simetría visual.
- **Geometría Armonizada de Modales y Botones (Tokens de Radio)**:
  - *Modales (`Modal`, `AlertDialog`)*: Panel contenedor con `rounded-xl` (12px / 0.75rem), idéntico al radio de los contenedores y tarjetas del sistema (`Card`, cards de plataforma, tablas), suprimiendo curvaturas sobredimensionadas (`rounded-3xl` / 24px).
  - *Botones de Acción (`.nexus-btn`, `Button`)*: Radio estandarizado en `var(--radius-base, 8px)` (8px) para eliminar el aspecto de cápsula o redondeo excesivo (`1rem` / 16px) y armonizarlo simétricamente con los botones de fila (`.nexus-btn-fila`), controles de formulario e inputs.
  - *Elementos Internos*: Los contenedores internos (stepper nav, cajas de previsualización) adoptan `rounded-xl` o `rounded-lg` para respetar la jerarquía de contención.

- **Configuración de Vista por Pestañas (General y Diseño) con Live Preview**:
  - *Arquitectura Segmentada*: `UserViewSettings` separa la configuración estructural (`General`) del catálogo estético (`Diseño`).
  - *Pestaña General*: Disposición del portal (sidebar vs topbar), toggles de la barra lateral (documentos, badges circulares, colapso de avatar de usuario) y control de bienvenida.
  - *Pestaña Diseño*:
    - *Contenedor Live Preview*: Caja destacada (`border-primary/30 bg-primary/5 rounded-2xl`) con badge animado `● Vista Previa en Vivo` y cuadrícula responsive (`grid-cols-1 xl:grid-cols-2 gap-6`). Renderiza en directo `<PlatformMockupCard>` y `<TarjetaArea>` con datos demostrativos que cambian al instante según los selectores inferiores.
    - *Selectores Desacoplados*: Cuadrícula de 6 estilos + 3 clásicos para Plataformas, y 6 estilos para Áreas, persistidos de forma independiente en `localStorage`.

- **Catálogo Multiestilo de Cards Reutilizables (Plataformas y Áreas)**:
  - Todas las variantes están consolidadas en `PlatformMockupCard` y `TarjetaArea` para reutilizarse en cualquier sección del portal:
    1. *Cards de Plataforma*:
       - `estandar`: SaaS corporativo con chip monograma, 2 recuadros centrales (Área + Rol/Nivel) y botón de acción directa.
       - `compacta`: Densidad alta para cuadrículas de alta productividad.
       - `horizontal`: Fila ergonómica para vistas de listado.
       - `enmarcada` (P1): Portada interior con margen perimetral, contenido centrado y botón píldora "Abrir Plataforma ↗".
       - `duotono` (P2): Portada a sangre con degradado duotono nocturno, monograma elevado y botón de ancho completo.
       - `evento` (P3): Cabecera con insignias flotantes de versión y favoritos, lista de atributos con iconos y botonera dual.
    2. *Cards de Área*:
       - `estandar`: Métricas DIS-102 con cifras de personas y herramientas más cluster de logotipos.
       - `split` (A1 - Harvest): Distribución horizontal 50/50 con bloque visual a la izquierda y editorial con métrica destacada a la derecha.
       - `onda` (A2): Cabecera de onda curva SVG en degradado con icono central e información simétrica.
       - `directorio` (A3): Hero cover con avatares de integrantes, tags de plataformas y acceso al catálogo.

- **Sistema de Carga de Alta Gama (PantallaCarga y Spinner Enriquecido)**:
  - *PantallaCarga (Full Page Loading Screen)*: Componente insignia para cargas iniciales de sesión (`app-shell`, `platforms-shell`, `require-role`, `requests`, `login-form`).
    - *Atmósfera visual*: Fondo difuso ambiental con orbe de luz en degradado sutil (`from-primary/30 via-brand/20 to-accent/30 blur-3xl`).
    - *Tarjeta flotante glassmórfica*: Panel central `rounded-3xl border border-panel-border/70 bg-panel-fill/80 backdrop-blur-xl p-8 shadow-2xl`.
    - *Emblema corporativo*: Escudo vectorial con halo pulsante dinámico y degradado institucional de marca.
    - *Barra de progreso de haz luminoso (Beam)*: Pista contenida con animación suave `@keyframes nx-beam-move` que fluye continuamente respetando `prefers-reduced-motion`.
    - *Micro-indicador de pulso*: Indicador circular concéntrico con animación ping y subtexto contextual descriptivo.
  - *Spinner de Sección Enriquecido*:
    - Variante `md`: Anillo orbital dual concéntrico con punto de pulso interno y tipografía jerarquizada (`label` en negrita + `subtexto` atenuado).
    - Variante `sm`: Anillo dual sutil de 16px para botones y controles interactivos sin saltos visuales.

- **Variantes de Tarjetas con Imagen de Fondo («Portada Fotográfica / Cine») (`platform-mockup-card.tsx`, `tarjeta-area.tsx`, `card-backgrounds.ts`)**:
  - *Arquitectura sin inline styles*: Imagen implementada mediante `<img className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none" />` con superposición de gradiente oscuro (`bg-gradient-to-t from-black/95 via-black/75 to-black/35`).
  - *Legibilidad y contraste*: Tipografía en blanco puro (`text-white font-bold drop-shadow-sm`) y textos secundarios en `text-slate-300`, garantizando contraste WCAG AA/AAA.
  - *Tarjeta de plataforma (`portada`)*: Monograma y tag de área translúcidos, botón de favoritos estelar dorado (`variante="portada"`), descripción compacta y botón de acción de ancho completo (`w-full min-h-12`).
  - *Tarjeta de área (`portada`)*: Icono en vidrio esmerilado, badge de estado interactivo, métricas de Personas y Plataformas en píldoras con `backdrop-blur-md` y botón «Ver plataformas →».

- **Botones e Iconografía de Favoritos Sincronizados (`favorite-button.tsx`, `icono.tsx`)**:
  - *Sincronización unívoca con el sidebar*: Todas las variantes de tarjeta utilizan estrictamente el componente canónico `<Icono nombre="favorito" tamano="2xl" relleno={favorite} />`.
  - *Estado activo*: `text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]` con relleno pleno `fill="currentColor"`.
  - *Estado inactivo*: `text-zinc-400/80` con trazo definido `fill="none"`.
  - *Área táctil*: 48px (`min-h-12 min-w-12 size-12`) con foco accesible `focus-visible:ring-2 focus-visible:ring-primary`.
  - *Variaciones de contenedor*:
    - `portada`: Contenedor translúcido cine/ticket (`bg-black/50 border border-white/20`).
    - `banner`: Contenedor panorámico con hero banner fotográfico superior (`bg-black/50 border border-white/20`).
    - `flotante`: Contenedor inmersivo con panel flotante de cristal esmerilado (`backdrop-blur-xl bg-black/60 border border-white/30`).
    - `duotono`: Contenedor cyber oscuro (`bg-black/60 border border-purple-500/40`).
    - `split`: Contenedor índigo translúcido (`bg-indigo-950/80 border border-indigo-400/40`).
    - `enmarcada`: Contenedor squircle con marco sutil (`border border-panel-border/80`).
    - `evento`: Insignia circular tech (`rounded-full border-2 border-amber-400/60`).
    - `glass`: Cristal ultra-glassmórfico (`backdrop-blur-xl border border-white/40`).
    - `editorial`: Acabado geométrico minimalista (`border-2 border-panel-border bg-superficie`).
    - `horizontal`: Píldora de ancho dinámico con etiqueta textual integrada (`Favorita` / `Guardar`).
    - `estandar` / `compacta`: Acabado pulido flotante con bordes redondeados (`rounded-2xl border`).

- **Pastillas de Pestañas (Tab Buttons) en Ajustes de Vista (`user-view-settings.tsx`)**:
  - *Arquitectura visual y tamaño estandarizado*: Botones píldora con tamaño rigurosamente estandarizado e idéntico (`inline-flex h-12 min-h-12 w-36 sm:w-40 shrink-0 items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border shadow-xs`), garantizando que «General», «Áreas» y «Plataformas» tengan exactamente el mismo ancho y alto (48px de alto x 144px/160px de ancho) sin depender de la longitud de su texto ni presentar asimetrías.
  - *Tres pestañas independientes con distribución 100% responsiva*:
    - `General`: Contenedor a altura completa (`flex-1 min-h-0 h-full w-full flex flex-col gap-4`). Cada panel cuenta con una cabecera diferenciada con fondo semántico (`bg-surface-container`), borde inferior separador (`border-b border-panel-border`) y esquinas redondeadas contenidas (`overflow-hidden rounded-2xl`). La fila 1 (`shrink-0`) aloja «Disposición Principal» y «Mensaje de Bienvenida» en una cuadrícula bicolumna (`grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch`) con cabeceras rigurosamente niveladas (`min-h-[64px] shrink-0`) y subcontenedores interactivos con altura idéntica simétrica al pixel (`flex-1 h-full min-h-[96px]`), garantizando que los dos botones de layout («Sidebar» y «Topbar») tengan la misma altura exacta que la caja del conmutador de «Mensaje de Bienvenida». La fila 2 («Elementos de la Barra Lateral») aprovecha el resto del alto disponible (`flex-1 min-h-0 flex flex-col justify-between`), integrando su propia cabecera contrastada y distribuyendo sus 3 opciones apiladas uniformemente (`flex-1 flex flex-col justify-between gap-3`), eliminando cualquier hueco inferior en blanco y diferenciando con claridad el header del body.
    - `Áreas`: Cuadrícula a altura completa (`flex-1 min-h-0 h-full w-full grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 items-stretch`). La columna izquierda (`md:col-span-7 h-full flex flex-col justify-between`) distribuye 10 estilos de área en cuadrícula equitativa de 2 columnas x 5 filas (`grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-fr my-auto`), incorporando «Glassmorphism Neón» y «Flotante Inmersiva». Todos los botones tienen altura unificada y compacta `h-full min-h-[96px]` sin prefijos numéricos ordinales toscos (`1.`, `2.`), sustituidos por el icono canónico de diseño (`Icono nombre="diseno" tamano="xs"` en `text-primary-text`), prescindiendo de párrafos técnicos extensos y manteniendo cajas de vista previa miniatura uniformes de 40px (`h-10 w-full rounded-lg ... mt-auto shrink-0 shadow-2xs`). La columna derecha (`md:col-span-5 h-full flex flex-col justify-between`) expande el marco de previsualización en vivo al 100% de la altura vertical con centrado óptico (`min-h-[300px] h-full`).
    - `Plataformas`: Cuadrícula a altura completa (`flex-1 min-h-0 h-full w-full grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 items-stretch`). La columna izquierda (`md:col-span-7 h-full flex flex-col justify-between min-h-0`) distribuye los 10 estilos de plataforma directamente en una cuadrícula simétrica de 2 columnas x 5 filas (`grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-fr my-auto`) con supresión total de paginación. Todos los botones tienen altura unificada `h-full min-h-[96px]`, prescindiendo de numeraciones ordinales mediante el icono genérico de diseño (`Icono nombre="diseno" tamano="xs"`) y manteniendo cajas de vista previa miniatura uniformes de 40px (`h-10 w-full rounded-lg ... mt-auto shrink-0 shadow-2xs`), logrando simetría geométrica perfecta 1:1 con la pestaña de Áreas. La columna derecha (`md:col-span-5 h-full flex flex-col justify-between min-h-0`) expande el marco de la maqueta interactiva al 100% del alto disponible (`min-h-[300px] h-full`).
  - *Pestaña activa*: `border-primary bg-primary text-texto-sobre-accion shadow-1 ring-2 ring-primary/20`.
  - *Pestaña inactiva*: `border-panel-border bg-fondo text-body-text hover:border-primary/50 hover:bg-superficie`.
  - *Sin botón redundante de retorno*: No se muestra botón «Volver a Plataformas» en la cabecera interna; la navegación se orquesta desde la barra de herramientas.
  - *Distribución al 100% y sin vacíos muertos*: En `General`, `Áreas` y `Plataformas`, el contenido se propaga vertical y horizontalmente al 100% (`flex-1 h-full min-h-0`), adaptándose de manera fluida y responsiva a la resolución del monitor sin generar vacíos inferiores ni desbordamientos.

- **Barra de Ubicación / Location Bar (`platforms-topbar.tsx`, `platforms-sidebar-view.tsx`, `ruta-navegacion.tsx`)**:
  - *Ubicación*: Contigua a los controles principales en la cabecera superior, visible y accesible en desktop y mobile con separador visual `<Icono nombre="chevron-der" tamano="xs" />` (`>`).
  - *Location Bar en Administración de Plataformas (`/admin/platforms`)*: La primera entrada son las áreas, por lo que la ruta indica de forma explícita `Gestión > Plataformas > Áreas`. Al ingresar a un área específica, la ruta se extiende a `Gestión > Plataformas > Áreas > [Nombre Área]`. Al hacer clic en «Áreas» o «Plataformas», se regresa limpiamente a la cuadrícula de áreas.
  - *Supresión permanente de "General >" en Portal*: Ninguna ruta en el portal de plataformas antepone "General". Se eliminan los 3 niveles innecesarios, limitando las rutas secundarias a estrictamente 2 niveles donde la raíz siempre es `Catálogo`.
  - *Estructura jerárquica unificada de 2 niveles*:
    - Catálogo raíz: `Catálogo` (nivel 1).
    - Vista de Áreas: `Catálogo > Áreas` (nivel 2).
    - Área seleccionada: `Catálogo > [Nombre del Área]` (nivel 2).
    - Favoritos: `Catálogo > Favoritos` (nivel 2).
    - Ajustes de vista: `Catálogo > Ajustes de Vista` (nivel 2).
    - Subsecciones de usuario: `Catálogo > [Mis Solicitudes | Mi Widget | Carta Responsiva]` (nivel 2).
  - *Interactividad y Retorno Instantáneo*: El segmento inicial `Catálogo` funciona como enlace interactivo o botón conmutador accesible (`focus-visible:ring-2 focus-visible:ring-primary`), permitiendo al usuario volver de forma inmediata a la vista raíz sin recargar la página.
  - *Diseño Limpio de URLs (Clean URLs)*: La navegación entre secciones y las pulsaciones sobre cualquier enlace del Location Bar garantizan URLs limpias sin parámetros de consulta sucios (`?seccion=widget`, `?seccion=responsiva`). Si existiese algún parámetro residual en la barra de direcciones, se purga de inmediato mediante `window.history.replaceState` preservando la ruta canónica `/platforms`.

- **Botón y Drawer Lateral de Diseño de Tarjetas de Área (`area-card-design-drawer.tsx`, `platform-admin.tsx`)**:
  - *Ubicación y simetría del botón*: Situado en la barra de herramientas de `/admin/platforms` inmediatamente a la izquierda del filtro de estado («Estado: Todos»). Comparte simetría dimensional idéntica con los otros dos controles («Estado» y «Cuadrícula»): ancho unificado `w-48 min-w-48` (192 px), altura de 48 px (`h-12 min-h-12`), padding `px-3.5`, icono `diseno`, etiqueta `Diseño` e indicador chevron derecho (`chevron-der`).
  - *Popup Lateral (Drawer)*: Despliegue accesible desde el lateral derecho (`Drawer`, position `right`, hasta 640 px de ancho), atrapando foco con `useFocusTrap` y restaurándolo al botón al cerrar (`devolverA`).
  - *Cabecera contrastada y botón X*: Franja de cabecera delimitada con token `bg-surface-container`, borde inferior `border-b border-panel-border`, título con icono temático `diseno` y botón de cierre compacto con icono vectorial `X` (`size-10` con `aria-label="Cerrar"`).
  - *Vista Previa en Vivo Estandarizada a 240 px con alturaEstandar*: Integra en la parte superior el componente canónico `TarjetaArea` configurado con `alturaEstandar={true}` (`h-60 min-h-60 max-h-60`, 240 px) para todas las 10 variantes departamentales, adaptando armónicamente paddings (`p-2.5`/`p-3`), alturas de imagen y banner (`h-20`), tipografías (`text-sm`) y cifras métricas compactas (`p-2 text-base` con iconos `xs`), con contenedor contenido y protegido con `overflow-hidden` para prevenir desbordamientos sobre las opciones inferiores.
  - *Interacción Silenciosa Sin Toasts*: Cualquier cambio de variante, conmutación del interruptor de forzar diseño institucional o restablecimiento de valores se aplica de manera reactiva e inmediata en `platform-admin.tsx` sin disparar notificaciones emergentes Toast que cubran los botones inferiores («Cerrar» y «Reestablecer»).
  - *Interruptor «Forzar diseño en todo el portal»*: Conmutador accesible compacto de una sola fila (`role="switch"`, `id="toggle-forzar-diseno-area"`) sin texto de descripción secundaria, con badge permanente simétrico («ACTIVO» / «INACTIVO») para eliminar layout shift y persistencia en `nexus.platforms.force_area_card_design`. Al activarse, fija el estilo institucional y bloquea la personalización de tarjetas en la vista de usuario.
  - *Paginación 2x2 con CapsulePager*: Cuadrícula de 4 variantes por página en 3 páginas (`ITEMS_POR_PAGINA = 4`), navegable mediante el componente canónico `CapsulePager` (`< 1/3 >`). En la página 3 se generan 2 tarjetas fantasma punteadas (`data-testid="area-design-ghost-card"`, leyenda «Espacio disponible») para preservar la simetría estricta de la cuadrícula 2x2.
  - *Interacción silenciosa sin toast*: Cualquier cambio de variante, conmutación del forzado o restablecimiento se aplica de forma reactiva y silenciosa sin emitir notificaciones emergentes Toast que obstruyan los botones del pie.
  - *Pie bipolar simétrico (Footer)*: Contenedor inferior fijado (`bg-surface-container border-t border-panel-border px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between gap-3`) con simetría vertical estricta y dos botones de 48 px (`h-12 min-h-12`) de idéntico ancho simétrico (`w-[calc(50%-0.5rem)] sm:w-48 sm:min-w-48` = 192 px unificado en escritorio, 50% simétrico en móvil, texto centrado con `!px-3`):
    - «Cerrar» (a la izquierda): Cierra el modal lateral conservando las configuraciones actuales.
    - «Reestablecer» (a la derecha): Restaura el diseño por omisión (`estandar` - Métricas Ejecutivas, situándose en la página 2) y desactiva el forzado de diseño.
  - *Estado de Vacío Premium en Ajustes de Vista al Bloquearse Tarjetas (`user-view-settings.tsx`)*: Cuando el diseño de tarjetas de área o plataforma está forzado institucionalmente por un administrador (`forzarDisenoArea` o `forzarDisenoPlataforma`), la pestaña respectiva («Áreas» o «Plataformas») sustituye completamente el diseño de 2 columnas y los selectores deshabilitados por un mensaje de vacío premium canónico (`PremiumEmptyState`). Ocupa el 100% del espacio del tab-content (`w-full h-full flex-1 min-h-[460px] rounded-2xl`), incorporando `badge="Bloqueado por Admin"`, `role="alert"`, icono representativo (`areas` o `plataformas`), título contundente («Diseño de Tarjetas de Área Bloqueado» o «Diseño de Tarjetas de Plataforma Bloqueado») y descripción transparente sobre la política institucional. Al liberarse el bloqueo, la vista restaura instantáneamente el selector de variantes y la maqueta en vivo.

- **Buscador Central Condicional en Barra Superior (`platforms-topbar.tsx`)**:
  - *Visibilidad*: El buscador central de herramientas (`<input type="search" placeholder="Buscar plataforma..." />` con badge `⌘K`) se muestra exclusivamente en el catálogo de plataformas (`seccionActiva === 'catalogo'` o por defecto).
  - *Ocultamiento*: Se oculta de manera automática en secciones ajenas donde no existe listado de plataformas que filtrar (`personalizacion` / Ajustes de Vista, `responsiva`, `widget`, y `/requests`).
  - *Balance visual*: Al ocultarse, se reemplaza por `<div className="flex-1" />` para conservar el equilibrio espacial flex y mantener las acciones y perfiles anclados a la derecha.
  - *Atajo ⌘K*: El atajo de teclado solo se enlaza y ejecuta cuando el buscador está montado y visible.

- **Acción Única y Métricas en Tarjetas de Plataforma (`platform-mockup-card.tsx`)**:
  - *Acción singular*: Un único botón o enlace de ancho completo (`w-full min-h-12`) o conector final según el estado de acceso («Abrir», «Solicitar acceso» o «En revisión»).
  - *Sin botón secundario*: Se excluye cualquier botón accesorio redundante como «Detalles».
  - *Limpieza de roles*: No se exhiben etiquetas fijas de «Administrador» o niveles dentro del cuerpo o banner de las tarjetas; la métrica secundaria en tarjeta estándar muestra «DISPONIBILIDAD: Habilitado / Disponible» en lugar de roles confusos.

- **Modal de Solicitud de Acceso con Seguridad y Responsabilidad (`request-form-modal.tsx`)**:
  - *Ficha descriptiva*: Cabecera con avatar inicial de la plataforma, nombre, badge de área, descripción detallada y aviso informativo institucional.
  - *Casilla de responsabilidad (Checkbox)*: Checkbox accesible obligatorio que valida el compromiso de uso adecuado de activos de información antes de habilitar el envío.
  - *Verificación CAPTCHA por plataforma*: Código alfanumérico monoespaciado aleatorio de 5 caracteres con botón de recarga interactiva y campo de texto con validación en tiempo real.
  - *Botón de envío protegido*: Permanece deshabilitado hasta la verificación exitosa de la casilla y el código CAPTCHA exacto.

- **Depuración Visual del Toolbar y Jerarquía Directa de Ruta (`platform-admin.tsx`, `ruta-navegacion.tsx`)**:
  - *Toolbar sin badge redundante*: En la vista de administración de plataformas (`/admin/platforms`), se suprime el badge duplicado del área a la derecha del buscador. El buscador mantiene su amplitud limpia y el contexto del área se expresa de forma natural en el placeholder y en la barra de localización superior.
  - *Location Bar directo sin nivel intermedio*: Al explorar un área específica en `/admin/platforms`, la miga de pan muestra directamente `Gestión › Plataformas › [Nombre del Área]`, omitiendo el segmento redundante `Áreas`. El enlace `Plataformas` permite limpiar el área activa y regresar a la vista general de áreas (`Gestión › Plataformas › Áreas`).

- **Botón y Drawer Lateral de Diseño de Plataformas con Vista Previa en Vivo (`platform-card-design-drawer.tsx`, `platform-admin.tsx`)**:
  - *Ubicación del botón*: En la barra de herramientas de la vista de plataformas de un área activa (`/admin/platforms`), se ubica inmediatamente a la izquierda del botón «Accesos» con `variant="fila"`, icono `diseno`, altura táctil de 48 px (`min-h-12`) y estilos unificados `nx-btn-toolbar`.
  - *Popup Lateral con Vista Previa en Vivo*: Al no haber tarjetas de plataforma visibles en la pantalla principal de administración (ya que se despliega una tabla de datos `DataTable`), el drawer lateral integra en su parte superior una maqueta de previsualización en vivo (`PlatformMockupCard` interactiva con botón de favoritos y estado de acceso) que reacciona instantáneamente a la variante seleccionada.
  - *Distribución proporcional flex/porcentaje*: El contenedor principal emplea `h-full min-h-full flex flex-col justify-between`, llenando de forma balanceada el 100% de la altura del cajón sin huecos blancos desproporcionados antes del pie.
  - *Vista previa directa sin contenedor interior duplicado*: La maqueta se monta directamente bajo el encabezado («Tarjeta de Plataforma» a la izquierda y «Vista Previa en Vivo» a la derecha) sin recuadros interiores grises intermedios ni bordes dobles, recuperando espacio horizontal y vertical.
  - *Altura estándar unificada de 240px (Patrón Editorial Suizo)*: Para eliminar los saltos verticales y la asimetría al alternar entre diseños de diversa altura nativa (compacta de 176px, estándar de 224px, editorial de 240px, flotante de 288px, horizontal de 80px), todas las variantes adoptan una altura estándar uniforme de 240 px (`min-h-60 max-h-60 h-60`) mediante `alturaEstandar={true}`. La variante horizontal se centra verticalmente (`my-auto`) dentro del marco, garantizando estabilidad total con cero layout shift.
  - *Interacción silenciosa sin toast obstructivos*: Se suprimen todas las notificaciones emergentes (`avisar`) al conmutar diseño, forzar estilo o reestablecer, evitando que los globos flotantes en la esquina inferior derecha cubran y bloqueen los botones de acción («Cerrar» y «Reestablecer»).
  - *Interruptor compacto de una sola fila*: Switch de forzar diseño institucional en fila simple sin texto de descripción secundaria, maximizando el espacio útil y con badge permanente simétrico («ACTIVO» / «INACTIVO») para eliminar layout shift.
  - *Paginación 2x2 con CapsulePager reutilizable*: Distribución en 3 páginas de 4 elementos por página con cuadrícula `flex-1 min-h-[220px] grid-rows-2` y paginador unificado en cápsula `CapsulePager` (`border border-panel-border/80 bg-superficie/90 p-0.5 shadow-xs` con chevrons interactivos y formato numérico central `< 1/3 >`, áreas táctiles de 48px `min-h-12 min-w-12`), eliminando el scroll vertical en la ventana y compartiendo el mismo componente canónico que `DataTable`, `PlatformAdmin` y `ActividadReciente`.
  - *Tarjetas fantasma (Ghost Cards) de simetría*: En la página 3 (que alberga las variantes 9 y 10), se renderizan automáticamente 2 tarjetas fantasma punteadas (`data-testid="platform-design-ghost-card"`, `min-h-[96px]`, icono `panel` y leyenda «Espacio disponible») para preservar la simetría estricta de la cuadrícula 2x2.
  - *Pie simétrico*: Barra inferior con relleno simétrico idéntico a la cabecera (`px-5 py-4 sm:px-6 sm:py-4.5`), botón «Cerrar» a la izquierda y «Reestablecer» a la derecha con anchos de 192 px en escritorio (`sm:w-48 sm:min-w-48`) y 50% en móvil.

- **Navegación Determinista y Estable en Barra Superior (`PlatformsTopbar`)**:
  - *Comportamiento no conmutable*: Los botones de navegación de la barra superior (`Plataformas`, `Mis Solicitudes`, `Mi Widget` y `Carta Responsiva`) seleccionan y activan la sección correspondiente. Si el usuario vuelve a presionar el botón de la sección activa, la interfaz permanece fija en dicha vista y jamás salta o conmuta de regreso al catálogo. El retorno al catálogo se gestiona mediante el botón principal «Plataformas», la miga de pan «Catálogo» o los botones contextuales de retorno.
  - *Respeto estricto a las preferencias de visualización (`mostrarDocumentos`)*: Cuando el usuario oculta la sección de documentos desde Ajustes de Vista, tanto el botón de Carta Responsiva en la barra superior como el modal emergente bloqueante (`ModalResponsiva`) se ocultan inmediatamente en todo el portal (incluyendo `/requests`), garantizando que la elección del usuario prevalezca consistentemente.

- **Página Institucional de Portada y Presentación (`pagina-portada.tsx`)**:
  - *Identidad y Estilo*: Inspirada en la estética SaaS Tech (Linear, Stripe) con paleta Electric Cobalt & Violet, micro-relieves, degradados sutiles y soporte total de modo claro y oscuro con alternancia en cabecera.
  - *Identidad y Estilo Oficial de Aduana*: Incorpora el logotipo oficial «Aduana - Control de Acceso» con su isotipo característico (letra «A» con cerradura central de seguridad, viga estructural cian y circuitos tecnológicos naranja). Los activos maestros transparentes residen en `/brand/` (`isotype-aduana.png`, `logo-aduana.png`, `icon.png`, `favicon.ico`).
  - *Botones de Inicio de Sesión e Iconos de Apoyo Unificados*: Todos los botones de acceso («Iniciar Sesión» en cabecera, «Iniciar Sesión» en el Hero y «Iniciar Sesión en Aduana» en el banner inferior) implementan un diseño único, canónico y estrictamente unificado: gradiente corporativo `bg-gradient-to-r from-primary via-brand to-accent`, borde superior translúcido `border border-white/20`, sombra con resplandor cromático `shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/40` e icono de marca unificado (`<Icono nombre="marca" />`).
  - *Simetría Estricta y Proporciones Equilibradas en el Hero*:
    - *Botones CTA Gemelos con Iconos de Apoyo*: Tanto el botón primario «Iniciar Sesión» (`<Icono nombre="marca" tamano="sm" />`) como el botón secundario «Explorar Producto» (`<Icono nombre="catalogo" tamano="sm" />`) comparten dimensiones gemelas estrictas de 224px x 48px (`h-12 w-full sm:w-56`), con distribución flex balanceada `inline-flex items-center justify-center gap-2.5` y texto en una sola línea `whitespace-nowrap`.
    - *Cabecera*: La barra de enlaces de navegación central utiliza centrado simétrico absoluto (`absolute left-1/2 -translate-x-1/2`), equidistante entre la marca y el botón de inicio de sesión.
    - *Hero Grid 50/50*: Cuadrícula balanceada `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)` contenida estrictamente en `max-w-7xl px-4 sm:px-6 lg:px-8`, con ancho elástico `w-full max-w-full` en `.nx-hero-product` para evitar desbordamientos horizontales o pérdida de margen derecho.
    - *Tríada de Ventana*: La cabecera de la maqueta renderiza íntegramente los 3 controles de ventana macOS (rojo `bg-error/80`, amarillo `bg-warning/80`, verde `bg-success/80`).
    - *Botones CTA en Fila Simétrica*: Texto sin división `whitespace-nowrap` con alturas uniformes de 48px (`min-h-12`).
    - *Fila de Indicadores (Métricas 4x1)*: Tarjetas de estadísticas de altura idéntica y alineación simétrica con el ancho superior.
  - *Estructura Modular*:
    1. Barra superior fija (`sticky top-0`) con logotipo con halo, enlaces ancla a secciones y botón de acceso a `/login`.
    2. Sección Hero con titular rotundo, métricas clave (100% auditabilidad, 0 shadow IT, -85% tiempos), y CTA bipolar.
    3. Contraste de propuesta de valor: El Caos Previo (sin Aduana) vs La Solución Aduana (gobernanza ágil y centralizada).
    4. Ciclo operativo en 4 fases explicadas: Descubrimiento, Solicitud con CAPTCHA, Aprobación TI con Carta Responsiva y Aprovisionamiento con SSO.
    5. Galería interactiva con capturas reales de alta definición (Catálogo, Cajón de Área, Previsualización Suiza y Ajustes de Vista).
    6. Sección de Seguridad y Arquitectura: Authelia SSO, OIDC, RBAC, Cartas Responsivas y Logs Inmutables.
    7. Documentación y Preguntas Frecuentes (FAQ) en acordeón accesible.
    8. Banner inferior de cierre con acceso directo a `/login` y footer corporativo.
  - *Control de Despliegue por Entorno (`PORTADA_ACTIVA`)*:
    - Controlado centralmente por `PORTADA_ACTIVA` en `.env` (leído vía `esPortadaActiva()`).
    - *Modo Presentación (`PORTADA_ACTIVA=true`)*: Visitantes no autenticados en `/` aterrizan en la portada corporativa; las rutas `/portada` y `/presentacion` están habilitadas; la tarjeta de login despliega el enlace directo «Conoce Aduana: Guía y Presentación de la Plataforma».
    - *Modo Productivo Directo (`PORTADA_ACTIVA=false`)*: Ingreso sin fricción directo a `/login`; intentos de acceso a `/portada` o `/presentacion` son redirigidos de inmediato a `/login`; el enlace de presentación en `/login` se oculta por completo.
    - *Asistente en Instalador (`deploy/install.sh`)*: Pregunta interactiva durante el aprovisionamiento para elegir entre modo presentación o modo productivo directo, soportando banderas automáticas `--portada [si|no]`, `--con-portada` y `--sin-portada`.

- **Identidad Corporativa Oficial ADUANA (Manual de Marca - DIS-120)**:
  - *Enfoque Dark-First*: Tema principal en Navy Profundo (`#1B2A38` fondo, `#233546` superficies/tarjetas, `#334A60` bordes y `#FFFFFF` texto). Acompañado de Tema Light de alto contraste (`#F8FAFC` fondo, `#FFFFFF` tarjetas y `#1B2A38` texto).
  - *Acentos de Marca*:
    - Primario: Cian Tecnológico `#1CB5E0` (Hover: `#1597BC`, `aduana-cyan`).
    - Secundario: Naranja Control `#F26419` (Hover: `#D9530F`, `aduana-orange`).
  - *Estados IAM*: Aprobado (`#10B981`), Pendiente (`#F59E0B`), Rechazado (`#EF4444`), Auditoría (`#38BDF8`).
  - *Tipografía Tripartita*:
    - Display / Titulares: `Montserrat` (`font-display`, pesos 600 y 700).
    - UI / Cuerpo: `Inter` (`font-sans`, pesos 400 y 500).
    - Monospace / Técnico: `JetBrains Mono` (`font-mono`).
  - *Contenedor de Isotipo*: Fondo Navy Profundo `#1B2A38` con borde `#334A60` en barra lateral, formulario de login y cabecera de portada.
  - *Microcopy Canónico*: «Inicia sesión con tu cuenta corporativa para acceder a tus plataformas.» en acceso y «Solicitar acceso» en peticiones.
  - *Branding en Barra y Lanzador (DIS-121 & DIS-122)*:
    - Marco Admin (`BarraLateral`): Título «Aduana» con subtítulo «Portal Vivaro».
    - Portal de Usuario (`PlatformsTopbar` y `PlatformsSidebarView`): Isotipo oficial sobre contenedor Navy Profundo (`#1B2A38`), título «Aduana» y subtítulo de producto «Vivaro Launchpad». Se retira el icono genérico de escudo (`escudo-ok`).
  - *Diseño Premium de Acceso y Cierre de Sesión (DIS-123)*:
    - `LoginForm` y `FormularioLoginLocal`: Atmósfera corporativa con ambient glow `aduana-cyan` y `aduana-orange`, tarjeta `rounded-3xl` con bisel superior en degradado de acento corporativo, isotipo oficial en contenedor Navy Profundo `#1B2A38` con anillo cian, titular `Montserrat` («Aduana») con insignia «Control de Acceso • Portal Vivaro», inputs con focus ring cian y botón de acción principal en degradado Cian Tecnológico (`from-aduana-cyan to-aduana-cyan-hover`).
    - `LogoutView`: Tarjeta estilizada con bisel de acento, confirmación de desconexión con isotipo oficial, insignia cian de seguridad y botón primario destacado para «Volver a iniciar sesión».
    - `AccesoEmergenciaForm`: Coherencia visual con acento Naranja Control para superadmin local en contingencias.

## 🚫 Prohibiciones Absolutas

- No usar `style=""` inline.
- No usar etiquetas `<style>` dentro de componentes.
- No usar scripts inline `<script>`.
- No alterar reglas o flujos de negocio sin plan de implementación formal previo.
