'use client';

/**
 * Modal de administración de "Accesos de usuario" con Dual Picklist.
 * - Pestaña Áreas: Asignación y desvinculación de áreas organizativas del usuario.
 * - Pestaña Plataformas: Asignación y revocación de accesos a plataformas del usuario.
 * - Transferencia con un solo clic entre columnas en ambas pestañas.
 * - Buscadores independientes en ambas columnas.
 * - Notificaciones exclusivas por Toast (sin notas de error inline en el modal).
 * - Conforme a tokens y reglas de arquitectura del sistema.
 */

import { useCallback, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { grantsApi } from '@/lib/access/grants';
import type { Access } from '@/lib/access/types';
import type { Area, ManagedUser, Platform } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { useFocoTrasMover } from '@/lib/use-foco-tras-mover';
import { Button, Modal } from '../form';
import { Icono, type NombreIcono } from '../icono';
import { AVISO_SALIDA_DE_AREA } from '../areas/area-users-panel';
import { RegionDeAnuncios } from '../region-de-anuncios';
import { useToast } from '../toast';
import { Badge, EmptyNote, ErrorNote, Spinner } from '../ui';

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

function coincideArea(a: Area, query: string): boolean {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    a.name.toLowerCase().includes(q) ||
    (a.description ? a.description.toLowerCase().includes(q) : false)
  );
}

