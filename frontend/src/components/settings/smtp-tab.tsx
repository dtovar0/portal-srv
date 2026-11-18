'use client';

/** Ajustes › Correo: servidor saliente y correo de prueba. */

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Button, Checkbox, Field, Option, Select, TextInput } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { Card, ErrorNote, Spinner } from '../ui';

export function SmtpTab() {
  const { data, loading, error, reload } = useAsync(() => api.smtp(), []);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [target, setTarget] = useState('');
  const [state, setState] = useState<{ saving: boolean; saved: boolean; error: string | null; tested: string | null }>(
    { saving: false, saved: false, error: null, tested: null },
  );
  const { avisar } = useToast();

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  // Con SMTP_FORCE_ENV el servidor ignora lo que se guarde aquí, así que los
  // campos se muestran en solo lectura en lugar de fingir que se pueden editar.
  const locked = data.editable === false;

  const value = form ?? {
    server: data.server ?? '',
    port: data.port ?? 587,
    encryption: data.encryption ?? 'starttls',
    username: data.username ?? '',
    sender_name: data.sender_name ?? '',
    auth_enabled: data.auth_enabled ?? true,
  };

  async function save() {
    setState({ ...state, saving: true, saved: false, error: null });
    try {
      // Una contraseña vacía deja la guardada intacta.
      await api.saveSmtp(value);
      setState({ saving: false, saved: true, error: null, tested: null });
      avisar('success', 'La configuración de correo se guardó.', 'Guardado');
      reload();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo guardar';
      setState({ saving: false, saved: false, tested: null, error: mensaje });
      avisar('error', mensaje, 'Error al guardar');
    }
  }

  async function test() {
    setState({ ...state, tested: null, error: null });
    try {
      await api.testSmtp(target);
      setState({ ...state, tested: `Correo enviado a ${target}.`, error: null });
      avisar('success', `Correo enviado a ${target}.`, 'Correo de prueba');
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo enviar';
      setState({ ...state, tested: null, error: mensaje });
      avisar('error', mensaje, 'Correo de prueba');
    }
  }

  return (
    <Card className="flex h-full w-full flex-1 min-h-0 flex-col space-y-4">
      {data.warning ? <ErrorNote message={data.warning} /> : null}

      {locked ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
          Estos valores vienen del <code>.env</code> del servidor
          (<code>SMTP_FORCE_ENV</code>) y no se pueden cambiar desde aquí. Para
          modificarlos, edita el archivo y reinicia el servicio.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Servidor">
          <TextInput
            disabled={locked}
            value={String(value.server)}
            onChange={(e) => setForm({ ...value, server: e.target.value })}
          />
        </Field>
        <Field label="Puerto">
          <TextInput
            type="number"
            disabled={locked}
            value={String(value.port)}
            onChange={(e) => setForm({ ...value, port: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Cifrado">
        <Select
          disabled={locked}
          value={String(value.encryption)}
          onChange={(e) => setForm({ ...value, encryption: e.target.value })}
        >
          <Option value="starttls">STARTTLS</Option>
          <Option value="ssl">SSL/TLS</Option>
          <Option value="none">Ninguno</Option>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Usuario">
          <TextInput
            disabled={locked}
            value={String(value.username ?? '')}
            onChange={(e) => setForm({ ...value, username: e.target.value })}
          />
        </Field>
        <Field label="Contraseña" hint="Por seguridad no se guarda en el portal: se define en el .env del servidor (SMTP_PASSWORD).">
          <TextInput type="password" value="" disabled readOnly aria-readonly="true" placeholder="Definida en el servidor" />
        </Field>
      </div>

      <Field label="Nombre del remitente">
        <TextInput
          disabled={locked}
          value={String(value.sender_name ?? '')}
          onChange={(e) => setForm({ ...value, sender_name: e.target.value })}
        />
      </Field>

      <Checkbox
        label="Requiere autenticación"
        disabled={locked}
        checked={Boolean(value.auth_enabled)}
        onChange={(e) => setForm({ ...value, auth_enabled: e.target.checked })}
      />

      {!locked ? (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={state.saving}>
            <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
            {state.saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      ) : null}

      <div className="border-t border-panel-border pt-4">
        <Field label="Enviar correo de prueba">
          <div className="flex gap-2">
            <TextInput
              type="email" placeholder="destino@ejemplo.com" value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Button variant="secondary" onClick={test} disabled={!target}>
              <Icono nombre="solicitudes" tamano="sm" ariaHidden={true} className="mr-1.5" />
              Enviar
            </Button>
          </div>
        </Field>
      </div>
    </Card>
  );
}
