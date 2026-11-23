'use client';

/**
 * Acceso de emergencia (ADR-009 6A): correo y contraseña contra `POST /auth/local`.
 * Diseño Split-Card minimalista con formulario esencial a la izquierda y fotografía
 * estética a la derecha, en total armonía con la pantalla principal de acceso.
 */

import Link from 'next/link';
import Link from 'next/link';
import { FormularioLoginLocal } from './formulario-login-local';
import { PageHeader } from './page-header';
import { APP_TITLE } from '@/lib/branding';

export function AccesoEmergenciaForm() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo text-body-text select-none p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Acceso de emergencia"
        description="Solo para la cuenta de emergencia del portal"
        className="sr-only"
      />

      {/* TARJETA SPLIT-CARD FLOTANTE */}
      <main className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col md:flex-row rounded-3xl border border-panel-border bg-superficie shadow-2xl transition-all">
          {/* PANEL IZQUIERDO: Formulario de Recuperación Local */}
          <div className="flex w-full md:w-1/2 flex-col justify-between p-8 sm:p-12">
            {/* Cabecera de marca con insignia de contingencia */}
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/isotype-aduana.png" alt={APP_TITLE} className="size-6 object-contain" width={24} height={24} />
              </span>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold tracking-tight text-body-text">{APP_TITLE}</span>
                <span className="inline-flex items-center rounded-md border border-aduana-orange/30 bg-aduana-orange/10 px-1.5 py-0.5 text-[10px] font-bold text-aduana-orange">
                  Recuperación
                </span>
              </div>
            </div>

            {/* Núcleo del formulario */}
            <div className="my-auto py-8 space-y-6">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-body-text">
                  Acceso de emergencia
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-texto-secundario leading-relaxed">
                  Solo para la cuenta de emergencia del portal en contingencias de red.
                </p>
              </div>

              <div className="space-y-4">
                <FormularioLoginLocal />
              </div>
            </div>

            {/* Pie de navegación de emergencia */}
            <div className="space-y-2 pt-4 border-t border-panel-border/40 text-xs text-texto-secundario">
              <div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-aduana-cyan hover:underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan"
                >
                  <span>← Volver al inicio de sesión corporativo</span>
                </Link>
              </div>
              <p className="text-[11px] text-texto-tenue">
                Vivaro • Superadmin Local • Modo Recuperación
              </p>
            </div>
          </div>

          {/* PANEL DERECHO: Fotografía estética a sangre limpia */}
          <div className="relative hidden md:block md:w-1/2 min-h-[460px] lg:min-h-[520px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/login-showcase.jpg"
              alt="Aduana Recuperación"
              className="absolute inset-0 size-full object-cover rounded-r-3xl"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
