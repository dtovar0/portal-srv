'use client';

/**
 * Diseño activo de las tarjetas del dashboard (DIS-113): lee la preferencia al montar y se
 * suscribe al evento que emite `guardarDisenoTarjetas`, así el botón de la barra superior
 * cambia las tarjetas al instante, sin recargar. También sigue los cambios de otras pestañas.
 */

import { useEffect, useState } from 'react';
import {
  CLAVE_DISENO_TARJETAS,
  esDisenoTarjeta,
  EVENTO_DISENO_TARJETAS,
  leerDisenoTarjetas,
  type DisenoTarjeta,
} from './diseno-tarjetas';

export function useDisenoTarjetas(): DisenoTarjeta {
  const [diseno, setDiseno] = useState<DisenoTarjeta>(() => leerDisenoTarjetas());

  useEffect(() => {
    // Sincronizar por si cambió en almacenamiento antes del montaje
    setDiseno(leerDisenoTarjetas());
    const alAplicar = (e: Event) => {
      const nuevo = (e as CustomEvent<unknown>).detail;
      setDiseno(esDisenoTarjeta(nuevo) ? nuevo : leerDisenoTarjetas());
    };
    const alCambiarOtraPestana = (e: StorageEvent) => {
      if (e.key === CLAVE_DISENO_TARJETAS) setDiseno(leerDisenoTarjetas());
    };
    window.addEventListener(EVENTO_DISENO_TARJETAS, alAplicar);
    window.addEventListener('storage', alCambiarOtraPestana);
    return () => {
      window.removeEventListener(EVENTO_DISENO_TARJETAS, alAplicar);
      window.removeEventListener('storage', alCambiarOtraPestana);
    };
  }, []);

  return diseno;
}
