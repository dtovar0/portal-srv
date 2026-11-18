'use client';

/**
 * Panel modal de "Accesos de área" con Dual Picklist.
 * Permite agregar y quitar usuarios del área seleccionada.
 * - Columna izquierda: Usuarios SIN acceso al área (disponibles para agregar).
 * - Columna derecha: Usuarios CON acceso al área (miembros del área).
 * - Transferencia con un solo clic entre columnas.
 * - Filtros de búsqueda independientes en ambas columnas.
 * - Acciones rápidas para agregar o quitar todos los filtrados.
 * - Notificaciones mediante Toast (`useToast`).
 * - Conforme a tokens del sistema y accesibilidad completa (DIS-016, DIS-019).
 */

import { useCallback, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Area, ManagedUser } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { useFocoTrasMover } from '@/lib/use-foco-tras-mover';
import { Button, Modal } from '../form';
import { Icono } from '../icono';
import { RegionDeAnuncios } from '../region-de-anuncios';
import { useToast } from '../toast';
import { Badge, EmptyNote, ErrorNote, Spinner } from '../ui';
import { mensajeDeError } from './area-errors';

function coincideUsuario(user: ManagedUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
}

export function AreaUsersPanel({
  area,
  onClose,
  onSaved,
}: {
  area: Area;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { avisar } = useToast();
  const usersAsync = useAsync(() => api.users(), []);

  const [cambios, setCambios] = useState<Record<number, boolean>>({});
  const [searchSinAcceso, setSearchSinAcceso] = useState('');
  const [searchConAcceso, setSearchConAcceso] = useState('');
  const [saving, setSaving] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const { refLista, enfocarTras } = useFocoTrasMover();

  const todosLosUsuarios = useMemo(() => usersAsync.data ?? [], [usersAsync.data]);

  // Determina si el usuario pertenecía inicialmente al área
  const perteneceInicialmente = useCallback(
    (u: ManagedUser) => u.areas.some((a) => a.id === area.id),
    [area.id],
  );

  // Determina si el usuario tiene acceso (estado inicial + cambios pendientes)
  const tieneAcceso = useCallback(
    (u: ManagedUser) => cambios[u.id] ?? perteneceInicialmente(u),
    [cambios, perteneceInicialmente],
  );

  // Listas divididas: Izquierda (sin acceso) y Derecha (con acceso)
  const sinAcceso = useMemo(
    () => todosLosUsuarios.filter((u) => !tieneAcceso(u)),
    [todosLosUsuarios, tieneAcceso],
  );

  const conAcceso = useMemo(
    () => todosLosUsuarios.filter((u) => tieneAcceso(u)),
    [todosLosUsuarios, tieneAcceso],
  );

  // Filtrado por buscador en cada columna
  const sinAccesoVisibles = useMemo(
    () => sinAcceso.filter((u) => coincideUsuario(u, searchSinAcceso)),
    [sinAcceso, searchSinAcceso],
  );

  const conAccesoVisibles = useMemo(
    () => conAcceso.filter((u) => coincideUsuario(u, searchConAcceso)),
    [conAcceso, searchConAcceso],
  );

  // Cambios pendientes respecto al estado original
  const pendientes = useMemo(
    () => todosLosUsuarios.filter((u) => tieneAcceso(u) !== perteneceInicialmente(u)),
    [todosLosUsuarios, tieneAcceso, perteneceInicialmente],
  );

  function darAcceso(user: ManagedUser) {
    enfocarTras('sin-acceso', sinAccesoVisibles, user.id);
    setCambios((prev) => ({ ...prev, [user.id]: true }));
    setAnuncio(`«${user.name || user.email}» agregado al área, ${conAcceso.length + 1} con acceso`);
  }

  function quitarAcceso(user: ManagedUser) {
    enfocarTras('con-acceso', conAccesoVisibles, user.id);
    setCambios((prev) => ({ ...prev, [user.id]: false }));
    setAnuncio(`«${user.name || user.email}» retirado del área, ${sinAcceso.length + 1} sin acceso`);
  }

  async function guardar() {
    setSaving(true);
    try {
      const userIdsConAcceso = todosLosUsuarios.filter((u) => tieneAcceso(u)).map((u) => u.id);
      await api.setAreaUsers(area.id, userIdsConAcceso);
      avisar(
        'success',
        `Accesos del área «${area.name}» actualizados correctamente.`,
        'Accesos actualizados',
      );
      setCambios({});
      onSaved?.();
      onClose();
    } catch (err) {
      const msg = mensajeDeError(err, 'No se pudieron actualizar los usuarios del área.');
      avisar('error', msg, 'Error');
      usersAsync.reload();
    } finally {
      setSaving(false);
    }
  }

  const loading = usersAsync.loading;
  const error = usersAsync.error;

  return (
    <Modal
      title={`Accesos — ${area.name}`}
      icon="solicitudes"
      size="2xl"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
            Cerrar
          </Button>
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
        </div>
      }
    >
      <div className="space-y-4">
        <RegionDeAnuncios mensaje={anuncio} />

        {/* Cabecera contextual del área */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-panel-border/80 bg-surface-container/60 shadow-xs">
          <div className="min-w-0">
            <p className="text-xs font-bold text-body-text">
              Área: <span className="text-primary-text">{area.name}</span>
            </p>
            <p className="text-xs text-label truncate">
              {area.description || 'Gestión de usuarios y membresía del área.'}
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

        {loading && !usersAsync.data ? <Spinner /> : null}
        {error ? <ErrorNote message={error} /> : null}

        {!loading && !error ? (
          todosLosUsuarios.length === 0 ? (
            <EmptyNote message="No hay usuarios disponibles en tu alcance." />
          ) : (
            /* DUAL PICK LIST: 2 columnas limpias */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch w-full min-h-0">
              {/* COLUMNA IZQUIERDA: Sin acceso al área */}
              <div className="flex flex-col rounded-2xl border border-panel-border/80 bg-surface-container/60 p-3.5 shadow-xs min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-body-text flex items-center gap-1.5">
                    <Icono nombre="usuarios" tamano="xs" ariaHidden={true} className="text-label" />
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
                    aria-label="Filtrar usuarios sin acceso al área"
                    className="w-full h-10 rounded-xl border border-panel-border bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner-soft transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
                    <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                  </div>
                </div>

                <ul
                  ref={refLista('sin-acceso')}
                  tabIndex={-1}
                  aria-label={`Usuarios sin acceso al área ${area.name}`}
                  className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-72 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-panel-border"
                >
                  {sinAccesoVisibles.length === 0 ? (
                    <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                      {searchSinAcceso.trim()
                        ? 'Ningún usuario coincide con la búsqueda.'
                        : 'Todos los usuarios tienen acceso a esta área.'}
                    </li>
                  ) : (
                    sinAccesoVisibles.map((user) => (
                      <li key={user.id} className="p-0 list-none">
                        <button
                          type="button"
                          data-item-id={user.id}
                          onClick={() => darAcceso(user)}
                          aria-label={`Agregar ${user.name || user.email} al área`}
                          title={`Haz clic para agregar a ${user.name || user.email} al área`}
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

                          <span className="size-7 rounded-lg bg-surface-container group-hover:bg-primary group-hover:text-on-primary flex items-center justify-center text-label transition-all shrink-0">
                            <Icono nombre="mas" tamano="xs" ariaHidden={true} />
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* COLUMNA DERECHA: Con acceso al área */}
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
                    aria-label="Filtrar usuarios con acceso al área"
                    className="w-full h-10 rounded-xl border border-panel-border bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner-soft transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
                    <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                  </div>
                </div>

                <ul
                  ref={refLista('con-acceso')}
                  tabIndex={-1}
                  aria-label={`Usuarios con acceso al área ${area.name}`}
                  className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-72 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-primary/20"
                >
                  {conAccesoVisibles.length === 0 ? (
                    <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                      {searchConAcceso.trim()
                        ? 'Ningún usuario coincide con la búsqueda.'
                        : 'Ningún usuario tiene acceso todavía. Haz clic en los disponibles a la izquierda.'}
                    </li>
                  ) : (
                    conAccesoVisibles.map((user) => {
                      const esNuevo = !perteneceInicialmente(user);
                      return (
                        <li key={user.id} className="p-0 list-none">
                          <button
                            type="button"
                            data-item-id={user.id}
                            onClick={() => quitarAcceso(user)}
                            aria-label={`Retirar a ${user.name || user.email} del área`}
                            title={`Haz clic para retirar a ${user.name || user.email} del área`}
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
                                <Badge tone="success" dot>Miembro</Badge>
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
          )
        ) : null}
      </div>
    </Modal>
  );
}
