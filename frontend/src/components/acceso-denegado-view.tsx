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

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo text-body-text select-none p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Sin acceso — ADUANA"
        description="Tu cuenta no cuenta con permisos para ingresar a ADUANA."
        className="sr-only"
      />

      <main className="relative z-10 w-full max-w-lg">
        <div className="rounded-3xl border border-panel-border bg-superficie shadow-2xl p-6 sm:p-8 space-y-6 transition-all">
          {/* Cabecera institucional */}
          <div className="flex items-center justify-between pb-4 border-b border-panel-border/50">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/isotype-aduana.png" alt={APP_TITLE} className="size-6 object-contain" width={24} height={24} />
              </span>
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-body-text">
                {APP_TITLE} <span className="text-texto-secundario font-normal">· Control de Acceso</span>
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">
              <span className="size-1.5 rounded-full bg-danger animate-pulse" />
              403 · SIN ACCESO
            </span>
          </div>

          {/* Mensaje principal */}
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-body-text">
              Sin acceso a la plataforma
            </h1>
            <p className="text-sm text-texto-secundario leading-relaxed">
              No tienes acceso a la plataforma {APP_TITLE} con tu cuenta corporativa actual. Comunícate con tu superior inmediato para que gestione tu alta o envía un correo a soporte:
            </p>
          </div>

          {/* Bloque de correo de soporte */}
          <div className="rounded-2xl border border-panel-border bg-fondo/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-texto-secundario uppercase tracking-wider">
                Soporte y Solicitudes
              </span>
              <span className="text-xs text-aduana-cyan font-mono font-bold">{emailSoporte}</span>
            </div>

            <a
              href={mailtoUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-aduana-cyan hover:bg-aduana-cyan-hover text-white font-bold text-sm py-3 px-4 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-aduana-cyan/50 active:scale-[0.98]"
            >
              <Icono nombre="correo" tamano="sm" ariaHidden={true} />
              <span>Enviar correo a {emailSoporte}</span>
            </a>
          </div>

          {/* Temporizador y auto-refresh */}
          <div className="rounded-2xl border border-panel-border/80 bg-superficie-elevada p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-texto-secundario font-medium">
                <Icono nombre="reloj" tamano="xs" ariaHidden={true} />
                <span>
                  {reintentando
                    ? 'Comprobando acceso con Authelia…'
                    : pausado
                    ? 'Temporizador en pausa'
                    : `Reintentando acceso automáticamente en ${segundos}s`}
                </span>
              </div>
              <span className="font-mono font-bold text-body-text">
                {reintentando ? '…' : `${segundos}s`}
              </span>
            </div>

            {/* Barra regresiva animada */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-border/40">
              <div
                className={`h-full transition-all duration-1000 ease-linear w-[var(--ancho-progreso)] ${
                  pausado ? 'bg-texto-tenue' : 'bg-aduana-cyan'
                }`}
                style={{
                  '--ancho-progreso': `${reintentando ? 100 : porcentajeProgreso}%`,
                } as React.CSSProperties}
              />
            </div>

            {/* Botones de acción del temporizador */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={reintentarAhora}
                disabled={reintentando}
              >
                <Icono nombre="recargar" tamano="xs" className={reintentando ? 'animate-spin' : ''} ariaHidden={true} />
                <span>{reintentando ? 'Comprobando…' : 'Reintentar ahora'}</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={togglePausa}
                disabled={reintentando}
                title={pausado ? 'Reanudar temporizador automático' : 'Pausar temporizador automático'}
              >
                <span>{pausado ? 'Reanudar' : 'Pausar'}</span>
              </Button>
            </div>
          </div>

          {/* Pie de navegación */}
          <div className="pt-2 border-t border-panel-border/40 flex items-center justify-between text-xs text-texto-secundario">
            <Link
              href="/login"
              className="text-aduana-cyan hover:underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan"
            >
              ← Volver al inicio de sesión
            </Link>
            <span className="text-[11px] text-texto-tenue">
              Vivaro • Control de Accesos
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

