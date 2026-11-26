'use client';

/**
 * Aviso por Toast (DIS-010) de plataformas con un enlace no válido. Las que no tienen enlace
 * («Omitir enlace», DIS-138) no cuentan: no les falta nada.
 */

import { useEffect, useRef } from 'react';
import { useToast } from '../toast';

export function MissingLinkNote({ count }: { count: number }) {
  const { avisar } = useToast();
  const notificadoRef = useRef<number | null>(null);

  useEffect(() => {
    if (count > 0 && notificadoRef.current !== count) {
      notificadoRef.current = count;
      const texto = `${count} ${count === 1 ? 'plataforma tiene un enlace no válido (debe ser https).' : 'plataformas tienen un enlace no válido (debe ser https).'}`;
      avisar('warning', texto, 'Enlace no válido');
    }
  }, [count, avisar]);

  return null;
}
