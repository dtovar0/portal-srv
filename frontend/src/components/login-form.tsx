'use client';

/**
 * Pantalla de acceso corporativo (ADR-009):
 * Diseño minimalista y limpio Split-Card:
 * Tarjeta centrada con formulario esencial a la izquierda y fotografía estética
 * a la derecha, sin sobrecarga de elementos, textos redundantes ni duplicidad de logotipos.
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
import { AccesoDenegadoView } from './acceso-denegado-view';
import { APP_TITLE } from '@/lib/branding';

/** Inicio del flujo OIDC: navegación completa, no `fetch`. */
export const URL_INICIO_OIDC = '/api/v1/auth/oidc/login';

export function LoginForm() {
  const { avisar } = useToast();
  const [context, setContext] = useState<AuthContext | null>(null);
  const [codigoError, setCodigoError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('error');
    }
    return null;
  });

  useEffect(() => {
    // Muestra el error del callback y limpia la URL para que no quede en el historial.
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('error');
    if (codigo !== null) {
      if (codigo === 'acceso_denegado') {
        setCodigoError('acceso_denegado');
        return;
      }
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

  if (codigoError === 'acceso_denegado') {
    return <AccesoDenegadoView supportEmail={context?.support_email} />;
  }

  if (!context) {
    return <PantallaCarga label="Comprobando acceso…" subtexto="Conectando con el servidor corporativo…" />;
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo text-body-text select-none p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`${APP_TITLE}: Control de Acceso`}
        description="Inicia sesión con tu cuenta corporativa para acceder a tus plataformas."
        className="sr-only"
      />

      {/* TARJETA SPLIT-CARD FLOTANTE */}
      <main className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col md:flex-row rounded-3xl border border-panel-border bg-superficie shadow-2xl transition-all">
          {/* PANEL IZQUIERDO: Formulario limpio */}
          <div className="flex w-full md:w-1/2 flex-col justify-between p-8 sm:p-12">
            {/* Único logo en la parte superior izquierda */}
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/isotype-aduana.png" alt={APP_TITLE} className="size-6 object-contain" width={24} height={24} />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-body-text">{APP_TITLE}</span>
            </div>

            {/* Núcleo de inicio de sesión */}
            <div className="my-auto py-10 space-y-6">
              <div>
                <PageHeader titleClassName="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-body-text" title="Iniciar Sesión" />
                <p className="mt-1.5 text-sm text-texto-secundario">
                  Usa tu cuenta corporativa.
                </p>
              </div>

              {context.local_login ? (
                <FormularioLoginLocal />
              ) : (
                <div className="space-y-4">
                  <Button
                    autoFocus
                    onClick={() => {
                      if (context.authelia_url && !context.oidc_enabled) {
                        window.location.href = context.authelia_url;
                        return;
                      }
                      window.location.href = URL_INICIO_OIDC;
                    }}
                    className="w-full min-h-12.5 py-3.5 px-4 bg-aduana-cyan hover:bg-aduana-cyan-hover active:scale-[0.98] font-display text-sm font-bold tracking-wide text-texto-sobre-aviso shadow-md rounded-xl border-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Icono nombre="escudo" tamano="sm" ariaHidden={true} />
                    <span>Iniciar Sesión con Authelia</span>
                  </Button>

                  {/* DIS-121: una sola línea de ayuda, sin cajas ni notas extra. */}
                  <nav aria-label="Ayuda para iniciar sesión" className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-texto-secundario">
                    <Link
                      href="/autoservicio"
                      className="min-h-12 min-w-12 inline-flex items-center font-semibold text-primary-text hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
                    >
                      ¿Olvidaste o caducó tu contraseña?
                    </Link>
                    {context.authelia_url ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <a
                          href={context.authelia_url}
                          className="min-h-12 min-w-12 inline-flex items-center text-primary-text hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Portal de Authelia ↗
                        </a>
                      </>
                    ) : null}
                  </nav>
                </div>
              )}
            </div>

            {/* Pie: solo la presentación, si la portada está activa (DIS-121). */}
            {esPortadaActiva() ? (
              <Link
                href="/"
                className="min-h-12 min-w-12 inline-flex items-center self-start text-xs text-texto-secundario hover:text-primary-text hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
              >
                Conoce {APP_TITLE}
              </Link>
            ) : null}
          </div>

          {/* PANEL DERECHO: Fotografía estética a sangre limpia */}
          <div className="relative hidden md:block md:w-1/2 min-h-115 lg:min-h-130">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/login-showcase.jpg"
              alt="Aduana"
              className="absolute inset-0 size-full object-cover rounded-r-3xl"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
