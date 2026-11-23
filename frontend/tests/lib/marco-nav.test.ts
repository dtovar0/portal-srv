/** DIS-078: reglas puras del marco (menú por rol, ruta actual e iniciales; sin buscador global desde DIS-101). */
import { describe, expect, it } from 'vitest';
import { entradaDeRuta, entradasVisibles, iniciales, seccionesVisibles } from '@/components/marco/nav-items';

const permisos = (admin: boolean, area: boolean) => ({
  is_admin: admin, is_area_admin: area, can_manage_areas: admin || area, can_manage_system: admin,
});

describe('menú por rol', () => {
  it('usuario ve solo Portal en General; admin ve además Gestión y Sistema con Plataformas en Gestión', () => {
    const usuario = seccionesVisibles(permisos(false, false));
    expect(usuario.map((s) => s.seccion)).toEqual(['General']);
    expect(usuario[0].entradas.map((e) => e.label)).toEqual(['Portal']);
    const admin = seccionesVisibles(permisos(false, true));
    expect(admin.map((s) => s.seccion)).toEqual(['General', 'Gestión', 'Sistema']);
    expect(admin[0].entradas.map((e) => e.label)).toEqual(['Dashboard', 'Portal']);
    expect(admin[1].entradas.map((e) => e.label)).toContain('Plataformas');
    expect(admin[1].entradas.map((e) => e.label)).not.toContain('Aprobaciones');
    expect(admin[2].entradas.map((e) => e.label)).toEqual(['Ajustes', 'Ejecuciones', 'Auditoría']);
  });

  it('el usuario solo ve Portal; el admin ve más', () => {
    const usuario = entradasVisibles(permisos(false, false)).map((e) => e.label);
    expect(usuario).toEqual(['Portal']);
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

describe('iniciales', () => {
  it('toma las de las dos primeras palabras y tolera nombres de usuario', () => {
    expect(iniciales('Ana Pérez López')).toBe('AP');
    expect(iniciales('admin.area')).toBe('AA');
    expect(iniciales('  ')).toBe('?');
  });
});
