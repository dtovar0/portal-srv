'use client';

/**
 * Estado «menú lateral colapsado» (DIS-078), recordado en el navegador.
 * El marco solo se pinta en el cliente (tras cargar la sesión), así que el valor
 * guardado se lee al crear el estado y no hay salto de diseño ni desajuste de hidratación.
 * Si el almacenamiento está bloqueado, el menú funciona igual sin recordarse.
 */

import { useCallback, useState } from 'react';

/** Llave en `localStorage` (preferencia por navegador; no es un secreto). */
export const CLAVE_MENU_COLAPSADO = 'nexus-menu-colapsado';

export function leerMenuColapsado(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_MENU_COLAPSADO) === '1';
  } catch {
    return false;
  }
}

function guardarMenuColapsado(colapsado: boolean): void {
  try {
    window.localStorage.setItem(CLAVE_MENU_COLAPSADO, colapsado ? '1' : '0');
  } catch {
    /* almacenamiento bloqueado: sin persistencia */
  }
}

export function useMenuColapsado() {
  const [colapsado, setColapsado] = useState<boolean>(leerMenuColapsado);
  const alternar = useCallback(() => {
    const siguiente = !colapsado;
    setColapsado(siguiente);
    guardarMenuColapsado(siguiente);
  }, [colapsado]);
  return { colapsado, alternar };
}
