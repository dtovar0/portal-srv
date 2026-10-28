'use client';

/**
 * Paleta de comandos del buscador global (DIS-078): `Modal` (foco atrapado y devuelto, Escape,
 * velo y bloqueo del fondo) con un `TextInput` en patrón `combobox` y su `listbox` (WAI-ARIA).
 * Flechas, Inicio/Fin y Enter. Se monta solo mientras está abierta, así el foco vuelve al
 * control que lo tenía al abrir.
 */

import { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, TextInput } from '../form';
import { Icono } from '../icono';
import { filtrarComandos, type Comando } from './comandos';

export function PaletaComandos({
  comandos,
  onCerrar,
}: {
  comandos: readonly Comando[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const idLista = useId();
  const [consulta, setConsulta] = useState('');
  const [indice, setIndice] = useState(0);

  const resultados = useMemo(() => filtrarComandos(comandos, consulta), [comandos, consulta]);
  const actual = Math.min(indice, Math.max(resultados.length - 1, 0));
  const idOpcion = (i: number) => `${idLista}-opcion-${i}`;

  function ejecutar(comando: Comando | undefined) {
    if (!comando) return;
    onCerrar();
    if (comando.href) router.push(comando.href);
    else comando.accion?.();
  }

  function alTeclear(evento: React.KeyboardEvent<HTMLInputElement>) {
    const n = resultados.length;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      if (n > 0) setIndice((actual + 1) % n);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (n > 0) setIndice((actual - 1 + n) % n);
    } else if (evento.key === 'Home' && n > 0) {
      evento.preventDefault();
      setIndice(0);
    } else if (evento.key === 'End' && n > 0) {
      evento.preventDefault();
      setIndice(n - 1);
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      ejecutar(resultados[actual]);
    }
  }

  return (
    <Modal title="Buscador global" onClose={onCerrar}>
      <TextInput
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={resultados.length > 0 ? idOpcion(actual) : undefined}
        aria-label="Buscar pantallas y acciones"
        placeholder="Buscar pantallas y acciones…"
        autoComplete="off"
        value={consulta}
        onChange={(evento) => { setConsulta(evento.target.value); setIndice(0); }}
        onKeyDown={alTeclear}
      />
      <ul id={idLista} role="listbox" aria-label="Resultados" className="max-h-80 overflow-y-auto">
        {resultados.map((comando, i) => (
          <li
            key={comando.id}
            id={idOpcion(i)}
            role="option"
            aria-selected={i === actual}
            onMouseMove={() => setIndice(i)}
            onClick={() => ejecutar(comando)}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 text-sm ${
              i === actual ? 'bg-activo-fondo text-activo-texto' : 'text-navegacion'
            }`}
          >
            <Icono nombre={comando.icono} />
            <span className="min-w-0 flex-1 truncate font-medium">{comando.etiqueta}</span>
            <span className={`text-xs ${i === actual ? 'text-activo-texto' : 'text-texto-secundario'}`}>{comando.tipo}</span>
          </li>
        ))}
      </ul>
      {resultados.length === 0 ? (
        <p role="status" className="text-sm text-texto-secundario">
          Sin resultados para «{consulta.trim()}».
        </p>
      ) : null}
    </Modal>
  );
}
