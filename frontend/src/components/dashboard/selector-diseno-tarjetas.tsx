'use client';

/**
 * Selector del diseño de las tarjetas del dashboard (DIS-112): botón de icono «Diseño de
 * tarjetas» (barra superior, DIS-113) que abre un `Modal` con los tres diseños como vista previa; «Aplicar» confirma la elección y
 * `Cancelar` o cerrar la descartan.
 */

import { useId, useState } from 'react';
import { Button } from '../button';
import { Modal } from '../form';
import { Icono } from '../icono';
import { BotonIcono } from '../marco/boton-icono';
import { DISENOS, DISENOS_TARJETA, type DisenoTarjeta } from './diseno-tarjetas';
import { TarjetaIndicador } from './tarjeta-indicador';

/** Datos de ejemplo de la vista previa (no son datos del portal). */
const EJEMPLO = { valor: 12, desglose: { parte: 9, resto: 3 } } as const;

export function SelectorDisenoTarjetas({
  actual,
  onAplicar,
}: {
  actual: DisenoTarjeta;
  onAplicar: (diseno: DisenoTarjeta) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState<DisenoTarjeta>(actual);
  const idBase = useId();

  const abrir = () => {
    setElegido(actual);
    setAbierto(true);
  };
  const aplicar = () => {
    onAplicar(elegido);
    setAbierto(false);
  };

  return (
    <>
      <BotonIcono icono="ajustes" etiqueta="Diseño de tarjetas" aria-haspopup="dialog" onClick={abrir} />
      {abierto ? (
        <Modal
          title="Diseño de tarjetas"
          icon="ajustes"
          size="3xl"
          onClose={() => setAbierto(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={aplicar}>Aplicar</Button>
            </>
          }
        >
          <p className="text-sm text-label">Elige cómo se muestran los contadores del dashboard.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {DISENOS_TARJETA.map((diseno) => {
              const idTitulo = `${idBase}-${diseno}`;
              return (
                <button
                  key={diseno}
                  type="button"
                  aria-pressed={elegido === diseno}
                  aria-labelledby={idTitulo}
                  onClick={() => setElegido(diseno)}
                  autoFocus={diseno === actual}
                  className="nx-ind-opcion foco-visible grid min-h-12 gap-3 rounded-xl p-3 text-left"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span id={idTitulo} className="text-sm font-bold text-body-text">
                      {DISENOS[diseno].nombre}
                    </span>
                    {elegido === diseno ? (
                      <span className="nx-ind-opcion__marca flex shrink-0 items-center gap-1 text-xs font-bold" aria-hidden="true">
                        <Icono nombre="aprobar" tamano="sm" />
                        Elegido
                      </span>
                    ) : null}
                  </span>
                  <span className="pointer-events-none" aria-hidden="true">
                    <TarjetaIndicador indicador="areas" valor={EJEMPLO.valor} desglose={EJEMPLO.desglose} diseno={diseno} />
                  </span>
                  <span className="text-xs text-label">{DISENOS[diseno].descripcion}</span>
                </button>
              );
            })}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
