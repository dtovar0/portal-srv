/** Columnas de la tabla de Administrar plataformas (DIS-010, DIS-035). */

import type { Platform } from '@/lib/types';
import { enlaceSeguro } from '@/lib/enlace-seguro';
import { atributoTexto, variablesChipPlataforma } from '@/lib/color-legible';
import { variablesCss } from '@/lib/variables-css';
import type { DataColumn } from '../data-table';
import { Badge } from '../ui';

export function columnasPlataformas({
  selectedPlatformIds,
  allSelected,
  someSelected,
  toggleSelectAll,
  togglePlatform,
}: {
  selectedPlatformIds: Set<number>;
  allSelected: boolean;
  someSelected: boolean;
  toggleSelectAll: () => void;
  togglePlatform: (id: number) => void;
}): DataColumn<Platform>[] {
  return [
    {
      key: 'seleccion',
      header: (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={toggleSelectAll}
            aria-label="Seleccionar todas las plataformas"
            className="nexus-checkbox cursor-pointer"
          />
        </div>
      ),
      headerClassName: 'w-12 px-4 py-2 select-none text-center',
      cellClassName: 'w-12 px-4 py-1.5 text-center',
      cell: (platform) => {
        const isSelected = selectedPlatformIds.has(platform.id);
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => togglePlatform(platform.id)}
              aria-label={`Seleccionar ${platform.name}`}
              className="nexus-checkbox cursor-pointer"
            />
          </div>
        );
      },
    },
    {
      key: 'plataforma',
      header: 'Plataforma',
      headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
      cellClassName: 'px-6 py-1.5',
      cell: (platform) => (
        <div className="flex items-center gap-2">
          <span
            className="nx-chip-solid grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold shadow-xs"
            data-texto={atributoTexto(platform.bg_color)}
            style={variablesCss(variablesChipPlataforma(platform.bg_color))}
            aria-hidden
          >
            {platform.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="truncate font-medium">{platform.name}</span>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Área',
      headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
      cellClassName: 'px-6 py-1.5 text-label',
      cell: (platform) => platform.area_name ?? '—',
    },
    {
      key: 'enlace',
      header: 'Enlace',
      headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
      cellClassName: 'max-w-xs px-6 py-1.5',
      cell: (platform) =>
        enlaceSeguro(platform.direct_link) ? (
          <span className="block truncate text-label" title={platform.direct_link ?? undefined}>
            {platform.direct_link}
          </span>
        ) : (
          <Badge tone="warning">Sin enlace</Badge>
        ),
    },
    {
      key: 'estado',
      header: 'Estado',
      headerClassName: 'px-6 py-2 font-black tracking-wider text-primary-text select-none',
      cellClassName: 'px-6 py-1.5',
      cell: (platform) => (
        <Badge tone={platform.status === 'Activo' ? 'success' : 'warning'}>{platform.status}</Badge>
      ),
    },
  ];
}
