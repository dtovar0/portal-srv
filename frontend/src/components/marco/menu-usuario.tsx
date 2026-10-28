'use client';

/**
 * Menú de usuario (DIS-078): avatar con iniciales, nombre y rol. Botón con `aria-haspopup="menu"`;
 * el menú se maneja con flechas, Inicio/Fin y Escape, y se cierra con Tab o un clic fuera.
 * Contiene «Tema: según el sistema» (reemplaza al selector de 3 opciones) y «Cerrar sesión».
 */

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Icono } from '../icono';
import type { Session } from '@/lib/types';
import { etiquetaRol, iniciales } from './nav-items';

const ITEMS = '[role="menuitem"], [role="menuitemcheckbox"]';
const CLASE_ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-navegacion outline-none transition-colors hover:bg-surface-container hover:text-body-text focus-visible:ring-2 focus-visible:ring-primary';

export function MenuUsuario({
  session,
  segunSistema,
  onSegunSistema,
}: {
  session: Session;
  /** El tema actual es «según el sistema». */
  segunSistema: boolean;
  onSegunSistema: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const idMenu = useId();
  const alAbrir = useRef<'primero' | 'ultimo'>('primero');

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>(ITEMS) ?? []);

  function cerrar(devolverFoco: boolean) {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }

  // Al abrir, el foco va al primer elemento.
  useEffect(() => {
    if (!abierto) return;
    const lista = items();
    (alAbrir.current === 'ultimo' ? lista[lista.length - 1] : lista[0])?.focus();
    alAbrir.current = 'primero';
  }, [abierto]);

  // Clic fuera cierra sin robar el foco.
  useEffect(() => {
    if (!abierto) return;
    function alPulsar(evento: PointerEvent) {
      if (!raiz.current?.contains(evento.target as Node)) setAbierto(false);
    }
    document.addEventListener('pointerdown', alPulsar);
    return () => document.removeEventListener('pointerdown', alPulsar);
  }, [abierto]);

  function moverFoco(delta: number | 'inicio' | 'fin') {
    const lista = items();
    if (lista.length === 0) return;
    const i = lista.indexOf(document.activeElement as HTMLElement);
    const destino =
      delta === 'inicio' ? 0 : delta === 'fin' ? lista.length - 1 : (i + delta + lista.length) % lista.length;
    lista[destino]?.focus();
  }

  function alTeclearMenu(evento: React.KeyboardEvent) {
    switch (evento.key) {
      case 'ArrowDown': evento.preventDefault(); moverFoco(1); break;
      case 'ArrowUp': evento.preventDefault(); moverFoco(-1); break;
      case 'Home': evento.preventDefault(); moverFoco('inicio'); break;
      case 'End': evento.preventDefault(); moverFoco('fin'); break;
      case 'Escape': evento.preventDefault(); cerrar(true); break;
      case 'Tab': cerrar(false); break;
      default:
    }
  }

  function alTeclearBoton(evento: React.KeyboardEvent) {
    if ((evento.key === 'ArrowDown' || evento.key === 'ArrowUp') && !abierto) {
      evento.preventDefault();
      alAbrir.current = evento.key === 'ArrowUp' ? 'ultimo' : 'primero';
      setAbierto(true);
    }
  }

  return (
    <div ref={raiz} className="relative">
      <button
        ref={boton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label={`Menú de usuario: ${session.name}`}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={alTeclearBoton}
        className="flex min-h-11 min-w-11 items-center gap-2.5 rounded-base py-0 pl-1 pr-2 text-body-text outline-none transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-pastilla bg-accion text-sm font-bold text-texto-sobre-accion">
          {iniciales(session.name)}
        </span>
        <span className="hidden min-w-0 flex-col items-start leading-tight lg:flex">
          <span className="max-w-40 truncate text-sm font-semibold">{session.name}</span>
          <span className="max-w-40 truncate text-xs text-texto-secundario">{etiquetaRol(session.role)}</span>
        </span>
        <Icono nombre="chevron-abajo" tamano="sm" className="hidden text-texto-secundario lg:inline-block" />
      </button>

      {abierto ? (
        <div
          ref={menu}
          id={idMenu}
          role="menu"
          aria-label="Cuenta"
          onKeyDown={alTeclearMenu}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-tarjeta border border-borde bg-superficie-elevada p-2 shadow-2"
        >
          <div role="presentation" className="border-b border-borde-sutil px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-body-text">{session.name}</p>
            <p className="truncate text-xs text-texto-secundario">{session.email}</p>
            <p className="truncate text-xs text-texto-secundario">{etiquetaRol(session.role)}</p>
          </div>
          <div role="none" className="flex flex-col gap-0.5 pt-2">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={segunSistema}
              onClick={() => { onSegunSistema(); cerrar(true); }}
              className={CLASE_ITEM}
            >
              <Icono nombre="sol" />
              <span className="flex-1">Tema: según el sistema</span>
              {segunSistema ? <Icono nombre="aprobar" tamano="sm" /> : null}
            </button>
            <Link href="/logout" role="menuitem" onClick={() => setAbierto(false)} className={CLASE_ITEM}>
              <Icono nombre="cerrar" />
              <span>Cerrar sesión</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
