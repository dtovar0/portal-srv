'use client';

/**
 * Alta de una nueva cuenta en 2 pasos (DIS-019, F-USR-02, RF-04).
 * - Paso 1: Datos del usuario (Nombre completo, Correo, Contraseña, Confirmar contraseña).
 * - Paso 2: Accesos mediante Dual Picklist (Áreas disponibles a la izquierda,
 *   Áreas asignadas a la derecha) con transferencia directa de un solo clic.
 * - Estandarizado en el Modal central con botones alineados a izquierda (Cancelar/Atrás)
 *   y derecha (Siguiente/Crear cuenta) con diseño premium.
 * - Sin textos de apoyo redundantes (se aprovechan los placeholders descriptivos).
 * - Espaciado de error pre-reservado (min-h-5) para evitar saltos y temblores de layout (CLS = 0).
 */

import { useState } from 'react';
import { usersApi } from '@/lib/access/users';
import type { Area, AreaRef, ManagedUser } from '@/lib/types';
import { Button, Field, Modal, TextInput } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { focusFirstError } from '../platforms/field-notes';
import { AreaDualPicklist } from './area-dual-picklist';
import {
  CORREO_MAX, NOMBRE_MAX, cuerpoAlta, describeDirectoryAccountError,
  validarStep1, type CampoAlta, type FormularioAlta,
} from './directory-account-errors';

const FORM_ID = 'alta-directorio';

const IDS = {
  fullName: 'alta-directorio-nombre-completo',
  email: 'alta-directorio-correo',
  password: 'alta-directorio-contrasena',
  confirmPassword: 'alta-directorio-confirmar-contrasena',
  area_ids: 'alta-directorio-areas',
} as const;

const ORDEN_PASO_1: [CampoAlta, string][] = [
  ['fullName', IDS.fullName],
  ['email', IDS.email],
  ['password', IDS.password],
  ['confirmPassword', IDS.confirmPassword],
];

const VACIO: FormularioAlta = {
  uid: '',
  email: '',
  given_name: '',
  surname: '',
  fullName: '',
  password: '',
  confirmPassword: '',
  area_ids: [],
};

