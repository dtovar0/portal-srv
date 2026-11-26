'use client';

/**
 * Plataformas que se aprovisionan por conector (DIS-022, F-CON-01): nombre,
 * área, si ya tienen configuración (`has_connector`) y accesos vigentes.
 * "Configurar" abre el panel del conector bajo la lista.
 *
 * Tabla en escritorio y tarjeta en móvil con `ResponsiveList` (DIS-014).
 */

import type { Platform } from '@/lib/types';
import { Button } from '../form';
import { Icono } from '../icono';
import { Badge } from '../ui';
import { ETIQUETA_CELDA, ResponsiveList, ResponsiveRow } from '../access/responsive-list';

const COLUMNAS = 'md:grid-cols-[minmax(0,2.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.5fr)]';

export const ENCABEZADOS_CONECTORES = ['Plataforma', 'Conector', 'Accesos vigentes', 'Acciones'];

const porNombre = (a: Platform, b: Platform) => a.name.localeCompare(b.name, 'es');

/**
 * Plataformas de la lista, por nombre: las que ya tienen conector y las de tipo `conector`
 * aunque falte configurarlo. Desde FNC-196 cualquier plataforma puede tener conector (DIS-139).
 */
export function plataformasConConector(plataformas: Platform[]): Platform[] {
  return plataformas
    .filter((p) => p.has_connector || p.integration_type === 'conector')
    .sort(porNombre);
}

/** Candidatas de «Nuevo»: cualquier plataforma que aún no tenga conector, por nombre (DIS-139). */
export function plataformasSinConector(plataformas: Platform[]): Platform[] {
  return plataformas.filter((p) => !p.has_connector).sort(porNombre);
}

export function botonConfigurarId(platformId: number): string {
  return `conector-configurar-${platformId}`;
}

export function ConnectorList({
  plataformas,
  seleccionada,
  onSelect,
}: {
  plataformas: Platform[];
  seleccionada: number | null;
  onSelect: (plataforma: Platform) => void;
}) {
  return (
    <ResponsiveList columns={COLUMNAS} headers={ENCABEZADOS_CONECTORES} label="Plataformas con conector">
      {plataformas.map((p) => (
        <ResponsiveRow
          key={p.id}
          columns={COLUMNAS}
          label={`Conector de ${p.name}`}
          interactive={true}
          selected={seleccionada === p.id}
          onClick={() => onSelect(p)}
        >
          <div className="min-w-0">
            <dt className={ETIQUETA_CELDA}>Plataforma</dt>
            <dd className="break-words font-semibold text-body-text">{p.name}</dd>
            <dd className="text-sm text-label">{p.area_name ?? '—'}</dd>
          </div>
          <div>
            <dt className={ETIQUETA_CELDA}>Conector</dt>
            <dd>
              {p.has_connector
                ? <Badge tone="success">Configurado</Badge>
                : <Badge tone="warning">Sin configurar</Badge>}
            </dd>
          </div>
          <div>
            <dt className={ETIQUETA_CELDA}>Accesos vigentes</dt>
            <dd className="text-sm tabular-nums text-body-text">{p.active_grants}</dd>
          </div>
          <div>
            <dt className={ETIQUETA_CELDA}>Acciones</dt>
            <dd>
              <Button
                id={botonConfigurarId(p.id)}
                variant={seleccionada === p.id ? 'fila-primario' : 'fila'}
                aria-label={`Configurar el conector de ${p.name}`}
                aria-current={seleccionada === p.id || undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(p);
                }}
                className="nx-btn-toolbar !px-2.5 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icono nombre="ajustes" tamano="sm" ariaHidden={true} />
                <span>Configurar</span>
              </Button>
            </dd>
          </div>
        </ResponsiveRow>
      ))}
    </ResponsiveList>
  );
}
