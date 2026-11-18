/** DIS-078: reglas puras del marco (menú por rol, ruta actual, comandos y atajo). */
import { describe, expect, it } from 'vitest';
import { comandosDePantallas, esAtajoBusqueda, filtrarComandos, normalizar } from '@/components/marco/comandos';
import { entradaDeRuta, entradasVisibles, iniciales, seccionesVisibles } from '@/components/marco/nav-items';

const permisos = (admin: boolean, area: boolean) => ({
  is_admin: admin, is_area_admin: area, can_manage_areas: admin || area, can_manage_system: admin,
});

describe('menú por rol', () => {
  it('usuario ve General y Sistema (con Auditoría en Sistema); admin ve además Gestión', () => {
    const usuario = seccionesVisibles(permisos(false, false));
    expect(usuario.map((s) => s.seccion)).toEqual(['General', 'Sistema']);
    expect(usuario[1].entradas.map((e) => e.label)).toContain('Auditoría');
    const admin = seccionesVisibles(permisos(false, true));
    expect(admin.map((s) => s.seccion)).toEqual(['General', 'Gestión', 'Sistema']);
    expect(admin[1].entradas.map((e) => e.label)).not.toContain('Aprobaciones');
    expect(admin[2].entradas.map((e) => e.label)).toEqual(['Ajustes', 'Ejecuciones', 'Auditoría']);
  });

  it('el usuario solo ve lo común; el admin ve más', () => {
    const usuario = entradasVisibles(permisos(false, false)).map((e) => e.label);
    expect(usuario).toContain('Mis solicitudes');
    expect(usuario).not.toContain('Aprobaciones');
    expect(usuario).not.toContain('Notificaciones');
    expect(entradasVisibles(permisos(true, false)).map((e) => e.label)).toContain('Conectores');
    expect(entradasVisibles(permisos(false, true)).map((e) => e.label)).not.toContain('Conectores');
  });
});

describe('entradaDeRuta', () => {
  it('coincide exacta o por prefijo más largo', () => {
    expect(entradaDeRuta('/')?.label).toBe('Dashboard');
    expect(entradaDeRuta('/admin/jobs')?.label).toBe('Ejecuciones');
    expect(entradaDeRuta('/audit/platforms/4')?.label).toBe('Auditoría');
    expect(entradaDeRuta('/desconocida')).toBeNull();
    expect(entradaDeRuta(null)).toBeNull();
  });
});

describe('comandos', () => {
  const comandos = comandosDePantallas(entradasVisibles(permisos(true, false)));

  it('normaliza acentos y mayúsculas', () => {
    expect(normalizar('  Auditoría ')).toBe('auditoria');
  });

  it('filtra por todas las palabras y pone primero las que empiezan por la consulta', () => {
    expect(filtrarComandos(comandos, '')).toHaveLength(comandos.length);
    expect(filtrarComandos(comandos, 'plataformas').map((c) => c.etiqueta)).toEqual(['Plataformas']);
    expect(normalizar(filtrarComandos(comandos, 'a').at(0)?.etiqueta ?? '').startsWith('a')).toBe(true);
    expect(filtrarComandos(comandos, 'zzz')).toEqual([]);
  });

  it('el atajo es Ctrl K o ⌘K, no con Alt', () => {
    expect(esAtajoBusqueda({ key: 'k', ctrlKey: true, metaKey: false, altKey: false })).toBe(true);
    expect(esAtajoBusqueda({ key: 'K', ctrlKey: false, metaKey: true, altKey: false })).toBe(true);
    expect(esAtajoBusqueda({ key: 'k', ctrlKey: true, metaKey: false, altKey: true })).toBe(false);
    expect(esAtajoBusqueda({ key: 'k', ctrlKey: false, metaKey: false, altKey: false })).toBe(false);
  });
});

describe('iniciales', () => {
  it('toma las de las dos primeras palabras y tolera nombres de usuario', () => {
    expect(iniciales('Ana Pérez López')).toBe('AP');
    expect(iniciales('admin.area')).toBe('AA');
    expect(iniciales('  ')).toBe('?');
  });
});
