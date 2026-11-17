'use client';

/**
 * Toast común (DIS-010, H-17): aviso breve y no bloqueante para confirmar o
 * fallar una acción, sin sustituir al error en línea de un formulario.
 *
 * - `ToastProvider` va una vez, en `layout.tsx`; `useToast()` devuelve
 *   `avisar(tono, texto)` y `cerrar(id)`. Fuera del proveedor no hace nada.
 * - Dos regiones vivas siempre montadas: `role="status"` (éxito e info,
 *   cortés) y `role="alert"` (error, asertiva).
 * - Éxito e info se cierran solos tras `TOAST_MS`; el error se queda hasta que
 *   se cierra (no se pierde un fallo por tardar en leerlo). Todos tienen botón
 *   "Cerrar aviso" de 48 px.
 * - DIS-049: el temporizador se pausa mientras el cursor (ratón, no toque) o el foco están sobre
 *   el aviso y vuelve a correr completo al salir (WCAG 2.2.1).
 * - DIS-049: con un diálogo abierto, la región de avisos entra en el ciclo de
 *   Tab de la trampa de foco (`data-fuera-de-trampa`), así "Cerrar aviso" se
 *   alcanza con el teclado.
 * - Se pinta en un portal en `document.body`, fuera de la raíz de la app, que
 *   queda `inert` bajo un diálogo (DIS-038), así que el aviso sigue legible.
 * - Solo tokens: `bg-panel-fill`, `border-<tono>` y texto `*-text` (pares ya
 *   medidos sobre el panel, AA en los dos temas).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icono, type NombreIcono } from './icono';

/** Milisegundos que permanecen los avisos (auto-cierre a los 8 segundos). */
export const TOAST_MS = 8000;

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

type Aviso = { id: number; tono: ToastTone; texto: string; titulo?: string };

export type ToastApi = {
  avisar: (tono: ToastTone, texto: string, titulo?: string) => number;
  cerrar: (id: number) => void;
};

export const TITULO_DEFECTO: Record<ToastTone, string> = {
  success: 'Éxito',
  error: 'Error',
  warning: 'Atención',
  info: 'Información',
};

const SIN_PROVEEDOR: ToastApi = { avisar: () => 0, cerrar: () => undefined };

const ToastContext = createContext<ToastApi>(SIN_PROVEEDOR);

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const CLASE_TONO: Record<ToastTone, string> = {
  success: 'border-panel-border/80 border-l-4 border-l-success shadow-xl shadow-success/5',
  error: 'border-panel-border/80 border-l-4 border-l-error shadow-xl shadow-error/5',
  warning: 'border-panel-border/80 border-l-4 border-l-warning shadow-xl shadow-warning/5',
  info: 'border-panel-border/80 border-l-4 border-l-primary shadow-xl shadow-primary/5',
};

const BARRA_TONO: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-primary',
};

const ICONO_TONO: Record<ToastTone, { icon: NombreIcono; badge: string; text: string }> = {
  success: {
    icon: 'exito',
    badge: 'bg-gradient-to-br from-success/20 to-success/10 border-success/40 text-success-text shadow-xs ring-1 ring-success/20',
    text: 'text-success-text',
  },
  error: {
    icon: 'error',
    badge: 'bg-gradient-to-br from-error/20 to-error/10 border-error/40 text-error-text shadow-xs ring-1 ring-error/20',
    text: 'text-error-text',
  },
  warning: {
    icon: 'aviso',
    badge: 'bg-gradient-to-br from-warning/20 to-warning/10 border-warning/40 text-warning-text shadow-xs ring-1 ring-warning/20',
    text: 'text-warning-text',
  },
  info: {
    icon: 'info',
    badge: 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/40 text-primary-text shadow-xs ring-1 ring-primary/20',
    text: 'text-primary-text',
  },
};

type PropsTarjeta = {
  aviso: Aviso;
  onCerrar: (id: number) => void;
  onPausa: (id: number) => void;
  onReanudar: (id: number) => void;
};

