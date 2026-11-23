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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-fondo p-4 sm:p-6 select-none">
      {/* Ambient background glows de identidad Aduana */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-aduana-cyan/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-aduana-orange/10 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        {/* Cabecera institucional con isotipo oficial */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-4 flex size-16 shrink-0 items-center justify-center rounded-2xl border border-aduana-border bg-superficie p-2.5 shadow-xl ring-4 ring-aduana-cyan/15"
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-11 object-contain" width={44} height={44} />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-body-text">
            Aduana
          </h1>

          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-aduana-border bg-panel-fill/80 px-3 py-1 text-xs font-semibold text-aduana-cyan">
            <span className="size-1.5 rounded-full bg-aduana-cyan animate-pulse" />
            Control de Acceso • Portal Vivaro
          </span>

          <p className="mt-2 text-xs text-label font-normal max-w-xs leading-relaxed">
            Inicia sesión con tu cuenta corporativa para acceder a tus plataformas.
          </p>

          <PageHeader
            title="Aduana: Control de Acceso"
            description="Inicia sesión con tu cuenta corporativa para acceder a tus plataformas."
            className="sr-only"
          />
        </div>

        {/* Tarjeta principal de acceso */}
        <Card className="relative overflow-hidden space-y-5 rounded-3xl border border-aduana-border bg-panel-fill/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="h-1 w-full bg-gradient-to-r from-aduana-cyan via-aduana-cyan to-aduana-orange rounded-t-3xl -mt-6 -mx-6 sm:-mt-8 sm:-mx-8 mb-6 overflow-hidden" aria-hidden="true" />

          {context.local_login ? (
            <FormularioLoginLocal />
          ) : context.oidc_enabled ? (
            <Button
              // Única acción de la pantalla: el foco empieza en ella.
              autoFocus
              onClick={() => { window.location.href = URL_INICIO_OIDC; }}
              className="w-full py-3 min-h-12 bg-gradient-to-r from-aduana-cyan to-aduana-cyan-hover hover:brightness-110 active:scale-[0.98] font-display font-bold text-white shadow-lg shadow-aduana-cyan/25 rounded-xl border-0 transition-all flex items-center justify-center gap-2"
            >
              <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
              Entrar con Authelia
            </Button>
          ) : (
            <p className="text-sm text-label text-center py-2" role="status">
              El inicio de sesión con Authelia no está disponible por ahora.
            </p>
          )}
        </Card>

        {/* Pie de pantalla */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          {esPortadaActiva() ? (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 text-xs font-semibold text-aduana-cyan hover:text-aduana-cyan-hover hover:underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan rounded-lg px-3 py-1.5"
            >
              <Icono nombre="info" tamano="xs" ariaHidden={true} />
              <span>Conoce Aduana: Guía y Presentación de la Plataforma</span>
            </Link>
          ) : null}

          <span className="text-[11px] text-label/60">
            Vivaro • Gobernanza y Control Centralizado de Accesos TI
          </span>
        </div>

      </div>
    </div>
  );
}
