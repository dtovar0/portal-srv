'use client';

/**
 * Usuario y contraseña contra `POST /auth/local` (respuesta única de fallo,
 * SEC-AUTH-09). Lo usan `/acceso-emergencia` y `/login` con Authelia apagado
 * (`OIDC_HABILITADO=false`, FNC-158).
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Field, TextInput } from './form';
import { Icono } from './icono';
import { useToast } from './toast';

export function FormularioLoginLocal() {
  const { avisar } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.loginLocal(email, password);
      window.location.href = '/dashboard';
    } catch (err) {
      avisar('error', err instanceof Error ? err.message : 'No se pudo iniciar sesión');
      setBusy(false);
    }
  }

  return (
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
  );
}
