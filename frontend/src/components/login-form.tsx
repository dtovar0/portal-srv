'use client';

/**
 * Pantalla de acceso corporativo (ADR-009):
 * Enfoque exclusivo en autenticación e identidad. No muestra contenido de
 * marketing ni presentación de la plataforma (reservado para la portada `/`).
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
    <div className="relative flex min-h-screen w-full flex-col justify-between bg-fondo text-body-text select-none">
      <PageHeader
        title="Aduana: Control de Acceso"
        description="Inicia sesión con tu cuenta corporativa para acceder a tus plataformas."
        className="sr-only"
      />

      {/* Atmósfera y profundidad de fondo (luces ambientales sutiles y cuadrícula técnica) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[620px] rounded-full bg-aduana-cyan/10 blur-[120px] dark:bg-aduana-cyan/15" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-aduana-orange/10 blur-[120px] dark:bg-aduana-orange/10" />
        <div className="absolute inset-0 bg-[radial-gradient(var(--color-borde-sutil)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-20" />
      </div>

      {/* BARRA SUPERIOR: Identidad discreta y enlace opcional a portada */}
      <header className="relative z-10 flex w-full items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1.5 shadow-xs transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-7 object-contain" width={28} height={28} />
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold tracking-tight text-body-text">Aduana</span>
              <span className="inline-flex items-center rounded-md border border-aduana-cyan/30 bg-aduana-cyan/10 px-1.5 py-0.2 text-[10px] font-bold text-aduana-cyan">
                v2.0
              </span>
            </div>
            <span className="text-[11px] text-texto-secundario">Control de Acceso</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
      </header>

      {/* ÁREA CENTRAL: Tarjeta de Acceso Corporativo con enfoque puro */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[440px]">
          <Card className="relative rounded-3xl border border-panel-border bg-superficie/95 p-8 sm:p-10 shadow-2xl shadow-aduana-cyan/5 backdrop-blur-xl transition-all">
            {/* Borde superior continuo con gradiente institucional */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-aduana-cyan via-aduana-cyan to-aduana-orange rounded-t-3xl"
              aria-hidden="true"
            />

            {/* Cabecera de la tarjeta: Logo e indicadores de autenticación */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl border border-panel-border bg-superficie p-2.5 shadow-md ring-4 ring-aduana-cyan/15 transition-transform hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/isotype-aduana.png"
                  alt="Aduana"
                  className="size-11 object-contain"
                  width={44}
                  height={44}
                />
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-panel-border/80 bg-panel-fill px-3 py-1 text-xs font-medium text-texto-secundario mb-3">
                <span className="size-2 rounded-full bg-exito animate-pulse" />
                <span>Portal Vivaro • Acceso Corporativo</span>
              </div>

              <h1 className="font-display text-2xl font-black tracking-tight text-body-text sm:text-3xl">
                Iniciar Sesión
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-texto-secundario max-w-xs leading-relaxed">
                Ingresa con tu cuenta corporativa para acceder al catálogo unificado de plataformas.
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
      </main>

      {/* BARRA INFERIOR: Metadata institucional y seguridad perimetral */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-5 sm:px-10 text-xs text-texto-secundario border-t border-panel-border/40 text-center sm:text-left">
        <span>Vivaro • Gobernanza y Control Centralizado de Accesos TI</span>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="size-1.5 rounded-full bg-exito" />
          <span>Conexión Cifrada TLS 1.3</span>
        </div>
      </footer>
    </div>
  );
}
