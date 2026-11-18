'use client';

/**
 * Toast común (DIS-010, H-17): aviso breve y no bloqueante para confirmar o
 * fallar una acción, sin sustituir al error en línea de un formulario.
 *
 * - `ToastProvider` va una vez, en `layout.tsx`; `useToast()` devuelve
 *   `avisar(tono, texto)` y `cerrar(id)`. Fuera del proveedor no hace nada.
 * - Dos regiones vivas siempre montadas: `role="status"` (éxito e info,
 *   cortés) y `role="alert"` (error, asertiva).
 * - Todos los avisos, también los de error, se cierran solos tras `TOAST_MS`
 *   (8 s, decisión del dueño 2026-11-18). Todos tienen botón "Cerrar aviso" de 48 px.
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

/** Tono de la tarjeta: brillo de esquina (`nx-toast-<tono>`, components.css) y sombra teñida. */
const CLASE_TONO: Record<ToastTone, string> = {
  success: 'nx-toast-success shadow-success/10',
  error: 'nx-toast-error shadow-error/10',
  warning: 'nx-toast-warning shadow-warning/10',
  info: 'nx-toast-info shadow-primary/10',
};

const BARRA_TONO: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-primary',
};

const ICONO_TONO: Record<ToastTone, { icon: NombreIcono; badge: string; text: string }> = {
  success: { icon: 'exito', badge: 'bg-success/15 text-success-text ring-success/30', text: 'text-success-text' },
  error: { icon: 'error', badge: 'bg-error/15 text-error-text ring-error/30', text: 'text-error-text' },
  warning: { icon: 'aviso', badge: 'bg-warning/15 text-warning-text ring-warning/30', text: 'text-warning-text' },
  info: { icon: 'info', badge: 'bg-primary/15 text-primary-text ring-primary/30', text: 'text-primary-text' },
};

type PropsTarjeta = {
  aviso: Aviso;
  onCerrar: (id: number) => void;
  onPausa: (id: number) => void;
  onReanudar: (id: number) => void;
};

function Tarjeta({ aviso, onCerrar, onPausa, onReanudar }: PropsTarjeta) {
  const encima = useRef({ cursor: false, foco: false });
  // La barra se pausa (CSS) con el temporizador y vuelve a empezar con él al reanudar.
  const [pausado, setPausado] = useState(false);
  const [ciclo, setCiclo] = useState(0);
  const tonoConfig = ICONO_TONO[aviso.tono];
  const actualizar = (parte: Partial<typeof encima.current>) => {
    encima.current = { ...encima.current, ...parte };
    if (encima.current.cursor || encima.current.foco) {
      onPausa(aviso.id);
      setPausado(true);
    } else {
      onReanudar(aviso.id);
      setPausado(false);
      setCiclo((n) => n + 1);
    }
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
      className={`nx-toast pointer-events-auto relative flex items-start gap-3.5 rounded-2xl border border-panel-border bg-panel-fill/95 p-4 pr-2 shadow-2xl backdrop-blur-xl transition-shadow duration-media ${CLASE_TONO[aviso.tono]}`}
    >
      <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${tonoConfig.badge}`} aria-hidden="true">
        <Icono nombre={tonoConfig.icon} tamano="sm" />
      </span>
      <div className="relative flex-1 min-w-0 pt-0.5">
        <h4 className={`text-sm font-semibold leading-snug ${tonoConfig.text}`}>
          {aviso.titulo || TITULO_DEFECTO[aviso.tono]}
        </h4>
        <p className="mt-1 text-sm text-label leading-relaxed break-words">
          {aviso.texto}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onCerrar(aviso.id)}
        aria-label="Cerrar aviso"
        className="relative inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full text-label transition-colors hover:bg-surface-container hover:text-body-text focus-visible:ring-2 focus-visible:ring-primary -my-2"
      >
        <Icono nombre="cerrar" tamano="sm" ariaHidden={true} />
        <span className="sr-only">Cerrar aviso</span>
      </button>
      <span className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full" aria-hidden="true">
        <span
          key={ciclo}
          className={`block h-full w-full ${BARRA_TONO[aviso.tono]} nx-toast-progress ${pausado ? 'nx-toast-progress-pausada' : ''}`}
        />
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
      // Todos los avisos, también los de error, se cierran solos (decisión del dueño, 2026-11-18).
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
