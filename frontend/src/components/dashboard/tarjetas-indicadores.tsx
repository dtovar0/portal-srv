/**
 * Fila de contadores del dashboard (DIS-112): una tarjeta por indicador con el diseño activo.
 * 1 columna en móvil, 2 en tableta, 3 en escritorio y 5 en pantallas anchas.
 */

import type { ClaveIndicador, Stats } from '@/lib/types';
import type { DisenoTarjeta } from './diseno-tarjetas';
import { TarjetaIndicador } from './tarjeta-indicador';

export interface ContadorIndicador {
  indicador: ClaveIndicador;
  valor: number;
}

export function TarjetasIndicadores({
  contadores,
  desglose,
  diseno,
}: {
  contadores: ContadorIndicador[];
  desglose: Stats['desglose'];
  diseno: DisenoTarjeta;
}) {
  return (
    <div className="grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {contadores.map(({ indicador, valor }) => (
        <TarjetaIndicador
          key={indicador}
          indicador={indicador}
          valor={valor}
          desglose={desglose?.[indicador]}
          diseno={diseno}
        />
      ))}
    </div>
  );
}
