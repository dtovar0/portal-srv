'use client';

/**
 * Modal de administración de "Accesos de usuario" con Dual Picklist.
 * - Columna izquierda: Plataformas SIN acceso asignado.
 * - Columna derecha: Plataformas CON acceso asignado.
 * - Transferencia con un solo clic entre columnas.
 * - Buscadores independientes en ambas columnas.
 * - Notificaciones exclusivas por Toast (sin notas de error inline en el modal).
 * - Conforme a tokens y reglas de arquitectura del sistema.
 */

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { grantsApi } from '@/lib/access/grants';
import type { Access, AccessStatus } from '@/lib/access/types';
import type { ManagedUser, Platform } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { Button, Modal } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { EmptyNote, Spinner } from '../ui';

export const MENSAJE_SUPERADMIN =
  'Es superadmin: tiene acceso a todas las plataformas desde el portal y no tiene accesos registrados.';

export const ESTADO_PARA_ADMIN: Record<string, string> = {
  en_proceso: 'Se está aplicando en la plataforma.',
  activo: 'Confirmado en la plataforma.',
  fallido: 'No se pudo aplicar en la plataforma tras los reintentos.',
  revocando: 'Se está retirando de la plataforma.',
  revocado: 'Retirado de la plataforma.',
  fallo_revocacion: 'No se pudo retirar de la plataforma tras los reintentos.',
};

export const SIN_ACCION = {
  noActivo: 'Sin acciones',
  propio: 'Es tu acceso: lo revoca otro administrador.',
  automatico: 'Automático del área: solo lo revoca el superadmin.',
  adminDelArea: 'Administra esta área: solo lo revoca el superadmin.',
} as const;

export function motivoSinRevocar(
  access: Access,
  user: ManagedUser,
  sesion: { id: number | undefined; esSuperadmin: boolean },
): string | null {
  if (access.status !== 'activo') return SIN_ACCION.noActivo;
  if (access.user?.id === sesion.id) return SIN_ACCION.propio;
  if (sesion.esSuperadmin) return null;
  if (access.origin === 'admin_de_area') return SIN_ACCION.automatico;
  if (user.managed_areas?.some((area) => area.id === access.area?.id)) return SIN_ACCION.adminDelArea;
  return null;
}

export function avisoRevocacion(access: Access): string {
  return `Revocación en curso: ${access.user?.name} en ${access.platform?.name}. El acceso se retirará de la plataforma.`;
}

export function mensajeVacioAccesos(status: string = 'vigente'): string {
  return status === 'vigente'
    ? 'No tiene accesos vigentes dentro de tu alcance.'
    : 'No tiene accesos con ese estado dentro de tu alcance.';
}

function coincidePlataforma(p: Platform, query: string): boolean {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    p.name.toLowerCase().includes(q) ||
    (p.area_name ? p.area_name.toLowerCase().includes(q) : false) ||
    (p.description ? p.description.toLowerCase().includes(q) : false)
  );
}

