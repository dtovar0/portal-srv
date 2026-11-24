'use client';

/** Cierre de sesión: avisa a Flask y, si el backend devuelve `redirect` (`OIDC_LOGOUT_URL`), salta al cierre de Authelia. */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { Card } from './ui';

export function LogoutView() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    api.logout()
      .then((result) => {
        if (!active) return;
        // Hay que cerrar también en Authelia, o volvería a entrar solo.
        if (result.redirect) {
          window.location.href = result.redirect;
          return;
        }
        setDone(true);
      })
      .catch(() => {
        if (active) setDone(true);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo p-4 sm:p-6 select-none">
      {/* Ambient background glows de identidad Aduana */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-aduana-cyan/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-aduana-orange/10 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        <Card className="relative text-center rounded-3xl border border-aduana-border bg-panel-fill/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="pointer-events-none absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-aduana-cyan via-aduana-cyan to-aduana-orange rounded-t-3xl" aria-hidden="true" />

          <div className="space-y-6">
            {done ? (
              <>
                <div
                  className="mx-auto flex size-16 shrink-0 items-center justify-center rounded-2xl border border-aduana-border bg-superficie p-2.5 shadow-xl ring-4 ring-aduana-cyan/15"
                  aria-hidden="true"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-11 object-contain" width={44} height={44} />
                </div>

                <div>
                  <div role="status">
                    <PageHeader titleClassName="font-display text-2xl font-extrabold tracking-tight text-body-text" title="Sesión cerrada" />
                  </div>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-aduana-border bg-panel-fill/80 px-3 py-1 text-xs font-semibold text-aduana-cyan">
                    <span className="size-1.5 rounded-full bg-aduana-cyan" />
                    Desconexión segura completada
                  </span>
                  <p className="mt-2 text-xs text-label font-normal leading-relaxed">
                    Has salido de Aduana exitosamente. Tus credenciales han sido desconectadas de este dispositivo.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="group relative inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-aduana-cyan to-aduana-cyan-hover px-5 py-3 font-display text-sm font-bold tracking-wide text-arte-luz shadow-lg shadow-aduana-cyan/25 transition-all hover:brightness-110 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan"
                  >
                    <Icono nombre="flecha-izq" tamano="sm" ariaHidden={true} className="transition-transform group-hover:-translate-x-1" />
                    <span>Volver a iniciar sesión</span>
                  </Link>
                </div>
              </>
            ) : (
              <div className="py-6 space-y-4 flex flex-col items-center">
                <div
                  className="mx-auto flex size-16 shrink-0 items-center justify-center rounded-2xl border border-aduana-border bg-superficie p-2.5 shadow-xl ring-4 ring-aduana-orange/15 animate-pulse"
                  aria-hidden="true"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-11 object-contain" width={44} height={44} />
                </div>
                <p className="font-display text-lg font-bold text-body-text" role="status">
                  Cerrando sesión…
                </p>
                <p className="text-xs text-label font-normal">
                  Finalizando la sesión corporativa de forma segura…
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-panel-border/50 flex items-center justify-center gap-1.5 text-xs text-label/70">
              <Icono nombre="candado" tamano="xs" ariaHidden={true} />
              <span>Vivaro • Seguridad e Identidad Corporativa</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
