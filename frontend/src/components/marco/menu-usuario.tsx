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
  colapsada = false,
  enBarraLateral = true,
  posicionMenu = 'arriba',
}: {
  session: Session;
  /** Barra lateral colapsada: solo el avatar y el menú a la derecha. */
  colapsada?: boolean;
  /** Aplica los tokens específicos del menú lateral oscuro (por defecto true). */
  enBarraLateral?: boolean;
  /** Dirección hacia donde se despliega el menú (por defecto 'arriba'). */
  posicionMenu?: 'arriba' | 'abajo';
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
        className={`flex items-center rounded-xl outline-none transition-all duration-rapida focus-visible:ring-2 cursor-pointer select-none ${enBarraLateral
          ? `min-h-11 focus-visible:ring-barra-lateral-foco text-barra-lateral-texto hover:bg-barra-lateral-hover active:bg-barra-lateral-presionado ${colapsada
            ? 'min-w-11 justify-center'
            : 'w-full gap-2.5 border border-barra-lateral-borde bg-barra-lateral-elemento py-1 pl-1.5 pr-2.5'
          }`
          : `h-12 min-h-12 focus-visible:ring-primary text-body-text shadow-xs ${colapsada
            ? 'size-12 min-w-12 justify-center border border-panel-border bg-fondo hover:border-primary/50 hover:bg-superficie hover:shadow-1 p-0'
            : 'w-auto gap-2.5 border border-panel-border bg-fondo hover:border-primary/50 hover:bg-superficie hover:shadow-1 py-1 pl-1.5 pr-2.5'
          } ${abierto ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary-text' : ''}`
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
            <Icono
              nombre="chevron-abajo"
              tamano="sm"
              className={`shrink-0 transition-transform duration-rapida ${abierto
                ? 'rotate-180 text-primary-text'
                : enBarraLateral
                  ? 'text-barra-lateral-secundario'
                  : 'text-texto-secundario'
                }`}
            />
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
          className={`absolute z-50 w-72 rounded-2xl border border-panel-border/80 bg-panel-fill p-2.5 shadow-2xl backdrop-blur-xl transition-all duration-rapida ${posicionMenu === 'abajo'
            ? 'top-full right-0 mt-2'
            : colapsada
              ? 'bottom-0 left-full ml-2'
              : 'bottom-full left-0 mb-2'
            }`}
        >
          {/* Header de usuario: izquierda avatar/icono, derecha nombre y correo, y abajo de ellos el badge */}
          <div role="presentation" className="p-3 border-b border-panel-border/80 bg-superficie-hundida/50 rounded-xl mb-1.5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-superficie/20 bg-gradient-to-br from-primary via-brand to-accent text-base font-bold text-texto-sobre-accion shadow-xs"
              >
                {iniciales(session.name)}
              </span>
              <div className="flex flex-col min-w-0 flex-1 justify-center text-left">
                <p className="truncate text-sm font-bold text-body-text leading-tight">{session.name}</p>
                <p className="truncate text-xs text-texto-secundario mt-0.5 leading-tight">{session.email}</p>
                <div className="mt-2 flex items-center">
                  <span className="inline-flex max-w-full truncate items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary-text border border-primary/20 shadow-xs">
                    {etiquetaRol(session.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div role="none" className="flex flex-col gap-1 pt-1">
            <Link
              href="/cambiar-contrasena"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-body-text hover:bg-superficie-hundida transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <Icono nombre="candado" tamano="sm" className="text-aduana-cyan" />
              <span>Cambiar contraseña</span>
            </Link>
            <Link
              href="/logout"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-error-text hover:bg-error/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-error cursor-pointer"
            >
              <Icono nombre="cerrar" tamano="sm" className="text-error-text" />
              <span>Cerrar sesión</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
