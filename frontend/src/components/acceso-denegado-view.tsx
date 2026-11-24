'use client';

/**
 * Pantalla de Acceso Denegado (ADUANA):
 * Desplegada cuando una cuenta corporativa autenticada no pertenece a ningún
 * grupo autorizado (principio Deny by Default).
 *
 * Ofrece:
 * - Mensaje institucional de acceso denegado.
 * - Instrucciones de contacto con su superior o correo de soporte (SUPPORT_EMAIL).
 * - Enlace directo mailto: para agilizar la solicitud.
 * - Temporizador con barra de progreso y auto-refresh para reintentar OIDC automáticamente
 *   cuando el superior otorgue los permisos.
 * - Controles interactivos: Reintentar ahora, Pausar/Reanudar, Volver al Login.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { APP_TITLE } from '@/lib/branding';

export const URL_INICIO_OIDC = '/api/v1/auth/oidc/login';
const SEGUNDOS_TEMPORIZADOR = 15;

interface AccesoDenegadoViewProps {
  supportEmail?: string;
}

export function AccesoDenegadoView({ supportEmail: emailProp }: AccesoDenegadoViewProps) {
  const emailSoporte =
    emailProp ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    'aduana-app@vivaro.com';

  const [segundos, setSegundos] = useState(SEGUNDOS_TEMPORIZADOR);
  const [pausado, setPausado] = useState(false);
  const [reintentando, setReintentando] = useState(false);

  // Cuenta regresiva y auto-refresh
  useEffect(() => {
    if (pausado || reintentando) return;

    if (segundos <= 0) {
      setReintentando(true);
      window.location.href = URL_INICIO_OIDC;
      return;
    }

    const timer = setTimeout(() => {
      setSegundos((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [segundos, pausado, reintentando]);

  function reintentarAhora() {
    setReintentando(true);
    window.location.href = URL_INICIO_OIDC;
  }

  function togglePausa() {
    setPausado((prev) => !prev);
  }

  const porcentajeProgreso = Math.max(0, Math.min(100, (segundos / SEGUNDOS_TEMPORIZADOR) * 100));

  const mailtoUrl = `mailto:${emailSoporte}?subject=${encodeURIComponent(
    'Solicitud de acceso a plataforma ADUANA'
  )}&body=${encodeURIComponent(
    'Hola,\n\nSolicito la asignación de acceso a la plataforma ADUANA para mi cuenta corporativa.\n\nGracias.'
  )}`;

  // DIS-123: misma tarjeta dividida que el login (DIS-121), sin cajas anidadas;
  // los dos botones del reintento tienen el mismo ancho y estilo.
  const estadoReintento = reintentando
    ? 'Comprobando tu acceso…'
    : pausado
    ? 'Reintento automático en pausa.'
    : `Volveremos a intentarlo en ${segundos} s.`;

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo text-body-text select-none p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`Sin acceso — ${APP_TITLE}`}
        description={`Tu cuenta no cuenta con permisos para ingresar a ${APP_TITLE}.`}
        className="sr-only"
      />

      <main className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col md:flex-row rounded-3xl border border-panel-border bg-superficie shadow-2xl">
          {/* PANEL IZQUIERDO */}
          <div className="flex w-full md:w-1/2 flex-col justify-between p-8 sm:p-12">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/isotype-aduana.png" alt={APP_TITLE} className="size-6 object-contain" width={24} height={24} />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-body-text">{APP_TITLE}</span>
            </div>

            <div className="my-auto py-10 space-y-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-peligro-tenue px-2.5 py-1 text-xs font-semibold text-peligro-texto">
                  <Icono nombre="candado" tamano="xs" ariaHidden={true} />
                  Sin acceso
                </span>
                <PageHeader
                  titleClassName="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-body-text"
                  title={`Aún no tienes acceso a ${APP_TITLE}`}
                />
                <p className="text-sm text-texto-secundario leading-relaxed">
                  Tu cuenta corporativa todavía no está autorizada. Pide el alta a tu
                  superior o escribe a soporte.
                </p>
              </div>

              <a
                href={mailtoUrl}
                className="flex min-h-12.5 w-full items-center justify-center gap-2.5 rounded-xl bg-aduana-cyan hover:bg-aduana-cyan-hover px-4 py-3.5 font-display text-sm font-bold tracking-wide text-texto-sobre-aviso shadow-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
              >
                <Icono nombre="correo" tamano="sm" ariaHidden={true} />
                <span>Escribir a soporte</span>
              </a>
              <p className="-mt-3 text-center text-xs text-texto-secundario">
                {emailSoporte}
              </p>

              {/* Reintento automático: una línea, la barra y dos botones iguales */}
              <section aria-label="Reintento automático" className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-texto-secundario" aria-live="polite">
                  <Icono nombre="reloj" tamano="xs" ariaHidden={true} />
                  <span>{estadoReintento}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-panel-border/40" aria-hidden="true">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear w-progreso ${
                      pausado ? 'bg-texto-tenue' : 'bg-aduana-cyan'
                    }`}
                    style={{
                      '--ancho-progreso': `${reintentando ? 100 : porcentajeProgreso}%`,
                    } as React.CSSProperties}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={reintentarAhora}
                    disabled={reintentando}
                  >
                    {reintentando ? 'Comprobando…' : 'Reintentar'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={togglePausa}
                    disabled={reintentando}
                    title={pausado ? 'Reanudar el reintento automático' : 'Pausar el reintento automático'}
                  >
                    {pausado ? 'Reanudar' : 'Pausar'}
                  </Button>
                </div>
              </section>
            </div>

            <Link
              href="/login"
              className="min-h-12 min-w-12 inline-flex items-center self-start text-xs text-texto-secundario hover:text-primary-text hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>

          {/* PANEL DERECHO: la misma fotografía del login */}
          <div className="relative hidden md:block md:w-1/2 min-h-115 lg:min-h-130">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/login-showcase.jpg"
              alt=""
              className="absolute inset-0 size-full object-cover rounded-r-3xl"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
