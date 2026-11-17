'use client';

/**
 * Alta y edición de una plataforma en 2 pasos:
 * - Paso 1: Descripción (Nombre, Descripción, Enlace).
 * - Paso 2: Estilo (Color de fondo, Color de texto, Vista previa dinámica y Estado Activo/Inactivo).
 *
 * Mismo criterio y coherencia que `areas/area-form.tsx` (DIS-016, DIS-017).
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Area, Platform, PlatformInput, PlatformWarning } from '@/lib/types';
import { atributoTexto, variablesChipPlataforma } from '@/lib/color-legible';
import { variablesCss } from '@/lib/variables-css';
import { Button, Checkbox, ColorInput, Field, Modal, TextArea, TextInput } from '../form';
import { Icono } from '../icono';
import { Badge, ErrorNote } from '../ui';
import { describedBy, FieldErrorNote, FieldHint, focusFirstError } from './field-notes';
import { type IntegrationValue } from './platform-integration-fields';
import {
  buildPayload, DESCRIPCION_MAX, NOMBRE_MAX, URL_MAX, validate, normalizarEnlaceDirecto,
} from './platform-payload';
import { describeSaveError, MENSAJE_REVISA_CAMPOS } from './platform-save-errors';

/**
 * Alta: los colores no se envían hasta que se eligen; el servidor aplica sus
 * colores por omisión (`POR_DEFECTO_ALTA`, los mismos que antes fijaba aquí la
 * pantalla). Mismo criterio que `areas/area-form.tsx` (DIS-016).
 */
const EMPTY: PlatformInput = {
  name: '',
  description: '',
  direct_link: '',
  status: 'Activo',
};

/** Ids de los controles base, en el orden del formulario (foco al primer error). */
const IDS = {
  name: 'platform-name',
  description: 'platform-description',
  direct_link: 'platform-link',
} as const;
const ORDEN_CAMPOS = Object.entries(IDS) as [string, string][];