export function UserAccessPanel({
  user,
  onClose,
}: {
  user: ManagedUser;
  onClose: () => void;
}) {
  const { avisar } = useToast();
  const platformsAsync = useAsync(() => api.platforms(), []);
  const accessAsync = useAsync(
    () => grantsApi.ofUser(user.id, { status: 'vigente', per_page: 100 }),
    [user.id],
  );

  const [cambios, setCambios] = useState<Record<number, boolean>>({});
  const [searchSinAcceso, setSearchSinAcceso] = useState('');
  const [searchConAcceso, setSearchConAcceso] = useState('');
  const [saving, setSaving] = useState(false);

  // Mapa de accesos vigentes del usuario: platform_id -> Access
  const accesosPorPlataforma = useMemo(() => {
    const map = new Map<number, Access>();
    for (const acc of accessAsync.data?.items ?? []) {
      if (acc.platform?.id) {
        map.set(acc.platform.id, acc);
      }
    }
    return map;
  }, [accessAsync.data]);

  const plataformas = useMemo(() => platformsAsync.data ?? [], [platformsAsync.data]);

  // Determina si el usuario tiene acceso a una plataforma
  const tieneAcceso = (p: Platform) => cambios[p.id] ?? accesosPorPlataforma.has(p.id);

  // División en listas: Izquierda (sin acceso) y Derecha (con acceso)
  const sinAcceso = useMemo(
    () => plataformas.filter((p) => !tieneAcceso(p)),
    [plataformas, cambios, accesosPorPlataforma],
  );

  const conAcceso = useMemo(
    () => plataformas.filter((p) => tieneAcceso(p)),
    [plataformas, cambios, accesosPorPlataforma],
  );

  // Filtrado por buscador en cada columna
  const sinAccesoVisibles = useMemo(
    () => sinAcceso.filter((p) => coincidePlataforma(p, searchSinAcceso)),
    [sinAcceso, searchSinAcceso],
  );

  const conAccesoVisibles = useMemo(
    () => conAcceso.filter((p) => coincidePlataforma(p, searchConAcceso)),
    [conAcceso, searchConAcceso],
  );

  // Cambios pendientes
  const pendientes = useMemo(
    () => plataformas.filter((p) => tieneAcceso(p) !== accesosPorPlataforma.has(p.id)),
    [plataformas, cambios, accesosPorPlataforma],
  );
  const aRevocar = useMemo(() => pendientes.filter((p) => !tieneAcceso(p)), [pendientes, tieneAcceso]);
  const aOtorgar = useMemo(() => pendientes.filter((p) => tieneAcceso(p)), [pendientes, tieneAcceso]);

  function darAcceso(p: Platform) {
    setCambios((prev) => ({ ...prev, [p.id]: true }));
  }

  function quitarAcceso(p: Platform) {
    setCambios((prev) => ({ ...prev, [p.id]: false }));
  }

  async function guardar() {
    setSaving(true);
    try {
      // 1. Otorgar accesos nuevos
      for (const p of aOtorgar) {
        await api.grantPlatformAccess(p.id, user.id, 'usuario');
      }

      // 2. Revocar accesos desmarcados
      for (const p of aRevocar) {
        const acceso = accesosPorPlataforma.get(p.id);
        if (acceso) {
          await api.revokeAccess(acceso.id, 'Retirado por administrador');
        }
      }

      const mensaje =
        aRevocar.length > 0 && aOtorgar.length === 0
          ? `Acceso retirado para ${user.name || user.email}.`
          : aOtorgar.length > 0 && aRevocar.length === 0
          ? `Acceso otorgado para ${user.name || user.email}.`
          : `Accesos de «${user.name || user.email}» actualizados.`;

      avisar('success', mensaje, 'Accesos');
      setCambios({});
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudieron actualizar los accesos.';
      avisar('error', msg, 'Error');
      accessAsync.reload();
    } finally {
      setSaving(false);
    }
  }

  const loading = platformsAsync.loading || accessAsync.loading;
  const error = platformsAsync.error || accessAsync.error;

  return (
    <Modal
      title={`Accesos — ${user.name || user.email}`}
      icon="solicitudes"
      size="2xl"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
            Cerrar
          </Button>
          {user.role === 'administrador' ? null : (
            <div className="flex items-center gap-2">
              {pendientes.length > 0 ? (
                <span className="text-xs font-semibold text-label">
                  {pendientes.length} {pendientes.length === 1 ? 'cambio pendiente' : 'cambios pendientes'}
                </span>
              ) : null}
              <Button onClick={guardar} disabled={saving || pendientes.length === 0}>
                <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Cabecera contextual */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-panel-border/80 bg-surface-container/60 shadow-xs">
          <div className="min-w-0">
            <p className="text-xs font-bold text-body-text">
              Usuario: <span className="text-primary-text">{user.name || user.email}</span>
            </p>
            <p className="text-xs text-label truncate">
              Correo: <span className="font-semibold">{user.email}</span>
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

        {user.role === 'administrador' ? (
          <div className="p-4 text-center">
            <EmptyNote message={MENSAJE_SUPERADMIN} />
          </div>
        ) : (
          <>
            {loading && !platformsAsync.data ? <Spinner /> : null}

            {!loading && !error ? (
              plataformas.length === 0 ? (
                <EmptyNote message="No hay plataformas disponibles en el sistema." />
              ) : (
                /* DUAL PICK LIST: 2 columnas limpias */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch w-full min-h-0">
                  {/* COLUMNA IZQUIERDA: Sin acceso */}
                  <div className="flex flex-col rounded-2xl border border-panel-border/80 bg-surface-container/60 p-3.5 shadow-xs min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-body-text flex items-center gap-1.5">
                        <Icono nombre="plataformas" tamano="xs" ariaHidden={true} className="text-label" />
                        <span>Sin acceso</span>
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-superficie text-label border border-panel-border/60">
                        {sinAcceso.length}
                      </span>
                    </div>

                    <div className="relative mb-2.5">
                      <input
                        type="text"
                        placeholder="Filtrar sin acceso…"
                        value={searchSinAcceso}
                        onChange={(e) => setSearchSinAcceso(e.target.value)}
                        aria-label="Filtrar plataformas sin acceso"
                        className="w-full h-10 rounded-xl border border-panel-border/60 bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-label/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner-soft transition-colors"
                      />
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
                        <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                      </div>
                    </div>

                    <ul
                      aria-label={`Plataformas sin acceso para ${user.name || user.email}`}
                      className="flex-1 min-h-48 max-h-72 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-panel-border/40"
                    >
                      {sinAccesoVisibles.length === 0 ? (
                        <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                          {searchSinAcceso.trim()
                            ? 'Ninguna plataforma coincide con la búsqueda.'
                            : 'El usuario tiene acceso a todas las plataformas.'}
                        </li>
                      ) : (
                        sinAccesoVisibles.map((p) => (
                          <li key={p.id} className="p-0 list-none">
                            <button
                              type="button"
                              onClick={() => darAcceso(p)}
                              aria-label={`Otorgar acceso a ${p.name}`}
                              title={`Haz clic para otorgar acceso a ${p.name}`}
                              className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-panel-border/60 bg-superficie hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all cursor-pointer select-none text-left shadow-2xs group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-7 rounded-lg bg-surface-container group-hover:bg-primary/10 group-hover:text-primary-text flex items-center justify-center shrink-0 text-label font-bold text-xs transition-colors">
                                  <Icono nombre={(p.icon as any) || 'plataformas'} tamano="xs" ariaHidden={true} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate text-body-text group-hover:text-primary-text transition-colors">
                                    {p.name}
                                  </p>
                                  <p className="text-xs text-label truncate">
                                    {p.area_name || 'Sin área'}
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
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary-text border border-primary/40">
                        {conAcceso.length}
                      </span>
                    </div>

                    <div className="relative mb-2.5">
                      <input
                        type="text"
                        placeholder="Filtrar con acceso…"
                        value={searchConAcceso}
                        onChange={(e) => setSearchConAcceso(e.target.value)}
                        aria-label="Filtrar plataformas con acceso"
                        className="w-full h-10 rounded-xl border border-primary/30 bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-label/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner-soft transition-colors"
                      />
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
                        <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                      </div>
                    </div>

                    <ul
                      aria-label={`Plataformas con acceso para ${user.name || user.email}`}
                      className="flex-1 min-h-48 max-h-72 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-primary/20"
                    >
                      {conAccesoVisibles.length === 0 ? (
                        <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                          {searchConAcceso.trim()
                            ? 'Ninguna plataforma coincide con la búsqueda.'
                            : 'El usuario no tiene acceso a ninguna plataforma todavía.'}
                        </li>
                      ) : (
                        conAccesoVisibles.map((p) => (
                          <li key={p.id} className="p-0 list-none">
                            <button
                              type="button"
                              onClick={() => quitarAcceso(p)}
                              aria-label={`Revocar acceso a ${p.name}`}
                              title={`Haz clic para revocar acceso a ${p.name}`}
                              className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-primary/30 bg-superficie hover:border-error-text/60 hover:bg-error/5 active:scale-95 transition-all cursor-pointer select-none text-left shadow-2xs group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-7 rounded-lg bg-primary/10 text-primary-text group-hover:bg-error/10 group-hover:text-error-text flex items-center justify-center shrink-0 font-bold text-xs transition-colors">
                                  <Icono nombre={(p.icon as any) || 'plataformas'} tamano="xs" ariaHidden={true} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate text-body-text group-hover:text-error-text transition-colors">
                                    {p.name}
                                  </p>
                                  <p className="text-xs text-label truncate">
                                    {p.area_name || 'Sin área'}
                                  </p>
                                </div>
                              </div>

                              <span className="size-7 rounded-lg bg-surface-container group-hover:bg-error-text group-hover:text-superficie flex items-center justify-center text-label transition-all shrink-0">
                                <Icono nombre="cerrar" tamano="xs" ariaHidden={true} />
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              )
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
