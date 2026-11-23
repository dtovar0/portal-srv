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
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="mb-4 flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[#334A60] bg-[#1B2A38] shadow-md p-2"
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/isotype-aduana.png" alt="Aduana" className="size-10 object-contain" width={40} height={40} />
          </span>
          <PageHeader
            title="Aduana: Control de Acceso"
            description="Inicia sesión con tu cuenta corporativa para acceder a tus plataformas."
            className="text-center sm:flex-col sm:items-center"
          />
        </div>

        <Card className="space-y-5 rounded-2xl border border-panel-border bg-panel-fill p-6 sm:p-8 shadow-2xl">
          {context.local_login ? (
            <FormularioLoginLocal />
          ) : context.oidc_enabled ? (
            <Button
              // Única acción de la pantalla: el foco empieza en ella.
              autoFocus
              onClick={() => { window.location.href = URL_INICIO_OIDC; }}
              className="w-full py-2 shadow-xs"
            >
              <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
              Entrar con Authelia
            </Button>
          ) : (
            <p className="text-sm text-label" role="status">
              El inicio de sesión con Authelia no está disponible por ahora.
            </p>
          )}
        </Card>

        {esPortadaActiva() ? (
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 text-xs font-semibold text-primary-text hover:underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-3 py-1.5"
            >
              <Icono nombre="info" tamano="xs" ariaHidden={true} />
              <span>Conoce Aduana: Guía y Presentación de la Plataforma</span>
            </Link>
          </div>
        ) : null}

      </div>
    </div>
  );
}
