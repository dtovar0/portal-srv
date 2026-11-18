'use client';

/**
 * Tema de la interfaz como hook (FNC-032, FNC-123, DIS-078): aplica la clase en `<html>`, la guarda
 * en el navegador y en la cuenta, y adopta el de la cuenta al iniciar sesión. Si el guardado en la
 * cuenta falla, se avisa y la vista no se revierte. Lo usan `ThemeSelector` y el marco de administración.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSession } from './session-provider';
import { useToast } from './toast';
import { api } from '@/lib/api';
import { TEMA_POR_DEFECTO, aplicarTemaDeCuenta, elegirTema, restaurarTema } from '@/lib/tema';

/** El sistema prefiere el tema oscuro (sin `matchMedia`, claro). */
function sistemaOscuro(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTema() {
  const [tema, setTema] = useState(TEMA_POR_DEFECTO);
  const { session } = useSession();
  const { avisar } = useToast();
  const temaDeCuenta = session?.preferences?.theme;

  // El script de `<head>` ya puso la clase; aquí se sincroniza el control.
  useEffect(() => { setTema(restaurarTema()); }, []);

  // El tema de la cuenta manda sobre el del navegador.
  useEffect(() => {
    const aplicado = aplicarTemaDeCuenta(temaDeCuenta);
    if (aplicado) setTema(aplicado);
  }, [temaDeCuenta]);

  const elegir = useCallback(async (id: string) => {
    setTema(id);
    elegirTema(id);
    try {
      await api.savePreferences({ theme: id });
    } catch {
      avisar('error', 'No se pudo guardar el tema en tu cuenta.', 'Tema');
    }
  }, [avisar]);

  /** Lo que se ve ahora: oscuro, ya sea elegido o por el sistema. */
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && sistemaOscuro());
  const alternar = useCallback(() => elegir(oscuro ? 'claro' : 'oscuro'), [elegir, oscuro]);

  return { tema, oscuro, elegir, alternar };
}
