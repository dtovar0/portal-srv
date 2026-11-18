'use client';

/**
 * Alta y edición de una plataforma en 3 pasos:
 * - Paso 1: Descripción (Nombre, Descripción, Enlace).
 * - Paso 2: Diseño (Icono del catálogo o subida de imagen, Colores de fondo y del icono).
 * - Paso 3: Vista previa y activación (Vista previa dinámica y Toggle Activa/Inactiva).
 *
 * Mismo criterio y coherencia que `areas/area-form.tsx` (DIS-016, DIS-017).
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Area, Platform, PlatformInput, PlatformWarning } from '@/lib/types';
import { atributoTexto, variablesChipPlataforma } from '@/lib/color-legible';
import { variablesCss } from '@/lib/variables-css';
import { Button, ColorInput, Field, FileInput, Modal, TextArea, TextInput, Toggle } from '../form';
import { Icono } from '../icono';
import { TRAZOS, type NombreIcono } from '../icono-trazos';
import { Badge } from '../ui';
import { useToast } from '../toast';
import { describedBy, FieldErrorNote, FieldHint, focusFirstError } from './field-notes';
import { type IntegrationValue } from './platform-integration-fields';
import {
  buildPayload, DESCRIPCION_MAX, NOMBRE_MAX, URL_MAX, validate, normalizarEnlaceDirecto,
} from './platform-payload';
import { describeSaveError, MENSAJE_REVISA_CAMPOS } from './platform-save-errors';

/** Tamaño máximo de la imagen de la plataforma (2 MB). */
const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024;
const MENSAJE_IMAGEN_GRANDE = 'La imagen no debe superar los 2 MB.';

