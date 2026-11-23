'use client';

/**
 * Usuario y contraseña contra `POST /auth/local` (respuesta única de fallo,
 * SEC-AUTH-09). Lo usan `/acceso-emergencia` y `/login` con Authelia apagado
 * (`OIDC_HABILITADO=false`, FNC-158).
 */

import { useState } from 'react';
import { api } from '@/lib/api';
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
    <form onSubmit={submit} className="space-y-4 text-left">
      <label className="block space-y-1.5">
        <span className="block text-xs font-bold uppercase tracking-wider text-label">
          Usuario
        </span>
        <div className="relative flex items-center">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            placeholder="nombre.apellido o correo corporativo"
            className="w-full h-12 rounded-xl border border-panel-border bg-superficie px-4 text-sm font-medium text-body-text placeholder:text-placeholder shadow-xs outline-none transition-all hover:border-aduana-cyan/50 focus:border-aduana-cyan focus:ring-2 focus:ring-aduana-cyan/20"
          />
        </div>
      </label>

      <label className="block space-y-1.5">
        <span className="block text-xs font-bold uppercase tracking-wider text-label">
          Contraseña
        </span>
        <div className="relative flex items-center">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            className="w-full h-12 rounded-xl border border-panel-border bg-superficie px-4 text-sm font-medium text-body-text placeholder:text-placeholder shadow-xs outline-none transition-all hover:border-aduana-cyan/50 focus:border-aduana-cyan focus:ring-2 focus:ring-aduana-cyan/20"
          />
        </div>
      </label>

      <div className="pt-2">
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="group relative flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-aduana-cyan to-aduana-cyan-hover px-5 py-3 font-display text-sm font-bold tracking-wide text-white shadow-lg shadow-aduana-cyan/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none outline-none focus-visible:ring-2 focus-visible:ring-aduana-cyan"
        >
          <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="transition-transform group-hover:scale-110" />
          <span>{busy ? 'Comprobando…' : 'Iniciar sesión'}</span>
        </button>
      </div>
    </form>
  );
}
