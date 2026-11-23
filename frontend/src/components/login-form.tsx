'use client';

/**
 * Pantalla de acceso corporativo (ADR-009):
 * Layout split-screen visual con escaparate de interfaz (capturas reales) en
 * escritorio y tarjeta de autenticación enfocada.
 *
 * Flujo:
 * - Un solo botón que inicia el flujo OIDC con Authelia por navegación completa.
 * - Con Authelia apagado (`OIDC_HABILITADO=false`, FNC-158) muestra usuario y
 *   contraseña para cuentas locales.
 * - La cuenta administrativa de contingencia se atiende en `/acceso-emergencia`.
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
import { Card, PantallaCarga } from './ui';

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
    <div className="relative flex min-h-screen w-full flex-col lg:flex-row bg-fondo text-body-text select-none">
      <PageHeader
        title="Aduana: Control de Acceso"
        description="Inicia sesión con tu cuenta corporativa para acceder a tus plataformas."
        className="sr-only"
      />

      {/* PANEL IZQUIERDO (Desktop): Escaparate Visual de la Plataforma */}
      <div className="relative hidden w-full lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between border-r border-panel-border/60 bg-superficie-hundida p-8 lg:p-12">
        {/* Atmósfera y luces ambientales sutiles */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 -left-24 size-96 rounded-full bg-aduana-cyan/10 blur-[100px]" />
          <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-aduana-orange/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(var(--color-borde-sutil)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-20" />
        </div>

        {/* Cabecera de marca superior izquierda */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-panel-border bg-superficie p-1.5 shadow-md ring-4 ring-aduana-cyan/15 transition-colors">
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

        {/* Centro visual: Ventana de interfaz de la plataforma */}
        <div className="relative z-10 my-auto py-8 max-w-xl mx-auto w-full">
          <div className="rounded-3xl border border-panel-border/80 bg-superficie/90 p-3 shadow-2xl shadow-aduana-cyan/5 backdrop-blur-xl transition-all">
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-error/80" />
                <span className="size-2.5 rounded-full bg-warning/80" />
                <span className="size-2.5 rounded-full bg-success/80" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-texto-secundario">
                <Icono nombre="escudo-ok" tamano="xs" ariaHidden={true} className="text-aduana-cyan" />
                <span>Catálogo Unificado de Plataformas</span>
              </span>
            </div>
            <div className="rounded-2xl border border-panel-border bg-superficie-hundida">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/catalogo-plataformas.png"
                alt="Catálogo de plataformas de Aduana"
                className="rounded-2xl block h-auto w-full object-cover shadow-xs"
                fetchPriority="high"
              />
            </div>
          </div>
        </div>

        {/* Pie del panel izquierdo */}
        <div className="relative z-10 pt-4 border-t border-panel-border/40 flex items-center justify-between text-xs text-texto-secundario">
          <span>Vivaro • Telecomunicaciones y Medios</span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-exito" />
            Sistemas Operativos
          </span>
        </div>
      </div>

      {/* PANEL DERECHO: Tarjeta de Acceso y Acciones */}
      <div className="relative flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Cabecera superior derecha (Mobile y enlace a portada) */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-7 object-contain" width={28} height={28} />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-body-text">Aduana</span>
              <span className="text-[11px] text-texto-secundario">Control de Acceso</span>
            </div>
          </div>

          <div className="ml-auto">
            {esPortadaActiva() ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-panel-border/70 bg-superficie/60 px-3 py-1.5 text-xs font-semibold text-aduana-cyan backdrop-blur-md transition-all hover:bg-superficie hover:text-aduana-cyan-hover hover:border-aduana-cyan/40 outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan"
              >
                <Icono nombre="info" tamano="xs" ariaHidden={true} />
                <span>Conoce Aduana: Guía y Presentación de la Plataforma</span>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Contenedor de la Tarjeta de Autenticación */}
        <div className="relative z-10 mx-auto my-auto w-full max-w-[420px] py-8">
          <Card className="relative rounded-3xl border border-panel-border bg-superficie/95 p-8 sm:p-10 shadow-2xl shadow-aduana-cyan/5 backdrop-blur-xl transition-all">
            {/* Borde superior continuo con gradiente institucional */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-aduana-cyan via-aduana-cyan to-aduana-orange rounded-t-3xl"
              aria-hidden="true"
            />

            {/* Cabecera de la tarjeta: Logo e indicadores */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl border border-panel-border bg-superficie p-2 shadow-md ring-4 ring-aduana-cyan/15 transition-transform hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/isotype-aduana.png"
                  alt="Aduana"
                  className="size-10 object-contain"
                  width={40}
                  height={40}
                />
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-panel-border/80 bg-panel-fill px-3 py-1 text-xs font-medium text-texto-secundario mb-2">
                <span className="size-2 rounded-full bg-exito animate-pulse" />
                <span>Portal Vivaro • Acceso Corporativo</span>
              </div>

              <h1 className="font-display text-2xl font-black tracking-tight text-body-text sm:text-3xl">
                Iniciar Sesión
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-texto-secundario leading-relaxed">
                Ingresa con tu cuenta corporativa para acceder a tus plataformas autorizadas.
              </p>
            </div>

            {/* Contenido interactivo según el estado de autenticación */}
            <div className="mt-8 space-y-5">
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

            {/* Pie interno de la tarjeta */}
            <div className="mt-8 border-t border-panel-border/60 pt-5 flex items-center justify-center gap-2 text-xs text-texto-secundario text-center">
              <Icono nombre="candado" tamano="xs" ariaHidden={true} />
              <span>Vivaro • Seguridad e Identidad Corporativa</span>
            </div>
          </Card>
        </div>

        {/* Pie inferior derecho */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-texto-secundario pt-4 border-t border-panel-border/40 text-center sm:text-left">
          <span>Vivaro • Gobernanza y Control Centralizado de Accesos TI</span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="size-1.5 rounded-full bg-exito" />
            <span>Conexión Cifrada TLS 1.3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
