/**
 * Tarjeta de un contador del dashboard (DIS-112) en uno de tres diseños aprobados:
 * «Anillo con brillo», «Dos segmentos» (título como badge) y «Medidor».
 *
 * El color de cada indicador sale de la clase `nx-ind--*` (tokens `--color-indicador-*`); el
 * componente no fija ningún valor visual. Sin desglose válido (backend anterior a FNC-164) la
 * tarjeta muestra solo la cifra, sin anillo ni porcentaje. Total 0 = anillo vacío y «0 %».
 */

import type { ClaveIndicador, DesgloseIndicador } from '@/lib/types';
import { Icono } from '../icono';
import { AnilloIndicador, MedidorIndicador } from './anillo-indicador';
import type { DisenoTarjeta } from './diseno-tarjetas';
import { desgloseValido, formatoCifra, INDICADORES, textoPorcentaje } from './indicadores';

/** Grosor del trazo de cada diseño (unidades del lienzo de 100). */
const GROSOR_BRILLO = 10;
const GROSOR_SEGMENTOS = 10;

interface Props {
  indicador: ClaveIndicador;
  valor: number;
  desglose?: DesgloseIndicador;
  diseno: DisenoTarjeta;
}

function CajaIcono({ icono, className }: { icono: (typeof INDICADORES)[ClaveIndicador]['icono']; className: string }) {
  return (
    <span className={`nx-ind__icono grid shrink-0 place-items-center ${className}`} aria-hidden="true">
      <Icono nombre={icono} tamano="sm" />
    </span>
  );
}

/** Solo la cifra: sin desglose no hay anillo ni porcentaje. */
function SoloCifra({ indicador, valor }: { indicador: ClaveIndicador; valor: number }) {
  const def = INDICADORES[indicador];
  return (
    <div className="relative flex items-center gap-3">
      <CajaIcono icono={def.icono} className="nx-ind__icono--grande size-12 rounded-xl" />
      <div className="min-w-0">
        <p className="nx-ind__etq text-xs font-bold uppercase tracking-wide">{def.etiqueta}</p>
        <p className="mt-1 text-3xl font-extrabold leading-none tabular-nums text-body-text">{formatoCifra(valor)}</p>
      </div>
    </div>
  );
}

/** Las dos partes para el lector de pantalla (el anillo y el porcentaje son visuales). */
function ResumenPartes({ indicador, desglose }: { indicador: ClaveIndicador; desglose: DesgloseIndicador }) {
  const { partes } = INDICADORES[indicador];
  return (
    <span className="sr-only">
      {formatoCifra(desglose.parte)} {partes[0]}, {formatoCifra(desglose.resto)} {partes[1]}.
    </span>
  );
}

/** Porcentaje con la parte que mide, también para el lector: «92 % activas». */
function Porcentaje({ indicador, desglose, className }: { indicador: ClaveIndicador; desglose: DesgloseIndicador; className: string }) {
  return (
    <strong className={className}>
      {textoPorcentaje(desglose)}
      <span className="sr-only"> {INDICADORES[indicador].partes[0]}</span>
    </strong>
  );
}

function Brillo({ indicador, valor, desglose }: { indicador: ClaveIndicador; valor: number; desglose: DesgloseIndicador }) {
  const def = INDICADORES[indicador];
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3">
      <ResumenPartes indicador={indicador} desglose={desglose} />
      <div className="grid min-w-32 flex-1 gap-1.5">
        <div className="flex items-center gap-2">
          <CajaIcono icono={def.icono} className="size-7 rounded-lg" />
          <p title={def.etiqueta} className="nx-ind__etq truncate text-xs font-bold uppercase tracking-wide">{def.etiqueta}</p>
        </div>
        <p className="text-3xl font-extrabold leading-none tabular-nums text-body-text">{formatoCifra(valor)}</p>
        <p className="text-xs text-label">
          {formatoCifra(desglose.parte)} {def.partes[0]}
        </p>
      </div>
      <div className="nx-ind__anillo nx-ind__anillo--brillo">
        <AnilloIndicador desglose={desglose} grosor={GROSOR_BRILLO} />
        <Porcentaje indicador={indicador} desglose={desglose} className="nx-ind__pct relative text-base font-extrabold tabular-nums" />
      </div>
    </div>
  );
}

