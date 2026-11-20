/**
 * Trazos SVG de las tarjetas de indicador (DIS-112): anillo (uno o dos segmentos) y medidor
 * de semicírculo. Decorativos (`aria-hidden`): el dato también va en texto en la tarjeta.
 *
 * Todo trazo mide 100 unidades (`pathLength`), así el llenado es `100 - largo` sin importar el
 * radio. El estado final es el que se ve siempre; la animación de llenado (`nx-ind-llenar`,
 * components.css) parte de vacío y se apaga con `prefers-reduced-motion`.
 */

import { useId } from 'react';
import type { DesgloseIndicador } from '@/lib/types';

/** Largo de todo trazo (`pathLength`). */
const LARGO = 100;
/** Hueco visible entre los dos segmentos, en unidades de `LARGO`. */
const HUECO = 3;
/** Centro y lado del lienzo del anillo. */
const CENTRO = 50;

/** Degradado de dos tonos del indicador: las clases toman el color de los tokens. */
function Degradado({ id, horizontal }: { id: string; horizontal?: boolean }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2={horizontal ? '0' : '1'}>
        <stop offset="0" className="nx-ind__tono-fin" />
        <stop offset="1" className="nx-ind__tono" />
      </linearGradient>
    </defs>
  );
}

/** Largo visible de cada segmento; el hueco solo existe si ambas partes tienen algo. */
function segmentos({ parte, resto }: DesgloseIndicador, dos: boolean): [number, number] {
  const total = parte + resto;
  if (total <= 0) return [0, 0];
  const fraccion = parte / total;
  if (!dos) return [fraccion * LARGO, 0];
  const hueco = parte > 0 && resto > 0 ? HUECO : 0;
  return [Math.max(fraccion * LARGO - hueco, 0), Math.max((1 - fraccion) * LARGO - hueco, 0)];
}

export function AnilloIndicador({
  desglose,
  grosor,
  dosSegmentos = false,
}: {
  desglose: DesgloseIndicador;
  /** Grosor del trazo en unidades del lienzo de 100. */
  grosor: number;
  dosSegmentos?: boolean;
}) {
  const id = `nx-ind-${useId().replace(/:/g, '')}`;
  const radio = CENTRO - grosor / 2;
  const [largoParte, largoResto] = segmentos(desglose, dosSegmentos);
  const giro = (desglose.parte / (desglose.parte + desglose.resto || 1)) * 360;

  return (
    <svg className="nx-ind__aro" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <Degradado id={id} />
      <circle className="nx-ind__pista" cx={CENTRO} cy={CENTRO} r={radio} strokeWidth={grosor} />
      {largoParte > 0 ? (
        <circle
          className="nx-ind__valor"
          cx={CENTRO}
          cy={CENTRO}
          r={radio}
          strokeWidth={grosor}
          stroke={`url(#${id})`}
          pathLength={LARGO}
          strokeDasharray={`${LARGO} ${LARGO}`}
          strokeDashoffset={LARGO - largoParte}
        />
      ) : null}
      {dosSegmentos && largoResto > 0 ? (
        <circle
          className="nx-ind__resto"
          cx={CENTRO}
          cy={CENTRO}
          r={radio}
          strokeWidth={grosor}
          pathLength={LARGO}
          strokeDasharray={`${LARGO} ${LARGO}`}
          strokeDashoffset={LARGO - largoResto}
          transform={`rotate(${giro} ${CENTRO} ${CENTRO})`}
        />
      ) : null}
    </svg>
  );
}

/** Semicírculo del medidor: de izquierda a derecha, sobre el eje horizontal. */
export function MedidorIndicador({ desglose }: { desglose: DesgloseIndicador }) {
  const id = `nx-ind-${useId().replace(/:/g, '')}`;
  const radio = 44;
  const trazo = `M ${CENTRO - radio} 52 A ${radio} ${radio} 0 0 1 ${CENTRO + radio} 52`;
  const [largoParte] = segmentos(desglose, false);

  return (
    <svg className="nx-ind__semi" viewBox="0 0 100 56" aria-hidden="true" focusable="false">
      <Degradado id={id} horizontal />
      <path className="nx-ind__pista" d={trazo} strokeWidth={9} />
      {largoParte > 0 ? (
        <path
          className="nx-ind__valor"
          d={trazo}
          strokeWidth={9}
          stroke={`url(#${id})`}
          pathLength={LARGO}
          strokeDasharray={`${LARGO} ${LARGO}`}
          strokeDashoffset={LARGO - largoParte}
        />
      ) : null}
    </svg>
  );
}
