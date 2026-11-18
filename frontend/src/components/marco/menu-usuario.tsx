'use client';

/**
 * Menú de usuario (DIS-078, movido al pie de la barra lateral en DIS-080): tarjeta con avatar con
 * iniciales, nombre y rol; con la barra colapsada, solo el avatar. Botón con `aria-haspopup="menu"`;
 * el menú se abre hacia arriba (hacia arriba y a la derecha si está colapsada), se maneja con
 * flechas, Inicio/Fin y Escape, y se cierra con Tab o un clic fuera.
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
  segunSistema: _segunSistema,
  onSegunSistema: _onSegunSistema,
  colapsada = false,
  enBarraLateral = true,
}: {
  session: Session;
  /** El tema actual es «según el sistema». */
  segunSistema?: boolean;
  onSegunSistema?: () => void;
  /** Barra lateral colapsada: solo el avatar y el menú a la derecha. */
  colapsada?: boolean;
  /** Aplica los tokens específicos del menú lateral oscuro (por defecto true). */
  enBarraLateral?: boolean;
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
    <div ref={raiz} className={`relative ${colapsada ? '' : 'min-w-0 flex-1'}`}>
      <button
        ref={boton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label={`Menú de usuario: ${session.name}`}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={alTeclearBoton}
        title={colapsada ? `Menú de usuario: ${session.name}` : undefined}
        className={`flex min-h-11 items-center rounded-control outline-none transition-colors focus-visible:ring-2 ${
          enBarraLateral
            ? 'focus-visible:ring-barra-lateral-foco text-barra-lateral-texto hover:bg-barra-lateral-hover active:bg-barra-lateral-presionado'
            : 'focus-visible:ring-primary text-body-text hover:bg-surface-container'
        } ${
          colapsada
            ? 'min-w-11 justify-center'
            : enBarraLateral
              ? 'w-full gap-2.5 border border-barra-lateral-borde bg-barra-lateral-elemento py-1 pl-1.5 pr-2.5'
              : 'w-full gap-2.5 border border-borde bg-superficie py-1 pl-1.5 pr-2.5'
        }`}
      >
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-superficie/20 bg-gradient-to-br from-primary via-brand to-accent text-sm font-bold text-texto-sobre-accion shadow-xs">
          {iniciales(session.name)}
        </span>
        {colapsada ? null : (
          <>
            <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
              <span className={`w-full truncate text-left text-sm font-semibold ${enBarraLateral ? 'text-barra-lateral-texto' : 'text-body-text'}`}>
                {session.name}
              </span>
              <span className={`w-full truncate text-left text-xs ${enBarraLateral ? 'text-barra-lateral-secundario' : 'text-texto-secundario'}`}>
                {etiquetaRol(session.role)}
              </span>
            </span>
            <Icono nombre="chevron-abajo" tamano="sm" className={`rotate-180 ${enBarraLateral ? 'text-barra-lateral-secundario' : 'text-texto-secundario'}`} />
          </>
        )}
      </button>

      {abierto ? (
        <div
          ref={menu}
          id={idMenu}
          role="menu"
          aria-label="Cuenta"
          onKeyDown={alTeclearMenu}
          className={`absolute z-50 w-60 rounded-2xl border border-panel-border bg-panel-fill p-2 shadow-2xl backdrop-blur-md ${
            colapsada ? 'bottom-0 left-full ml-2' : 'bottom-full left-0 mb-2'
          }`}
        >
          <div role="presentation" className="border-b border-panel-border/80 px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-body-text">{session.name}</p>
            <p className="truncate text-xs text-texto-secundario">{session.email}</p>
            <p className="truncate text-xs text-texto-secundario">{etiquetaRol(session.role)}</p>
          </div>
          <div role="none" className="flex flex-col gap-0.5 pt-2">
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
