'use client';

/**
 * Alta y edición de una plataforma en 3 pasos:
 * - Paso 1: Descripción (Nombre, Descripción, Enlace).
 * - Paso 2: Diseño (Icono del catálogo o subida de imagen, Colores de fondo y del icono, Vista previa dinámica).
 * - Paso 3: Accesos (Dual Picklist con usuarios del área para asignar accesos directos).
 *
 * Mismo criterio y coherencia que `areas/area-form.tsx` (DIS-016, DIS-017, DIS-019).
 */

import { useCallback, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Access } from '@/lib/access/types';
import type { Area, ManagedUser, Platform, PlatformInput, PlatformWarning } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { useFocoTrasMover } from '@/lib/use-foco-tras-mover';
import { atributoTexto, variablesChipPlataforma } from '@/lib/color-legible';
import { variablesCss } from '@/lib/variables-css';
import { Button, ColorInput, Field, FileInput, Modal, TextArea, TextInput, Toggle } from '../form';
import { Icono } from '../icono';
import { TRAZOS, type NombreIcono } from '../icono-trazos';
import { RegionDeAnuncios } from '../region-de-anuncios';
import { Badge, ErrorNote, Spinner } from '../ui';
import { useToast } from '../toast';
import { describedBy, FieldErrorNote, FieldHint, focusFirstError } from './field-notes';
import { type IntegrationValue } from './platform-integration-fields';
import {
  buildPayload, DESCRIPCION_MAX, NOMBRE_MAX, URL_MAX, validate, normalizarEnlaceDirecto,
} from './platform-payload';
import { describeSaveError, MENSAJE_REVISA_CAMPOS } from './platform-save-errors';

