'use client';

/**
 * Dual Picklist para asignación de áreas (DIS-019).
 * - Columna izquierda: Áreas disponibles con filtro de búsqueda.
 * - Columna derecha: Áreas asignadas con filtro de búsqueda.
 * - Transferencia con un solo clic: al pulsar sobre un área disponible se asigna de inmediato.
 *   Si el área cuenta con plataformas vinculadas, solicita confirmación con código de seguridad (captcha).
 * - Al pulsar sobre un área asignada, se quita de inmediato con un clic.
 * - Sin botones intermedios ni scroll lateral: diseño limpio de 2 columnas responsivas.
 */

import { useId, useMemo, useRef, useState } from 'react';
import type { Area, AreaRef } from '@/lib/types';
import { Button } from '../form';
import { Icono } from '../icono';
import { useFocoTrasMover } from '@/lib/use-foco-tras-mover';
import { RegionDeAnuncios } from '../region-de-anuncios';
import { ErrorNote, Spinner } from '../ui';

const CAPTCHA_WORDS = ['CONFIRMAR', 'ACCESO', 'SEGURIDAD', 'PLATAFORMA', 'AUTORIZAR'];

export interface AreaDualPicklistProps {
  id?: string;
  areas: (AreaRef | Area)[];
  selected: number[];
  onChange: (ids: number[]) => void;
  error?: string;
  loading?: boolean;
  loadError?: string | null;
  empty?: string;
}

