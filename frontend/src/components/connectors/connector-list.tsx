'use client';

/**
 * Conectores (DIS-022, F-CON-01; DIS-140: independientes, `GET /connectors`): nombre,
 * tipo, host, plataforma (o «Sin asociar») y estado de la credencial.
 * "Configurar" abre el panel del conector bajo la lista.
 *
 * Tabla en escritorio y tarjeta en móvil con `ResponsiveList` (DIS-014).
 */

import type { ConnectorItem } from '@/lib/access/types';
import { Button } from '../form';
import { Icono } from '../icono';
import { Badge } from '../ui';
import { ETIQUETA_CELDA, ResponsiveList, ResponsiveRow } from '../access/responsive-list';
import { ESTADOS_CREDENCIAL, TIPOS_CONECTOR, esTipoConocido } from './connector-catalog';

const COLUMNAS =
  'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)]';

export const ENCABEZADOS_CONECTORES = ['Nombre', 'Tipo', 'Host', 'Plataforma', 'Credencial', 'Acciones'];

export function botonConfigurarId(connectorId: number): string {
  return `conector-configurar-${connectorId}`;
}

export function ConnectorList({
  conectores,
  seleccionado,
  onSelect,
}: {
  conectores: ConnectorItem[];
  seleccionado: number | null;
  onSelect: (conector: ConnectorItem) => void;
}) {
  return (
    <ResponsiveList columns={COLUMNAS} headers={ENCABEZADOS_CONECTORES} label="Conectores">
      {conectores.map((c) => {
        const credencial = ESTADOS_CREDENCIAL[c.credential_status];
        return (
          <ResponsiveRow
            key={c.id}
            columns={COLUMNAS}
            label={`Conector ${c.name}`}
            interactive={true}
            selected={seleccionado === c.id}
            onClick={() => onSelect(c)}
          >
            <div className="min-w-0">
              <dt className={ETIQUETA_CELDA}>Nombre</dt>
              <dd className="break-words font-semibold text-body-text">{c.name}</dd>
            </div>
            <div>
              <dt className={ETIQUETA_CELDA}>Tipo</dt>
              <dd className="text-sm text-body-text">{esTipoConocido(c.type) ? TIPOS_CONECTOR[c.type] : c.type}</dd>
            </div>
            <div className="min-w-0">
              <dt className={ETIQUETA_CELDA}>Host</dt>
              <dd className="break-words text-sm text-body-text">{c.host}</dd>
            </div>
            <div className="min-w-0">
              <dt className={ETIQUETA_CELDA}>Plataforma</dt>
              <dd>
                {c.platform
                  ? <span className="break-words text-sm text-body-text">{c.platform.name}</span>
                  : <Badge tone="warning">Sin asociar</Badge>}
              </dd>
            </div>
            <div>
              <dt className={ETIQUETA_CELDA}>Credencial</dt>
              <dd>
                <Badge tone={credencial?.tono ?? 'slate'}>{credencial?.texto ?? c.credential_status}</Badge>
              </dd>
            </div>
            <div>
              <dt className={ETIQUETA_CELDA}>Acciones</dt>
              <dd>
                <Button
                  id={botonConfigurarId(c.id)}
                  variant={seleccionado === c.id ? 'fila-primario' : 'fila'}
                  aria-label={`Configurar el conector ${c.name}`}
                  aria-current={seleccionado === c.id || undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(c);
                  }}
                  className="nx-btn-toolbar !px-2.5 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icono nombre="ajustes" tamano="sm" ariaHidden={true} />
                  <span>Configurar</span>
                </Button>
              </dd>
            </div>
          </ResponsiveRow>
        );
      })}
    </ResponsiveList>
  );
}