/** Coincidencia simple por nombre o correo para el buscador del Dual Picklist. */
function coincideUsuario(user: ManagedUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || (user.name || '').toLowerCase().includes(q) || (user.email || '').toLowerCase().includes(q);
}

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
        }
      : { ...EMPTY, icon: 'plataformas', area_id: defaultAreaId ?? areas[0]?.id },
  );
  const [integration] = useState<IntegrationValue>(initialIntegration);
  // DIS-133: al editar una plataforma sin enlace, el interruptor nace encendido.
  const [omitirEnlace, setOmitirEnlace] = useState<boolean>(isEdit && !platform?.direct_link);
  const opcionesValidacion = { enlaceObligatorio: !omitirEnlace };
  // El estado ya no se edita aquí (DIS-114): se conmuta con el badge de la tabla.
  // Al crear, el servidor la deja Activa; al editar no se envía, para no pisarlo.
  const estadoVista = platform?.status ?? 'Activo';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  const usersAsync = useAsync(() => api.users(), []);
  const accessAsync = useAsync(
    () => (platform ? api.platformAccess(platform.id) : Promise.resolve({ items: [] as Access[], total: 0 })),
    [platform?.id],
  );

  const [cambiosAcceso, setCambiosAcceso] = useState<Record<number, boolean>>({});
  const [searchSinAcceso, setSearchSinAcceso] = useState('');
  const [searchConAcceso, setSearchConAcceso] = useState('');
  const [anuncio, setAnuncio] = useState('');
  const { refLista, enfocarTras } = useFocoTrasMover();

  // Mapa de accesos vigentes de la plataforma: user_id -> Access
  const accesosPorUsuario = useMemo(() => {
    const map = new Map<number, Access>();
    for (const acc of accessAsync.data?.items ?? []) {
      map.set(acc.user.id, acc);
    }
    return map;
  }, [accessAsync.data]);

  const todosLosUsuarios: ManagedUser[] = useMemo(() => usersAsync.data ?? [], [usersAsync.data]);

  // Usuarios pertenecientes al área de la plataforma (form.area_id)
  const usuariosDelArea = useMemo(() => {
    if (!form.area_id) return todosLosUsuarios;
    return todosLosUsuarios.filter((u) => u.areas?.some((a) => a.id === form.area_id));
  }, [todosLosUsuarios, form.area_id]);

  const tieneAcceso = useCallback(
    (u: ManagedUser) => cambiosAcceso[u.id] ?? accesosPorUsuario.has(u.id),
    [cambiosAcceso, accesosPorUsuario],
  );

  const sinAcceso = useMemo(
    () => usuariosDelArea.filter((u) => !tieneAcceso(u)),
    [usuariosDelArea, tieneAcceso],
  );

  const conAcceso = useMemo(
    () => usuariosDelArea.filter((u) => tieneAcceso(u)),
    [usuariosDelArea, tieneAcceso],
  );

  const sinAccesoVisibles = useMemo(
    () => sinAcceso.filter((u) => coincideUsuario(u, searchSinAcceso)),
    [sinAcceso, searchSinAcceso],
  );

  const conAccesoVisibles = useMemo(
    () => conAcceso.filter((u) => coincideUsuario(u, searchConAcceso)),
    [conAcceso, searchConAcceso],
  );

  function darAcceso(user: ManagedUser) {
    enfocarTras('sin-acceso', sinAccesoVisibles, user.id);
    setCambiosAcceso((prev) => ({ ...prev, [user.id]: true }));
    setAnuncio(`«${user.name || user.email}» pasa a con acceso, ${conAcceso.length + 1} con acceso`);
  }

  function quitarAcceso(user: ManagedUser) {
    enfocarTras('con-acceso', conAccesoVisibles, user.id);
    setCambiosAcceso((prev) => ({ ...prev, [user.id]: false }));
    setAnuncio(`«${user.name || user.email}» pasa a sin acceso, ${sinAcceso.length + 1} sin acceso`);
  }

  function agregarTodosFiltrados() {
    if (sinAccesoVisibles.length === 0) return;
    const nuevos: Record<number, boolean> = {};
    for (const u of sinAccesoVisibles) {
      nuevos[u.id] = true;
    }
    setCambiosAcceso((prev) => ({ ...prev, ...nuevos }));
    setAnuncio(`${sinAccesoVisibles.length} usuarios agregados a con acceso`);
  }

  function quitarTodosFiltrados() {
    if (conAccesoVisibles.length === 0) return;
    const nuevos: Record<number, boolean> = {};
    for (const u of conAccesoVisibles) {
      nuevos[u.id] = false;
    }
    setCambiosAcceso((prev) => ({ ...prev, ...nuevos }));
    setAnuncio(`${conAccesoVisibles.length} usuarios retirados de con acceso`);
  }

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
    const errors = validate(formAvanzado, integration, opcionesValidacion);
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
    const errors = validate(formAvanzado, integration, opcionesValidacion);
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
    const errors = validate(formFinal, integration, opcionesValidacion);
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

      const targetPlatformId = result.platform.id;

      // Otorgar accesos seleccionados
      const aOtorgar = usuariosDelArea.filter((u) => tieneAcceso(u) && !accesosPorUsuario.has(u.id));
      for (const u of aOtorgar) {
        try {
          await api.grantPlatformAccess(targetPlatformId, u.id, 'usuario');
        } catch (err) {
          console.error('Error al otorgar acceso a la plataforma:', err);
        }
      }

      // Revocar accesos retirados
      const aRevocar = usuariosDelArea.filter((u) => !tieneAcceso(u) && accesosPorUsuario.has(u.id));
      for (const u of aRevocar) {
        const acceso = accesosPorUsuario.get(u.id);
        if (acceso) {
          try {
            await api.revokeAccess(acceso.id, 'Retirado por administrador');
          } catch (err) {
            console.error('Error al revocar acceso de la plataforma:', err);
          }
        }
      }

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
      } else if (view.fields.icon || view.fields.bg_color || view.fields.text_color || view.fields.status) {
        setPaso(2);
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
      size="2xl"
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
              Accesos
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

            <Toggle
              id="platform-omitir-enlace"
              label="Omitir enlace"
              description="La plataforma se muestra en el portal, pero no se puede abrir."
              checked={omitirEnlace}
              onChange={(omitir) => {
                setOmitirEnlace(omitir);
                if (omitir) {
                  set('direct_link', '');
                  setFieldErrors((previos) => {
                    const resto = { ...previos };
                    delete resto.direct_link;
                    return resto;
                  });
                }
              }}
            />

            {omitirEnlace ? null : (
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
                  Dirección https:// a la que lleva la tarjeta (se añade automáticamente si se omite).
                </FieldHint>
                <FieldErrorNote id={`${IDS.direct_link}-error`} message={fieldErrors.direct_link} />
              </div>
            )}
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
                        {/* Vista previa local o https externo: next/image no la optimiza (mismo motivo que areas/tarjeta-area.tsx) */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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

            {/* Vista previa en vivo del diseño de la plataforma (movido a Paso 2) */}
            <div className="rounded-xl border border-panel-border/80 bg-surface-container/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-label block">
                  Vista previa de la plataforma
                </span>
                <Badge tone={estadoVista === 'Activo' ? 'success' : 'warning'} dot>
                  {estadoVista === 'Activo' ? 'Activa' : 'Inactiva'}
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
                      // Vista previa local o https externo: next/image no la optimiza (mismo motivo que areas/tarjeta-area.tsx)
                      // eslint-disable-next-line @next/next/no-img-element
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
          </div>
        ) : null}

        {/* PASO 3: Accesos (Dual Picklist con usuarios del área) */}
        {paso === 3 ? (
          <div className="space-y-4">
            <RegionDeAnuncios mensaje={anuncio} />

            {/* Cabecera contextual del área y conteos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-panel-border/80 bg-surface-container/60 shadow-xs">
              <div className="min-w-0">
                <p className="text-xs font-bold text-body-text">
                  Asignación rápida de accesos a la plataforma
                </p>
                <p className="text-xs text-label truncate">
                  Área:{' '}
                  <span className="font-semibold text-primary-text">
                    {areaSeleccionada?.name || 'Sin área'}
                  </span>{' '}
                  — Transfiere los usuarios a la columna derecha para concederles acceso.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary-text">
                  {conAcceso.length} con acceso
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg border border-panel-border/60 bg-superficie text-label">
                  {sinAcceso.length} sin acceso
                </span>
              </div>
            </div>

            {usersAsync.loading && !usersAsync.data ? <Spinner /> : null}
            {usersAsync.error ? <ErrorNote message={usersAsync.error} /> : null}

            {!usersAsync.loading && !usersAsync.error ? (
              /* DUAL PICK LIST: 2 columnas */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch w-full min-h-0">
                {/* COLUMNA IZQUIERDA: Sin acceso */}
                <div className="flex flex-col rounded-2xl border border-panel-border/80 bg-surface-container/60 p-3.5 shadow-xs min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-body-text flex items-center gap-1.5">
                      <Icono nombre="usuarios" tamano="xs" ariaHidden={true} className="text-label" />
                      <span>Sin acceso</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sinAccesoVisibles.length > 0 ? (
                        <button
                          type="button"
                          onClick={agregarTodosFiltrados}
                          title="Otorgar acceso a todos los usuarios filtrados"
                          className="min-h-12 inline-flex items-center px-3 text-xs font-bold text-primary-text hover:underline cursor-pointer"
                        >
                          Agregar todos
                        </button>
                      ) : null}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-superficie text-label border border-panel-border/60">
                        {sinAcceso.length}
                      </span>
                    </div>
                  </div>

                  <div className="relative mb-2.5">
                    <input
                      type="text"
                      placeholder="Filtrar sin acceso…"
                      value={searchSinAcceso}
                      onChange={(e) => setSearchSinAcceso(e.target.value)}
                      aria-label="Filtrar usuarios sin acceso"
                      className="w-full h-10 rounded-xl border border-panel-border bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label"
                      aria-hidden="true"
                    >
                      <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                    </div>
                  </div>

                  <ul
                    ref={refLista('sin-acceso')}
                    tabIndex={-1}
                    aria-label={`Usuarios sin acceso a ${form.name || 'la plataforma'}`}
                    className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-64 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-panel-border"
                  >
                    {sinAccesoVisibles.length === 0 ? (
                      <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                        {searchSinAcceso.trim()
                          ? 'Ningún usuario coincide con la búsqueda.'
                          : usuariosDelArea.length === 0
                          ? 'No hay usuarios asignados a esta área.'
                          : 'Todos los miembros del área tienen acceso.'}
                      </li>
                    ) : (
                      sinAccesoVisibles.map((user) => (
                        <li key={user.id} className="p-0 list-none">
                          <button
                            type="button"
                            data-item-id={user.id}
                            onClick={() => darAcceso(user)}
                            aria-label={`Otorgar acceso a ${user.name || user.email}`}
                            title={`Haz clic para otorgar acceso a ${user.name || user.email}`}
                            className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-panel-border bg-superficie hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all cursor-pointer select-none text-left shadow-2xs group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="size-7 rounded-lg bg-surface-container group-hover:bg-primary/10 group-hover:text-primary-text flex items-center justify-center shrink-0 text-label font-bold text-xs transition-colors">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate text-body-text group-hover:text-primary-text transition-colors">
                                  {user.name || user.email}
                                </p>
                                <p className="text-xs text-label truncate max-w-36">
                                  {user.email}
                                </p>
                              </div>
                            </div>

                            <span className="size-7 rounded-lg bg-surface-container group-hover:bg-primary group-hover:text-superficie flex items-center justify-center text-label transition-all shrink-0">
                              <Icono nombre="mas" tamano="xs" ariaHidden={true} />
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* COLUMNA DERECHA: Con acceso */}
                <div className="flex flex-col rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/5 via-superficie to-primary/5 p-3.5 shadow-xs min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-text flex items-center gap-1.5">
                      <Icono nombre="exito" tamano="xs" ariaHidden={true} className="text-primary-text" />
                      <span>Con acceso</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {conAccesoVisibles.length > 0 ? (
                        <button
                          type="button"
                          onClick={quitarTodosFiltrados}
                          title="Retirar acceso a todos los usuarios filtrados"
                          className="min-h-12 inline-flex items-center px-3 text-xs font-bold text-error-text hover:underline cursor-pointer"
                        >
                          Quitar todos
                        </button>
                      ) : null}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary-text border border-primary/40">
                        {conAcceso.length}
                      </span>
                    </div>
                  </div>

                  <div className="relative mb-2.5">
                    <input
                      type="text"
                      placeholder="Filtrar con acceso…"
                      value={searchConAcceso}
                      onChange={(e) => setSearchConAcceso(e.target.value)}
                      aria-label="Filtrar usuarios con acceso"
                      className="w-full h-10 rounded-xl border border-primary/30 bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label"
                      aria-hidden="true"
                    >
                      <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                    </div>
                  </div>

                  <ul
                    ref={refLista('con-acceso')}
                    tabIndex={-1}
                    aria-label={`Usuarios con acceso a ${form.name || 'la plataforma'}`}
                    className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-64 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-primary/20"
                  >
                    {conAccesoVisibles.length === 0 ? (
                      <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                        {searchConAcceso.trim()
                          ? 'Ningún usuario coincide con la búsqueda.'
                          : 'Ningún usuario tiene acceso todavía.'}
                      </li>
                    ) : (
                      conAccesoVisibles.map((user) => {
                        const esNuevo = !accesosPorUsuario.has(user.id);
                        return (
                          <li key={user.id} className="p-0 list-none">
                            <button
                              type="button"
                              data-item-id={user.id}
                              onClick={() => quitarAcceso(user)}
                              aria-label={`Retirar acceso a ${user.name || user.email}`}
                              title={`Haz clic para retirar acceso a ${user.name || user.email}`}
                              className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-primary/30 bg-superficie hover:border-error/60 hover:bg-error/5 active:scale-95 transition-all cursor-pointer select-none text-left shadow-2xs group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-7 rounded-lg bg-primary/10 text-primary-text group-hover:bg-error/10 group-hover:text-error-text flex items-center justify-center shrink-0 font-bold text-xs transition-colors">
                                  {(user.name || user.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate text-body-text group-hover:text-error-text transition-colors">
                                    {user.name || user.email}
                                  </p>
                                  <p className="text-xs text-label truncate max-w-36">
                                    {user.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {esNuevo ? (
                                  <Badge tone="primary">Nuevo</Badge>
                                ) : (
                                  <Badge tone="success" dot>Activo</Badge>
                                )}
                                <span className="size-7 rounded-lg bg-surface-container group-hover:bg-error group-hover:text-superficie flex items-center justify-center text-label transition-all">
                                  <Icono nombre="cerrar" tamano="xs" ariaHidden={true} />
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
