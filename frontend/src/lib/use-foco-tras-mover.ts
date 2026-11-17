'use client';

/**
 * Foco tras mover un elemento entre dos listas (DIS-082). Al pasar un ítem de una lista a otra, el
 * foco se queda en el ítem vecino de la lista de origen o, si ya no quedan, en la propia lista
 * (`tabIndex={-1}`); así quien navega con teclado no pierde su posición.
 *
 * Uso: `ref={refLista('nombre')}` en cada `<ul>`, `data-item-id={id}` en el botón de cada ítem y
 * `enfocarTras('nombre', itemsVisibles, id)` justo antes de aplicar el cambio.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useFocoTrasMover() {
  const listas = useRef(new Map<string, HTMLUListElement | null>());
  const [pendiente, setPendiente] = useState<{ lista: string; id: number | null } | null>(null);

  const refLista = useCallback(
    (nombre: string) => (el: HTMLUListElement | null) => {
      listas.current.set(nombre, el);
    },
    [],
  );

  /** Vecino del ítem `id` en `items`: el siguiente, o el anterior si era el último; `null` si no hay. */
  const enfocarTras = useCallback((lista: string, items: readonly { id: number }[], id: number) => {
    const indice = items.findIndex((item) => item.id === id);
    const vecino = items[indice + 1] ?? items[indice - 1] ?? null;
    setPendiente({ lista, id: vecino ? vecino.id : null });
  }, []);

  useEffect(() => {
    if (!pendiente) return;
    const ul = listas.current.get(pendiente.lista);
    if (ul) {
      const boton = pendiente.id === null ? null : ul.querySelector<HTMLElement>(`[data-item-id="${pendiente.id}"]`);
      (boton ?? ul).focus();
    }
    setPendiente(null);
  }, [pendiente]);

  return { refLista, enfocarTras };
}