export function UserAccessPanel({
  user,
  users,
  initialTab = 'plataformas',
  onClose,
  onSaved,
}: {
  user?: ManagedUser;
  users?: ManagedUser[];
  initialTab?: 'areas' | 'plataformas';
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { avisar } = useToast();
  const [tab, setTab] = useState<'areas' | 'plataformas'>(initialTab);

  const userList = useMemo(() => {
    if (users && users.length > 0) return users;
    if (user) return [user];
    return [];
  }, [users, user]);

  const currentUser = userList[0] || ({} as ManagedUser);
  const isMulti = userList.length > 1;

  // --- DATOS DE ÁREAS ---
  const areasAsync = useAsync(() => api.areas(), []);
  const [anuncio, setAnuncio] = useState('');
  const { refLista, enfocarTras } = useFocoTrasMover();
  const [cambiosAreas, setCambiosAreas] = useState<Record<number, boolean>>({});
  const [searchSinAccesoAreas, setSearchSinAccesoAreas] = useState('');
  const [searchConAccesoAreas, setSearchConAccesoAreas] = useState('');

  const areas = useMemo(() => areasAsync.data ?? [], [areasAsync.data]);

  const perteneceAreaInicial = useCallback(
    (a: Area) => {
      if (userList.length === 0) return false;
      return userList.every((u) => (u.areas || []).some((ua) => ua.id === a.id));
    },
    [userList],
  );

  const tieneArea = useCallback(
    (a: Area) => cambiosAreas[a.id] ?? perteneceAreaInicial(a),
    [cambiosAreas, perteneceAreaInicial],
  );

  const areasSinAcceso = useMemo(
    () => areas.filter((a) => !tieneArea(a)),
    [areas, tieneArea],
  );

  const areasConAcceso = useMemo(
    () => areas.filter((a) => tieneArea(a)),
    [areas, tieneArea],
  );

  const areasSinAccesoVisibles = useMemo(
    () => areasSinAcceso.filter((a) => coincideArea(a, searchSinAccesoAreas)),
    [areasSinAcceso, searchSinAccesoAreas],
  );

  const areasConAccesoVisibles = useMemo(
    () => areasConAcceso.filter((a) => coincideArea(a, searchConAccesoAreas)),
    [areasConAcceso, searchConAccesoAreas],
  );

  const pendientesAreas = useMemo(
    () => areas.filter((a) => tieneArea(a) !== perteneceAreaInicial(a)),
    [areas, tieneArea, perteneceAreaInicial],
  );

  function darArea(a: Area) {
    enfocarTras('areas-sin-acceso', areasSinAccesoVisibles, a.id);
    setCambiosAreas((prev) => ({ ...prev, [a.id]: true }));
    setAnuncio(`Área «${a.name}» asignada, ${areasConAcceso.length + 1} asignadas`);
  }

  function quitarArea(a: Area) {
    enfocarTras('areas-con-acceso', areasConAccesoVisibles, a.id);
    setCambiosAreas((prev) => ({ ...prev, [a.id]: false }));
    setAnuncio(`Área «${a.name}» retirada, ${areasSinAcceso.length + 1} sin asignar`);
  }

  // --- DATOS DE PLATAFORMAS ---
  const platformsAsync = useAsync(() => api.platforms(), []);
  const accessAsync = useAsync(async () => {
    if (userList.length === 0) return [];
    // Si falla la lectura de alguno, se muestra el error: suponer "sin accesos"
    // haría que Guardar volviera a otorgar lo que ya tiene.
    return Promise.all(
      userList.map((u) => grantsApi.ofUser(u.id, { status: 'vigente', per_page: 100 })),
    );
  }, [userList]);

  const [cambios, setCambios] = useState<Record<number, boolean>>({});
  const [searchSinAcceso, setSearchSinAcceso] = useState('');
  const [searchConAcceso, setSearchConAcceso] = useState('');
  const [saving, setSaving] = useState(false);

  // Mapa de accesos vigentes por usuario: user_id -> (platform_id -> Access)
  const accesosPorUsuario = useMemo(() => {
    const map = new Map<number, Map<number, Access>>();
    const results = accessAsync.data ?? [];
    userList.forEach((u, idx) => {
      const userGrants = results[idx]?.items ?? [];
      const userMap = new Map<number, Access>();
      for (const acc of userGrants) {
        if (acc.platform?.id) {
          userMap.set(acc.platform.id, acc);
        }
      }
      map.set(u.id, userMap);
    });
    return map;
  }, [accessAsync.data, userList]);

  const plataformas = useMemo(() => platformsAsync.data ?? [], [platformsAsync.data]);

  // Determina si todos los usuarios del lote tienen acceso a una plataforma
  const tieneAccesoInicial = useCallback(
    (p: Platform) => {
      if (userList.length === 0) return false;
      return userList.every((u) => accesosPorUsuario.get(u.id)?.has(p.id));
    },
    [userList, accesosPorUsuario],
  );

  const tieneAcceso = useCallback(
    (p: Platform) => cambios[p.id] ?? tieneAccesoInicial(p),
    [cambios, tieneAccesoInicial],
  );

  // División en listas: Izquierda (sin acceso) y Derecha (con acceso)
  const sinAcceso = useMemo(
    () => plataformas.filter((p) => !tieneAcceso(p)),
    [plataformas, tieneAcceso],
  );

  const conAcceso = useMemo(
    () => plataformas.filter((p) => tieneAcceso(p)),
    [plataformas, tieneAcceso],
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

  // Cambios pendientes en plataformas
  const pendientes = useMemo(
    () => plataformas.filter((p) => tieneAcceso(p) !== tieneAccesoInicial(p)),
    [plataformas, tieneAcceso, tieneAccesoInicial],
  );
  const aRevocar = useMemo(() => pendientes.filter((p) => !tieneAcceso(p)), [pendientes, tieneAcceso]);
  const aOtorgar = useMemo(() => pendientes.filter((p) => tieneAcceso(p)), [pendientes, tieneAcceso]);

  function darAcceso(p: Platform) {
    enfocarTras('plataformas-sin-acceso', sinAccesoVisibles, p.id);
    setCambios((prev) => ({ ...prev, [p.id]: true }));
    setAnuncio(`Acceso a «${p.name}» agregado, ${conAcceso.length + 1} con acceso`);
  }

  function quitarAcceso(p: Platform) {
    enfocarTras('plataformas-con-acceso', conAccesoVisibles, p.id);
    setCambios((prev) => ({ ...prev, [p.id]: false }));
    setAnuncio(`Acceso a «${p.name}» retirado, ${sinAcceso.length + 1} sin acceso`);
  }

  async function guardarAreas() {
    setSaving(true);
    try {
      // Solo se aplican los cambios del panel sobre las áreas de cada cuenta: con
      // varias cuentas, una lista común borraría las áreas que no comparten.
      await Promise.all(userList.map((u) => {
        const ids = new Set((u.areas || []).map((ua) => ua.id));
        for (const [id, asignada] of Object.entries(cambiosAreas)) {
          if (asignada) ids.add(Number(id));
          else ids.delete(Number(id));
        }
        return api.setUserAreas(u.id, [...ids]);
      }));
      const mensaje = isMulti
        ? `Áreas actualizadas correctamente para ${userList.length} usuarios.`
        : `Áreas de «${currentUser.name || currentUser.email}» actualizadas correctamente.`;
      avisar('success', mensaje, 'Áreas actualizadas');
      setCambiosAreas({});
      onSaved?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudieron actualizar las áreas.';
      avisar('error', msg, 'Error');
      areasAsync.reload();
    } finally {
      setSaving(false);
    }
  }

  async function guardarPlataformas() {
    setSaving(true);
    try {
      for (const u of userList) {
        if (u.role === 'administrador') continue;
        const userGrants = accesosPorUsuario.get(u.id);

        // 1. Otorgar accesos nuevos
        for (const p of aOtorgar) {
          if (!userGrants?.has(p.id)) {
            await api.grantPlatformAccess(p.id, u.id, 'usuario');
          }
        }

        // 2. Revocar accesos desmarcados
        for (const p of aRevocar) {
          const acceso = userGrants?.get(p.id);
          if (acceso) {
            await api.revokeAccess(acceso.id, 'Retirado por administrador');
          }
        }
      }

      const mensaje = isMulti
        ? `Accesos a plataformas actualizados para ${userList.length} usuarios.`
        : aRevocar.length > 0 && aOtorgar.length === 0
        ? `Acceso retirado para ${currentUser.name || currentUser.email}.`
        : aOtorgar.length > 0 && aRevocar.length === 0
        ? `Acceso otorgado para ${currentUser.name || currentUser.email}.`
        : `Accesos de «${currentUser.name || currentUser.email}» actualizados.`;

      avisar('success', mensaje, 'Accesos');
      setCambios({});
      onSaved?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudieron actualizar los accesos.';
      avisar('error', msg, 'Error');
      accessAsync.reload();
    } finally {
      setSaving(false);
    }
  }

  const loading =
    tab === 'areas'
      ? areasAsync.loading
      : platformsAsync.loading || accessAsync.loading;
  const error =
    tab === 'areas'
      ? areasAsync.error
      : platformsAsync.error || accessAsync.error;

  const pendientesActuales = tab === 'areas' ? pendientesAreas.length : pendientes.length;

  const todosSuperadmin = useMemo(() => {
    return userList.length > 0 && userList.every((u) => u.role === 'administrador');
  }, [userList]);

  const puedeAccederPlataformas = useMemo(() => {
    if (userList.length === 0) return false;
    return userList.every(
      (u) =>
        u.role === 'administrador' ||
        (u.areas?.length ?? 0) > 0 ||
        areasConAcceso.length > 0
    );
  }, [userList, areasConAcceso.length]);

  return (
    <Modal
      title={isMulti ? `Accesos — ${userList.length} usuarios seleccionados` : `Accesos — ${currentUser.name || currentUser.email || ''}`}
      icon="solicitudes"
      size="2xl"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
            Cerrar
          </Button>
          {tab === 'plataformas' && (todosSuperadmin || !puedeAccederPlataformas) ? null : (
            <div className="flex items-center gap-2">
              {pendientesActuales > 0 ? (
                <span className="text-xs font-semibold text-label">
                  {pendientesActuales} {pendientesActuales === 1 ? 'cambio pendiente' : 'cambios pendientes'}
                </span>
              ) : null}
              <Button
                onClick={tab === 'areas' ? guardarAreas : guardarPlataformas}
                disabled={saving || pendientesActuales === 0}
              >
                <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <RegionDeAnuncios mensaje={anuncio} />
        {/* Cabecera contextual */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-panel-border/80 bg-surface-container/60 shadow-xs">
          <div className="min-w-0">
            {isMulti ? (
              <>
                <p className="text-xs font-bold text-body-text">
                  Selección múltiple: <span className="text-primary-text">{userList.length} usuarios</span>
                </p>
                <p className="text-xs text-label truncate" title={userList.map((u) => u.name || u.email).join(', ')}>
                  {userList.map((u) => u.name || u.email).slice(0, 3).join(', ')}{userList.length > 3 ? '…' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-body-text">
                  Usuario: <span className="text-primary-text">{currentUser.name || currentUser.email}</span>
                </p>
                <p className="text-xs text-label truncate">
                  Correo: <span className="font-semibold">{currentUser.email}</span>
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary-text">
              {tab === 'areas' ? areasConAcceso.length : conAcceso.length} con acceso
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg border border-panel-border/60 bg-superficie text-label">
              {tab === 'areas' ? areasSinAcceso.length : sinAcceso.length} sin acceso
            </span>
          </div>
        </div>

        {/* Selector de pestañas: Áreas y Plataformas */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-superficie-hundida border border-panel-border/60">
          <button
            type="button"
            onClick={() => setTab('areas')}
            className={`flex-1 flex min-h-12 items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'areas'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-label hover:text-body-text hover:bg-surface-container'
            }`}
            aria-pressed={tab === 'areas'}
            aria-label="Pestaña de áreas"
          >
            <Icono nombre="areas" tamano="xs" ariaHidden={true} />
            <span>Áreas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tab === 'areas'
                  ? 'bg-on-primary/20 text-on-primary'
                  : 'bg-superficie text-label'
              }`}
            >
              {areasConAcceso.length}
            </span>
          </button>
          <button
            type="button"
            disabled={!puedeAccederPlataformas}
            onClick={() => setTab('plataformas')}
            className={`flex-1 flex min-h-12 items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              !puedeAccederPlataformas
                ? 'bg-deshabilitado-fondo text-deshabilitado-texto cursor-not-allowed'
                : tab === 'plataformas'
                ? 'bg-primary text-on-primary shadow-xs cursor-pointer'
                : 'text-label hover:text-body-text hover:bg-surface-container cursor-pointer'
            }`}
            aria-pressed={tab === 'plataformas'}
            aria-label="Pestaña de plataformas"
            title={
              !puedeAccederPlataformas
                ? isMulti
                  ? 'Uno o más usuarios seleccionados no tienen áreas asignadas. Asigna al menos 1 área primero'
                  : 'El usuario no tiene áreas asignadas. Asigna al menos 1 área primero'
                : 'Pestaña de plataformas'
            }
          >
            <Icono nombre="solicitudes" tamano="xs" ariaHidden={true} />
            <span>Plataformas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tab === 'plataformas'
                  ? 'bg-on-primary/20 text-on-primary'
                  : 'bg-superficie text-label'
              }`}
            >
              {conAcceso.length}
            </span>
          </button>
        </div>

        {/* CONTENIDO PESTAÑA ÁREAS */}
        {tab === 'areas' ? (
          <>
            <p className="text-xs text-label">{AVISO_SALIDA_DE_AREA}</p>
            {loading && !areasAsync.data ? <Spinner /> : null}
            {error ? <ErrorNote message={error} /> : null}

            {!loading && !error ? (
              areas.length === 0 ? (
                <EmptyNote message="No hay áreas disponibles en el sistema." />
              ) : (
                /* DUAL PICK LIST: ÁREAS */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch w-full min-h-0">
                  {/* COLUMNA IZQUIERDA: Áreas sin acceso */}
                  <div className="flex flex-col rounded-2xl border border-panel-border/80 bg-surface-container/60 p-3.5 shadow-xs min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-body-text flex items-center gap-1.5">
                        <Icono nombre="areas" tamano="xs" ariaHidden={true} className="text-label" />
                        <span>Sin acceso</span>
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-superficie text-label border border-panel-border/60">
                        {areasSinAcceso.length}
                      </span>
                    </div>

                    <div className="relative mb-2.5">
                      <input
                        type="text"
                        placeholder="Filtrar sin acceso…"
                        value={searchSinAccesoAreas}
                        onChange={(e) => setSearchSinAccesoAreas(e.target.value)}
                        aria-label="Filtrar áreas sin acceso"
                        className="w-full h-10 rounded-xl border border-panel-border bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
                        <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                      </div>
                    </div>

                    <ul
                      ref={refLista('areas-sin-acceso')}
                      tabIndex={-1}
                      aria-label={isMulti ? `Áreas sin acceso para ${userList.length} usuarios` : `Áreas sin acceso para ${currentUser.name || currentUser.email}`}
                      className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-72 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-panel-border"
                    >
                      {areasSinAccesoVisibles.length === 0 ? (
                        <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                          {searchSinAccesoAreas.trim()
                            ? 'Ninguna área coincide con la búsqueda.'
                            : 'El usuario pertenece a todas las áreas disponibles.'}
                        </li>
                      ) : (
                        areasSinAccesoVisibles.map((a) => (
                          <li key={a.id} className="p-0 list-none">
                            <button
                              type="button"
                              data-item-id={a.id}
                              onClick={() => darArea(a)}
                              aria-label={`Asignar área ${a.name}`}
                              title={`Haz clic para asignar el área ${a.name}`}
                              className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-panel-border bg-superficie hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all cursor-pointer select-none text-left shadow-2xs group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-7 rounded-lg bg-surface-container group-hover:bg-primary/10 group-hover:text-primary-text flex items-center justify-center shrink-0 text-label font-bold text-xs transition-colors">
                                  <Icono nombre={(a.icon as NombreIcono) || 'areas'} tamano="xs" ariaHidden={true} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate text-body-text group-hover:text-primary-text transition-colors">
                                    {a.name}
                                  </p>
                                  <p className="text-xs text-label truncate">
                                    {a.description || 'Área organizativa'}
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

                  {/* COLUMNA DERECHA: Áreas con acceso */}
                  <div className="flex flex-col rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/5 via-superficie to-primary/5 p-3.5 shadow-xs min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary-text flex items-center gap-1.5">
                        <Icono nombre="exito" tamano="xs" ariaHidden={true} className="text-primary-text" />
                        <span>Con acceso</span>
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary-text border border-primary/40">
                        {areasConAcceso.length}
                      </span>
                    </div>

                    <div className="relative mb-2.5">
                      <input
                        type="text"
                        placeholder="Filtrar con acceso…"
                        value={searchConAccesoAreas}
                        onChange={(e) => setSearchConAccesoAreas(e.target.value)}
                        aria-label="Filtrar áreas con acceso"
                        className="w-full h-10 rounded-xl border border-panel-border bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
                        <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                      </div>
                    </div>

                    <ul
                      ref={refLista('areas-con-acceso')}
                      tabIndex={-1}
                      aria-label={isMulti ? `Áreas con acceso para ${userList.length} usuarios` : `Áreas con acceso para ${currentUser.name || currentUser.email}`}
                      className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-72 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-primary/20"
                    >
                      {areasConAccesoVisibles.length === 0 ? (
                        <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                          {searchConAccesoAreas.trim()
                            ? 'Ninguna área coincide con la búsqueda.'
                            : 'El usuario no tiene áreas asignadas todavía.'}
                        </li>
                      ) : (
                        areasConAccesoVisibles.map((a) => {
                          const esNuevo = !perteneceAreaInicial(a);
                          return (
                            <li key={a.id} className="p-0 list-none">
                              <button
                                type="button"
                                data-item-id={a.id}
                                onClick={() => quitarArea(a)}
                                aria-label={`Retirar área ${a.name}`}
                                title={`Haz clic para retirar el área ${a.name}`}
                                className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-primary/30 bg-superficie hover:border-error-text/60 hover:bg-error/5 active:scale-95 transition-all cursor-pointer select-none text-left shadow-2xs group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="size-7 rounded-lg bg-primary/10 text-primary-text group-hover:bg-error/10 group-hover:text-error-text flex items-center justify-center shrink-0 font-bold text-xs transition-colors">
                                    <Icono nombre={(a.icon as NombreIcono) || 'areas'} tamano="xs" ariaHidden={true} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate text-body-text group-hover:text-error-text transition-colors">
                                      {a.name}
                                    </p>
                                    <p className="text-xs text-label truncate">
                                      {a.description || 'Área organizativa'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {esNuevo ? (
                                    <Badge tone="primary">Nuevo</Badge>
                                  ) : (
                                    <Badge tone="success" dot>Asignada</Badge>
                                  )}
                                  <span className="size-7 rounded-lg bg-surface-container group-hover:bg-error-text group-hover:text-superficie flex items-center justify-center text-label transition-all shrink-0">
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
          </>
        ) : (
          /* CONTENIDO PESTAÑA PLATAFORMAS */
          <>
            {todosSuperadmin ? (
              <div className="p-4 text-center">
                <EmptyNote message={MENSAJE_SUPERADMIN} />
              </div>
            ) : !puedeAccederPlataformas ? (
              <div className="p-4 text-center">
                <EmptyNote message={isMulti ? "Uno o más usuarios seleccionados no tienen áreas asignadas. Ve a la pestaña de Áreas y asigna al menos una para poder otorgarles acceso a plataformas." : "El usuario no tiene áreas asignadas. Ve a la pestaña de Áreas y asigna al menos una para poder otorgarle acceso a plataformas."} />
              </div>
            ) : (
              <>
                {loading && !platformsAsync.data ? <Spinner /> : null}

                {error ? <ErrorNote message={error} /> : null}
                {!loading && !error ? (
                  plataformas.length === 0 ? (
                    <EmptyNote message="No hay plataformas disponibles en el sistema." />
                  ) : (
                    /* DUAL PICK LIST: PLATAFORMAS */
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
                            className="w-full h-10 rounded-xl border border-panel-border bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                          />
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
                            <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                          </div>
                        </div>

                        <ul
                          ref={refLista('plataformas-sin-acceso')}
                          tabIndex={-1}
                          aria-label={isMulti ? `Plataformas sin acceso para ${userList.length} usuarios` : `Plataformas sin acceso para ${currentUser.name || currentUser.email}`}
                          className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-72 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-panel-border"
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
                                  data-item-id={p.id}
                                  onClick={() => darAcceso(p)}
                                  aria-label={`Otorgar acceso a ${p.name}`}
                                  title={`Haz clic para otorgar acceso a ${p.name}`}
                                  className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-panel-border bg-superficie hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all cursor-pointer select-none text-left shadow-2xs group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="size-7 rounded-lg bg-surface-container group-hover:bg-primary/10 group-hover:text-primary-text flex items-center justify-center shrink-0 text-label font-bold text-xs transition-colors">
                                      <Icono nombre={(p.icon as NombreIcono) || 'plataformas'} tamano="xs" ariaHidden={true} />
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

                                  <span className="size-7 rounded-lg bg-surface-container group-hover:bg-primary group-hover:text-on-primary flex items-center justify-center text-label transition-all shrink-0">
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
                            className="w-full h-10 rounded-xl border border-panel-border bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                          />
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
                            <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
                          </div>
                        </div>

                        <ul
                          ref={refLista('plataformas-con-acceso')}
                          tabIndex={-1}
                          aria-label={isMulti ? `Plataformas con acceso para ${userList.length} usuarios` : `Plataformas con acceso para ${currentUser.name || currentUser.email}`}
                          className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-72 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-primary/20"
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
                                  data-item-id={p.id}
                                  onClick={() => quitarAcceso(p)}
                                  aria-label={`Revocar acceso a ${p.name}`}
                                  title={`Haz clic para revocar acceso a ${p.name}`}
                                  className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-primary/30 bg-superficie hover:border-error-text/60 hover:bg-error/5 active:scale-95 transition-all cursor-pointer select-none text-left shadow-2xs group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="size-7 rounded-lg bg-primary/10 text-primary-text group-hover:bg-error/10 group-hover:text-error-text flex items-center justify-center shrink-0 font-bold text-xs transition-colors">
                                      <Icono nombre={(p.icon as NombreIcono) || 'plataformas'} tamano="xs" ariaHidden={true} />
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
          </>
        )}
      </div>
    </Modal>
  );
}
