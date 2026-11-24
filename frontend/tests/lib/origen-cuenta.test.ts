/** FNC-169: origen de la cuenta; `sso` es del directorio (Authelia + LDAP). */
import { describe, expect, it } from 'vitest';
import { esCuentaDelDirectorio, etiquetaOrigen } from '@/lib/origen-cuenta';

describe('origen-cuenta', () => {
  it('sso y el heredado ldap son del directorio; local no', () => {
    expect(esCuentaDelDirectorio('sso')).toBe(true);
    expect(esCuentaDelDirectorio('ldap')).toBe(true);
    expect(esCuentaDelDirectorio('local')).toBe(false);
    expect(esCuentaDelDirectorio(undefined)).toBe(false);
  });

  it('etiquetas legibles', () => {
    expect(etiquetaOrigen('sso')).toBe('Directorio (Authelia)');
    expect(etiquetaOrigen('ldap')).toBe('Directorio (Authelia)');
    expect(etiquetaOrigen('local')).toBe('Cuenta local');
    expect(etiquetaOrigen('otro')).toBe('otro');
  });
});