export function DirectoryAccountForm({
  areas,
  areasLoading = false,
  areasError = null,
  areasRequired,
  onClose,
  onCreated,
}: {
  areas: (AreaRef | Area)[];
  areasLoading?: boolean;
  areasError?: string | null;
  areasRequired?: boolean;
  onClose: () => void;
  onCreated: (user: ManagedUser) => void;
}) {
  const { avisar } = useToast();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormularioAlta>(VACIO);
  const [fields, setFields] = useState<Partial<Record<CampoAlta, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function cambiar<K extends CampoAlta>(campo: K, valor: FormularioAlta[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (fields[campo]) setFields((e) => ({ ...e, [campo]: undefined }));
    if (error) setError(null);
  }

  function avanzarAlPaso2() {
    const errs = validarStep1(form);
    if (Object.keys(errs).length > 0) {
      setFields(errs);
      const msg = 'Por favor completa todos los datos obligatorios correctamente.';
      setError(msg);
      avisar('warning', 'Completa los campos obligatorios.', 'Datos incompletos');
      setTimeout(() => {
        focusFirstError(ORDEN_PASO_1, errs as Record<string, string>);
      }, 50);
      return;
    }
    setFields({});
    setError(null);
    setPaso(2);
  }

  function retrocederAlPaso1() {
    setError(null);
    setPaso(1);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    if (areasRequired && form.area_ids.length === 0) {
      const msg = 'Elige al menos un área de tu alcance para continuar.';
      setError(msg);
      avisar('warning', 'Selecciona al menos un área.', 'Área requerida');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload = cuerpoAlta(form);
      const res = await usersApi.createDirectoryAccount(payload);
      avisar('success', `${res.user.name || res.user.email} se agregó al directorio.`, 'Cuenta creada');
      onCreated(res.user);
    } catch (err) {
      const view = describeDirectoryAccountError(err);
      setError(view.message);
      avisar('error', view.message, 'Error al crear');
      setFields(view.fields);

      if (view.fields.email || view.fields.given_name || view.fields.surname || view.fields.uid) {
        setPaso(1);
        setTimeout(() => {
          focusFirstError(ORDEN_PASO_1, view.fields as Record<string, string>);
        }, 50);
      }
      setSending(false);
    }
  }

  return (
    <Modal
      title="Nueva cuenta"
      onClose={onClose}
      icon="usuarios"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {paso === 1 ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="min-h-12 px-5 border border-panel-border/90 bg-superficie hover:bg-superficie-elevada active:scale-[0.98] text-body-text shadow-xs font-bold text-xs inline-flex items-center gap-2 transition-all"
              >
                <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
                <span>Cancelar</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={avanzarAlPaso2}
                className="min-h-12 px-6 bg-gradient-to-r from-primary via-brand to-accent hover:opacity-95 active:scale-[0.98] text-primary-contrast shadow-md font-bold text-xs inline-flex items-center gap-2 transition-all"
              >
                <span>Siguiente</span>
                <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={retrocederAlPaso1}
                disabled={sending}
                className="min-h-12 px-5 border border-panel-border/90 bg-superficie hover:bg-superficie-elevada active:scale-[0.98] text-body-text shadow-xs font-bold text-xs inline-flex items-center gap-2 transition-all"
              >
                <Icono nombre="chevron-izq" tamano="sm" ariaHidden={true} />
                <span>Atrás</span>
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="primary"
                aria-disabled={sending ? 'true' : undefined}
                className="min-h-12 px-6 bg-gradient-to-r from-primary via-brand to-accent hover:opacity-95 active:scale-[0.98] text-primary-contrast shadow-md font-bold text-xs inline-flex items-center gap-2 transition-all"
              >
                <Icono nombre="aprobar" tamano="sm" ariaHidden={true} />
                {sending ? 'Creando…' : 'Crear'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate aria-busy={sending} className="space-y-4">
        {/* Indicador de progreso de 2 pasos con diseño premium */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-panel-border/80 bg-surface-container/60 shadow-xs select-none">
          <div className="flex items-center gap-2.5">
            <span
              className={`size-7 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                paso === 1
                  ? 'bg-primary text-superficie shadow-xs'
                  : 'bg-primary/20 text-primary-text'
              }`}
            >
              {paso === 2 ? '✓' : '1'}
            </span>
            <span className={`text-xs font-bold ${paso === 1 ? 'text-body-text' : 'text-label'}`}>
              1. Datos de usuario
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-panel-border/60 mx-1" aria-hidden="true" />

          <div className="flex items-center gap-2.5">
            <span
              className={`size-7 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                paso === 2
                  ? 'bg-primary text-superficie shadow-xs'
                  : 'bg-surface-container text-label border border-panel-border/60'
              }`}
            >
              2
            </span>
            <span className={`text-xs font-bold ${paso === 2 ? 'text-body-text' : 'text-label'}`}>
              2. Accesos y áreas
            </span>
          </div>
        </div>

        {error ? <div className="sr-only" role="alert">{error}</div> : null}

        {/* PASO 1: Datos del usuario (sin textos de apoyo redundantes y con espacio de error reservado) */}
        {paso === 1 ? (
          <div className="space-y-1">
            <div>
              <Field label="Nombre completo">
                <TextInput
                  id={IDS.fullName}
                  value={form.fullName ?? ''}
                  onChange={(e) => {
                    cambiar('fullName', e.target.value);
                    const partes = e.target.value.trim().split(/\s+/);
                    cambiar('given_name', partes[0] || '');
                    cambiar('surname', partes.slice(1).join(' ') || partes[0] || '');
                  }}
                  placeholder="Ej. Ana María Ruiz González"
                  required
                  aria-required="true"
                  maxLength={NOMBRE_MAX}
                  autoComplete="name"
                  aria-describedby={fields.fullName ? `${IDS.fullName}-error` : undefined}
                  aria-invalid={fields.fullName ? true : undefined}
                />
              </Field>
              <div className="min-h-5 pt-0.5" aria-live="polite">
                {fields.fullName ? (
                  <span id={`${IDS.fullName}-error`} role="alert" className="block text-xs font-bold text-error-text">
                    {fields.fullName}
                  </span>
                ) : null}
              </div>
            </div>

            <div>
              <Field label="Correo">
                <TextInput
                  id={IDS.email}
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    cambiar('email', email);
                    const uid = email.split('@')[0]?.trim().toLowerCase() || '';
                    cambiar('uid', uid);
                  }}
                  placeholder="usuario@empresa.com"
                  required
                  aria-required="true"
                  maxLength={CORREO_MAX}
                  autoComplete="email"
                  aria-describedby={fields.email ? `${IDS.email}-error` : undefined}
                  aria-invalid={fields.email ? true : undefined}
                />
              </Field>
              <div className="min-h-5 pt-0.5" aria-live="polite">
                {fields.email ? (
                  <span id={`${IDS.email}-error`} role="alert" className="block text-xs font-bold text-error-text">
                    {fields.email}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Field label="Contraseña">
                  <TextInput
                    id={IDS.password}
                    type="password"
                    value={form.password ?? ''}
                    onChange={(e) => cambiar('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    aria-required="true"
                    autoComplete="new-password"
                    aria-describedby={fields.password ? `${IDS.password}-error` : undefined}
                    aria-invalid={fields.password ? true : undefined}
                  />
                </Field>
                <div className="min-h-5 pt-0.5" aria-live="polite">
                  {fields.password ? (
                    <span id={`${IDS.password}-error`} role="alert" className="block text-xs font-bold text-error-text">
                      {fields.password}
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <Field label="Confirmar contraseña">
                  <TextInput
                    id={IDS.confirmPassword}
                    type="password"
                    value={form.confirmPassword ?? ''}
                    onChange={(e) => cambiar('confirmPassword', e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    aria-required="true"
                    autoComplete="new-password"
                    aria-describedby={fields.confirmPassword ? `${IDS.confirmPassword}-error` : undefined}
                    aria-invalid={fields.confirmPassword ? true : undefined}
                  />
                </Field>
                <div className="min-h-5 pt-0.5" aria-live="polite">
                  {fields.confirmPassword ? (
                    <span id={`${IDS.confirmPassword}-error`} role="alert" className="block text-xs font-bold text-error-text">
                      {fields.confirmPassword}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PASO 2: Dual Picklist (Áreas disponibles vs asignadas con transferencia en 1 clic) */
          <div className="space-y-2">
            <AreaDualPicklist
              id={IDS.area_ids}
              areas={areas}
              selected={form.area_ids}
              onChange={(ids) => cambiar('area_ids', ids)}
              loading={areasLoading}
              loadError={areasError}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
