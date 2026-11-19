'use client';

/**
 * Acceso de emergencia (ADR-009 6A): correo y contraseña contra `POST /auth/local`.
 * Sin enlace visible desde `/login`; el fallo es siempre el mismo mensaje (SEC-AUTH-09).
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Field, TextInput } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { useToast } from './toast';
import { Card } from './ui';

export function AccesoEmergenciaForm() {
  const { avisar } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.loginLocal(email, password);
      window.location.href = '/';
    } catch (err) {
      avisar('error', err instanceof Error ? err.message : 'No se pudo iniciar sesión');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <PageHeader
            title="Acceso de emergencia"
            description="Solo para la cuenta de emergencia del portal"
            className="text-center sm:flex-col sm:items-center"
          />
        </div>
        <Card className="space-y-5 rounded-2xl border border-panel-border bg-panel-fill p-6 sm:p-8 shadow-2xl">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Usuario">
              <TextInput
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </Field>
            <Field label="Contraseña">
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Button
              type="submit"
              disabled={busy || !email || !password}
              className="w-full py-2 shadow-xs"
            >
              <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
              {busy ? 'Comprobando…' : 'Iniciar sesión'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
