'use client';

/**
 * Pantalla de acceso corporativo (ADR-009):
 * Layout Split-Card de inspiración editorial/minimalista:
 * Tarjeta flotante centralizada con formulario en el panel izquierdo y
 * fotografía artística estética a sangre en el panel derecho.
 *
 * Flujo:
 * - Un solo botón que inicia el flujo OIDC con Authelia por navegación completa.
 * - Con Authelia apagado (`OIDC_HABILITADO=false`, FNC-158) muestra usuario y
 *   contraseña para cuentas locales.
 * - Errores de callback en `?error=<codigo>` mostrados por toast.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { mensajeErrorOidc } from '@/lib/errores-oidc';
import { esPortadaActiva } from '@/lib/portada';
import type { AuthContext } from '@/lib/types';
import { Button } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { useToast } from './toast';
import { FormularioLoginLocal } from './formulario-login-local';
import { PantallaCarga } from './ui';

/** Inicio del flujo OIDC: navegación completa, no `fetch`. */
export const URL_INICIO_OIDC = '/api/v1/auth/oidc/login';

export function LoginForm() {
  const { avisar } = useToast();
  const [context, setContext] = useState<AuthContext | null>(null);

  useEffect(() => {
    // Muestra el error del callback y limpia la URL para que no quede en el historial.
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('error');
    if (codigo !== null) {
      avisar('error', mensajeErrorOidc(codigo));
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    api.authContext()
      .then((result) => {
        if (!active) return;
        setContext(result);
        // Con sesión válida no hay nada que pedir.
        if (result.authenticated) window.location.href = '/dashboard';
      })
      .catch(() => {
        if (active) setContext({
          oidc_enabled: false, authenticated: false, emergency_available: true,
          local_login: false,
        });
      });
    return () => { active = false; };
  }, []);

  if (!context) {
    return <PantallaCarga label="Comprobando acceso…" subtexto="Conectando con el servidor corporativo…" />;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between items-center bg-fondo text-body-text select-none p-4 sm:p-6 lg:p-10">
      <PageHeader
        title="Aduana: Control de Acceso"
        description="Inicia sesión con tu cuenta corporativa para acceder a tus plataformas."
        className="sr-only"
      />

      {/* Atmósfera y luces ambientales sutiles de fondo */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[680px] rounded-full bg-aduana-cyan/10 blur-[130px] dark:bg-aduana-cyan/15" />
        <div className="absolute bottom-1/4 left-1/3 size-[500px] rounded-full bg-aduana-orange/10 blur-[130px] dark:bg-aduana-orange/10" />
        <div className="absolute inset-0 bg-[radial-gradient(var(--color-borde-sutil)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-20" />
      </div>

      {/* Cabecera superior: Enlace opcional a la portada */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1 shadow-xs transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-6 object-contain" width={24} height={24} />
          </span>
          <span className="font-display text-sm font-extrabold tracking-tight text-body-text">Aduana</span>
        </div>

        <div className="ml-auto">
          {esPortadaActiva() ? (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-panel-border/70 bg-superficie/70 px-3.5 py-1.5 text-xs font-semibold text-aduana-cyan backdrop-blur-md transition-all hover:bg-superficie hover:text-aduana-cyan-hover hover:border-aduana-cyan/40 outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan"
            >
              <Icono nombre="info" tamano="xs" ariaHidden={true} />
              <span>Conoce Aduana: Guía y Presentación de la Plataforma</span>
            </Link>
          ) : null}
        </div>
      </header>

      {/* TARJETA FLOTANTE DUAL-PANE (Split-Card inspirado en la referencia) */}
      <main className="relative z-10 my-auto w-full max-w-5xl py-4">
        <div className="relative flex flex-col md:flex-row rounded-[2rem] border border-panel-border bg-superficie/95 shadow-2xl shadow-aduana-cyan/5 backdrop-blur-xl transition-all">
          {/* Borde superior continuo con gradiente institucional */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-aduana-cyan via-aduana-cyan to-aduana-orange rounded-t-[2rem]"
            aria-hidden="true"
          />

          {/* PANEL IZQUIERDO: Formulario de Autenticación */}
          <div className="flex w-full md:w-1/2 flex-col justify-between p-8 sm:p-12 lg:p-14">
            {/* Cabecera institucional del formulario */}
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-panel-border bg-superficie p-1.5 shadow-md ring-4 ring-aduana-cyan/15 transition-transform hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-8 object-contain" width={32} height={32} />
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-extrabold tracking-tight text-body-text">Aduana</span>
                  <span className="inline-flex items-center rounded-md border border-aduana-cyan/30 bg-aduana-cyan/10 px-2 py-0.5 text-[10px] font-bold text-aduana-cyan">
                    v2.0
                  </span>
                </div>
                <span className="text-xs text-texto-secundario font-medium">Control de Acceso • Portal Vivaro</span>
              </div>
            </div>

            {/* Núcleo de interacción de login */}
            <div className="my-auto py-8">
              <div className="space-y-2 mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-panel-border/80 bg-panel-fill px-3 py-1 text-xs font-medium text-texto-secundario mb-1">
                  <span className="size-2 rounded-full bg-exito animate-pulse" />
                  <span>Portal Vivaro • Acceso Corporativo</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-body-text">
                  ¡Bienvenido de nuevo!
                </h1>
                <p className="text-xs sm:text-sm text-texto-secundario leading-relaxed">
                  Ingresa con tu cuenta corporativa para acceder a tus plataformas autorizadas.
                </p>
              </div>

              <div className="space-y-5">
                {context.local_login ? (
                  <FormularioLoginLocal />
                ) : context.oidc_enabled ? (
                  <div className="space-y-4">
                    <Button
                      autoFocus
                      onClick={() => { window.location.href = URL_INICIO_OIDC; }}
                      className="group relative w-full min-h-[52px] py-3.5 px-4 bg-gradient-to-r from-aduana-cyan to-aduana-cyan-hover hover:brightness-110 active:scale-[0.98] font-display text-sm font-bold tracking-wide text-texto-sobre-accion shadow-lg shadow-aduana-cyan/25 rounded-xl border-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="transition-transform group-hover:scale-110" />
                      <span>Entrar con Authelia</span>
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-center text-xs text-texto-secundario pt-1">
                      <Icono nombre="candado" tamano="xs" ariaHidden={true} className="text-aduana-cyan" />
                      <span>Autenticación federada SSO con doble factor</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center space-y-3">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-aviso-borde bg-aviso-tenue text-aviso-texto">
                      <Icono nombre="aviso" tamano="md" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-body-text">Servicio SSO no disponible</h3>
                      <p className="text-xs text-label leading-relaxed" role="status">
                        El inicio de sesión con Authelia no está disponible por ahora.
                      </p>
                    </div>
                    <p className="text-[11px] text-texto-secundario border-t border-panel-border/60 pt-3">
                      Contacta al administrador de sistemas o prueba más tarde.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pie de seguridad del formulario */}
            <div className="pt-4 border-t border-panel-border/60 flex items-center justify-between text-xs text-texto-secundario">
              <div className="flex items-center gap-1.5">
                <Icono nombre="candado" tamano="xs" ariaHidden={true} />
                <span>Vivaro • Identidad Segura</span>
              </div>
              <span className="text-[11px]">Cifrado TLS 1.3</span>
            </div>
          </div>

          {/* PANEL DERECHO: Fotografía Artística Estética a Sangre */}
          <div className="relative hidden md:block md:w-1/2 min-h-[480px] lg:min-h-[580px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/login-showcase.jpg"
              alt="Vivaro Identidad y Arquitectura"
              className="absolute inset-0 size-full object-cover rounded-b-[2rem] md:rounded-b-none md:rounded-r-[2rem]"
            />

            {/* Velo degradado sutil para integración y contraste */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-superficie-hundida/80 via-superficie-hundida/20 to-transparent rounded-b-[2rem] md:rounded-b-none md:rounded-r-[2rem]"
              aria-hidden="true"
            />

            {/* Detalle de costura: Icono flotante entre paneles (inspirado en la referencia) */}
            <div
              className="absolute -left-5 top-1/2 -translate-y-1/2 size-10 rounded-full border border-panel-border bg-superficie shadow-xl flex items-center justify-center text-aduana-cyan z-20 transition-transform hover:scale-110"
              aria-hidden="true"
            >
              <Icono nombre="candado" tamano="xs" />
            </div>

            {/* Pastilla flotante con diseño glassmorphism al pie de la imagen */}
            <div className="absolute bottom-6 inset-x-6 z-10">
              <div className="rounded-2xl border border-panel-border/80 bg-superficie/85 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-aduana-cyan/15 text-aduana-cyan">
                      <Icono nombre="escudo-ok" tamano="xs" />
                    </span>
                    <div>
                      <span className="block text-xs font-bold text-body-text">Infraestructura Confiable</span>
                      <span className="block text-[11px] text-texto-secundario">Control de accesos y gobernanza unificada</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-exito uppercase tracking-wider">
                    <span className="size-1.5 rounded-full bg-exito animate-pulse" />
                    Activo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Pie de página exterior */}
      <footer className="relative z-10 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 text-xs text-texto-secundario border-t border-panel-border/30 text-center sm:text-left">
        <span>Vivaro • Gobernanza y Control Centralizado de Accesos TI</span>
        <span className="text-[11px]">Plataforma Corporativa Aduana</span>
      </footer>
    </div>
  );
}
