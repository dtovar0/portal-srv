'use client';

/**
 * Página de Portada y Presentación Corporativa de Aduana (DIS-118).
 *
 * Describe la misión, funcionamiento, problemáticas resueltas (Shadow IT),
 * capturas de pantalla, arquitectura de seguridad, documentación y acceso (login).
 * Cumple con los design tokens Electric Cobalt & Violet, sistema 8pt y modo oscuro.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Icono } from '../icono';
import { PageHeader } from '../page-header';
import { esPortadaActiva } from '@/lib/portada';
import { elegirTema, leerTema } from '@/lib/tema';

interface CapturaInfo {
  id: string;
  titulo: string;
  subtitulo: string;
  src: string;
  descripcion: string;
  etiquetas: string[];
}

const CAPTURAS: CapturaInfo[] = [
  {
    id: 'catalogo',
    titulo: 'Catálogo General y Launchpad',
    subtitulo: 'Vista amplia con buscador ⌘K, filtros por área y métricas en vivo',
    src: '/screenshots/catalogo-plataformas.png',
    descripcion:
      'Espacio de trabajo unificado donde los colaboradores descubren todas las herramientas oficiales de la empresa, filtradas por departamento y organizadas con acceso en 1 clic.',
    etiquetas: ['Buscador ⌘K', 'Filtro por Áreas', 'Favoritas', 'Autoservicio'],
  },
  {
    id: 'diseno-plataforma',
    titulo: 'Diseño de Plataformas (Patrón Suizo)',
    subtitulo: 'Vista previa en tiempo real con altura estandarizada de 240px',
    src: '/screenshots/diseno-tarjetas-plataforma.png',
    descripcion:
      'Cajón lateral interactivo con previsualización en vivo. Garantiza estabilidad visual estricta mediante altura estándar de 240 px y paginador compacto en cápsula.',
    etiquetas: ['Altura Estándar 240px', 'Vista Previa en Vivo', 'Paginador Cápsula', 'Sin Layout Shift'],
  },
  {
    id: 'diseno-area',
    titulo: 'Diseño de Tarjetas de Área',
    subtitulo: '10 variantes departamentales con switch institucional permanente',
    src: '/screenshots/diseno-tarjetas-area.png',
    descripcion:
      'Personalización modular de tarjetas departamentales: Métricas Ejecutivas, Bento Grid, Onda Curva, Medallón Insignia y Flotante Inmersiva con control de forzado corporativo.',
    etiquetas: ['10 Variantes', 'Forzado Institucional', 'Interacción Silenciosa', 'Simetría 2x2'],
  },
  {
    id: 'ajustes-vista',
    titulo: 'Ajustes de Vista y Políticas',
    subtitulo: 'Personalización de usuario y estado de vacío premium al bloquearse',
    src: '/screenshots/ajustes-vista-premium.png',
    descripcion:
      'Configuración personalizada de interfaz (Topbar Launchpad vs Sidebar Workspace, visibilidad de carta responsiva) y sustitución por mensaje premium cuando una política está forzada.',
    etiquetas: ['Topbar vs Sidebar', 'Control de Documentos', 'Bloqueo por Admin', 'Empty State'],
  },
];

interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

const FAQS: PreguntaFrecuente[] = [
  {
    pregunta: '¿Qué es Aduana y quién debe utilizarlo?',
    respuesta:
      'Aduana es la plataforma centralizada de gobernanza y catálogo de herramientas corporativas. Todos los colaboradores de la empresa lo utilizan para acceder a sus herramientas asignadas y solicitar nuevos accesos, mientras que los líderes y administradores de TI lo emplean para aprobar peticiones, auditar licencias y resguardar la seguridad institucional.',
  },
  {
    pregunta: '¿Por qué se creó Aduana en lugar de gestionar accesos por tickets o correo?',
    respuesta:
      'Se creó para erradicar el Shadow IT (herramientas contratadas o compartidas de manera informal), eliminar tiempos muertos de días o semanas en correos no estructurados, y garantizar que cada acceso otorgado cuente con un respaldo auditable y una Carta Responsiva legal firmada por el usuario.',
  },
  {
    pregunta: '¿Qué es la Carta Responsiva y cuándo debo firmarla?',
    respuesta:
      'La Carta Responsiva es un documento digital que formaliza el compromiso del colaborador respecto al uso ético, seguro y confidencial de las cuentas e información corporativa. Se firma digitalmente con verificación anti-error CAPTCHA en el primer ingreso al portal o al recibir la aprobación de una nueva herramienta.',
  },
  {
    pregunta: '¿Cómo se aprueban las solicitudes de acceso?',
    respuesta:
      'Cada solicitud es revisada por el Administrador del Área correspondiente o el equipo de TI. El revisor analiza la justificación de negocio y aprueba o rechaza con motivo documentado. Al aprobarse, los conectores de Aduana sincronizan las credenciales y el acceso queda disponible de inmediato.',
  },
  {
    pregunta: '¿Puedo personalizar cómo veo mi catálogo de herramientas?',
    respuesta:
      'Sí. Aduana permite alternar entre el diseño de barra superior (Launchpad amplio con buscador ⌘K) y barra lateral (Workspace con árbol de navegación), elegir entre tema claro u oscuro, y configurar un Widget de Accesos Rápidos con tus herramientas favoritas.',
  },
];

export function PaginaPortada() {
  const router = useRouter();
  const [tema, setTema] = useState<string>('sistema');
  const [capturaActiva, setCapturaActiva] = useState<string>('catalogo');
  const [faqAbierto, setFaqAbierto] = useState<number | null>(0);

  useEffect(() => {
    if (!esPortadaActiva()) {
      router.replace('/login');
      return;
    }
    setTema(leerTema());
  }, [router]);

  const alternarTema = useCallback(() => {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro';
    setTema(nuevo);
    elegirTema(nuevo);
  }, [tema]);

  const esOscuro = tema === 'oscuro';
  const capturaSeleccionada = CAPTURAS.find((c) => c.id === capturaActiva) ?? CAPTURAS[0];

  return (
    <div className="nx-landing min-h-full bg-fondo text-body-text flex flex-col selection:bg-primary/20 selection:text-primary-text">
      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN Y ACCESO */}
      <header className="sticky top-0 z-40 w-full border-b border-panel-border/80 bg-superficie/85 backdrop-blur-md transition-colors">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logotipo y Marca Oficial de Aduana */}
          <Link
            href="/"
            className="min-w-12 min-h-12 flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl group"
            aria-label="Aduana - Control de Acceso"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-superficie border border-panel-border p-1.5 shadow-xs transition-colors group-hover:scale-105 transition-transform"
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/isotype-aduana.png"
                alt="Isotipo de Aduana"
                className="size-7 object-contain"
                width={28}
                height={28}
              />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-extrabold tracking-tight text-body-text flex items-center gap-2">
                Aduana
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-text">
                  v2.0
                </span>
              </span>
              <span className="text-xs text-texto-secundario hidden sm:block">
                Control de Acceso
              </span>
            </div>
          </Link>

          {/* Enlaces de Navegación Rápida con centrado simétrico absoluto */}
          <nav aria-label="Navegación de secciones" className="hidden lg:flex items-center gap-1 xl:gap-2 absolute left-1/2 -translate-x-1/2">
            <a
              href="#por-que"
              className="inline-flex min-h-12 items-center rounded-lg px-3 text-xs font-semibold text-texto-secundario hover:text-body-text hover:bg-surface-container transition-colors"
            >
              ¿Por qué Aduana?
            </a>
            <a
              href="#como-funciona"
              className="inline-flex min-h-12 items-center rounded-lg px-3 text-xs font-semibold text-texto-secundario hover:text-body-text hover:bg-surface-container transition-colors"
            >
              ¿Cómo funciona?
            </a>
            <a
              href="#capturas"
              className="inline-flex min-h-12 items-center rounded-lg px-3 text-xs font-semibold text-texto-secundario hover:text-body-text hover:bg-surface-container transition-colors"
            >
              Capturas y Módulos
            </a>
            <a
              href="#seguridad"
              className="inline-flex min-h-12 items-center rounded-lg px-3 text-xs font-semibold text-texto-secundario hover:text-body-text hover:bg-surface-container transition-colors"
            >
              Seguridad & Auditoría
            </a>
            <a
              href="#documentacion"
              className="inline-flex min-h-12 items-center rounded-lg px-3 text-xs font-semibold text-texto-secundario hover:text-body-text hover:bg-surface-container transition-colors"
            >
              Documentación
            </a>
            <a
              href="#faq"
              className="inline-flex min-h-12 items-center rounded-lg px-3 text-xs font-semibold text-texto-secundario hover:text-body-text hover:bg-surface-container transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Acciones: Alternar Tema y Botón Iniciar Sesión Premium */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={alternarTema}
              aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
              className="min-w-12 flex size-10 min-h-12 min-w-10 items-center justify-center rounded-xl border border-panel-border bg-superficie text-texto-secundario hover:text-primary-text hover:border-primary/40 hover:bg-surface-container transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shadow-xs"
            >
              <Icono nombre={esOscuro ? 'sol' : 'luna'} tamano="sm" />
            </button>

            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-brand to-accent px-4 py-2 text-xs sm:text-sm font-bold text-texto-sobre-accion shadow-sm shadow-primary/25 border border-arte-luz/20 hover:shadow-md hover:shadow-primary/40 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              <Icono nombre="marca" tamano="xs" ariaHidden={true} />
              <span>Iniciar Sesión</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="nx-hero-stage relative overflow-hidden border-b border-panel-border/60">
        {/* Halos decorativos de fondo */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-gradient-to-tr from-primary/15 via-brand/10 to-accent/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="nx-hero-layout relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Badge de Novedad / Identidad */}
          <div className="nx-hero-badge inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary-text shadow-xs">
            <span className="size-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            Plataforma Corporativa de Gobernanza de Accesos TI
          </div>

          {/* Titular Principal */}
          <PageHeader
            titleClassName="nx-hero-title font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.055em] text-body-text leading-[0.98]"
            title={
              <>
                El acceso correcto.{' '}
                <span className="bg-gradient-to-r from-aduana-cyan to-aduana-orange bg-clip-text text-transparent">
                  Para cada persona.
                </span>
              </>
            }
          />

          {/* Subtítulo Descriptivo */}
          <p className="nx-hero-copy max-w-xl text-base sm:text-lg text-texto-secundario leading-relaxed">
            Aduana convierte el acceso a las herramientas de la empresa en una experiencia clara: descubrir,
            solicitar, aprobar y auditar desde un solo lugar.
          </p>

          {/* Botones de Llamada a la Acción (CTA) simétricos (224px x 48px) con Iconos de Apoyo */}
          <div className="nx-hero-actions flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 w-full sm:w-56 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary via-brand to-accent px-4 text-sm font-bold text-texto-sobre-accion shadow-md shadow-primary/25 border border-arte-luz/20 hover:shadow-lg hover:shadow-primary/35 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap text-center"
            >
              <Icono nombre="marca" tamano="sm" ariaHidden={true} />
              <span>Iniciar Sesión</span>
            </Link>

            <a
              href="#como-funciona"
              className="inline-flex h-12 w-full sm:w-56 items-center justify-center gap-2.5 rounded-xl border border-panel-border bg-superficie/90 px-4 text-sm font-semibold text-body-text shadow-xs hover:bg-surface-container hover:border-primary/40 hover:text-primary-text focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap text-center"
            >
              <Icono nombre="catalogo" tamano="sm" ariaHidden={true} className="text-texto-secundario" />
              <span>Explorar Producto</span>
            </a>
          </div>

          {/* Métricas e Impacto en Cifras */}
          <div className="nx-hero-product relative text-left">
            <div className="nx-product-frame rounded-[1.75rem] border border-panel-border/80 bg-superficie/80 p-2.5 shadow-2xl backdrop-blur-xl sm:p-3">
              <div className="flex items-center justify-between px-2 pb-2.5 sm:px-3">
                <div className="flex gap-1.5" aria-hidden="true"><span className="size-2.5 rounded-full bg-error/80" /><span className="size-2.5 rounded-full bg-warning/80" /><span className="size-2.5 rounded-full bg-success/80" /></div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-texto-secundario"><Icono nombre="escudo-ok" tamano="xs" ariaHidden={true} /> Producto real</span>
              </div>
              <div className="overflow-hidden rounded-[1.15rem] border border-panel-border bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screenshots/catalogo-plataformas.png" alt="Vista real del catálogo de plataformas de Aduana" className="nx-product-image block h-auto w-full" fetchPriority="high" />
              </div>
            </div>
          </div>

          <div className="nx-hero-proof grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="p-4 rounded-xl border border-panel-border bg-superficie shadow-xs flex flex-col justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-primary-text block">100%</span>
              <span className="text-xs font-bold text-body-text mt-1 block">Auditabilidad Legal</span>
              <span className="text-xs text-texto-secundario mt-0.5 block leading-tight">
                Cartas responsivas con CAPTCHA y bitácora inmutable.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-panel-border bg-superficie shadow-xs flex flex-col justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-success-text block">0</span>
              <span className="text-xs font-bold text-body-text mt-1 block">Shadow IT</span>
              <span className="text-xs text-texto-secundario mt-0.5 block leading-tight">
                Visibilidad absoluta de licencias y cuentas departamentales.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-panel-border bg-superficie shadow-xs flex flex-col justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-text block">-85%</span>
              <span className="text-xs font-bold text-body-text mt-1 block">Tiempo de Aprobación</span>
              <span className="text-xs text-texto-secundario mt-0.5 block leading-tight">
                Autoservicio ágil con flujos directos a líderes de área.
              </span>
            </div>

            <div className="p-4 rounded-xl border border-panel-border bg-superficie shadow-xs flex flex-col justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-accent-text block">24/7</span>
              <span className="text-xs font-bold text-body-text mt-1 block">Disponibilidad SSO</span>
              <span className="text-xs text-texto-secundario mt-0.5 block leading-tight">
                Federación OIDC segura con Authelia y verificación MFA.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN: ¿POR QUÉ SE CREÓ ADUANA? (PROBLEMA VS MISIÓN) */}
      <section id="por-que" className="nx-editorial-section py-20 sm:py-28 border-b border-panel-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-text block mb-2">
              El Origen y la Misión
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-body-text tracking-tight mb-4">
              ¿Por qué se creó Aduana y qué problemática resuelve?
            </h2>
            <p className="text-sm sm:text-base text-texto-secundario leading-relaxed">
              En empresas en crecimiento, la dispersión de herramientas informáticas sin control centralizado
              representa uno de los mayores vectores de vulnerabilidad de seguridad y desperdicio presupuestal.
            </p>
          </div>

          <div className="nx-contrast-grid grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* Tarjeta: El Problema Previo */}
            <div className="rounded-2xl border border-danger/30 bg-superficie p-6 sm:p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-danger/10 text-danger-text" aria-hidden="true">
                    <Icono nombre="aviso" tamano="md" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-body-text">El Caos Previo (Sin Aduana)</h3>
                    <span className="text-xs text-danger-text font-medium">Riesgos operativos y de seguridad</span>
                  </div>
                </div>

                <ul className="space-y-4 text-xs sm:text-sm text-texto-secundario leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="text-danger-text font-bold text-base leading-none">•</span>
                    <span>
                      <strong className="text-body-text font-semibold">Shadow IT descontrolado:</strong> Cada departamento
                      contrataba herramientas en silos, compartiendo accesos en hojas de cálculo y chats sin visibilidad de TI.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-danger-text font-bold text-base leading-none">•</span>
                    <span>
                      <strong className="text-body-text font-semibold">Tiempos muertos de semanas:</strong> Solicitudes en tickets
                      informales que tardaban días en revisarse, frenando la incorporación de nuevos colaboradores.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-danger-text font-bold text-base leading-none">•</span>
                    <span>
                      <strong className="text-body-text font-semibold">Riesgo en auditorías y bajas:</strong> Cuentas activas que
                      quedaban olvidadas tras la desvinculación de personal, sin registros firmados de resguardo de información.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-panel-border/80 text-xs text-texto-secundario">
                Resultado previo: Vulnerabilidades normativas y gastos redundantes en licencias no aprovechadas.
              </div>
            </div>

            {/* Tarjeta: La Solución Aduana */}
            <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/5 via-superficie to-superficie p-6 sm:p-8 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-texto-sobre-accion shadow-xs" aria-hidden="true">
                    <Icono nombre="exito" tamano="md" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-body-text">La Solución Aduana</h3>
                    <span className="text-xs text-primary-text font-medium">Gobernanza ágil y centralizada</span>
                  </div>
                </div>

                <ul className="space-y-4 text-xs sm:text-sm text-texto-secundario leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="text-primary-text font-bold text-base leading-none">✓</span>
                    <span>
                      <strong className="text-body-text font-semibold">Catálogo Único de la Verdad:</strong> Todas las plataformas
                      autorizadas residen en un solo portal clasificado por áreas organizativas (TI, Finanzas, Legal, etc.).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-primary-text font-bold text-base leading-none">✓</span>
                    <span>
                      <strong className="text-body-text font-semibold">Aprobaciones Delegadas en Minutos:</strong> Los líderes
                      departamentales evalúan y aprueban peticiones con un solo clic y motivo justificado.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-primary-text font-bold text-base leading-none">✓</span>
                    <span>
                      <strong className="text-body-text font-semibold">Cartas Responsivas Electrónicas:</strong> Resguardo legal
                      obligatorio firmado digitalmente por el usuario con validación anti-error CAPTCHA.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-panel-border/80 text-xs text-texto-secundario flex items-center justify-between">
                <span>Cumplimiento estricto con estándares ISO 27001 y SOC 2</span>
                <span className="font-bold text-primary-text">Gobernanza Garantizada</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN: ¿CÓMO FUNCIONA? (FLUJO EN 4 ETAPAS) */}
      <section id="como-funciona" className="nx-flow-section py-20 sm:py-28 border-b border-panel-border/60 bg-superficie/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-text block mb-2">
              Flujo Operativo
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-body-text tracking-tight mb-4">
              ¿Cómo funciona la plataforma?
            </h2>
            <p className="text-sm sm:text-base text-texto-secundario leading-relaxed">
              El ciclo de vida de los accesos corporativos en Aduana está diseñado para ser completamente fluido,
              transparente y seguro tanto para el empleado como para el administrador.
            </p>
          </div>

          <div className="nx-flow-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Paso 1 */}
            <div className="rounded-2xl border border-panel-border bg-superficie p-6 shadow-xs flex flex-col justify-between relative group hover:border-primary/50 transition-colors">
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary-text font-bold text-sm mb-4">
                  01
                </span>
                <h3 className="text-base font-bold text-body-text mb-2">Descubrimiento</h3>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  El colaborador ingresa al catálogo general, filtra por su departamento o utiliza el buscador rápido con el atajo <kbd className="px-1.5 py-0.5 rounded border border-panel-border text-xs font-mono">⌘K</kbd>.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-panel-border text-xs font-semibold text-primary-text flex items-center gap-1">
                <Icono nombre="buscar" tamano="xs" />
                <span>Exploración en tiempo real</span>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="rounded-2xl border border-panel-border bg-superficie p-6 shadow-xs flex flex-col justify-between relative group hover:border-primary/50 transition-colors">
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand-text font-bold text-sm mb-4">
                  02
                </span>
                <h3 className="text-base font-bold text-body-text mb-2">Solicitud Segura</h3>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  El usuario selecciona el nivel de acceso (Lectura, Escritura, Admin), describe la justificación y valida el código anti-error CAPTCHA de seguridad.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-panel-border text-xs font-semibold text-brand-text flex items-center gap-1">
                <Icono nombre="solicitudes" tamano="xs" />
                <span>Validación con CAPTCHA</span>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="rounded-2xl border border-panel-border bg-superficie p-6 shadow-xs flex flex-col justify-between relative group hover:border-primary/50 transition-colors">
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent-text font-bold text-sm mb-4">
                  03
                </span>
                <h3 className="text-base font-bold text-body-text mb-2">Aprobación TI</h3>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  El administrador evalúa la petición. Si es autorizada, el usuario acepta la Carta Responsiva digital de resguardo de información confidencial.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-panel-border text-xs font-semibold text-accent-text flex items-center gap-1">
                <Icono nombre="documento" tamano="xs" />
                <span>Firma de Responsiva</span>
              </div>
            </div>

            {/* Paso 4 */}
            <div className="rounded-2xl border border-panel-border bg-superficie p-6 shadow-xs flex flex-col justify-between relative group hover:border-primary/50 transition-colors">
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success-text font-bold text-sm mb-4">
                  04
                </span>
                <h3 className="text-base font-bold text-body-text mb-2">Aprovisionamiento</h3>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  Los conectores vinculan la cuenta con SSO, desbloquean el botón de acceso y permiten al usuario anclar la herramienta en su Widget Flotante de escritorio.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-panel-border text-xs font-semibold text-success-text flex items-center gap-1">
                <Icono nombre="widget" tamano="xs" />
                <span>Acceso directo en 1 clic</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECCIÓN: GALERÍA DE CAPTURAS Y MÓDULOS */}
      <section id="capturas" className="nx-showcase py-20 sm:py-28 border-b border-panel-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-text block mb-2">
              Demostración Visual
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-body-text tracking-tight mb-4">
              Capturas de Pantalla y Módulos del Sistema
            </h2>
            <p className="text-sm sm:text-base text-texto-secundario leading-relaxed">
              Explora la interfaz moderna inspirada en estándares SaaS de clase mundial: diseño limpio, tipografía
              armónica y soporte total para modo claro y oscuro.
            </p>
          </div>

          {/* Selector de Pestañas de Módulos */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {CAPTURAS.map((item) => {
              const activa = item.id === capturaActiva;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCapturaActiva(item.id)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                    activa
                      ? 'bg-primary text-texto-sobre-accion shadow-xs ring-2 ring-primary/20'
                      : 'border border-panel-border bg-superficie text-texto-secundario hover:text-body-text hover:bg-surface-container'
                  }`}
                >
                  <Icono nombre={item.id === 'catalogo' ? 'catalogo' : item.id === 'diseno-plataforma' ? 'plataformas' : item.id === 'diseno-area' ? 'areas' : 'ajustes'} tamano="xs" />
                  <span>{item.titulo}</span>
                </button>
              );
            })}
          </div>

          {/* Contenedor de la Captura Activa */}
          <div className="nx-showcase-frame rounded-[2rem] border border-panel-border bg-superficie p-3 sm:p-5 shadow-2xl">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-panel-border">
              <div>
                <h3 className="text-lg font-bold text-body-text">{capturaSeleccionada.titulo}</h3>
                <p className="text-xs text-texto-secundario mt-0.5">{capturaSeleccionada.subtitulo}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {capturaSeleccionada.etiquetas.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-panel-border bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-texto-secundario"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Marco de Imagen / Screenshot */}
            <div className="overflow-hidden rounded-xl border border-panel-border/80 bg-surface-container flex items-center justify-center shadow-inner min-h-90 sm:min-h-120">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturaSeleccionada.src}
                alt={capturaSeleccionada.titulo}
                className="w-full h-auto max-h-145 object-contain rounded-lg transition-transform duration-300"
                loading="lazy"
              />
            </div>

            <p className="text-xs sm:text-sm text-texto-secundario mt-4 px-1 leading-relaxed">
              {capturaSeleccionada.descripcion}
            </p>
          </div>
        </div>
      </section>

      {/* 6. SECCIÓN: SEGURIDAD, ARQUITECTURA Y CUMPLIMIENTO */}
      <section id="seguridad" className="nx-security py-20 sm:py-28 border-b border-panel-border/60 bg-superficie/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="nx-security-shell grid grid-cols-1 gap-4 rounded-3xl border border-panel-border bg-superficie p-4 shadow-2 lg:grid-cols-12 lg:p-6">
            <div className="relative flex min-h-130 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-brand to-accent p-8 text-texto-sobre-accion lg:col-span-4">
              <div className="absolute -right-20 -top-20 size-64 rounded-full border border-arte-luz/20" aria-hidden="true" />
              <div className="absolute -right-8 -top-8 size-40 rounded-full border border-arte-luz/20" aria-hidden="true" />
              <div className="relative">
                <span className="mb-8 flex size-12 items-center justify-center rounded-xl border border-arte-luz/25 bg-arte-luz/15 shadow-xs" aria-hidden="true">
                  <Icono nombre="escudo-ok" tamano="lg" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-texto-sobre-accion/80">Arquitectura segura</span>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">Seguridad que acompaña cada acceso.</h2>
                <p className="mt-5 text-base leading-relaxed text-texto-sobre-accion/85">
                  Identidad, privilegio mínimo y evidencia auditable operan como una sola capa de control.
                </p>
              </div>
              <div className="relative border-t border-arte-luz/25 pt-6 text-sm font-bold">Zero Trust · RBAC · OIDC · Auditoría</div>
            </div>

            <div className="nx-security-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-rows-2">
            <div className="rounded-2xl border border-panel-border bg-fondo p-6 shadow-xs flex min-h-60 flex-col justify-between">
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary-text mb-4" aria-hidden="true">
                  <Icono nombre="escudo-ok" tamano="md" />
                </span>
                <h3 className="text-sm font-bold text-body-text mb-2">Autenticación OIDC / SSO</h3>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  Integración federada con Authelia y proveedores de identidad corporativos. Soporte para MFA y sesiones protegidas sin exposición de tokens.
                </p>
              </div>
              <span className="mt-6 text-xs font-bold uppercase tracking-wider text-primary-text">Authelia • OIDC</span>
            </div>

            <div className="rounded-2xl border border-panel-border bg-fondo p-6 shadow-xs flex min-h-60 flex-col justify-between">
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand-text mb-4" aria-hidden="true">
                  <Icono nombre="documento" tamano="md" />
                </span>
                <h3 className="text-sm font-bold text-body-text mb-2">Cartas Responsivas Digitales</h3>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  Resguardo legal de cuentas y activos tecnológicos con firma digital del titular, fecha exacta y código de verificación CAPTCHA.
                </p>
              </div>
              <span className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-text">Firma Electrónica</span>
            </div>

            <div className="rounded-2xl border border-panel-border bg-fondo p-6 shadow-xs flex min-h-60 flex-col justify-between">
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent-text mb-4" aria-hidden="true">
                  <Icono nombre="usuarios" tamano="md" />
                </span>
                <h3 className="text-sm font-bold text-body-text mb-2">Control por Roles (RBAC)</h3>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  Privilegios segmentados en 3 capas: Colaborador Estándar, Administrador de Área y Administrador Global de Sistemas.
                </p>
              </div>
              <span className="mt-6 text-xs font-bold uppercase tracking-wider text-accent-text">Principio Zero-Trust</span>
            </div>

            <div className="rounded-2xl border border-panel-border bg-fondo p-6 shadow-xs flex min-h-60 flex-col justify-between">
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success-text mb-4" aria-hidden="true">
                  <Icono nombre="auditoria" tamano="md" />
                </span>
                <h3 className="text-sm font-bold text-body-text mb-2">Bitácora de Auditoría</h3>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  Registro inmutable de cada solicitud, aprobación, rechazo, revocación o cambio de configuración con usuario y marca de tiempo.
                </p>
              </div>
              <span className="mt-6 text-xs font-bold uppercase tracking-wider text-success-text">Logs Inmutables</span>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECCIÓN: DOCUMENTACIÓN Y GUÍAS RÁPIDAS */}
      <section id="documentacion" className="py-16 sm:py-24 border-b border-panel-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-text block mb-2">
              Recursos de Apoyo
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-body-text tracking-tight mb-4">
              Documentación y Guías para Equipos
            </h2>
            <p className="text-sm sm:text-base text-texto-secundario leading-relaxed">
              Consulta las guías esenciales para sacar el máximo provecho al portal de accesos según tu rol en la organización.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guía 1 */}
            <div className="rounded-2xl border border-panel-border bg-superficie p-6 shadow-xs flex flex-col justify-between hover:border-primary/50 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-primary-text mb-3">
                  <Icono nombre="catalogo" tamano="sm" />
                  <span className="text-xs font-bold uppercase tracking-wider">Para Colaboradores</span>
                </div>
                <h3 className="text-base font-bold text-body-text mb-2">Guía de Inicio Rápido</h3>
                <p className="text-xs text-texto-secundario leading-relaxed mb-4">
                  Aprende a buscar herramientas en el catálogo, cómo llenar una solicitud de acceso justificada, firmar tu carta responsiva y anclar tus accesos frecuentes al widget flotante.
                </p>
              </div>

              <div className="pt-4 border-t border-panel-border">
                <Link
                  href="/login"
                  className="min-w-12 min-h-12 inline-flex items-center gap-1 text-xs font-bold text-primary-text hover:underline"
                >
                  <span>Ir al catálogo</span>
                  <Icono nombre="flecha-der" tamano="xs" />
                </Link>
              </div>
            </div>

            {/* Guía 2 */}
            <div className="rounded-2xl border border-panel-border bg-superficie p-6 shadow-xs flex flex-col justify-between hover:border-primary/50 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-brand-text mb-3">
                  <Icono nombre="aprobaciones" tamano="sm" />
                  <span className="text-xs font-bold uppercase tracking-wider">Para Líderes & TI</span>
                </div>
                <h3 className="text-base font-bold text-body-text mb-2">Manual del Administrador</h3>
                <p className="text-xs text-texto-secundario leading-relaxed mb-4">
                  Cómo gestionar solicitudes de acceso pendientes, aprobar o rechazar con motivos documentados, configurar áreas organizativas y dar de alta nuevas plataformas en el catálogo.
                </p>
              </div>

              <div className="pt-4 border-t border-panel-border">
                <Link
                  href="/login"
                  className="min-w-12 min-h-12 inline-flex items-center gap-1 text-xs font-bold text-brand-text hover:underline"
                >
                  <span>Panel de administración</span>
                  <Icono nombre="flecha-der" tamano="xs" />
                </Link>
              </div>
            </div>

            {/* Guía 3 */}
            <div className="rounded-2xl border border-panel-border bg-superficie p-6 shadow-xs flex flex-col justify-between hover:border-primary/50 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-accent-text mb-3">
                  <Icono nombre="ajustes" tamano="sm" />
                  <span className="text-xs font-bold uppercase tracking-wider">Personalización</span>
                </div>
                <h3 className="text-base font-bold text-body-text mb-2">Diseño y Políticas Visuales</h3>
                <p className="text-xs text-texto-secundario leading-relaxed mb-4">
                  Conoce las 10 variantes de diseño de tarjetas de área y plataforma, cómo conmutar entre vista Topbar y Sidebar, y cómo forzar estilos institucionales a nivel de portal.
                </p>
              </div>

              <div className="pt-4 border-t border-panel-border">
                <Link
                  href="/login"
                  className="min-w-12 min-h-12 inline-flex items-center gap-1 text-xs font-bold text-accent-text hover:underline"
                >
                  <span>Ajustes de vista</span>
                  <Icono nombre="flecha-der" tamano="xs" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SECCIÓN: PREGUNTAS FRECUENTES (FAQ) */}
      <section id="faq" className="py-16 sm:py-24 border-b border-panel-border/60 bg-superficie/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-text block mb-2">
              Dudas Comunes
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-body-text tracking-tight mb-4">
              Preguntas Frecuentes
            </h2>
            <p className="text-sm text-texto-secundario leading-relaxed">
              Resolvemos las principales inquietudes sobre el acceso, seguridad y políticas del portal.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const abierto = faqAbierto === index;
              return (
                <div
                  key={faq.pregunta}
                  className="rounded-2xl border border-panel-border bg-superficie overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setFaqAbierto(abierto ? null : index)}
                    aria-expanded={abierto}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left text-sm font-bold text-body-text hover:text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer transition-colors"
                  >
                    <span>{faq.pregunta}</span>
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border border-panel-border text-texto-secundario transition-transform duration-200 ${abierto ? 'rotate-180 text-primary-text border-primary/40 bg-primary/10' : ''}`}>
                      <Icono nombre="chevron-abajo" tamano="xs" />
                    </span>
                  </button>

                  {abierto ? (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-texto-secundario leading-relaxed border-t border-panel-border/60">
                      {faq.respuesta}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. BANNER FINAL DE LLAMADO A LA ACCIÓN (CTA) */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-brand/10 to-accent/15 p-8 sm:p-12 lg:p-16 text-center shadow-xl relative overflow-hidden">
            <div
              className="absolute -right-20 -bottom-20 size-80 rounded-full bg-primary/20 blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-superficie px-3 py-1 text-xs font-bold text-primary-text shadow-xs mb-6">
              <Icono nombre="escudo-ok" tamano="xs" />
              Acceso Seguro Corporativo
            </span>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-body-text tracking-tight mb-4">
              ¿Listo para comenzar a trabajar?
            </h2>

            <p className="mx-auto max-w-2xl text-sm sm:text-base text-texto-secundario leading-relaxed mb-8">
              Ingresa con tus credenciales corporativas mediante Authelia SSO y descubre todas las plataformas,
              herramientas y trámites asignados a tu cuenta.
            </p>

            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary via-brand to-accent px-8 py-3.5 text-sm font-bold text-texto-sobre-accion shadow-lg shadow-primary/25 border border-arte-luz/20 hover:shadow-xl hover:shadow-primary/35 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all cursor-pointer active:scale-[0.98] text-center"
            >
              <Icono nombre="marca" tamano="sm" ariaHidden={true} />
              <span>Iniciar Sesión en Aduana</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. PIE DE PÁGINA (FOOTER) */}
      <footer className="border-t border-panel-border/80 bg-superficie py-12 text-xs text-texto-secundario">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-panel-border/60">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-superficie border border-panel-border p-1 shadow-xs transition-colors" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-7 object-contain" width={28} height={28} />
              </span>
              <div>
                <span className="text-sm font-bold text-body-text block">Aduana Enterprise</span>
                <span className="text-xs text-texto-secundario">Control de Acceso & Gobernanza TI</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
              <a href="#por-que" className="min-w-12 min-h-12 inline-flex items-center hover:text-body-text transition-colors">¿Por qué Aduana?</a>
              <a href="#como-funciona" className="min-w-12 min-h-12 inline-flex items-center hover:text-body-text transition-colors">Funcionamiento</a>
              <a href="#capturas" className="min-w-12 min-h-12 inline-flex items-center hover:text-body-text transition-colors">Capturas</a>
              <a href="#seguridad" className="min-w-12 min-h-12 inline-flex items-center hover:text-body-text transition-colors">Seguridad</a>
              <a href="#documentacion" className="min-w-12 min-h-12 inline-flex items-center hover:text-body-text transition-colors">Documentación</a>
              <Link href="/login" className="min-w-12 min-h-12 inline-flex items-center font-bold text-primary-text hover:underline">Iniciar Sesión</Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-texto-secundario/80">
            <p>© {new Date().getFullYear()} Aduana Enterprise TI. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success inline-block" aria-hidden="true" />
              <span>Autenticación OIDC federada y protección de activos activa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
