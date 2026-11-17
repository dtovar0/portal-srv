'use client';

/** Aviso de plataformas sin enlace directo configurado mediante Toast (DIS-010). */

import { useEffect, useRef } from 'react';
import { useToast } from '../toast';

export function MissingLinkNote({ count }: { count: number }) {
  const { avisar } = useToast();
  const notificadoRef = useRef<number | null>(null);

  useEffect(() => {
    if (count > 0 && notificadoRef.current !== count) {
      notificadoRef.current = count;
      const texto = `${count} ${count === 1 ? 'plataforma requiere enlace directo.' : 'plataformas requieren enlace directo.'}`;
      avisar('warning', texto, 'Enlace pendiente');
    }
  }, [count, avisar]);

  return null;
}
