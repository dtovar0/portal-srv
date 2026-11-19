'use client';

/**
 * Pantalla de acceso (ADR-009): un solo botón que inicia el flujo OIDC con
 * Authelia por navegación completa (el portal nunca ve tokens). La cuenta de
 * emergencia vive en `/acceso-emergencia`, sin enlace desde aquí. Los errores
 * del callback llegan en `?error=<codigo>` y se muestran por toast.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { mensajeErrorOidc } from '@/lib/errores-oidc';
import type { AuthContext } from '@/lib/types';
import { Button } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { useToast } from './toast';
import { Card, Spinner } from './ui';

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
        if (result.authenticated) window.location.href = '/';
      })
      .catch(() => {
        if (active) setContext({
          oidc_enabled: false, authenticated: false, emergency_available: true,
        });
      });
    return () => { active = false; };
  }, []);

  if (!context) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Comprobando acceso…" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="mb-4 flex size-12 shrink-0 items-center justify-center rounded-2xl border border-superficie/20 bg-gradient-to-br from-primary via-brand to-accent text-texto-sobre-accion shadow-md"
            aria-hidden="true"
          >
            <Icono nombre="escudo-ok" tamano="lg" />
          </span>
          <PageHeader
            title="Portal de accesos"
            description="Catálogo centralizado de plataformas"
            className="text-center sm:flex-col sm:items-center"
          />
        </div>

        <Card className="space-y-5 rounded-2xl border border-panel-border bg-panel-fill p-6 sm:p-8 shadow-2xl">
          {context.oidc_enabled ? (
            <Button
              onClick={() => { window.location.href = URL_INICIO_OIDC; }}
              className="w-full py-2 shadow-xs"
            >
              <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
              Entrar con Authelia
            </Button>
          ) : (
            <p className="text-sm text-label">
              El inicio de sesión con Authelia no está disponible por ahora.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
