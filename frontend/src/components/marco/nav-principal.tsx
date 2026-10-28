'use client';

/**
 * Lista de navegación con secciones, iconos y contador (DIS-078). La usan la barra lateral
 * (expandida o colapsada) y el cajón móvil (DIS-025). Colapsada: solo iconos, con el nombre en
 * `aria-label` y `title`; el activo se marca con `aria-current` y los tokens `--color-activo-*`.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icono } from '../icono';
import { useSession } from '../session-provider';
import { seccionesVisibles } from './nav-items';

export interface NavPrincipalProps {
  onNavigate?: () => void;
  colapsada?: boolean;
  /** Contador por `href` (p. ej. aprobaciones pendientes); solo se muestra si es mayor que cero. */
  contadores?: Readonly<Record<string, number>>;
}

export function NavPrincipal({ onNavigate, colapsada = false, contadores = {} }: NavPrincipalProps) {
  const { session } = useSession();
  const pathname = usePathname();
  if (!session) return null;

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Principal">
      {seccionesVisibles(session.permissions).map(({ seccion, entradas }, indice) => (
        <div key={seccion} className="flex flex-col gap-0.5">
          {colapsada ? (
            indice > 0 ? <hr className="mx-3 my-2 border-borde-sutil" /> : null
          ) : (
            <p className={`px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-texto-secundario ${indice > 0 ? 'pt-5' : 'pt-1'}`}>
              {seccion}
            </p>
          )}
          {entradas.map((item) => {
            const activo = pathname === item.href;
            const contador = contadores[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? 'page' : undefined}
                aria-label={colapsada ? item.label : undefined}
                title={colapsada ? item.label : undefined}
                onClick={onNavigate}
                className={`relative flex min-h-11 items-center gap-3 rounded-control px-3.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                  colapsada ? 'justify-center' : ''
                } ${
                  activo
                    ? 'bg-activo-fondo font-semibold text-activo-texto'
                    : 'font-medium text-navegacion hover:bg-surface-container hover:text-body-text active:bg-surface-container'
                }`}
              >
                <Icono nombre={item.icono} />
                <span className={colapsada ? 'sr-only' : 'min-w-0 flex-1 truncate'}>{item.label}</span>
                {contador > 0 ? (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-pastilla bg-error-solid px-1.5 text-xs font-bold text-on-error ${
                      colapsada ? 'absolute right-1.5 top-1' : ''
                    }`}
                  >
                    <span aria-hidden="true">{contador}</span>
                    <span className="sr-only">{`, ${contador} pendientes`}</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
