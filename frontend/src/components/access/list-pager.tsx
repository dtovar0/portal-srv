/**
 * Paginación de una lista paginada del contrato (`Paginated`, DIS-014):
 * "Anterior" y "Siguiente"; se anuncia solo el cambio de página. Sin otra página,
 * no se muestra.
 */

import { Button } from '../form';
import { Icono } from '../icono';

export function totalPaginas(total: number, perPage: number): number {
  return perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1;
}

export function ListPager({
  page,
  perPage,
  total,
  label,
  onChange,
}: {
  page: number;
  perPage: number;
  total: number;
  /** Nombre accesible de la navegación, p. ej. "Páginas de mis solicitudes". */
  label: string;
  onChange: (page: number) => void;
}) {
  const paginas = totalPaginas(total, perPage);
  if (paginas <= 1) return null;

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-panel-border bg-panel-fill p-3 shadow-xs"
    >
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="min-h-12 min-w-12 gap-1.5 px-4 shadow-xs"
      >
        <Icono nombre="chevron-izq" tamano="sm" ariaHidden={true} />
        <span>Anterior</span>
      </Button>
      <p className="text-sm font-semibold text-label">Página {page} de {paginas} · {total} en total</p>
      {/* Solo la página: un refresco que cambie el total no se anuncia. */}
      <span className="sr-only" aria-live="polite">Página {page}</span>
      <Button
        variant="secondary"
        disabled={page >= paginas}
        onClick={() => onChange(page + 1)}
        className="min-h-12 min-w-12 gap-1.5 px-4 shadow-xs"
      >
        <span>Siguiente</span>
        <Icono nombre="chevron-der" tamano="sm" ariaHidden={true} />
      </Button>
    </nav>
  );
}

