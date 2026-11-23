'use client';

/**
 * Pantalla de acceso (ADR-009): un solo botón que inicia el flujo OIDC con
 * Authelia por navegación completa (el portal nunca ve tokens). La cuenta de
 * emergencia vive en `/acceso-emergencia`, sin enlace desde aquí. Los errores
 * del callback llegan en `?error=<codigo>` y se muestran por toast.
 * Con Authelia apagado (`OIDC_HABILITADO=false`, FNC-158) muestra usuario y
 * contraseña: solo entran cuentas locales.
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
    <div className="relative flex min-h-screen w-full flex-col lg:flex-row bg-fondo select-none">
      <PageHeader
        title="Aduana: Control de Acceso"
        description="Inicia sesión con tu cuenta corporativa para acceder a tus plataformas."
        className="sr-only"
      />

      {/* PANEL IZQUIERDO: Escaparate Institucional de Marca & Seguridad (Desktop) */}
      <div className="relative hidden w-full lg:flex lg:w-1/2 xl:w-5/12 flex-col justify-between border-r border-panel-border/60 bg-[#0B131D] p-8 lg:p-12 text-white">
        {/* Glows y atmósfera espacial/tecnológica */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-aduana-cyan/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-aduana-orange/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#334A60_1px,transparent_1px)] [background-size:24px_24px] opacity-35" aria-hidden="true" />

        {/* Cabecera de marca superior izquierda */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 p-1.5 shadow-lg ring-4 ring-aduana-cyan/15 backdrop-blur-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-8 object-contain" width={32} height={32} />
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold tracking-tight text-white">Aduana</span>
              <span className="inline-flex items-center rounded-full border border-aduana-cyan/30 bg-aduana-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-aduana-cyan">
                v2.0
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Control de Acceso • Portal Vivaro</span>
          </div>
        </div>

        {/* Sección central: Pilares de Seguridad y Gobernanza Zero-Trust */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="space-y-2 max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Infraestructura Corporativa Segura
            </span>
            <h2 className="font-display text-3xl font-black tracking-tight text-white leading-tight">
              El acceso correcto. <br />
              <span className="bg-gradient-to-r from-aduana-cyan via-slate-100 to-aduana-orange bg-clip-text text-transparent">
                Para cada persona.
              </span>
            </h2>
            <p className="text-sm text-slate-300/90 leading-relaxed pt-1">
              Plataforma unificada de gestión de identidades, auditoría de credenciales y catálogo de herramientas bajo estándares Zero-Trust.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-xs transition-all hover:bg-white/[0.07]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-aduana-cyan/30 bg-aduana-cyan/10 text-aduana-cyan">
                <Icono nombre="candado" tamano="sm" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Federación Zero-Trust</h3>
                <p className="text-xs text-slate-300/80 leading-relaxed mt-0.5">
                  Autenticación SSO perimetral con doble factor (MFA) y verificación continua de sesiones.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-xs transition-all hover:bg-white/[0.07]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-aduana-orange/30 bg-aduana-orange/10 text-aduana-orange">
                <Icono nombre="plataformas" tamano="sm" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Launchpad Unificado</h3>
                <p className="text-xs text-slate-300/80 leading-relaxed mt-0.5">
                  Acceso inmediato a herramientas de nube, plataformas operativas y aplicaciones internas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-xs transition-all hover:bg-white/[0.07]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
                <Icono nombre="aprobaciones" tamano="sm" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Trazabilidad Total</h3>
                <p className="text-xs text-slate-300/80 leading-relaxed mt-0.5">
                  Bitácora inmutable de eventos, firmas de cartas responsivas y erradicación de Shadow IT.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del panel izquierdo */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Vivaro • Telecomunicaciones y Medios</span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Sistemas Operativos
          </span>
        </div>
      </div>

      {/* PANEL DERECHO: Tarjeta de Acceso y Acciones */}
      <div className="relative flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-16">
        {/* Glow sutil en mobile */}
        <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-aduana-cyan/10 blur-3xl lg:hidden" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-aduana-orange/10 blur-3xl lg:hidden" aria-hidden="true" />

        {/* Cabecera superior derecha (Mobile o enlaces auxiliares) */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1 shadow-sm">
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-aduana-cyan hover:text-aduana-cyan-hover hover:underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan rounded-lg px-2.5 py-1.5"
              >
                <Icono nombre="info" tamano="xs" ariaHidden={true} />
                <span>Conoce Aduana: Guía y Presentación de la Plataforma</span>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Contenedor de la Tarjeta de Autenticación */}
        <div className="relative z-10 mx-auto my-auto w-full max-w-md py-8">
          <div className="mb-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-aduana-border bg-panel-fill/80 px-3 py-1 text-xs font-semibold text-aduana-cyan mb-3">
              <span className="size-1.5 rounded-full bg-aduana-cyan animate-pulse" />
              Identidad Corporativa Vivaro
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-body-text">
              Iniciar Sesión
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-texto-secundario leading-relaxed">
              Ingresa con tus credenciales institucionales para acceder a tus plataformas autorizadas.
            </p>
          </div>

          <Card className="relative rounded-3xl border border-aduana-border bg-panel-fill/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="pointer-events-none absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-aduana-cyan via-aduana-cyan to-aduana-orange rounded-t-3xl" aria-hidden="true" />

            <div className="space-y-5">
              {context.local_login ? (
                <FormularioLoginLocal />
              ) : context.oidc_enabled ? (
                <div className="space-y-4">
                  <Button
                    autoFocus
                    onClick={() => { window.location.href = URL_INICIO_OIDC; }}
                    className="w-full py-3.5 min-h-12 bg-gradient-to-r from-aduana-cyan to-aduana-cyan-hover hover:brightness-110 active:scale-[0.98] font-display text-sm font-bold tracking-wide text-white shadow-lg shadow-aduana-cyan/25 rounded-xl border-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icono nombre="aprobar" tamano="sm" ariaHidden={true} />
                    <span>Entrar con Authelia</span>
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-center text-[11px] text-texto-secundario">
                    <Icono nombre="candado" tamano="xs" />
                    <span>Federación SSO segura con protocolo OpenID Connect</span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center space-y-3">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
                    <Icono nombre="aviso" tamano="md" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-body-text">Autenticación SSO Desconectada</h3>
                    <p className="mt-1 text-xs text-label leading-relaxed" role="status">
                      El inicio de sesión con Authelia no está disponible por ahora.
                    </p>
                  </div>
                  <p className="text-[11px] text-texto-secundario border-t border-panel-border/60 pt-3">
                    Comprueba la conexión con el servidor o contacta al administrador de sistemas.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-texto-secundario text-center">
            <Icono nombre="candado" tamano="xs" ariaHidden={true} />
            <span>Vivaro • Seguridad e Identidad Corporativa</span>
          </div>
        </div>

        {/* Pie inferior derecho */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-label/60 pt-4 border-t border-panel-border/40 text-center sm:text-left">
          <span>Vivaro • Gobernanza y Control Centralizado de Accesos TI</span>
          <span className="text-[10px] text-label/50">Cifrado TLS 1.3 • Zero-Trust</span>
        </div>
      </div>
    </div>
  );
}