const ICONOS_PLATAFORMA: { id: NombreIcono; label: string }[] = [
  { id: 'plataformas', label: 'Plataforma' },
  { id: 'panel', label: 'Panel' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'areas', label: 'Área' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'ejecuciones', label: 'Operaciones' },
  { id: 'auditoria', label: 'Auditoría' },
  { id: 'ajustes', label: 'Configuración' },
  { id: 'solicitudes', label: 'Solicitudes' },
  { id: 'aprobaciones', label: 'Aprobaciones' },
  { id: 'escudo', label: 'Seguridad' },
  { id: 'documento', label: 'Documentos' },
  { id: 'actividad', label: 'Monitoreo' },
  { id: 'marca', label: 'Destacado' },
  { id: 'favorito', label: 'Favorito' },
];

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
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [modoIcono, setModoIcono] = useState<'catalogo' | 'subir'>('catalogo');
  const [imagePreview, setImagePreview] = useState<string | null>(platform?.logo_url ?? null);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [form, setForm] = useState<PlatformInput>(
    platform
      ? {
          name: platform.name,
          description: platform.description,
          area_id: platform.area_id,
          direct_link: platform.direct_link ?? '',
          icon: platform.icon || 'plataformas',
          logo_url: platform.logo_url ?? null,
          bg_color: platform.bg_color,
          text_color: platform.text_color,
          status: platform.status,
        }
      : { ...EMPTY, icon: 'plataformas', area_id: defaultAreaId ?? areas[0]?.id },
  );
  const [integration, setIntegration] = useState<IntegrationValue>(initialIntegration);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  function set<K extends keyof PlatformInput>(key: K, value: PlatformInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > TAMANO_MAXIMO_IMAGEN) {
      setError(MENSAJE_IMAGEN_GRANDE);
      toast.avisar('error', MENSAJE_IMAGEN_GRANDE, 'Imagen demasiado grande');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setNombreArchivo(file.name);
      const nombreIcono = file.name.replace(/\.[^/.]+$/, '').slice(0, 50);
      set('icon', nombreIcono);
      setError(null);
    };
    reader.readAsDataURL(file);
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
      toast.avisar('warning', MENSAJE_REVISA_CAMPOS, 'Datos incompletos');
      focusFirstError(ORDEN_CAMPOS, errors);
      return;
    }
    setError(null);
    setPaso(2);
  }

  function avanzarAlPaso3() {
    const linkNormalizado = normalizarEnlaceDirecto(form.direct_link);
    const formAvanzado = { ...form, direct_link: linkNormalizado };
    const errors = validate(formAvanzado, integration, isEdit);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(MENSAJE_REVISA_CAMPOS);
      toast.avisar('warning', MENSAJE_REVISA_CAMPOS, 'Datos incompletos');
      setPaso(1);
      focusFirstError(ORDEN_CAMPOS, errors);
      return;
    }
    setError(null);
    setPaso(3);
  }

  function retrocederAlPaso1() {
    setError(null);
    setPaso(1);
    focusFirstError(ORDEN_CAMPOS, fieldErrors);
  }

  function retrocederAlPaso2() {
    setError(null);
    setPaso(2);
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
      toast.avisar('warning', MENSAJE_REVISA_CAMPOS, 'Datos incompletos');
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
      toast.avisar('error', view.message, 'Error al guardar');
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
      } else if (view.fields.icon || view.fields.bg_color || view.fields.text_color) {
        setPaso(2);
      } else if (view.fields.status) {
        setPaso(3);
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
          ) : paso === 2 ? (
            <>
              <Button variant="secondary" onClick={retrocederAlPaso1} disabled={saving}>
                <Icono nombre="chevron-izq" tamano="sm" ariaHidden={true} className="mr-1.5" />
                Atrás
              </Button>
              <Button onClick={avanzarAlPaso3}>
                <span>Siguiente</span>
                <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} className="ml-1.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={retrocederAlPaso2} disabled={saving}>
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
        {/* Indicador de progreso de 3 pasos con diseño accesible */}
        <nav
          aria-label="Progreso del formulario"
          className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-panel-border/80 bg-surface-container/60 shadow-xs select-none"
        >
          <button
            type="button"
            onClick={() => setPaso(1)}
            aria-current={paso === 1 ? 'step' : undefined}
            className="min-h-12 min-w-12 px-3 flex items-center gap-2 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-all"
          >
            <span
              className={`size-6 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                paso === 1
                  ? 'bg-primary text-superficie shadow-xs'
                  : 'bg-primary/20 text-primary-text'
              }`}
            >
              {paso > 1 ? '✓' : '1'}
            </span>
            <span className={`text-xs font-bold ${paso === 1 ? 'text-body-text' : 'text-label'}`}>
              Descripción
            </span>
          </button>

          <div className="flex-1 h-0.5 bg-panel-border/60 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={avanzarAlPaso2}
            aria-current={paso === 2 ? 'step' : undefined}
            className="min-h-12 min-w-12 px-3 flex items-center gap-2 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-all"
          >
            <span
              className={`size-6 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                paso === 2
                  ? 'bg-primary text-superficie shadow-xs'
                  : paso > 2
                  ? 'bg-primary/20 text-primary-text'
                  : 'bg-surface-container text-label border border-panel-border/60'
              }`}
            >
              {paso > 2 ? '✓' : '2'}
            </span>
            <span className={`text-xs font-bold ${paso === 2 ? 'text-body-text' : 'text-label'}`}>
              Diseño
            </span>
          </button>

          <div className="flex-1 h-0.5 bg-panel-border/60 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={avanzarAlPaso3}
            aria-current={paso === 3 ? 'step' : undefined}
            className="min-h-12 min-w-12 px-3 flex items-center gap-2 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-all"
          >
            <span
              className={`size-6 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                paso === 3
                  ? 'bg-primary text-superficie shadow-xs'
                  : 'bg-surface-container text-label border border-panel-border/60'
              }`}
            >
              3
            </span>
            <span className={`text-xs font-bold ${paso === 3 ? 'text-body-text' : 'text-label'}`}>
              Vista previa
            </span>
          </button>
        </nav>

        {error ? <div className="sr-only">{error}</div> : null}

        {/* PASO 1: Descripción (Nombre, Descripción, Enlace) */}
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

        {/* PASO 2: Diseño (Colores de fondo y del icono, Icono del catálogo o subida de imagen) */}
        {paso === 2 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <p>Fondo de la tarjeta e icono.</p>
                    </div>
                  </div>
                </Field>
              </div>

              <div>
                <Field
                  label="Color del icono"
                  hint={form.text_color ? undefined : 'Color de contraste del icono.'}
                >
                  <div className="flex items-center gap-3 pt-1">
                    <ColorInput
                      id="platform-text-color"
                      aria-label="Color del icono"
                      value={form.text_color ?? ''}
                      onChange={(e) => set('text_color', e.target.value)}
                      {...describedBy(['platform-colors-error', false],
                        ['platform-colors-hint', !form.text_color])}
                    />
                    <div className="text-xs text-label">
                      <span className="font-semibold text-body-text">{form.text_color || 'Por omisión'}</span>
                      <p>Color del icono y texto.</p>
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

            {/* Selector de modo: Seleccionar icono vs Subir imagen */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-label">
                  Identidad visual
                </span>
                <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-surface-container border border-panel-border/80">
                  <button
                    type="button"
                    onClick={() => setModoIcono('catalogo')}
                    className={`min-h-12 min-w-12 px-3 flex items-center justify-center rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      modoIcono === 'catalogo'
                        ? 'bg-superficie text-body-text shadow-2xs font-bold'
                        : 'text-label hover:text-body-text'
                    }`}
                  >
                    Elegir icono
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoIcono('subir')}
                    className={`min-h-12 min-w-12 px-3 flex items-center justify-center rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      modoIcono === 'subir'
                        ? 'bg-superficie text-body-text shadow-2xs font-bold'
                        : 'text-label hover:text-body-text'
                    }`}
                  >
                    Subir imagen
                  </button>
                </div>
              </div>

              {modoIcono === 'catalogo' ? (
                <div
                  role="radiogroup"
                  aria-label="Icono de la plataforma"
                  className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1"
                >
                  {ICONOS_PLATAFORMA.map(({ id, label }) => {
                    const seleccionado = !imagePreview && (form.icon || 'plataformas') === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={seleccionado}
                        aria-label={label}
                        title={label}
                        onClick={() => {
                          setImagePreview(null);
                          setNombreArchivo('');
                          set('icon', id);
                        }}
                        className={`min-h-12 min-w-12 flex flex-col items-center justify-center gap-0.5 rounded-xl border p-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                          seleccionado
                            ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/40 shadow-xs'
                            : 'border-panel-border/80 bg-surface-container/60 text-label hover:border-body-text/30 hover:text-body-text'
                        }`}
                      >
                        <Icono nombre={id} tamano="md" ariaHidden={true} />
                        <span className="text-2xs font-medium leading-none truncate max-w-full">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-panel-border/80 bg-surface-container/40 space-y-2">
                  {imagePreview ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={imagePreview}
                          alt="Icono subido"
                          className="size-10 object-contain rounded-lg border border-panel-border/80 bg-superficie p-1 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-body-text truncate">
                            {nombreArchivo || 'Imagen personalizada'}
                          </p>
                          <p className="text-2xs text-label">Lista para la vista previa</p>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setImagePreview(null);
                          setNombreArchivo('');
                          set('icon', 'plataformas');
                        }}
                      >
                        <Icono nombre="cerrar" tamano="xs" ariaHidden={true} className="mr-1" />
                        Quitar
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <FileInput
                        id="platform-icon-file"
                        aria-label="Subir icono o logotipo"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleFileChange}
                      />
                      <p className="text-2xs text-label mt-1">
                        Formatos admitidos: PNG, JPG, SVG o WebP (máximo 2 MB).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* PASO 3: Vista previa y activación (Toggle) */}
        {paso === 3 ? (
          <div className="space-y-4">
            {/* Vista previa en vivo del diseño de la plataforma */}
            <div className="rounded-xl border border-panel-border/80 bg-surface-container/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-label block">
                  Vista previa de la plataforma
                </span>
                <Badge tone={form.status === 'Activo' ? 'success' : 'warning'} dot>
                  {form.status === 'Activo' ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-panel-border/80 bg-panel-fill shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="nx-chip-solid grid size-11 shrink-0 place-items-center rounded-xl text-xs font-semibold shadow-xs overflow-hidden"
                    data-texto={atributoTexto(form.bg_color)}
                    style={variablesCss(variablesChipPlataforma(form.bg_color))}
                    aria-hidden="true"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Logo" className="size-full object-contain p-1" />
                    ) : form.icon && form.icon in TRAZOS ? (
                      <Icono nombre={form.icon as NombreIcono} tamano="md" ariaHidden={true} />
                    ) : (
                      (form.name || 'PL').slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-sm text-body-text leading-tight">
                      {form.name || 'Nombre de la plataforma'}
                    </p>
                    <p className="truncate text-xs text-label leading-tight mt-0.5">
                      {form.description || 'Sin descripción.'}
                    </p>
                    {form.direct_link ? (
                      <p className="truncate text-2xs text-primary-text font-medium mt-1 flex items-center gap-1">
                        <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
                        <span>{form.direct_link}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {areaSeleccionada ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md border border-panel-border/80 bg-superficie text-label">
                      {areaSeleccionada.name}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Toggle de plataforma activa */}
            <div>
              <Toggle
                id="platform-status"
                label="Activa"
                description="Indica si la plataforma se encuentra visible y disponible para los usuarios en el catálogo."
                checked={form.status === 'Activo'}
                onChange={(checked) => set('status', checked ? 'Activo' : 'Inactivo')}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
