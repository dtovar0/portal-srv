'use client';

/**
 * Menú desplegable de notificaciones exclusivo para la vista de usuario (DIS-115).
 * Se despliega hacia abajo desde el botón disparador en PlatformsTopbar y PlatformsSidebarView.
 * Presenta:
 * - Botón simétrico (48×48px) con indicador visual de no leídas y área táctil accesible (≥44px).
 * - Encabezado premium con conteo de no leídas y acción directa para "Marcar leídas".
 * - Lista de notificaciones con iconos por tipo (éxito, error, aviso, info), título, hora y mensaje.
 * - Estados de carga (Skeleton) y vacío amigable ("No tienes notificaciones").
 * - Pie de menú con enlace directo al centro completo (/notifications).
 * - Cierre accesible con tecla Escape y clic exterior.
 */

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { AppNotification } from '@/lib/types';
import { Icono } from '../icono';
import { EmptyNote, Skeleton } from '../ui';

const ICONOS_TIPO: Record<string, 'exito' | 'error' | 'aviso' | 'info'> = {
  success: 'exito',
  error: 'error',
  warning: 'aviso',
  info: 'info',
};

const TONOS_TIPO: Record<string, string> = {
  success: 'bg-success/15 text-success-text',
  error: 'bg-error/15 text-error-text',
  warning: 'bg-warning/15 text-warning-text',
  info: 'bg-primary/15 text-primary-text',
};

export interface MenuNotificacionesProps {
  /** Cantidad inicial de notificaciones sin leer proveniente de useIndicadores */
  noLeidasInicial?: number;
  /** Callback opcional al cambiar el conteo de no leídas */
  onCambioNoLeidas?: (nuevas: number) => void;
}

export function MenuNotificaciones({
  noLeidasInicial = 0,
  onCambioNoLeidas,
}: MenuNotificacionesProps) {
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<AppNotification[]>([]);
  const [cargando, setCargando] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [noLeidas, setNoLeidas] = useState(noLeidasInicial);

  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  // Sincronizar si cambia el prop externo
  useEffect(() => {
    setNoLeidas(noLeidasInicial);
  }, [noLeidasInicial]);

  // Cargar notificaciones cuando se abre el menú
  const cargarNotificaciones = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await api.notifications();
      setNotificaciones(lista);
      const unread = lista.filter((n) => !n.is_read).length;
      setNoLeidas(unread);
      onCambioNoLeidas?.(unread);
    } catch {
      // mantener estado actual en caso de error de red
    } finally {
      setCargando(false);
    }
  }, [onCambioNoLeidas]);

  useEffect(() => {
    if (abierto) {
      void cargarNotificaciones();
    }
  }, [abierto, cargarNotificaciones]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    function alPulsar(e: PointerEvent) {
      if (!raiz.current?.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('pointerdown', alPulsar);
    return () => document.removeEventListener('pointerdown', alPulsar);
  }, [abierto]);

  // Cerrar al pulsar Escape
  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAbierto(false);
      boton.current?.focus();
    }
  }

  // Marcar todas como leídas
  async function marcarTodasLeidas() {
    if (marcando || noLeidas === 0) return;
    setMarcando(true);
    try {
      await api.markNotificationsRead();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setNoLeidas(0);
      onCambioNoLeidas?.(0);
    } catch {
      // fallo silencioso
    } finally {
      setMarcando(false);
    }
  }

  const etiquetaBoton = noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones';

  return (
    <div ref={raiz} className="relative inline-block" onKeyDown={alTeclear}>
      {/* Botón Disparador Symmetrical */}
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={idMenu}
        aria-label={etiquetaBoton}
        title={etiquetaBoton}
        className={`relative flex size-12 min-w-12 h-12 min-h-12 items-center justify-center rounded-xl border border-panel-border bg-fondo text-texto hover:border-borde-fuerte transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer ${abierto ? '!border-primary !bg-primary/10 !text-primary-text ring-2 ring-primary/20' : ''
          }`}
      >
        <Icono nombre="campana" />
        {noLeidas > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 size-2.5 rounded-pastilla border-2 border-superficie bg-error-solid"
          />
        ) : null}
      </button>

      {/* Menú Desplegable Premium */}
      {abierto ? (
        <div
          id={idMenu}
          aria-label="Panel de notificaciones"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-panel-border/80 bg-panel-fill shadow-2xl backdrop-blur-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-rapida"
        >
          {/* Encabezado */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border/80 bg-superficie-hundida/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-body-text">Notificaciones</span>
              {noLeidas > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary-text border border-primary/20 tabular-nums">
                  {noLeidas} {noLeidas === 1 ? 'nueva' : 'nuevas'}
                </span>
              ) : null}
            </div>

            {noLeidas > 0 ? (
              <button
                type="button"
                onClick={marcarTodasLeidas}
                disabled={marcando}
                className="inline-flex min-h-11 min-w-11 items-center gap-1.5 px-3 py-1 text-xs font-semibold text-primary-text hover:bg-primary/10 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:text-deshabilitado-texto"
                aria-label="Marcar todas como leídas"
                title="Marcar todas como leídas"
              >
                <Icono nombre="aprobar" tamano="xs" ariaHidden />
                <span>Marcar leídas</span>
              </button>
            ) : null}
          </div>

          {/* Cuerpo / Lista de Notificaciones */}
          <div className="max-h-80 min-h-36 overflow-y-auto divide-y divide-panel-border/40" data-desplazable="">
            {cargando ? (
              <div className="p-4 space-y-3">
                <Skeleton variant="fila" count={3} ariaLabel="Cargando notificaciones…" />
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="p-4">
                <EmptyNote
                  variant="seamless"
                  icono="campana"
                  title="Al día"
                  message="No tienes notificaciones pendientes."
                />
              </div>
            ) : (
              notificaciones.map((item) => {
                const iconoNombre = ICONOS_TIPO[item.type] ?? 'info';
                const tonoClase = TONOS_TIPO[item.type] ?? TONOS_TIPO.info;

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 transition-colors hover:bg-superficie/40 ${item.is_read ? '' : 'bg-primary/5'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${tonoClase}`}
                    >
                      <Icono nombre={iconoNombre} tamano="xs" />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-xs truncate ${item.is_read ? 'font-medium text-texto-secundario' : 'font-bold text-body-text'}`}>
                          {item.title}
                        </p>
                        <span className="shrink-0 text-xs text-texto-secundario tabular-nums">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-texto-secundario mt-0.5 line-clamp-2">
                        {item.message}
                      </p>
                    </div>

                    {!item.is_read ? (
                      <span
                        aria-hidden="true"
                        className="size-2 mt-1.5 shrink-0 rounded-pastilla bg-primary"
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {/* Pie de Menú */}
          <div className="border-t border-panel-border/80 bg-superficie-hundida/40 p-2 flex items-center justify-between">
            <Link
              href="/notifications"
              onClick={() => setAbierto(false)}
              className="flex min-h-11 min-w-11 w-full items-center justify-center rounded-xl px-3 text-xs font-bold text-primary-text hover:bg-primary/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Ver todas las notificaciones</span>
              <span className="ml-1" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