export function PlatformForm({
  areas,
  platform,
  defaultAreaId,
  isSuperadmin,
  onClose,
  onSaved,
}: {
  areas: Area[];
  platform: Platform | null;
  defaultAreaId?: number;
  isSuperadmin: boolean;
  onClose: () => void;
  onSaved: (result: { platform: Platform; warnings: PlatformWarning[] }) => void;
}) {
  const isEdit = platform !== null;
  // `GET /platforms` aún no expone los campos de integración (FNC-063).
  const currentType = platform?.integration_type ?? null;
  const initialIntegration: IntegrationValue = {
    integration_type: isEdit ? '' : 'conector',
    ldap_group_user_dn: platform?.ldap_group_user_dn ?? '',
    ldap_group_admin_dn: platform?.ldap_group_admin_dn ?? '',
  };
  const [paso, setPaso] = useState<1 | 2>(1);
  const [form, setForm] = useState<PlatformInput>(
    platform
      ? {
          name: platform.name,
          description: platform.description,
          area_id: platform.area_id,
          direct_link: platform.direct_link ?? '',
          bg_color: platform.bg_color,
          text_color: platform.text_color,
          status: platform.status,
        }
      : { ...EMPTY, area_id: defaultAreaId ?? areas[0]?.id },
  );
  const [integration, setIntegration] = useState<IntegrationValue>(initialIntegration);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function set<K extends keyof PlatformInput>(key: K, value: PlatformInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function avanzarAlPaso2() {
    const linkNormalizado = normalizarEnlaceDirecto(form.direct_link);
    const formAvanzado = { ...form, direct_link: linkNormalizado };
    if (linkNormalizado !== (form.direct_link ?? '')) {
      set('direct_link', linkNormalizado);
    }
    const errors = validate(formAvanzado, integration, isEdit);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(MENSAJE_REVISA_CAMPOS);
      focusFirstError(ORDEN_CAMPOS, errors);
      return;
    }
    setError(null);
    setPaso(2);
  }

  function retrocederAlPaso1() {
    setError(null);
    setPaso(1);
    focusFirstError(ORDEN_CAMPOS, fieldErrors);
  }

  async function save() {
    const linkNormalizado = normalizarEnlaceDirecto(form.direct_link);
    const formFinal = { ...form, direct_link: linkNormalizado };
    if (linkNormalizado !== (form.direct_link ?? '')) {
      set('direct_link', linkNormalizado);
    }
    const errors = validate(formFinal, integration, isEdit);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(MENSAJE_REVISA_CAMPOS);
      setPaso(1);
      focusFirstError(ORDEN_CAMPOS, errors);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(formFinal, integration, initialIntegration,
        { isEdit, isSuperadmin, currentType });
      const result = platform
        ? await api.updatePlatform(platform.id, payload)
        : await api.createPlatform(payload);
      onSaved({ platform: result.platform, warnings: result.warnings ?? [] });
    } catch (err) {
      const view = describeSaveError(err);
      setError(view.message);
      setFieldErrors(view.fields);
      if (
        view.fields.name ||
        view.fields.description ||
        view.fields.direct_link ||
        view.fields.area_id ||
        view.fields.integration_type ||
        view.fields.ldap_group_user_dn ||
        view.fields.ldap_group_admin_dn
      ) {
        setPaso(1);
      }
      focusFirstError(ORDEN_CAMPOS, view.fields);
    } finally {
      setSaving(false);
    }
  }

  const areaSeleccionada = areas.find((a) => a.id === form.area_id);

  return (
    <Modal
      title={platform ? 'Editar plataforma' : 'Nueva plataforma'}
      icon="plataformas"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {paso === 1 ? (
            <>
              <Button variant="secondary" onClick={onClose}>
                <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
                Cancelar
              </Button>
              <Button onClick={avanzarAlPaso2}>
                <span>Siguiente</span>
                <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} className="ml-1.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={retrocederAlPaso1} disabled={saving}>
                <Icono nombre="chevron-izq" tamano="sm" ariaHidden={true} className="mr-1.5" />
                Atrás
              </Button>
              <Button onClick={save} disabled={saving}>
                <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Indicador de progreso de 2 pasos con diseño accesible */}
        <nav
          aria-label="Progreso del formulario"
          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-panel-border/80 bg-surface-container/60 shadow-xs select-none"
        >
          <button
            type="button"
            onClick={() => setPaso(1)}
            aria-current={paso === 1 ? 'step' : undefined}
            className="min-h-12 min-w-12 px-3 flex items-center gap-2.5 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-all"
          >
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
              1. Descripción
            </span>
          </button>

          <div className="flex-1 h-0.5 bg-panel-border/60 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={avanzarAlPaso2}
            aria-current={paso === 2 ? 'step' : undefined}
            className="min-h-12 min-w-12 px-3 flex items-center gap-2.5 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-all"
          >
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
              2. Estilo
            </span>
          </button>
        </nav>

        {error ? <ErrorNote message={error} /> : null}

        {/* PASO 1: Descripción (Nombre, Descripción, Enlace, Área e Integración) */}
        {paso === 1 ? (
          <div className="space-y-4">
            <div>
              <Field label="Nombre">
                <TextInput
                  id={IDS.name}
                  value={form.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Nombre de la plataforma"
                  maxLength={NOMBRE_MAX}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      avanzarAlPaso2();
                    }
                  }}
                  {...describedBy([`${IDS.name}-error`, fieldErrors.name])}
                />
              </Field>
              <FieldErrorNote id={`${IDS.name}-error`} message={fieldErrors.name} />
            </div>

            <div>
              <Field label="Descripción">
                <TextArea
                  id={IDS.description}
                  rows={2}
                  value={form.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Describe el propósito y servicios de la plataforma…"
                  maxLength={DESCRIPCION_MAX}
                  {...describedBy([`${IDS.description}-error`, fieldErrors.description])}
                />
              </Field>
              <FieldErrorNote id={`${IDS.description}-error`} message={fieldErrors.description} />
            </div>

            <div>
              <Field label="Enlace">
                <TextInput
                  id={IDS.direct_link}
                  type="text"
                  inputMode="url"
                  value={form.direct_link ?? ''}
                  onChange={(e) => set('direct_link', e.target.value)}
                  onBlur={() => {
                    const normalizado = normalizarEnlaceDirecto(form.direct_link);
                    if (normalizado !== (form.direct_link ?? '')) {
                      set('direct_link', normalizado);
                    }
                  }}
                  placeholder="ejemplo.com o https://ejemplo.com"
                  maxLength={URL_MAX}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      avanzarAlPaso2();
                    }
                  }}
                  {...describedBy([`${IDS.direct_link}-error`, fieldErrors.direct_link],
                    [`${IDS.direct_link}-hint`, true])}
                />
              </Field>
              <FieldHint id={`${IDS.direct_link}-hint`}>
                Dirección https:// a la que lleva la tarjeta (se añade automáticamente si se omite). Sin enlace, la plataforma se muestra pero
                no se puede abrir.
              </FieldHint>
              <FieldErrorNote id={`${IDS.direct_link}-error`} message={fieldErrors.direct_link} />
            </div>
          </div>
        ) : null}

        {/* PASO 2: Estilo (Color de fondo, Color de texto, Vista previa y Estado) */}
        {paso === 2 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Field
                  label="Color de fondo"
                  hint={form.bg_color ? undefined : 'Color distintivo de la plataforma.'}
                >
                  <div className="flex items-center gap-3 pt-1">
                    <ColorInput
                      id="platform-bg-color"
                      aria-label="Color de fondo"
                      value={form.bg_color ?? ''}
                      onChange={(e) => set('bg_color', e.target.value)}
                      {...describedBy(['platform-colors-error', false],
                        ['platform-colors-hint', !form.bg_color])}
                    />
                    <div className="text-xs text-label">
                      <span className="font-semibold text-body-text">{form.bg_color || 'Por omisión'}</span>
                      <p>Fondo del icono en tarjeta.</p>
                    </div>
                  </div>
                </Field>
              </div>

              <div>
                <Field
                  label="Color de texto"
                  hint={form.text_color ? undefined : 'Color de contraste del texto.'}
                >
                  <div className="flex items-center gap-3 pt-1">
                    <ColorInput
                      id="platform-text-color"
                      aria-label="Color de texto"
                      value={form.text_color ?? ''}
                      onChange={(e) => set('text_color', e.target.value)}
                      {...describedBy(['platform-colors-error', false],
                        ['platform-colors-hint', !form.text_color])}
                    />
                    <div className="text-xs text-label">
                      <span className="font-semibold text-body-text">{form.text_color || 'Por omisión'}</span>
                      <p>Color del texto e icono.</p>
                    </div>
                  </div>
                </Field>
              </div>
            </div>

            {!form.bg_color || !form.text_color ? (
              <FieldHint id="platform-colors-hint">
                Si no eliges un color, se usa el color por omisión asignado por el sistema.
              </FieldHint>
            ) : null}

            {/* Vista previa en vivo del estilo visual de la plataforma */}
            <div className="rounded-xl border border-panel-border/80 bg-surface-container/30 p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-label block">
                Vista previa
              </span>
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-panel-border/80 bg-panel-fill shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="nx-chip-solid grid size-10 shrink-0 place-items-center rounded-xl text-xs font-semibold shadow-xs"
                    data-texto={atributoTexto(form.bg_color)}
                    style={variablesCss(variablesChipPlataforma(form.bg_color))}
                    aria-hidden="true"
                  >
                    {(form.name || 'PL').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-sm text-body-text leading-tight">
                      {form.name || 'Nombre de la plataforma'}
                    </p>
                    <p className="truncate text-xs text-label leading-tight mt-0.5">
                      {form.description || 'Sin descripción.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {areaSeleccionada ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md border border-panel-border/80 bg-superficie text-label">
                      {areaSeleccionada.name}
                    </span>
                  ) : null}
                  <Badge tone={form.status === 'Activo' ? 'success' : 'warning'} dot>
                    {form.status === 'Activo' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <Checkbox
                id="platform-status"
                label="Activa"
                checked={form.status === 'Activo'}
                onChange={(e) => set('status', e.target.checked ? 'Activo' : 'Inactivo')}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
