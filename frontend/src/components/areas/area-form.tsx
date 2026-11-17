'use client';

/**
 * Alta y edición de un área en 2 pasos (DIS-016):
 * - Paso 1: Descripción (Nombre obligatorio, Descripción opcional).
 * - Paso 2: Estilo visual (Color personalizado o por omisión, vista previa dinámica y Estado Activo/Inactivo).
 *
 * En un alta el color no se envía hasta que se elige: el servidor aplica su
 * color por omisión (el mismo que antes fijaba aquí la pantalla), y así no
 * hay un color literal en el componente.
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Area, AreaInput } from '@/lib/types';
import { variablesCss } from '@/lib/variables-css';
import { Button, Checkbox, ColorInput, Field, FieldErrorNote, Modal, TextArea, TextInput } from '../form';
import { Icono } from '../icono';
import type { NombreIcono } from '../icono-trazos';
import { Badge, ErrorNote } from '../ui';
import { erroresDeCampo, mensajeDeError } from './area-errors';

const ICONOS_AREA: { id: NombreIcono; label: string }[] = [
  { id: 'areas', label: 'Estructura' },
  { id: 'panel', label: 'Panel' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'plataformas', label: 'Plataformas' },
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
  { id: 'favorito', label: 'Prioritario' },
];

/** Id del campo Nombre: recibe el foco cuando es inválido (`TextInput` no acepta `ref`). */
const NAME_ID = 'area-name';

function enfocarNombre() {
  document.getElementById(NAME_ID)?.focus();
}

/** Atributos de accesibilidad de un control con posible error. */
function invalido(id: string, message?: string) {
  return message ? { 'aria-invalid': true, 'aria-describedby': id } : {};
}

export function AreaForm({
  area,
  onClose,
  onSaved,
}: {
  area: Area | null;
  onClose: () => void;
  /** Recibe el área que devolvió el servidor. */
  onSaved: (saved: Area) => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [form, setForm] = useState<AreaInput>(
    area
      ? {
          name: area.name,
          description: area.description ?? '',
          icon: area.icon || 'areas',
          color: area.color,
          status: area.status,
        }
      : { name: '', description: '', icon: 'areas', status: 'Activo' },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  function avanzarAlPaso2() {
    if (!form.name?.trim()) {
      setError(null);
      setFields({ name: 'El nombre es obligatorio.' });
      enfocarNombre();
      return;
    }
    setError(null);
    setFields({});
    setPaso(2);
  }

  function retrocederAlPaso1() {
    setError(null);
    setPaso(1);
    setTimeout(enfocarNombre, 50);
  }

  async function save() {
    if (!form.name?.trim()) {
      setError(null);
      setFields({ name: 'El nombre es obligatorio.' });
      setPaso(1);
      setTimeout(enfocarNombre, 50);
      return;
    }
    setSaving(true);
    setError(null);
    setFields({});
    try {
      const result = area ? await api.updateArea(area.id, form) : await api.createArea(form);
      onSaved(result.area);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar'));
      const errores = erroresDeCampo(err);
      setFields(errores);
      if (errores.name || errores.description) {
        setPaso(1);
        if (errores.name) setTimeout(enfocarNombre, 50);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={area ? 'Editar área' : 'Nueva área'}
      icon="areas"
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

        {/* PASO 1: Descripción (Nombre y Descripción) */}
        {paso === 1 ? (
          <div className="space-y-4">
            <div>
              <Field label="Nombre">
                <TextInput
                  id={NAME_ID}
                  placeholder="Ej. Finanzas, Infraestructura…"
                  value={form.name ?? ''}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (fields.name) setFields({ ...fields, name: '' });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      avanzarAlPaso2();
                    }
                  }}
                  {...invalido('area-name-error', fields.name)}
                />
              </Field>
              <FieldErrorNote id="area-name-error" message={fields.name} />
            </div>

            <div>
              <Field label="Descripción">
                <TextArea
                  rows={3}
                  placeholder="Describe las funciones, plataformas y propósito del área…"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  {...invalido('area-description-error', fields.description)}
                />
              </Field>
              <FieldErrorNote id="area-description-error" message={fields.description} />
            </div>
          </div>
        ) : null}

        {/* PASO 2: Estilo visual (Color, Icono, Vista previa, Estado) */}
        {paso === 2 ? (
          <div className="space-y-5">
            <div>
              <Field
                label="Color"
                hint={form.color ? undefined : 'Si no eliges uno, se usa el color por omisión.'}
              >
                <div className="flex items-center gap-3 pt-1">
                  <ColorInput
                    id="area-color"
                    aria-label="Color"
                    value={form.color ?? ''}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    {...invalido('area-color-error', fields.color)}
                  />
                  <div className="text-xs text-label">
                    <span className="font-semibold text-body-text">{form.color || 'Por omisión'}</span>
                    <p>Color de identificación del área en tarjetas e insignias.</p>
                  </div>
                </div>
              </Field>
              <FieldErrorNote id="area-color-error" message={fields.color} />
            </div>

            <div>
              <Field
                label="Icono representativo"
                hint="Selecciona el icono que identificará al área en listas, insignias y tarjetas."
              >
                <div
                  role="radiogroup"
                  aria-label="Icono del área"
                  className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1"
                >
                  {ICONOS_AREA.map(({ id, label }) => {
                    const seleccionado = (form.icon || 'areas') === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={seleccionado}
                        aria-label={label}
                        title={label}
                        onClick={() => setForm({ ...form, icon: id })}
                        className={`min-h-12 min-w-12 flex flex-col items-center justify-center gap-1 rounded-xl border p-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                          seleccionado
                            ? 'border-primary bg-primary/10 text-primary-text ring-2 ring-primary/40 shadow-xs'
                            : 'border-panel-border/80 bg-surface-container/60 text-label hover:border-body-text/30 hover:text-body-text'
                        }`}
                      >
                        <Icono nombre={id} tamano="md" ariaHidden={true} />
                        <span className="text-xs font-medium leading-none truncate max-w-full">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <FieldErrorNote id="area-icon-error" message={fields.icon} />
            </div>

            {/* Vista previa en vivo del estilo visual */}
            <div className="rounded-xl border border-panel-border/80 bg-surface-container/30 p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-label block">
                Vista previa
              </span>
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-panel-border/80 bg-panel-fill shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="nx-chip-tint grid size-10 shrink-0 place-items-center rounded-xl text-xs font-black shadow-xs"
                    style={variablesCss({ '--chip-color': form.color })}
                    aria-hidden="true"
                  >
                    {(form.name || 'Área').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="inline-flex size-5 items-center justify-center rounded-md border border-panel-border/60 bg-surface-container text-primary-text shrink-0">
                        <Icono nombre={((form.icon as NombreIcono) || 'areas')} tamano="xs" ariaHidden={true} />
                      </span>
                      <p className="truncate font-bold text-sm text-body-text leading-tight">
                        {form.name || 'Nombre del área'}
                      </p>
                    </div>
                    <p className="truncate text-xs text-label leading-tight mt-0.5">
                      {form.description || 'Sin descripción.'}
                    </p>
                  </div>
                </div>
                <Badge tone={form.status === 'Activo' ? 'success' : 'warning'} dot>
                  {form.status === 'Activo' ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </div>

            <div>
              <Checkbox
                id="area-status"
                label="Activa"
                checked={form.status === 'Activo'}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? 'Activo' : 'Inactivo' })}
                {...invalido('area-status-error', fields.status)}
              />
              <FieldErrorNote id="area-status-error" message={fields.status} />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
