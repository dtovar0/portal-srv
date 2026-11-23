'use client';

/** Ajustes › Mis preferencias: disponibles para cualquier usuario. */

import { useState } from 'react';
import { api } from '@/lib/api';
import { usePlatformsLayout } from '@/lib/platforms-layout';
import { Button, Checkbox, Field, TextInput } from '../form';
import {
  guardarOmitirBienvenida,
  leerOmitirBienvenida,
} from '../platforms/platforms-welcome-modal';
import {
  guardarBotonUsuarioCompacto,
  leerBotonUsuarioCompacto,
} from '../platforms/user-view-settings';
import {
  guardarOmitirModalPortal,
  leerOmitirModalPortal,
} from '../marco/modal-transicion-portal';
import {
  guardarOmitirModalAdmin,
  leerOmitirModalAdmin,
} from '../platforms/modal-transicion-admin';
import { useSession } from '../session-provider';
import { useToast } from '../toast';
import { Card } from '../ui';

export function PreferencesTab() {
  const { session } = useSession();
  const { avisar } = useToast();
  const { layout: platformsLayout, setLayout: setPlatformsLayout } = usePlatformsLayout();
  const [mostrarBienvenida, setMostrarBienvenida] = useState(() => !leerOmitirBienvenida());
  const [botonUsuarioCompacto, setBotonUsuarioCompacto] = useState(() => leerBotonUsuarioCompacto());
  const [confirmarPortal, setConfirmarPortal] = useState(() => !leerOmitirModalPortal());
  const [confirmarAdmin, setConfirmarAdmin] = useState(() => !leerOmitirModalAdmin());
  const [prefs, setPrefs] = useState(session?.preferences ?? null);
  const [state, setState] = useState<{ saving: boolean; saved: boolean; error: string | null }>(
    { saving: false, saved: false, error: null },
  );

  if (!prefs) return null;

  async function save() {
    setState({ saving: true, saved: false, error: null });
    try {
      // FNC-123: el tema lo guarda solo el selector; aquí se omite para no pisarlo con el de la sesión.
      const sinTema = { ...prefs! };
      delete sinTema.theme;
      const result = await api.savePreferences(sinTema);
      setPrefs(result.preferences);
      setState({ saving: false, saved: true, error: null });
      avisar('success', 'Tus preferencias se guardaron.', 'Guardado');
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo guardar';
      setState({ saving: false, saved: false, error: mensaje });
      avisar('error', mensaje, 'Error al guardar');
    }
  }

  return (
    <Card className="flex h-full w-full flex-1 min-h-0 flex-col space-y-4">

      <Checkbox
        label="Recibir notificaciones en la aplicación"
        checked={prefs.notifications}
        onChange={(e) => setPrefs({ ...prefs, notifications: e.target.checked })}
      />
      <Checkbox
        label="Recibir notificaciones por correo"
        checked={prefs.email_notifications}
        onChange={(e) => setPrefs({ ...prefs, email_notifications: e.target.checked })}
      />
      <Checkbox
        label="Mostrar los tours de ayuda"
        checked={prefs.tour_enabled}
        onChange={(e) => setPrefs({ ...prefs, tour_enabled: e.target.checked })}
      />

      <Field label="Intervalo de refresco (segundos)" hint="Entre 15 y 3600.">
        <TextInput
          type="number" min={15} max={3600}
          value={String(prefs.refresh_interval)}
          onChange={(e) =>
            setPrefs({ ...prefs, refresh_interval: Number(e.target.value) })
          }
        />
      </Field>

      <div className="border-t border-borde pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-body-text">Diseño de la vista de plataformas</h3>
          <p className="text-xs text-texto-secundario mt-0.5">
            Elige la presentación del catálogo de plataformas (/platforms). Solo aplica a esta vista; las páginas administrativas conservan el panel de control.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
            platformsLayout === 'topbar'
              ? 'border-primary bg-primary/5 text-body-text ring-1 ring-primary'
              : 'border-borde bg-superficie text-texto-secundario hover:bg-surface-container'
          }`}>
            <input
              type="radio"
              name="platforms_layout"
              value="topbar"
              checked={platformsLayout === 'topbar'}
              onChange={() => setPlatformsLayout('topbar')}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-body-text">Solo barra superior (Launchpad)</div>
              <div className="text-xs text-texto-secundario mt-0.5">
                Diseño amplio en cuadrícula de 4 columnas sin barra lateral. Recomendado para usuarios.
              </div>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
            platformsLayout === 'sidebar'
              ? 'border-primary bg-primary/5 text-body-text ring-1 ring-primary'
              : 'border-borde bg-superficie text-texto-secundario hover:bg-surface-container'
          }`}>
            <input
              type="radio"
              name="platforms_layout"
              value="sidebar"
              checked={platformsLayout === 'sidebar'}
              onChange={() => setPlatformsLayout('sidebar')}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-body-text">Con barra lateral (Panel de control)</div>
              <div className="text-xs text-texto-secundario mt-0.5">
                Mantiene la barra lateral corporativa persistente con navegación agrupada por secciones.
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="border-t border-borde pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-body-text">Mensaje de bienvenida en plataformas</h3>
          <p className="text-xs text-texto-secundario mt-0.5">
            Diálogo modal con el saludo y el resumen de tus plataformas corporativas al entrar al portal.
          </p>
        </div>
        <Checkbox
          label="Mostrar diálogo de bienvenida al ingresar"
          checked={mostrarBienvenida}
          onChange={(e) => {
            const checked = e.target.checked;
            setMostrarBienvenida(checked);
            guardarOmitirBienvenida(!checked);
          }}
        />
      </div>

      <div className="border-t border-borde pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-body-text">Botón de usuario en barra superior</h3>
          <p className="text-xs text-texto-secundario mt-0.5">
            Reduce el botón de perfil en la barra superior para mostrar únicamente el avatar con tus iniciales.
          </p>
        </div>
        <Checkbox
          label="Colapsar botón de usuario (solo mostrar icono)"
          checked={botonUsuarioCompacto}
          onChange={(e) => {
            const checked = e.target.checked;
            setBotonUsuarioCompacto(checked);
            guardarBotonUsuarioCompacto(checked);
          }}
        />
      </div>

      {session?.permissions?.is_admin || session?.permissions?.is_area_admin ? (
        <div className="border-t border-borde pt-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-body-text">Confirmación al cambiar al portal</h3>
            <p className="text-xs text-texto-secundario mt-0.5">
              Muestra un aviso preventivo antes de redirigir al portal de usuario al pulsar «Portal» en el menú.
            </p>
          </div>
          <Checkbox
            label="Mostrar confirmación antes de ingresar al portal de usuario"
            checked={confirmarPortal}
            onChange={(e) => {
              const checked = e.target.checked;
              setConfirmarPortal(checked);
              guardarOmitirModalPortal(!checked);
            }}
          />
          <Checkbox
            label="Mostrar confirmación antes de regresar al panel de administración"
            checked={confirmarAdmin}
            onChange={(e) => {
              const checked = e.target.checked;
              setConfirmarAdmin(checked);
              guardarOmitirModalAdmin(!checked);
            }}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={state.saving}>
          {state.saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </Card>
  );
}
