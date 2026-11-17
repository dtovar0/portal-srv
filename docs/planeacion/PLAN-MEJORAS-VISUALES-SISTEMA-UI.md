# 🎨 PLAN DE MEJORAS VISUALES Y BUENAS PRÁCTICAS UI/UX

Este plan consolida la arquitectura de diseño del portal bajo el estándar **Opción 1: Electric Cobalt & Violet (Tech / Modern SaaS — Vibe Linear & Stripe)**, asegurando que la interfaz sobresalga por su refinamiento visual, micro-interacciones pulidas y estricto cumplimiento de accesibilidad WCAG AA.

---

## 🗺️ Fases de Implementación

### 🔹 Fase 1: Scrollbars Modernas y Buscador SaaS (Command Bar)
- **Objetivo**: Eliminar la tosquedad de las barras de scroll nativas del sistema operativo y elevar el buscador global.
- **Acciones**:
  1. Agregar en `global.css` reglas de scrollbar sutil (`scrollbar-thin`, ancho 6px-8px, track transparente, pulgar tokenizado y hover interactivo) sin romper accesibilidad.
  2. Mejorar `BuscadorGlobal`: contenedor con micro-sombra `shadow-xs`, borde reactivo y tecla atajo estilizada con KBD 3D (`border-b-2 shadow-xs`).

### 🔹 Fase 2: Toasts Modernos con Iconografía y Micro-animación
- **Objetivo**: Proveer feedback visual de nivel de producción ante acciones de usuario.
- **Acciones**:
  1. En `toast.tsx`: pastilla con icono semántico (`exito`, `error`, `aviso`, `info`), botón de cierre con `Icono nombre="cerrar"` de 48px y soporte de micro-sombras.
  2. En `components.css`: micro-animación `@keyframes toast-entrada` con `cubic-bezier` y curva suave.

### 🔹 Fase 3: Estación de Filtrado y Paginación Integrada
- **Objetivo**: Dar contorno arquitectónico y presencia a las barras de filtros y controles de navegación de listas.
- **Acciones**:
  1. En `filter-bar.tsx`: contenedor con variante de tarjeta `variant="card"` (`bg-panel-fill border border-panel-border rounded-xl p-4 shadow-xs`) para agrupar armónicamente selectores y búsqueda.
  2. En `list-pager.tsx`: diseño modernizado con botones icono chevron, pastilla de conteo y página activa (`Página X de Y`) con tipografía técnica.

### 🔹 Fase 4: Insignias Vivas (Status Badges con Indicador / Dot)
- **Objetivo**: Dotar a las etiquetas de estado de dinamismo visual y claridad inmediata.
- **Acciones**:
  1. En `ui.tsx` (`Badge`): soporte de prop `dot` (punto vivo de 6px) con micro-resplandor opcional para estados en vivo (Activo, Pendiente, Error).

### 🔹 Fase 5: Componente de Wizard por Pasos (Modales Multi-Step)
- **Objetivo**: Estandarizar formularios complejos en flujos secuenciales guiados.
- **Acciones**:
  1. Crear `modal-wizard.tsx` con barra de progreso superior animada con gradiente Cobalt & Violet, paso activo con relieve y controles de navegación ("Atrás", "Siguiente", "Confirmar").

### 🔹 Fase 6: Validación de Calidad (QA), Contraste y Memoria de Diseño
- **Objetivo**: Garantizar 0 regresiones y documentar las nuevas directrices.
- **Acciones**:
  1. Ejecución de suite completa de pruebas en Vitest (contraste, simetría, componentes).
  2. Actualización de `UI_GUIDE.md` con las nuevas especificaciones.