function Tarjeta({ aviso, onCerrar, onPausa, onReanudar }: PropsTarjeta) {
  const encima = useRef({ cursor: false, foco: false });
  const tonoConfig = ICONO_TONO[aviso.tono];
  const actualizar = (parte: Partial<typeof encima.current>) => {
    encima.current = { ...encima.current, ...parte };
    if (encima.current.cursor || encima.current.foco) onPausa(aviso.id);
    else onReanudar(aviso.id);
  };
  return (
    <div
      onPointerEnter={(evento) => {
        if (evento.pointerType === 'mouse') actualizar({ cursor: true });
      }}
      onPointerLeave={(evento) => {
        if (evento.pointerType === 'mouse') actualizar({ cursor: false });
      }}
      onFocus={() => actualizar({ foco: true })}
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) actualizar({ foco: false });
      }}
      className={`nx-toast pointer-events-auto relative flex items-start gap-3 rounded-2xl border bg-panel-fill/95 p-3.5 pl-4 shadow-2xl backdrop-blur-xl transition-all duration-media hover:shadow-xl ${CLASE_TONO[aviso.tono]}`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${tonoConfig.badge}`} aria-hidden="true">
        <Icono nombre={tonoConfig.icon} tamano="sm" />
      </span>
      <div className="flex-1 min-w-0 pr-1">
        <h4 className={`text-xs font-black tracking-wide uppercase leading-tight ${tonoConfig.text}`}>
          {aviso.titulo || TITULO_DEFECTO[aviso.tono]}
        </h4>
        <p className="mt-0.5 text-xs font-medium text-body-text/80 leading-snug break-words">
          {aviso.texto}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onCerrar(aviso.id)}
        aria-label="Cerrar aviso"
        className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-label/60 transition-all hover:bg-surface-container hover:text-body-text active:scale-95 focus-visible:ring-2 focus-visible:ring-primary -mr-2 -my-2"
      >
        <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
        <span className="sr-only">Cerrar aviso</span>
      </button>
      <span
        className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-2xl bg-panel-border/30"
        aria-hidden="true"
      >
        <span className={`block h-full w-full ${BARRA_TONO[aviso.tono]} nx-toast-progress`} />
      </span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [montado, setMontado] = useState(false);
  const siguiente = useRef(1);
  const temporizadores = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setMontado(true);
    const activos = temporizadores.current;
    return () => {
      activos.forEach(clearTimeout);
      activos.clear();
    };
  }, []);

  const cerrar = useCallback((id: number) => {
    const temporizador = temporizadores.current.get(id);
    if (temporizador) clearTimeout(temporizador);
    temporizadores.current.delete(id);
    setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
  }, []);

  const avisar = useCallback(
    (tono: ToastTone, texto: string, titulo?: string) => {
      const id = siguiente.current++;
      setAvisos((actuales) => [...actuales, { id, tono, texto, titulo }]);
      temporizadores.current.set(id, setTimeout(() => cerrar(id), TOAST_MS));
      return id;
    },
    [cerrar],
  );

  const pausar = useCallback((id: number) => {
    const temporizador = temporizadores.current.get(id);
    if (temporizador) clearTimeout(temporizador);
    temporizadores.current.delete(id);
  }, []);

  const reanudar = useCallback(
    (id: number) => {
      if (temporizadores.current.has(id)) return;
      temporizadores.current.set(id, setTimeout(() => cerrar(id), TOAST_MS));
    },
    [cerrar],
  );

  const api = useMemo(() => ({ avisar, cerrar }), [avisar, cerrar]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {montado
        ? createPortal(
            <div data-fuera-de-trampa className="pointer-events-none fixed bottom-4 right-4 z-60 flex flex-col items-end gap-2 w-full max-w-sm sm:w-96">
              <div role="status" className="flex w-full flex-col gap-2">
                {avisos
                  .filter((aviso) => aviso.tono !== 'error')
                  .map((aviso) => <Tarjeta key={aviso.id} aviso={aviso} onCerrar={cerrar} onPausa={pausar} onReanudar={reanudar} />)}
              </div>
              <div role="alert" className="flex w-full flex-col gap-2">
                {avisos
                  .filter((aviso) => aviso.tono === 'error')
                  .map((aviso) => <Tarjeta key={aviso.id} aviso={aviso} onCerrar={cerrar} onPausa={pausar} onReanudar={reanudar} />)}
              </div>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
