'use client';

/** Modal de alta y edición de un usuario (áreas y plataformas por chips). */

import { useEffect, useState } from 'react';
import type { PasswordPolicy } from '@/lib/access/types';
import { usersApi } from '@/lib/access/users';
import { api } from '@/lib/api';
import { descripcionPolitica } from '@/lib/contrasena';
import type { Area, DirectoryUser, ManagedUser, Platform, UserInput } from '@/lib/types';
import { Button, Checkbox, Field, Modal, TextInput } from '../form';
import { Icono } from '../icono';
import { useSession } from '../session-provider';
import { useToast } from '../toast';
import { GrupoChips } from './grupo-chips';
import { TagPicker } from './tag-picker';

/** El alta de cuentas que ya existen en el directorio llega con FNC-079. */
const DIRECTORY_IMPORT_PENDING =
  'El alta de cuentas del directorio aún no está disponible en el portal.';


const ID_AYUDA_CONTRASENA = 'usuario-contrasena-ayuda';
const ID_ERROR_GUARDAR = 'usuario-guardar-error';

export function UserForm({
  user,
  areas,
  platforms,
  prefill,
  onClose,
  onSaved,
}: {
  user: ManagedUser | null;
  areas: Area[];
  platforms: Platform[];
  /** Datos traídos del directorio para un alta. */
  prefill?: DirectoryUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // DIS-019: el rol y las áreas administradas ya no se editan aquí (acciones
  // "Hacer admin" / "Quitar admin" del superadmin). FNC-161: la contraseña se
  // ofrece en cuentas locales (se guarda en el portal) y del directorio (se
  // cambia en LDAP, solo el superadmin); el backend decide y vuelve a validar.
  const { session } = useSession();
  const esLocal = user?.auth_source === 'local';
  const esDirectorio = user?.auth_source === 'ldap' && Boolean(session?.permissions.is_admin);
  const conContrasena = esLocal || esDirectorio;
  // Política vigente del backend; solo se necesita para la cuenta del directorio.
  const [politica, setPolitica] = useState<PasswordPolicy | null>(null);
  const [form, setForm] = useState<UserInput>(
    user
      ? { name: user.name, is_active: user.is_active }
      : {
          email: prefill?.email ?? prefill?.account ?? '',
          name: prefill?.name ?? '',
          role: 'usuario',
          is_active: true,
          // `auth_source` lo fija el servidor (FNC-044): no se envía.
        },
  );
  const [areaIds, setAreaIds] = useState<number[]>(
    (user?.areas ?? []).map((a) => a.id),
  );
  const [platformIds, setPlatformIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEnContrasena, setErrorEnContrasena] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!esDirectorio) return undefined;
    let vigente = true;
    usersApi.passwordPolicy().then(
      (res) => { if (vigente) setPolitica(res.policy); },
      () => { /* sin política visible el servidor sigue validando y avisa */ },
    );
    return () => { vigente = false; };
  }, [esDirectorio]);

  async function save() {
    if (!user && !form.email?.trim()) {
      setError('El correo es obligatorio.');
      toast.avisar('warning', 'El correo es obligatorio.', 'Datos incompletos');
      return;
    }
    // `POST /users` solo crea cuentas locales: dar de alta a alguien del
    // directorio así le daría una contraseña local. Espera a FNC-079.
    if (!user && prefill) {
      setError(DIRECTORY_IMPORT_PENDING);
      toast.avisar('warning', DIRECTORY_IMPORT_PENDING, 'Directorio');
      return;
    }
    setSaving(true);
    setError(null);
    setErrorEnContrasena(false);
    try {
      if (user) {
        const { password, ...resto } = form;
        // Vacío conserva la contraseña actual: no se envía.
        await api.updateUser(user.id, password ? { ...resto, password } : resto);
        await api.setUserAreas(user.id, areaIds);
        if (platformIds.length > 0) {
          await api.setUserPlatforms(user.id, platformIds);
        }
      } else {
        await api.createUser({ ...form, area_ids: areaIds });
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar';
      setError(msg);
      // Si se envió contraseña, el error se liga al campo (el backend la valida primero).
      setErrorEnContrasena(Boolean(form.password));
      toast.avisar('error', msg, 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={user ? 'Editar usuario' : 'Nuevo usuario'}
      onClose={onClose}
      icon="usuarios"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="min-h-12 min-w-28 text-xs font-bold">
            <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving} className="min-h-12 min-w-28 text-xs font-bold shadow-xs">
            <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      {error ? <div id={ID_ERROR_GUARDAR} className="sr-only">{error}</div> : null}

      {!user ? (
        <Field label="Correo">
          <TextInput
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
      ) : null}

      <Field label="Nombre">
        <TextInput
          value={form.name ?? ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      {conContrasena ? (
        <div className="space-y-1.5">
          <Field label="Contraseña">
            <TextInput
              type="password" autoComplete="new-password"
              value={form.password ?? ''}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-describedby={
                errorEnContrasena ? `${ID_AYUDA_CONTRASENA} ${ID_ERROR_GUARDAR}` : ID_AYUDA_CONTRASENA
              }
              aria-invalid={errorEnContrasena ? true : undefined}
            />
          </Field>
          {/* Fuera del <label>: no forma parte del nombre del campo. */}
          <p id={ID_AYUDA_CONTRASENA} className="text-xs text-label">
            {esLocal
              ? 'Se guarda en el portal. Vacío conserva la actual.'
              : 'Se cambia en el directorio LDAP. Vacío conserva la actual.'}
            {esDirectorio && politica ? ` ${descripcionPolitica(politica)}` : ''}
          </p>
        </div>
      ) : null}

      <GrupoChips legend="Áreas a las que pertenece">
        <TagPicker
          options={areas} selected={areaIds} onChange={setAreaIds}
          empty="No hay áreas en tu alcance."
        />
      </GrupoChips>

      {user ? (
        <GrupoChips legend="Plataformas asignadas" hint="Vacío deja las actuales sin cambios.">
          <TagPicker
            options={platforms} selected={platformIds} onChange={setPlatformIds}
            empty="No hay plataformas en tu alcance."
          />
        </GrupoChips>
      ) : null}

      <Checkbox
        label="Cuenta activa"
        checked={Boolean(form.is_active)}
        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
      />
    </Modal>
  );
}
