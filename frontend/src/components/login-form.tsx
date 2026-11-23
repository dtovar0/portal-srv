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
        title="Aduana: Control de Acceso"
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
                <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-6 object-contain" width={24} height={24} />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-body-text">Aduana</span>
            </div>

            {/* Núcleo de inicio de sesión */}
            <div className="my-auto py-10 space-y-6">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-body-text">
                  Iniciar Sesión
                </h1>
                <p className="mt-1.5 text-sm text-texto-secundario">
                  Ingresa con tu cuenta corporativa para continuar.
                </p>
              </div>

              {context.local_login ? (
                <FormularioLoginLocal />
              ) : context.oidc_enabled ? (
                <div className="space-y-4">
                  <Button
                    autoFocus
                    onClick={() => { window.location.href = URL_INICIO_OIDC; }}
                    className="w-full min-h-[50px] py-3.5 px-4 bg-aduana-cyan hover:bg-aduana-cyan-hover active:scale-[0.98] font-display text-sm font-bold tracking-wide text-texto-sobre-accion shadow-md rounded-xl border-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Icono nombre="aprobar" tamano="sm" ariaHidden={true} />
                    <span>Entrar con Authelia</span>
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-texto-secundario text-center">
                    <Icono nombre="candado" tamano="xs" ariaHidden={true} />
                    <span>Autenticación federada SSO</span>
                  </p>
                </div>
              ) : (
                <div className="py-2 text-center space-y-2">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-aviso-borde bg-aviso-tenue text-aviso-texto">
                    <Icono nombre="aviso" tamano="sm" />
                  </div>
                  <p className="text-xs text-label leading-relaxed" role="status">
                    El inicio de sesión con Authelia no está disponible por ahora.
                  </p>
                  <p className="text-[11px] text-texto-secundario">
                    Contacta a soporte técnico para asistencia.
                  </p>
                </div>
              )}
            </div>

            {/* Enlaces y notas al pie del formulario */}
            <div className="space-y-2 pt-4 border-t border-panel-border/40 text-xs text-texto-secundario">
              {esPortadaActiva() ? (
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-aduana-cyan hover:underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan"
                  >
                    <span>Conoce Aduana: Guía y Presentación de la Plataforma</span>
                  </Link>
                </div>
              ) : null}
              <p className="text-[11px] text-texto-tenue">
                Vivaro • Gobernanza y Control Centralizado de Accesos TI
              </p>
            </div>
          </div>

          {/* PANEL DERECHO: Fotografía estética a sangre limpia */}
          <div className="relative hidden md:block md:w-1/2 min-h-[460px] lg:min-h-[520px]">
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
