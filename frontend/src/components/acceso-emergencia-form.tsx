'use client';

/**
 * Acceso de emergencia (ADR-009 6A): correo y contraseña contra `POST /auth/local`.
 * Sin enlace visible desde `/login`; el fallo es siempre el mismo mensaje (SEC-AUTH-09).
 */

import { FormularioLoginLocal } from './formulario-login-local';
import { PageHeader } from './page-header';
import { Card } from './ui';

export function AccesoEmergenciaForm() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-fondo p-4 sm:p-6 select-none">
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-aduana-orange/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-aduana-cyan/10 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-4 flex size-16 shrink-0 items-center justify-center rounded-2xl border border-aduana-border bg-superficie p-2.5 shadow-xl ring-4 ring-aduana-orange/15"
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-11 object-contain" width={44} height={44} />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-body-text">
            Acceso de emergencia
          </h1>

          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-aduana-border bg-panel-fill/80 px-3 py-1 text-xs font-semibold text-aduana-orange">
            <span className="size-1.5 rounded-full bg-aduana-orange animate-pulse" />
            Superadmin Local • Modo Recuperación
          </span>

          <p className="mt-2 text-xs text-label font-normal max-w-xs leading-relaxed">
            Solo para la cuenta de emergencia del portal en contingencias de red.
          </p>

          <PageHeader
            title="Acceso de emergencia"
            description="Solo para la cuenta de emergencia del portal"
            className="sr-only"
          />
        </div>

        <Card className="relative rounded-3xl border border-aduana-border bg-panel-fill/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="pointer-events-none absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-aduana-orange via-aduana-orange to-aduana-cyan rounded-t-3xl" aria-hidden="true" />

          <div className="space-y-5">
            <FormularioLoginLocal />
          </div>
        </Card>
      </div>
    </div>
  );
}
