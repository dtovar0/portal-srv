import type { Config } from 'tailwindcss';

/**
 * Configuración portada de assets/js/tailwind-config.js del portal original,
 * con los mismos nombres de utilidad para que el marcado de las plantillas
 * funcione sin traducción. Los valores salen de src/styles/tokens.css.
 *
 * Se añade `<alpha-value>` a los tokens declarados como canales «R G B» para
 * poder usar `bg-primary/10`; los que el original define como color completo
 * (body-bg, header, input) se dejan tal cual.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DIS-055 — Semánticos por rol funcional (ADR-007)
        fondo: 'rgb(var(--color-fondo) / <alpha-value>)',
        superficie: 'rgb(var(--color-superficie) / <alpha-value>)',
        'superficie-elevada': 'rgb(var(--color-superficie-elevada) / <alpha-value>)',
        'superficie-hundida': 'rgb(var(--color-superficie-hundida) / <alpha-value>)',
        velo: 'rgb(var(--color-velo))',

        texto: 'rgb(var(--color-texto) / <alpha-value>)',
        'texto-secundario': 'rgb(var(--color-texto-secundario) / <alpha-value>)',
        'texto-tenue': 'rgb(var(--color-texto-tenue) / <alpha-value>)',
        'texto-sobre-accion': 'rgb(var(--color-texto-sobre-accion) / <alpha-value>)',
        'texto-sobre-peligro': 'rgb(var(--color-texto-sobre-peligro) / <alpha-value>)',
        'texto-sobre-aviso': 'rgb(var(--color-texto-sobre-aviso) / <alpha-value>)',
        'texto-enlace': 'rgb(var(--color-texto-enlace) / <alpha-value>)',

        borde: 'rgb(var(--color-borde) / <alpha-value>)',
        'borde-sutil': 'rgb(var(--color-borde-sutil) / <alpha-value>)',
        'borde-fuerte': 'rgb(var(--color-borde-fuerte) / <alpha-value>)',

        accion: 'rgb(var(--color-accion) / <alpha-value>)',
        'accion-hover': 'rgb(var(--color-accion-hover) / <alpha-value>)',
        'accion-presionada': 'rgb(var(--color-accion-presionada) / <alpha-value>)',
        'accion-tenue': 'rgb(var(--color-accion-tenue) / <alpha-value>)',
        'accion-texto': 'rgb(var(--color-accion-texto) / <alpha-value>)',

        exito: 'rgb(var(--color-exito-relleno) / <alpha-value>)',
        'exito-tenue': 'rgb(var(--color-exito-tenue) / <alpha-value>)',
        'exito-borde': 'rgb(var(--color-exito-borde) / <alpha-value>)',
        'exito-texto': 'rgb(var(--color-exito-texto) / <alpha-value>)',

        aviso: 'rgb(var(--color-aviso-relleno) / <alpha-value>)',
        'aviso-tenue': 'rgb(var(--color-aviso-tenue) / <alpha-value>)',
        'aviso-borde': 'rgb(var(--color-aviso-borde) / <alpha-value>)',
        'aviso-texto': 'rgb(var(--color-aviso-texto) / <alpha-value>)',

        peligro: 'rgb(var(--color-peligro-relleno) / <alpha-value>)',
        'peligro-tenue': 'rgb(var(--color-peligro-tenue) / <alpha-value>)',
        'peligro-borde': 'rgb(var(--color-peligro-borde) / <alpha-value>)',
        'peligro-texto': 'rgb(var(--color-peligro-texto) / <alpha-value>)',

        'info-tenue': 'rgb(var(--color-info-tenue) / <alpha-value>)',
        'info-borde': 'rgb(var(--color-info-borde) / <alpha-value>)',

        neutro: 'rgb(var(--color-neutro-relleno) / <alpha-value>)',
        'neutro-tenue': 'rgb(var(--color-neutro-tenue) / <alpha-value>)',
        'neutro-borde': 'rgb(var(--color-neutro-borde) / <alpha-value>)',
        'neutro-texto': 'rgb(var(--color-neutro-texto) / <alpha-value>)',

        // DIS-056 — Tokens de interacción y estado
        'foco-anillo': 'rgb(var(--foco-anillo) / <alpha-value>)',
        'deshabilitado-fondo': 'rgb(var(--deshabilitado-fondo) / <alpha-value>)',
        'deshabilitado-texto': 'rgb(var(--deshabilitado-texto) / <alpha-value>)',
        'deshabilitado-borde': 'rgb(var(--deshabilitado-borde) / <alpha-value>)',
        'invalido-borde': 'rgb(var(--invalido-borde) / <alpha-value>)',
        'solo-lectura-fondo': 'rgb(var(--solo-lectura-fondo) / <alpha-value>)',
        'seleccionado-borde': 'rgb(var(--seleccionado-borde) / <alpha-value>)',

        // Main Palette (Alias transitorios)
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-sky': 'rgb(var(--color-accent-sky) / <alpha-value>)',
        'accent-violet': 'rgb(var(--color-accent-violet) / <alpha-value>)',
        peach: 'rgb(var(--color-accent-peach) / <alpha-value>)',
        violet: 'rgb(var(--color-accent-violet) / <alpha-value>)',
        sky: 'rgb(var(--color-accent-sky) / <alpha-value>)',
        brand: 'rgb(var(--color-brand) / <alpha-value>)',

        // Texto de marca por tema (DIS-001): los de arriba son rellenos.
        'primary-text': 'rgb(var(--color-primary-text) / <alpha-value>)',
        'brand-text': 'rgb(var(--color-brand-text) / <alpha-value>)',
        'accent-text': 'rgb(var(--color-accent-text) / <alpha-value>)',
        'accent-sky-text': 'rgb(var(--color-accent-sky-text) / <alpha-value>)',
        'accent-peach-text': 'rgb(var(--color-accent-peach-text) / <alpha-value>)',
        // Relleno de marca con texto encima y su texto (DIS-001).
        'primary-solid': 'rgb(var(--color-primary-solid) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',

        // Surfaces & Backgrounds
        'body-bg': 'var(--color-body-bg)',
        'body-text': 'var(--color-body-text)',
        header: 'rgb(var(--color-header-bg) / <alpha-value>)',
        'header-text': 'rgb(var(--color-header-text) / <alpha-value>)',
        // DIS-078: marco de administración (paleta del diseño aprobado, DIS-076)
        'barra-lateral': 'rgb(var(--color-barra-lateral) / <alpha-value>)',
        'barra-lateral-borde': 'rgb(var(--color-barra-lateral-borde) / <alpha-value>)',
        'barra-lateral-texto': 'rgb(var(--color-barra-lateral-texto) / <alpha-value>)',
        'barra-lateral-secundario': 'rgb(var(--color-barra-lateral-secundario) / <alpha-value>)',
        'barra-lateral-nav': 'rgb(var(--color-barra-lateral-nav) / <alpha-value>)',
        'barra-lateral-hover': 'rgb(var(--color-barra-lateral-hover))',
        'barra-lateral-presionado': 'rgb(var(--color-barra-lateral-presionado))',
        'barra-lateral-elemento': 'rgb(var(--color-barra-lateral-elemento))',
        'barra-lateral-foco': 'rgb(var(--color-barra-lateral-foco) / <alpha-value>)',
        navegacion: 'rgb(var(--color-navegacion) / <alpha-value>)',
        'activo-fondo': 'rgb(var(--color-activo-fondo) / <alpha-value>)',
        'activo-texto': 'rgb(var(--color-activo-texto) / <alpha-value>)',
        'entrada-fondo': 'rgb(var(--color-entrada-fondo) / <alpha-value>)',
        'panel-fill': 'rgb(var(--color-panel-fill) / <alpha-value>)',
        'panel-border': 'rgb(var(--color-panel-border) / <alpha-value>)',
        'panel-header': 'rgb(var(--color-panel-header-bg) / <alpha-value>)',
        'panel-header-text': 'rgb(var(--color-panel-header-text) / <alpha-value>)',
        'audit-body': 'rgb(var(--color-audit-body) / <alpha-value>)',
        'surface-container': 'rgb(var(--color-surface-container-bg) / <alpha-value>)',
        'surface-container-border':
          'rgb(var(--color-surface-container-border) / <alpha-value>)',
        // DIS-038: velo de diálogos y menú móvil; el token ya trae su opacidad.
        overlay: 'rgb(var(--color-overlay))',

        // Buttons & Interaction
        'button-bg': 'rgb(var(--color-button-bg) / <alpha-value>)',
        'button-text': 'rgb(var(--color-button-text) / <alpha-value>)',
        'button-disabled': 'rgb(var(--color-button-disabled-bg) / <alpha-value>)',
        'button-disabled-text':
          'rgb(var(--color-button-disabled-text) / <alpha-value>)',

        // Inputs
        input: 'var(--color-input-text)',
        'input-bg': 'rgb(var(--color-input-bg) / <alpha-value>)',
        'input-border': 'rgb(var(--color-input-border) / <alpha-value>)',
        'input-focus': 'rgb(var(--color-input-focus) / <alpha-value>)',
        label: 'rgb(var(--color-label-text) / <alpha-value>)',
        placeholder: 'rgb(var(--color-placeholder) / <alpha-value>)',

        // Navigation & Tabs
        'tab-bar': 'rgb(var(--color-tab-bar-bg) / <alpha-value>)',
        'tab-active': 'rgb(var(--color-tab-active-bg) / <alpha-value>)',
        'tab-active-text': 'rgb(var(--color-tab-active-text) / <alpha-value>)',
        'tab-inactive': 'rgb(var(--color-tab-inactive-bg) / <alpha-value>)',
        'tab-inactive-text': 'rgb(var(--color-tab-inactive-text) / <alpha-value>)',

        // Business Intelligence (BI) & Status
        'bi-logistics': 'rgb(var(--color-bi-card-logistics) / <alpha-value>)',
        'bi-ring': 'rgb(var(--color-bi-ring-bg) / <alpha-value>)',
        'bi-main': 'rgb(var(--color-bi-text-main) / <alpha-value>)',
        'bi-muted': 'rgb(var(--color-bi-text-muted) / <alpha-value>)',
        'kpi-highlight': 'rgb(var(--color-kpi-highlight) / <alpha-value>)',

        // Estados: rellenos y tintes (`bg-error/10`); DIS-002 quitó los literales.
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        // DIS-004: relleno del botón de peligro y su texto, por tema.
        'error-solid': 'rgb(var(--color-error-solid) / <alpha-value>)',
        'on-error': 'rgb(var(--color-on-error) / <alpha-value>)',
        // Estados como texto, por tema (DIS-002).
        'success-text': 'rgb(var(--color-success-text) / <alpha-value>)',
        'warning-text': 'rgb(var(--color-warning-text) / <alpha-value>)',
        'error-text': 'rgb(var(--color-error-text) / <alpha-value>)',
        'info-text': 'rgb(var(--color-info-text) / <alpha-value>)',

        // Alias usados por el marcado de base.html
        bg: 'var(--color-body-bg)',
        text: 'var(--color-body-text)',

        // Identidad Corporativa ADUANA (Manual de Identidad §06)
        // Colores fijos de ilustraciones y tarjetas de diseño (DIS-119): no cambian con el tema.
        'arte-ambar-300': 'rgb(var(--color-arte-ambar-300) / <alpha-value>)',
        'arte-ambar-400': 'rgb(var(--color-arte-ambar-400) / <alpha-value>)',
        'arte-ambar-500': 'rgb(var(--color-arte-ambar-500) / <alpha-value>)',
        'arte-ambar-600': 'rgb(var(--color-arte-ambar-600) / <alpha-value>)',
        'arte-ambar-700': 'rgb(var(--color-arte-ambar-700) / <alpha-value>)',
        'arte-azul-500': 'rgb(var(--color-arte-azul-500) / <alpha-value>)',
        'arte-azul-900': 'rgb(var(--color-arte-azul-900) / <alpha-value>)',
        'arte-esmeralda-200': 'rgb(var(--color-arte-esmeralda-200) / <alpha-value>)',
        'arte-esmeralda-300': 'rgb(var(--color-arte-esmeralda-300) / <alpha-value>)',
        'arte-esmeralda-400': 'rgb(var(--color-arte-esmeralda-400) / <alpha-value>)',
        'arte-esmeralda-500': 'rgb(var(--color-arte-esmeralda-500) / <alpha-value>)',
        'arte-esmeralda-600': 'rgb(var(--color-arte-esmeralda-600) / <alpha-value>)',
        'arte-esmeralda-700': 'rgb(var(--color-arte-esmeralda-700) / <alpha-value>)',
        'arte-indigo-300': 'rgb(var(--color-arte-indigo-300) / <alpha-value>)',
        'arte-indigo-400': 'rgb(var(--color-arte-indigo-400) / <alpha-value>)',
        'arte-indigo-700': 'rgb(var(--color-arte-indigo-700) / <alpha-value>)',
        'arte-indigo-900': 'rgb(var(--color-arte-indigo-900) / <alpha-value>)',
        'arte-indigo-950': 'rgb(var(--color-arte-indigo-950) / <alpha-value>)',
        'arte-luz': 'rgb(var(--color-arte-luz) / <alpha-value>)',
        'arte-naranja-500': 'rgb(var(--color-arte-naranja-500) / <alpha-value>)',
        'arte-naranja-700': 'rgb(var(--color-arte-naranja-700) / <alpha-value>)',
        'arte-pizarra-100': 'rgb(var(--color-arte-pizarra-100) / <alpha-value>)',
        'arte-pizarra-300': 'rgb(var(--color-arte-pizarra-300) / <alpha-value>)',
        'arte-pizarra-400': 'rgb(var(--color-arte-pizarra-400) / <alpha-value>)',
        'arte-pizarra-700': 'rgb(var(--color-arte-pizarra-700) / <alpha-value>)',
        'arte-pizarra-800': 'rgb(var(--color-arte-pizarra-800) / <alpha-value>)',
        'arte-pizarra-900': 'rgb(var(--color-arte-pizarra-900) / <alpha-value>)',
        'arte-pizarra-950': 'rgb(var(--color-arte-pizarra-950) / <alpha-value>)',
        'arte-purpura-200': 'rgb(var(--color-arte-purpura-200) / <alpha-value>)',
        'arte-purpura-300': 'rgb(var(--color-arte-purpura-300) / <alpha-value>)',
        'arte-purpura-400': 'rgb(var(--color-arte-purpura-400) / <alpha-value>)',
        'arte-purpura-500': 'rgb(var(--color-arte-purpura-500) / <alpha-value>)',
        'arte-purpura-600': 'rgb(var(--color-arte-purpura-600) / <alpha-value>)',
        'arte-purpura-800': 'rgb(var(--color-arte-purpura-800) / <alpha-value>)',
        'arte-purpura-950': 'rgb(var(--color-arte-purpura-950) / <alpha-value>)',
        'arte-sombra': 'rgb(var(--color-arte-sombra) / <alpha-value>)',
        'arte-turquesa-500': 'rgb(var(--color-arte-turquesa-500) / <alpha-value>)',
        'arte-turquesa-800': 'rgb(var(--color-arte-turquesa-800) / <alpha-value>)',
        'arte-zinc-400': 'rgb(var(--color-arte-zinc-400) / <alpha-value>)',
        'aduana-bg-main': 'var(--aduana-bg-main)',
        'aduana-bg-surface': 'var(--aduana-bg-surface)',
        'aduana-bg-hover': 'var(--aduana-bg-hover)',
        'aduana-border': 'var(--aduana-border)',
        'aduana-text-primary': 'var(--aduana-text-primary)',
        'aduana-text-secondary': 'var(--aduana-text-secondary)',
        'aduana-cyan': 'var(--aduana-cyan)',
        'aduana-cyan-hover': 'var(--aduana-cyan-hover)',
        'aduana-orange': 'var(--aduana-orange)',
        'aduana-orange-hover': 'var(--aduana-orange-hover)',
        'status-approved': 'var(--status-approved)',
        'status-pending': 'var(--status-pending)',
        'status-rejected': 'var(--status-rejected)',
        'status-info': 'var(--status-info)',
      },
      borderRadius: {
        base: 'var(--radius-base)',
        panel: 'var(--radius-panel)',
        control: 'var(--radio-control)',
        tarjeta: 'var(--radio-tarjeta)',
        dialogo: 'var(--radio-dialogo)',
        pastilla: 'var(--radio-pastilla)',
        xl: '8px',
        '2xl': '10px',
        '3xl': '12px',
      },
      boxShadow: {
        1: 'var(--sombra-1)',
        2: 'var(--sombra-2)',
        3: 'var(--sombra-3)',
      },
      borderWidth: {
        base: 'var(--borde-ancho)',
      },
      transitionDuration: {
        corta: 'var(--duracion-corta)',
        media: 'var(--duracion-media)',
      },
      transitionTimingFunction: {
        curva: 'var(--curva)',
      },
      fontFamily: {
        display: ['var(--fuente-display)', 'var(--font-display)', 'Montserrat', 'sans-serif'],
        sans: ['var(--fuente-texto)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--fuente-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: '1rem' }],
        sm: ['var(--text-sm)', { lineHeight: '1.25rem' }],
        base: ['var(--text-base)', { lineHeight: '1.5rem' }],
        lg: ['var(--text-lg)', { lineHeight: '1.75rem' }],
        xl: ['var(--text-xl)', { lineHeight: '1.75rem' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '2rem' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '2.25rem' }],
      },
      // Escala 8pt extendida (DIS-119): medidas de 4 px en 4 px (y medios pasos) que Tailwind no trae
      // y que antes iban como valores arbitrarios entre corchetes.
      spacing: {
        '12.5': '3.125rem',
        '15': '3.75rem',
        '22': '5.5rem',
        '42.5': '10.625rem',
        '47.5': '11.875rem',
        '55': '13.75rem',
        '75': '18.75rem',
        '85': '21.25rem',
        '90': '22.5rem',
        '115': '28.75rem',
        '120': '30rem',
        '130': '32.5rem',
        '140': '35rem',
        '145': '36.25rem',
        '160': '40rem',
        '185': '46.25rem',
      },
      opacity: {
        atenuada: 'var(--opacidad-atenuada)',
        deshabilitada: 'var(--opacidad-deshabilitada)',
        decoracion: 'var(--opacidad-decoracion)',
      },
      maxWidth: {
        contenido: 'var(--contenido-max)',
        formulario: 'var(--formulario-max)',
        dialogo: 'var(--dialogo-max)',
      },
      width: {
        '9/20': '45%',
        '11/20': '55%',
        'mitad-canal': 'calc(50% - 0.5rem)',
        progreso: 'var(--ancho-progreso)',
        lateral: 'var(--marco-lateral-ancho)',
        'lateral-colapsada': 'var(--marco-lateral-colapsada)',
      },
      height: {
        control: 'var(--control-alto)',
        'barra-superior': 'var(--marco-superior-alto)',
      },
      minHeight: {
        control: 'var(--control-alto)',
      },
      minWidth: {
        control: 'var(--control-alto)',
      },
      zIndex: {
        '60': '60',
      },
    },
  },
  plugins: [],
} satisfies Config;
