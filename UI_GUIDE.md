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
|---|---|---|
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

## 🚫 Prohibiciones Absolutas
- No usar `style=""` inline.
- No usar etiquetas `<style>` dentro de componentes.
- No usar scripts inline `<script>`.
- No alterar reglas o flujos de negocio sin plan de implementación formal previo.
