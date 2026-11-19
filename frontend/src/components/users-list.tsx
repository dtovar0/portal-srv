'use client';

/** Usuarios: alta, edición, baja y asignación de áreas y plataformas. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { eliminarEnLote, mensajeLoteParcial } from '@/lib/eliminar-en-lote';
import { useAsync } from '@/lib/use-async';
import type { DirectoryUser, ManagedUser } from '@/lib/types';
import { DataTable, type DataColumn } from './data-table';
import { Button, ConfirmDialog } from './form';
import { Icono } from './icono';
import type { NombreIcono } from './icono-trazos';
import { PageHeader } from './page-header';
import { useSession } from './session-provider';
import { Badge, ErrorNote, RegionDeAviso } from './ui';
import { AdminAreasDialog, RemoveAdminDialog } from './users/admin-role-dialog';
import { DirectoryAccountForm } from './users/directory-account-form';
import { DirectoryPicker } from './users/directory-picker';
import { PurgePanel } from './users/purge-panel';
import { useToast } from './toast';
import { MENSAJE_SUPERADMIN, UserAccessPanel } from './users/user-access-panel';
import { UserForm } from './users/user-form';

const ROLE_LABELS: Record<string, string> = {
  administrador: 'Super admin',
  admin_area: 'Admin',
  usuario: 'Usuario',
};

const ROLE_TONES: Record<string, 'primary' | 'sky' | 'slate'> = {
  administrador: 'primary',
  admin_area: 'sky',
  usuario: 'slate',
};

export function UsersList() {
  const { session } = useSession();
  const { avisar } = useToast();
  const users = useAsync(() => api.users(), []);
  const areas = useAsync(() => api.areas(), []);
  const platforms = useAsync(() => api.platforms(), []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [removing, setRemoving] = useState<ManagedUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [directory, setDirectory] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const [prefill, setPrefill] = useState<DirectoryUser | null>(null);
  // DIS-018: accesos del usuario; al cerrar, el foco vuelve a su botón.
  const [accessOf, setAccessOf] = useState<ManagedUser | null>(null);
  const [accessUsers, setAccessUsers] = useState<ManagedUser[]>([]);
  const [accessTab, setAccessTab] = useState<'areas' | 'plataformas'>('plataformas');
  const accessTrigger = useRef<HTMLButtonElement | null>(null);
  // DIS-019: alta en el directorio y acciones de rol (solo superadmin); el
  // resultado se avisa con toast (DIS-091).
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [roleOf, setRoleOf] = useState<{ user: ManagedUser; action: 'areas' | 'quitar' } | null>(null);

  const isAdmin = session?.permissions.is_admin ?? false;
  // El superadmin asigna cualquier área; el admin de área, solo las suyas.
  const assignableAreas = isAdmin ? (areas.data ?? []) : (session?.managed_areas ?? []);

  const roleTrigger = useRef<HTMLButtonElement | null>(null);
  /** Botón que abrió el alta o la acción de rol: recibe el foco tras el aviso. */
  const disparadorAviso = useRef<HTMLButtonElement | null>(null);

  function abrirRol(trigger: HTMLButtonElement, user: ManagedUser, action: 'areas' | 'quitar') {
    roleTrigger.current = trigger;
    disparadorAviso.current = trigger;
    setRoleOf({ user, action });
  }

  // Estables (`useCallback`): `Modal` re-ejecuta su efecto, y enfoca su panel,
  // cada vez que cambia `onClose`; con una función nueva por render robaría el foco.
  const cancelarRol = useCallback(() => {
    setRoleOf(null);
    roleTrigger.current?.focus();
  }, []);
  const cerrarAlta = useCallback(() => setCreatingAccount(false), []);

  /** Cierra el diálogo, recarga y devuelve el foco. `mensaje` vacío: el diálogo ya avisó. */
  function anunciar(mensaje: string, titulo = 'Usuario') {
    setCreatingAccount(false);
    setRoleOf(null);
    if (mensaje) avisar('success', mensaje, titulo);
    users.reload();
    // Tras desmontar el diálogo, el foco vuelve al botón que lo abrió, si sigue en la página.
    // Si la fila cambió y el botón ya no existe, al buscador (no a `body`).
    setTimeout(() => {
      if (disparadorAviso.current?.isConnected) disparadorAviso.current.focus();
      else document.getElementById('buscar-usuarios')?.focus();
    }, 0);
  }

  async function remove() {
    if (!removing || removing.length === 0) return;
    setBusy(true);
    setProblem(null);
    const count = removing.length;
    try {
      const { eliminados, error } = await eliminarEnLote(removing, (u) => api.deleteUser(u.id));
      setRemoving(null);
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        eliminados.forEach((u) => next.delete(u.id));
        return next;
      });
      if (error) {
        const base = error instanceof Error ? error.message : 'No se pudieron eliminar las cuentas.';
        const msg = mensajeLoteParcial(eliminados.length, count, base);
        setProblem(msg);
        avisar('error', msg, 'Error');
      } else {
        avisar(
          'success',
          count === 1
            ? `Cuenta de ${removing[0].email} retirada.`
            : `${count} cuentas de usuarios retiradas.`,
          count === 1 ? 'Usuario eliminado' : 'Usuarios eliminados',
        );
      }
      users.reload();
    } finally {
      setBusy(false);
    }
  }

  const [busqueda, setBusqueda] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const filteredUsers = useMemo(() => {
    if (!users.data) return [];
    if (!busqueda.trim()) return users.data;
    const q = busqueda.toLowerCase().trim();
    return users.data.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.areas?.some((a) => a.name.toLowerCase().includes(q)),
    );
  }, [users.data, busqueda]);

  const activeSelectedIds = selectedUserIds;

  const effectiveSelectedUser = useMemo(() => {
    if (!users.data || users.data.length === 0) return null;
    if (activeSelectedIds.size === 0) return null;
    if (lastSelectedId && activeSelectedIds.has(lastSelectedId)) {
      return users.data.find((u) => u.id === lastSelectedId) ?? null;
    }
    const primerId = Array.from(activeSelectedIds)[0];
    return users.data.find((u) => u.id === primerId) ?? null;
  }, [users.data, activeSelectedIds, lastSelectedId]);

  const isSingleSelected = activeSelectedIds.size === 1;

  const selectedUsers = useMemo(() => {
    if (!users.data || activeSelectedIds.size === 0) return [];
    return users.data.filter((u) => activeSelectedIds.has(u.id));
  }, [users.data, activeSelectedIds]);

  const algunoSinAreas = useMemo(() => {
    if (selectedUsers.length === 0) return false;
    return selectedUsers.some((u) => u.role !== 'administrador' && (u.areas?.length ?? 0) === 0);
  }, [selectedUsers]);

  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const displayUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  const allDisplayIds = useMemo(() => displayUsers.map((u) => u.id), [displayUsers]);
  const allSelected = allDisplayIds.length > 0 && allDisplayIds.every((id) => activeSelectedIds.has(id));
  const someSelected = allDisplayIds.some((id) => activeSelectedIds.has(id)) && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedUserIds(new Set());
      setLastSelectedId(null);
    } else {
      setSelectedUserIds(new Set(allDisplayIds));
      if (!lastSelectedId && allDisplayIds.length > 0) {
        setLastSelectedId(allDisplayIds[0]);
      }
    }
  }

  function toggleUser(id: number) {
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
      if (lastSelectedId === id) {
        setLastSelectedId(next.size > 0 ? Array.from(next)[0] : null);
      }
    } else {
      next.add(id);
      setLastSelectedId(id);
    }
    setSelectedUserIds(next);
  }

  const areasMap = useMemo(() => {
    const map = new Map<number, { icon: string; color: string; name: string }>();
    if (areas.data) {
      for (const a of areas.data) {
        map.set(a.id, { icon: a.icon || 'areas', color: a.color, name: a.name });
      }
    }
    return map;
  }, [areas.data]);

  const columnas = useMemo<DataColumn<ManagedUser>[]>(
    () => [
      {
        key: 'seleccion',
        header: (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label="Seleccionar todos los usuarios"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              className="nexus-checkbox cursor-pointer"
            />
          </div>
        ),
        headerClassName: 'w-16 px-4 py-2 text-center font-black tracking-wider text-primary-text select-none',
        cellClassName: 'w-16 px-4 py-1.5 text-center',
        cell: (user) => {
          const estaSeleccionado = activeSelectedIds.has(user.id);
          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                aria-label={`Seleccionar a ${user.name}`}
                checked={estaSeleccionado}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleUser(user.id)}
                className="nexus-checkbox cursor-pointer"
              />
            </div>
          );
        },
      },
      {
        key: 'nombre',
        header: 'Nombre',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
        cellClassName: 'px-6 py-1.5',
        cell: (user) => (
          <div className="flex items-center gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-brand/10 to-accent/10 font-bold text-xs text-primary-text shadow-xs"
              aria-hidden="true"
            >
              {user.name ? user.name.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
            </div>
            <span className="truncate font-bold text-xs text-body-text leading-tight">{user.name}</span>
          </div>
        ),
      },
      {
        key: 'correo',
        header: 'Correo',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
        cellClassName: 'px-6 py-1.5',
        cell: (user) => (
          <span className="truncate text-xs text-body-text leading-tight">{user.email}</span>
        ),
      },
      {
        key: 'rol',
        header: 'Rol',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
        cellClassName: 'px-6 py-1.5',
        cell: (user) => {
          const config = {
            administrador: {
              tone: 'violet' as const,
              label: 'Super admin',
            },
            admin_area: {
              tone: 'sky' as const,
              label: 'Admin',
            },
            usuario: {
              tone: 'slate' as const,
              label: 'Usuario',
            },
          }[user.role] ?? {
            tone: 'slate' as const,
            label: user.role,
          };

          return (
            <div className="flex items-center gap-1.5">
              <Badge
                tone={config.tone}
                className="!h-8 !px-3 inline-flex items-center text-xs font-semibold rounded-lg"
              >
                {config.label}
              </Badge>
            </div>
          );
        },
      },
      {
        key: 'estado',
        header: 'Estado',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
        cellClassName: 'px-6 py-1.5',
        cell: (user) => {
          const activeLabel = user.is_active ? 'Activo' : 'Inactivo';
          const authLabel = user.auth_source === 'ldap'
            ? 'Directorio OpenLDAP'
            : user.auth_source === 'local'
            ? 'Cuenta local'
            : user.auth_source;

          return (
            <div className="flex items-center gap-1.5">
              {/* Estatus de actividad */}
              <Badge
                tone={user.is_active ? 'success' : 'warning'}
                icon={user.is_active ? 'exito' : 'aviso'}
                title={activeLabel}
                className="!size-8 !p-0 justify-center rounded-lg"
              >
                <span className="sr-only">{activeLabel}</span>
              </Badge>

              {/* Origen de cuenta */}
              <Badge
                tone={user.auth_source === 'ldap' ? 'primary' : 'slate'}
                icon={user.auth_source === 'ldap' ? 'plataformas' : 'documento'}
                title={authLabel}
                className="!size-8 !p-0 justify-center rounded-lg"
              >
                <span className="sr-only">{authLabel}</span>
              </Badge>
            </div>
          );
        },
      },
      {
        key: 'areas',
        header: 'Áreas asignadas',
        headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
        cellClassName: 'px-6 py-1.5',
        cell: (user) => (
          <div className="flex max-w-xs flex-wrap items-center gap-1.5">
            {user.areas.length === 0 ? (
              <span className="text-xs text-label italic">Sin áreas asignadas</span>
            ) : (
              user.areas.map((area) => {
                const icono = (area.icon || areasMap.get(area.id)?.icon || 'areas') as NombreIcono;
                return (
                  <span
                    key={area.id}
                    title={area.name}
                    aria-label={area.name}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-panel-border/80 bg-surface-container text-primary-text shadow-xs transition-transform hover:scale-110"
                  >
                    <Icono nombre={icono} tamano="sm" ariaHidden={true} />
                  </span>
                );
              })
            )}
          </div>
        ),
      },
    ],
    [activeSelectedIds, allSelected, someSelected, allDisplayIds, areasMap],
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 min-h-0">
      <PageHeader title="Usuarios" className="sr-only" />

      {showPurge ? <div className="shrink-0"><PurgePanel onDone={users.reload} /></div> : null}

      {accessUsers.length > 0 ? (
        <UserAccessPanel
          key={accessUsers.map((u) => u.id).join('-')}
          users={accessUsers}
          user={accessUsers[0]}
          initialTab={accessTab}
          onClose={() => {
            setAccessUsers([]);
            setAccessOf(null);
            accessTrigger.current?.focus();
          }}
          onSaved={users.reload}
        />
      ) : accessOf ? (
        <UserAccessPanel
          key={accessOf.id}
          user={accessOf}
          users={[accessOf]}
          initialTab={accessTab}
          onClose={() => {
            setAccessOf(null);
            setAccessUsers([]);
            accessTrigger.current?.focus();
          }}
          onSaved={users.reload}
        />
      ) : null}

      {problem ? (
        <div className="sr-only">
          {problem}
        </div>
      ) : users.error ? (
        <RegionDeAviso minHeight="min-h-0" className="shrink-0">
          <ErrorNote message={users.error} />
        </RegionDeAviso>
      ) : null}

      {/* Grid de 1 columna y 2 filas (10/90): Fila 1 contenedor con botones, Fila 2 tabla al 100% */}
      <div className="grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-[auto_1fr] gap-4">
        {/* Fila 1 (N columnas, 1 fila): Buscador a la izquierda, botones estandarizados a la derecha */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
          {/* A LA IZQUIERDA: Buscador y estado de selección */}
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-2xl">
            <div className="relative w-full max-w-md">
              <label htmlFor="buscar-usuarios" className="sr-only">Buscar usuarios</label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-label">
                <Icono nombre="buscar" tamano="md" ariaHidden={true} />
              </div>
              <input
                id="buscar-usuarios"
                type="search"
                placeholder="Buscar usuarios…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                aria-label="Buscar usuarios"
                className="nx-buscador-toolbar h-12 w-full rounded-xl border border-panel-border bg-fondo pl-11 pr-10 py-3 text-sm text-body-text placeholder:text-placeholder transition-all focus:border-primary focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {busqueda ? (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('');
                    setPage(1);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center justify-center min-h-12 min-w-12 pr-3 text-label hover:text-body-text transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
                </button>
              ) : null}
            </div>
            {activeSelectedIds.size > 1 ? (
              <span className="text-xs font-bold text-body-text whitespace-nowrap bg-panel-border/30 px-2.5 py-1 rounded-lg border border-panel-border/60">
                {activeSelectedIds.size} usuarios seleccionados
              </span>
            ) : activeSelectedIds.size === 0 ? (
              <span className="sr-only">Acciones de usuarios</span>
            ) : null}
          </div>

          {/* A LA DERECHA: Botones solicitados: accesos, áreas, editar, eliminar y nuevo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Accesos: activo si hay 1 o más usuarios seleccionados y ninguno sin áreas (salvo superadmin) */}
            <Button
              variant="fila"
              disabled={activeSelectedIds.size === 0 || algunoSinAreas}
              onClick={(event) => {
                if (selectedUsers.length === 0) return;
                accessTrigger.current = event.currentTarget;
                if (selectedUsers.length === 1 && effectiveSelectedUser?.role === 'administrador') {
                  avisar('info', 'Acceso total sin restricciones.', 'Superadmin');
                  return;
                }
                setAccessTab('plataformas');
                setAccessUsers(selectedUsers);
                setAccessOf(selectedUsers[0] ?? null);
              }}
              aria-label={effectiveSelectedUser ? `Accesos de ${effectiveSelectedUser.name}` : 'Accesos'}
              title={
                activeSelectedIds.size === 0
                  ? 'Selecciona al menos 1 usuario para ver accesos'
                  : algunoSinAreas
                  ? selectedUsers.length > 1
                    ? 'Uno o más usuarios seleccionados no tienen áreas asignadas. Asigna al menos 1 área primero'
                    : 'El usuario no tiene áreas asignadas. Asigna al menos 1 área primero'
                  : selectedUsers.length > 1
                  ? `Accesos de ${selectedUsers.length} usuarios seleccionados`
                  : `Accesos de ${effectiveSelectedUser?.name}`
              }
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="solicitudes" tamano="sm" ariaHidden={true} />
              <span>Accesos</span>
            </Button>

            {/* Botón Áreas: activo si hay 1 o más usuarios seleccionados */}
            <Button
              variant="fila"
              disabled={activeSelectedIds.size === 0}
              onClick={(event) => {
                if (selectedUsers.length === 0) return;
                accessTrigger.current = event.currentTarget;
                setAccessTab('areas');
                setAccessUsers(selectedUsers);
                setAccessOf(selectedUsers[0] ?? null);
              }}
              aria-label={effectiveSelectedUser ? `Áreas de ${effectiveSelectedUser.name}` : 'Áreas'}
              title={
                activeSelectedIds.size === 0
                  ? 'Selecciona al menos 1 usuario para ver áreas'
                  : selectedUsers.length > 1
                  ? `Asignar áreas a ${selectedUsers.length} usuarios seleccionados`
                  : `Áreas de ${effectiveSelectedUser?.name}`
              }
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="areas" tamano="sm" ariaHidden={true} />
              <span>Áreas</span>
            </Button>

            {/* Botón Editar: activo solo si se selecciona exactamente 1 fila */}
            <Button
              variant="fila"
              disabled={!isSingleSelected}
              onClick={() => effectiveSelectedUser && setEditing(effectiveSelectedUser)}
              aria-label={effectiveSelectedUser ? `Editar ${effectiveSelectedUser.name}` : 'Editar'}
              title={
                isSingleSelected
                  ? `Editar ${effectiveSelectedUser?.name}`
                  : activeSelectedIds.size > 1
                  ? 'Solo se puede editar 1 usuario a la vez'
                  : 'Selecciona 1 usuario para editar'
              }
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="editar" tamano="sm" ariaHidden={true} />
              <span>Editar</span>
            </Button>

            {/* Botón Eliminar: activo si hay 1 o más filas seleccionadas */}
            <Button
              variant="fila-peligro"
              disabled={activeSelectedIds.size === 0}
              onClick={() => selectedUsers.length > 0 && setRemoving(selectedUsers)}
              aria-label={
                selectedUsers.length === 1
                  ? `Eliminar ${selectedUsers[0]?.name}`
                  : selectedUsers.length > 1
                  ? `Eliminar ${selectedUsers.length} usuarios seleccionados`
                  : 'Eliminar'
              }
              title={
                selectedUsers.length === 1
                  ? `Eliminar ${selectedUsers[0]?.name}`
                  : selectedUsers.length > 1
                  ? `Eliminar ${selectedUsers.length} usuarios seleccionados`
                  : 'Selecciona al menos 1 usuario para eliminar'
              }
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="eliminar" tamano="sm" ariaHidden={true} />
              <span>Eliminar</span>
            </Button>

            {/* Línea de separación vertical a la izquierda del botón Nuevo */}
            <div className="h-6 w-px bg-panel-border/80 self-center mx-1 shrink-0" aria-hidden="true" />

            {/* Botón Nuevo: pegado a la derecha */}
            <Button
              variant="fila-primario"
              onClick={(evento) => {
                disparadorAviso.current = evento.currentTarget;
                setCreatingAccount(true);
              }}
              aria-label="Nuevo usuario"
              title="Nuevo usuario"
              className="nx-btn-toolbar !px-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Icono nombre="mas" tamano="sm" ariaHidden={true} />
              <span className="sr-only">Nuevo usuario</span>
              <span aria-hidden="true">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Fila 2: Tabla al 100% responsiva */}
        <div className="flex flex-1 min-h-0 flex-col h-full w-full overflow-hidden">
          <DataTable
            label="Usuarios"
            columns={columnas}
            rows={displayUsers}
            rowKey={(u) => u.id}
            loading={users.loading && !users.data}
            error={users.error}
            emptyMessage="No hay usuarios dentro de tu alcance."
            selectedKeys={activeSelectedIds}
            onRowClick={(u) => toggleUser(u.id)}
            page={page}
            totalPages={totalPages}
            totalRecords={totalUsers}
            onPageChange={setPage}
            targetRows={8}
            ghostRows={true}
          />
        </div>
      </div>

      {directory ? (
        <DirectoryPicker
          onClose={() => setDirectory(false)}
          onPick={(found) => {
            // Prellena el alta con lo que devuelve el directorio.
            setPrefill(found);
            setDirectory(false);
            setCreating(true);
          }}
        />
      ) : null}

      {creatingAccount ? (
        <DirectoryAccountForm
          areas={assignableAreas}
          areasLoading={isAdmin && areas.loading}
          areasError={isAdmin && areas.error ? 'No se pudieron cargar las áreas.' : null}
          areasRequired={!isAdmin}
          onClose={cerrarAlta}
          onCreated={() => anunciar('')}
        />
      ) : null}

      {roleOf?.action === 'areas' ? (
        <AdminAreasDialog
          user={roleOf.user}
          areas={areas.data ?? []}
          areasLoading={areas.loading}
          areasError={areas.error ? 'No se pudieron cargar las áreas.' : null}
          onClose={cancelarRol}
          onSaved={anunciar}
          onStale={users.reload}
        />
      ) : null}

      {roleOf?.action === 'quitar' ? (
        <RemoveAdminDialog
          user={roleOf.user}
          onClose={cancelarRol}
          onSaved={anunciar}
          onStale={users.reload}
        />
      ) : null}

      {creating ? (
        <UserForm
          user={null} areas={areas.data ?? []} platforms={platforms.data ?? []}
          prefill={prefill}
          onClose={() => { setCreating(false); setPrefill(null); }}
          onSaved={() => {
            setCreating(false);
            setPrefill(null);
            users.reload();
          }}
        />
      ) : null}

      {editing ? (
        <UserForm
          user={editing} areas={areas.data ?? []} platforms={platforms.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); users.reload(); }}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title={removing.length === 1 ? 'Eliminar usuario' : 'Eliminar usuarios'}
          message={
            removing.length === 1
              ? `Se eliminará la cuenta de ${removing[0].email}. Esta acción no se puede deshacer.`
              : `Se eliminarán las cuentas de los ${removing.length} usuarios seleccionados. Esta acción no se puede deshacer.`
          }
          onConfirm={remove}
          onCancel={() => setRemoving(null)}
          busy={busy}
        />
      ) : null}
    </div>
  );
}