function Segmentos({ indicador, valor, desglose }: { indicador: ClaveIndicador; valor: number; desglose: DesgloseIndicador }) {
  const def = INDICADORES[indicador];
  const partes: [string, number, string][] = [
    [def.partes[0], desglose.parte, 'nx-ind__punto'],
    [def.partes[1], desglose.resto, 'nx-ind__punto nx-ind__punto--resto'],
  ];
  return (
    <div className="relative grid gap-3.5">
      <ResumenPartes indicador={indicador} desglose={desglose} />
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="nx-ind__anillo nx-ind__anillo--segmentos">
          <AnilloIndicador desglose={desglose} grosor={GROSOR_SEGMENTOS} dosSegmentos />
          <span className="nx-ind__icono-aro relative grid place-items-center">
            <Icono nombre={def.icono} tamano="lg" />
          </span>
        </div>
        <div className="grid min-w-24 flex-1 gap-1">
          <span
            title={def.etiqueta}
            className="badge-titulo inline-flex w-fit max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide"
          >
            {def.etiqueta}
          </span>
          <p className="text-3xl font-extrabold leading-none tabular-nums text-body-text">{formatoCifra(valor)}</p>
          <p className="text-xs font-bold tabular-nums text-label">
            {textoPorcentaje(desglose)}
            <span className="sr-only"> {def.partes[0]}</span>
          </p>
        </div>
      </div>
      <ul className="nx-ind__leyenda grid gap-1.5 pt-3" aria-hidden="true">
        {partes.map(([nombre, cantidad, claseCita]) => (
          <li key={nombre} className="flex items-center gap-2 text-xs text-label">
            <span className={`${claseCita} size-2.5 rounded-sm`} aria-hidden="true" />
            <span className="min-w-0 flex-1">{nombre}</span>
            <b className="font-bold tabular-nums text-body-text">{formatoCifra(cantidad)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Medidor({ indicador, valor, desglose }: { indicador: ClaveIndicador; valor: number; desglose: DesgloseIndicador }) {
  const def = INDICADORES[indicador];
  return (
    <div className="relative grid justify-items-center gap-1.5 text-center">
      <ResumenPartes indicador={indicador} desglose={desglose} />
      <div className="nx-ind__medidor">
        <MedidorIndicador desglose={desglose} />
        <CajaIcono icono={def.icono} className="nx-ind__icono--medidor rounded-xl" />
      </div>
      <p className="nx-ind__etq text-xs font-bold uppercase tracking-wide">{def.etiqueta}</p>
      <p className="text-3xl font-extrabold leading-none tabular-nums text-body-text">{formatoCifra(valor)}</p>
      <p className="text-xs text-label">
        <span className="font-bold tabular-nums">{textoPorcentaje(desglose)}</span> {def.partes[0]}
      </p>
    </div>
  );
}

export function TarjetaIndicador({ indicador, valor, desglose, diseno }: Props) {
  const def = INDICADORES[indicador];
  const reparto = desgloseValido(desglose, valor);
  return (
    <div
      role="group"
      aria-label={def.etiqueta}
      data-diseno={reparto ? diseno : 'solo-cifra'}
      className={`nx-ind ${def.clase} relative min-w-0 overflow-hidden rounded-2xl border border-panel-border bg-panel-fill p-4 shadow-1`}
    >
      {!reparto ? <SoloCifra indicador={indicador} valor={valor} /> : null}
      {reparto && diseno === 'brillo' ? <Brillo indicador={indicador} valor={valor} desglose={reparto} /> : null}
      {reparto && diseno === 'segmentos' ? <Segmentos indicador={indicador} valor={valor} desglose={reparto} /> : null}
      {reparto && diseno === 'medidor' ? <Medidor indicador={indicador} valor={valor} desglose={reparto} /> : null}
    </div>
  );
}
