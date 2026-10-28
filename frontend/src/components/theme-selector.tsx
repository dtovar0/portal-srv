'use client';

/**
 * Selector de tema de 3 opciones (FNC-032, FNC-123). La lógica vive en `useTema`
 * (DIS-078); el marco de administración ya no lo usa: su botón de tema y el menú de
 * usuario lo reemplazan.
 */

import { Select } from './form';
import { useTema } from './use-tema';
import { TEMAS } from '@/lib/tema';

export function ThemeSelector() {
  const { tema, elegir } = useTema();

  return (
    <div className="w-28 min-w-0 sm:w-40">
      <Select
        aria-label="Tema de la interfaz"
        value={tema}
        onChange={(e) => { void elegir(e.target.value); }}
      >
        {TEMAS.map((t) => <option key={t.id} value={t.id}>{t.etiqueta}</option>)}
      </Select>
    </div>
  );
}