export function AreaDualPicklist({
  id: propId,
  areas,
  selected,
  onChange,
  error,
  loading = false,
  loadError = null,
  empty = 'No hay áreas disponibles.',
}: AreaDualPicklistProps) {
  const generatedId = useId();
  const baseId = propId || generatedId;
  const { refLista, enfocarTras } = useFocoTrasMover();
  const [anuncio, setAnuncio] = useState('');
  /** Botón que abrió el desafío: el foco vuelve ahí al cancelar. */
  const origenRef = useRef<HTMLElement | null>(null);

  function anunciar(area: AreaRef | Area, asignada: boolean, total: number) {
    const cuenta = `${total} ${total === 1 ? 'asignada' : 'asignadas'}`;
    setAnuncio(`«${area.name}» ${asignada ? 'asignada' : 'quitada'}, ${cuenta}`);
  }

  // Filtros de búsqueda en cada columna
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchAssigned, setSearchAssigned] = useState('');

  // Desafío de confirmación (Captcha) para áreas con plataformas
  const [pendingArea, setPendingArea] = useState<(AreaRef | Area) | null>(null);
  const [captchaWord, setCaptchaWord] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // Divide las áreas en disponibles y asignadas
  const availableAreas = useMemo(() => {
    return areas
      .filter((a) => !selected.includes(a.id))
      .filter((a) => a.name.toLowerCase().includes(searchAvailable.trim().toLowerCase()));
  }, [areas, selected, searchAvailable]);

  const assignedAreas = useMemo(() => {
    return areas
      .filter((a) => selected.includes(a.id))
      .filter((a) => a.name.toLowerCase().includes(searchAssigned.trim().toLowerCase()));
  }, [areas, selected, searchAssigned]);

  function tienePlataformas(area: AreaRef | Area): boolean {
    const pCount = (area as Area).platforms_count;
    if (typeof pCount === 'number' && pCount > 0) return true;
    const plats = (area as unknown as { platforms?: unknown[] }).platforms;
    if (Array.isArray(plats) && plats.length > 0) return true;
    return false;
  }

  function plataformasCount(area: AreaRef | Area): number {
    return (area as Area).platforms_count ?? 0;
  }

  /** Texto de la insignia de plataformas (describe el botón sin cambiar su nombre accesible). */
  function textoPlataformas(area: AreaRef | Area): string {
    const n = plataformasCount(area);
    if (n <= 0) return 'Contiene plataformas vinculadas';
    return `Contiene ${n} ${n === 1 ? 'plataforma vinculada' : 'plataformas vinculadas'}`;
  }

  function transferirArea(area: AreaRef | Area, origen?: HTMLElement) {
    origenRef.current = origen ?? null;
    if (tienePlataformas(area)) {
      // Iniciar desafío de seguridad
      const randomIndex = Math.floor(Math.random() * CAPTCHA_WORDS.length);
      const chosenWord = CAPTCHA_WORDS[randomIndex] || 'CONFIRMAR';
      setCaptchaWord(chosenWord);
      setCaptchaInput('');
      setCaptchaError(null);
      setPendingArea(area);
    } else {
      // Transferencia directa con un clic
      enfocarTras('disponibles', availableAreas, area.id);
      onChange([...selected, area.id]);
      anunciar(area, true, selected.length + 1);
    }
  }

  function confirmarTransferencia() {
    if (!pendingArea) return;
    if (captchaInput.trim().toUpperCase() !== captchaWord) {
      setCaptchaError(`Escribe exactamente la palabra "${captchaWord}".`);
      return;
    }
    enfocarTras('disponibles', availableAreas, pendingArea.id);
    onChange([...selected, pendingArea.id]);
    anunciar(pendingArea, true, selected.length + 1);
    setPendingArea(null);
    setCaptchaInput('');
    setCaptchaError(null);
  }

  function cancelarTransferencia() {
    setPendingArea(null);
    setCaptchaInput('');
    setCaptchaError(null);
    origenRef.current?.focus();
  }

  function quitarArea(area: AreaRef | Area) {
    enfocarTras('asignadas', assignedAreas, area.id);
    onChange(selected.filter((item) => item !== area.id));
    anunciar(area, false, selected.length - 1);
  }

  return (
    <div className="flex flex-col gap-3 w-full overflow-hidden" id={baseId}>
      <RegionDeAnuncios mensaje={anuncio} />
      {loading ? <Spinner /> : null}
      {loadError ? <ErrorNote message={loadError} /> : null}

      {/* Alerta de confirmación de seguridad si un área tiene plataformas */}
      {pendingArea ? (
        <div
          role="region"
          aria-label="Confirmación de acceso a plataformas"
          aria-labelledby={`${baseId}-captcha-titulo`}
          aria-describedby={`${baseId}-captcha-desc`}
          className="rounded-2xl border border-warning/50 bg-gradient-to-r from-warning/10 via-superficie to-surface-container p-4 shadow-1 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-warning/20 text-warning-text flex items-center justify-center shrink-0">
              <Icono nombre="aviso" tamano="md" ariaHidden={true} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <h4 id={`${baseId}-captcha-titulo`} className="text-sm font-bold text-body-text">
                Confirmación de acceso a plataformas
              </h4>
              <p id={`${baseId}-captcha-desc`} className="text-xs text-label leading-relaxed">
                El área <strong className="text-body-text font-bold">{pendingArea.name}</strong> otorga acceso a{' '}
                {plataformasCount(pendingArea) > 0 ? (
                  <span>{plataformasCount(pendingArea)} plataformas vinculadas</span>
                ) : (
                  <span>plataformas del sistema</span>
                )}
                . Para autorizar estos accesos, escribe el siguiente código de confirmación:
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-warning/30 bg-superficie">
            <span className="text-xs font-medium text-label">Palabra de seguridad:</span>
            <span
              data-testid="captcha-word"
              className="font-mono font-black text-sm tracking-widest text-warning-text px-3 py-1 bg-warning/10 rounded-lg border border-warning/40 text-center select-none shadow-xs"
            >
              {captchaWord}
            </span>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${baseId}-captcha-input`} className="block text-xs font-bold text-body-text">
              Escribe exactamente <strong className="text-warning-text">{captchaWord}</strong> para confirmar:
            </label>
            <input
              id={`${baseId}-captcha-input`}
              type="text"
              value={captchaInput}
              onChange={(e) => {
                setCaptchaInput(e.target.value);
                setCaptchaError(null);
              }}
              placeholder={`Escribe ${captchaWord}...`}
              className="w-full h-11 rounded-xl border border-panel-border bg-fondo px-4 text-xs font-mono font-bold text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              autoFocus
            />
            {captchaError ? (
              <p className="text-xs font-bold text-error-text">{captchaError}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={cancelarTransferencia}
              className="min-h-10 px-4 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={captchaInput.trim().toUpperCase() !== captchaWord}
              onClick={confirmarTransferencia}
              className="min-h-10 px-5 text-xs font-bold shadow-xs disabled:opacity-40"
            >
              Confirmar asignación
            </Button>
          </div>
        </div>
      ) : null}

      {/* Grid del Dual Picklist: 2 columnas limpias sin botones intermedios y sin scroll lateral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch w-full min-h-0">
        {/* COLUMNA IZQUIERDA: Áreas disponibles */}
        <div className="flex flex-col rounded-2xl border border-panel-border/80 bg-surface-container/60 p-3.5 shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-body-text flex items-center gap-1.5">
              <span>Áreas disponibles</span>
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-superficie text-label border border-panel-border/60">
              {availableAreas.length}
            </span>
          </div>

          <div className="relative mb-2.5">
            <input
              type="text"
              placeholder="Filtrar disponibles..."
              value={searchAvailable}
              onChange={(e) => setSearchAvailable(e.target.value)}
              aria-label="Filtrar áreas disponibles"
              className="w-full h-10 rounded-xl border border-panel-border bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
              <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
            </div>
          </div>

          <ul
            ref={refLista('disponibles')}
            tabIndex={-1}
            aria-label="Áreas disponibles"
            className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-60 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-panel-border"
          >
            {availableAreas.length === 0 ? (
              <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                {empty}
              </li>
            ) : (
              availableAreas.map((area) => {
                const hasPlat = tienePlataformas(area);
                return (
                  <li
                    key={area.id}
                    className="p-0 list-none"
                  >
                    <button
                      type="button"
                      data-item-id={area.id}
                      onClick={(e) => transferirArea(area, e.currentTarget)}
                      aria-label={`Asignar ${area.name}`}
                      aria-describedby={hasPlat ? `area-plat-${area.id}` : undefined}
                      title={`Haz clic para asignar ${area.name}`}
                      className="w-full min-h-12 min-w-12 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-panel-border bg-superficie hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] transition-all cursor-pointer select-none text-left shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-surface-container group-hover:bg-primary/10 group-hover:text-primary-text flex items-center justify-center shrink-0 text-label transition-colors">
                          <Icono nombre="areas" tamano="xs" ariaHidden={true} />
                        </div>
                        <span className="text-xs font-bold truncate text-body-text group-hover:text-primary-text transition-colors">
                          {area.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasPlat ? (
                          <span
                            id={`area-plat-${area.id}`}
                            title={textoPlataformas(area)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-warning/15 text-warning-text border border-warning/30"
                          >
                            <Icono nombre="escudo" tamano="xs" ariaHidden={true} />
                            <span aria-hidden="true">{plataformasCount(area) || ''}</span>
                            <span className="sr-only">{textoPlataformas(area)}</span>
                          </span>
                        ) : null}

                        <span className="size-7 rounded-lg bg-surface-container group-hover:bg-primary group-hover:text-superficie flex items-center justify-center text-label transition-all">
                          <Icono nombre="mas" tamano="xs" ariaHidden={true} />
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* COLUMNA DERECHA: Áreas asignadas */}
        <div className="flex flex-col rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/5 via-superficie to-primary/5 p-3.5 shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-text flex items-center gap-1.5">
              <span>Áreas asignadas</span>
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary-text border border-primary/40">
              {assignedAreas.length}
            </span>
          </div>

          <div className="relative mb-2.5">
            <input
              type="text"
              placeholder="Filtrar asignadas..."
              value={searchAssigned}
              onChange={(e) => setSearchAssigned(e.target.value)}
              aria-label="Filtrar áreas asignadas"
              className="w-full h-10 rounded-xl border border-primary/30 bg-fondo pl-9 pr-3 text-xs text-body-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-label" aria-hidden="true">
              <Icono nombre="buscar" tamano="xs" ariaHidden={true} />
            </div>
          </div>

          <ul
            ref={refLista('asignadas')}
            tabIndex={-1}
            aria-label="Áreas asignadas"
            className="outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 min-h-48 max-h-60 overflow-y-auto overflow-x-hidden space-y-1.5 p-1 rounded-xl bg-superficie/50 border border-primary/20"
          >
            {assignedAreas.length === 0 ? (
              <li className="flex items-center justify-center h-32 text-xs text-label italic p-4 text-center">
                Ninguna área asignada aún. Haz clic en las disponibles para agregar.
              </li>
            ) : (
              assignedAreas.map((area) => {
                const hasPlat = tienePlataformas(area);
                return (
                  <li
                    key={area.id}
                    className="p-0 list-none"
                  >
                    <button
                      type="button"
                      data-item-id={area.id}
                      onClick={() => quitarArea(area)}
                      aria-label={`Quitar ${area.name}`}
                      aria-describedby={hasPlat ? `area-plat-asignada-${area.id}` : undefined}
                      title={`Haz clic para quitar ${area.name}`}
                      className="w-full min-h-12 min-w-12 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-primary/30 bg-superficie hover:border-error/60 hover:bg-error/5 active:scale-[0.98] transition-all cursor-pointer select-none text-left shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-primary/10 text-primary-text group-hover:bg-error/10 group-hover:text-error-text flex items-center justify-center shrink-0 transition-colors">
                          <Icono nombre="exito" tamano="xs" ariaHidden={true} />
                        </div>
                        <span className="text-xs font-bold truncate text-body-text group-hover:text-error-text transition-colors">
                          {area.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasPlat ? (
                          <span
                            id={`area-plat-asignada-${area.id}`}
                            title="Acceso confirmado a plataformas"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-warning/15 text-warning-text border border-warning/30"
                          >
                            <Icono nombre="escudo" tamano="xs" ariaHidden={true} />
                            <span className="sr-only">Acceso confirmado a plataformas</span>
                          </span>
                        ) : null}

                        <span className="size-7 rounded-lg bg-surface-container group-hover:bg-error group-hover:text-superficie flex items-center justify-center text-label transition-all">
                          <Icono nombre="cerrar" tamano="xs" ariaHidden={true} />
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {error ? <p className="text-xs font-bold text-error-text mt-1">{error}</p> : null}
    </div>
  );
}
