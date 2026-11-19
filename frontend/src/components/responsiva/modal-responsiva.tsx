'use client';

/**
 * Modal integrado de primer ingreso: Firma de Carta Responsiva de TI.
 * - Funciona directamente sobre el portal (dentro de Marco) sin crear una página nueva ni desarmar el layout.
 * - Presenta el documento de responsiva y la lista de herramientas asignadas.
 * - Desbloquea el portal y activa el aprovisionamiento al momento de firmar.
 * - Cumple con la regla DIS-068 de diálogo único utilizando Modal de form.tsx.
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import type { ResponsivaData, Session } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { Button, Modal } from '../form';
import { Icono } from '../icono';
import { RegionDeAnuncios } from '../region-de-anuncios';
import { useToast } from '../toast';
import { Badge, ErrorNote, Spinner } from '../ui';

export function ModalResponsiva({
  session,
  onFirmado,
}: {
  session: Session;
  onFirmado: () => void;
}) {
  const { avisar } = useToast();
  const responsivaAsync = useAsync<ResponsivaData>(() => api.responsiva(), []);
  const [aceptado, setAceptado] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState('');

  const data = responsivaAsync.data;
  const loading = responsivaAsync.loading;
  const errorCarga = responsivaAsync.error;

  async function handleFirmar() {
    if (!aceptado) {
      setAnuncio('Debes marcar la casilla para confirmar que aceptas la responsiva.');
      return;
    }

    setFirmando(true);
    setErrorFirma(null);
    try {
      await api.firmarResponsiva();
      avisar('success', 'Carta responsiva firmada. Bienvenido a tu portal.', 'Firma registrada');
      setAnuncio('Carta responsiva firmada con éxito. Accediendo al portal.');
      onFirmado();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar la firma.';
      setErrorFirma(msg);
      avisar('error', msg, 'Error');
    } finally {
      setFirmando(false);
    }
  }

  function handleIntentoCerrar() {
    avisar('warning', 'Debes leer y aceptar la responsiva para usar el portal, o puedes cerrar sesión.', 'Firma requerida');
    setAnuncio('Para ingresar al portal debes aceptar la responsiva o cerrar sesión.');
  }

  return (
    <>
      <RegionDeAnuncios mensaje={anuncio} />
      <Modal
        title={data?.titulo || 'Carta Responsiva de Uso de Activos de Información'}
        icon="escudo"
        size="3xl"
        onClose={handleIntentoCerrar}
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <a
              href="/logout"
              title="Cerrar sesión actual"
              className="min-h-12 min-w-12 px-4 inline-flex items-center justify-center rounded-xl border border-panel-border/80 bg-surface-container/60 hover:bg-superficie text-label hover:text-body-text text-xs font-semibold transition-colors"
            >
              <Icono nombre="cerrar" tamano="xs" ariaHidden={true} className="mr-1.5" />
              <span>Cerrar sesión</span>
            </a>

            <Button
              onClick={handleFirmar}
              disabled={!aceptado || firmando || loading}
              className="w-full sm:w-auto"
            >
              <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
              <span>
                {firmando
                  ? 'Registrando firma…'
                  : data?.es_aprobacion
                    ? 'Firmar y activar accesos'
                    : 'Firmar y acceder al portal'}
              </span>
            </Button>
          </div>
        }
      >
        <div className="space-y-5 text-body-text">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Spinner label="Cargando términos de la responsiva…" />
            </div>
          ) : errorCarga ? (
            <div className="py-4">
              <ErrorNote message={errorCarga} />
            </div>
          ) : (
            <>
              {/* Saludo y contexto */}
              <div className="p-4 rounded-xl border border-panel-border/80 bg-surface-container/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-text mb-0.5">
                    {data?.es_aprobacion
                      ? 'Nuevos Accesos Aprobados • Confirmación Requerida'
                      : 'Primer Ingreso • Cumplimiento Normativo'}
                  </p>
                  <p className="text-sm font-semibold text-body-text">
                    Hola, {session.name || session.email}
                  </p>
                  <p className="text-xs text-label mt-0.5">
                    {data?.es_aprobacion
                      ? 'Tus solicitudes de acceso a las siguientes herramientas han sido aprobadas. Por favor lee y confirma la responsiva para activar su uso en tu cuenta.'
                      : 'Para activar tus accesos a las plataformas institucionales, lee y confirma la responsiva de seguridad.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone="primary">v{data?.version || '1.0'}</Badge>
                  <Badge tone="slate">{session.role}</Badge>
                </div>
              </div>

              {/* Plataformas y áreas asignadas */}
              {data && (data.plataformas.length > 0 || data.areas.length > 0) ? (
                <div className="p-4 rounded-xl border border-panel-border/80 bg-surface-container/40 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-label block">
                    {data?.es_aprobacion
                      ? 'Plataformas recientemente aprobadas'
                      : 'Activos y herramientas pre-asignadas a tu usuario'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {data.areas.map((a) => (
                      <span
                        key={`area-${a.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary-text text-xs font-semibold"
                      >
                        <Icono nombre="areas" tamano="xs" ariaHidden={true} />
                        <span>Área: {a.name}</span>
                      </span>
                    ))}
                    {data.plataformas.map((p) => (
                      <span
                        key={`plat-${p.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-panel-border bg-superficie text-body-text text-xs font-semibold"
                      >
                        <Icono nombre="plataformas" tamano="xs" ariaHidden={true} className="text-label" />
                        <span>{p.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Contenido de la carta responsiva */}
              <div className="rounded-xl border border-panel-border/80 bg-superficie shadow-xs overflow-hidden">
                <div className="p-3 bg-surface-container/60 border-b border-panel-border/80 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-body-text flex items-center gap-2">
                    <Icono nombre="documento" tamano="xs" ariaHidden={true} className="text-primary-text" />
                    <span>Términos y Obligaciones</span>
                  </span>
                  <span className="text-2xs font-semibold text-label">Lectura obligatoria</span>
                </div>

                <div
                  tabIndex={0}
                  aria-label="Texto de la carta responsiva"
                  className="p-4 sm:p-5 overflow-y-auto max-h-56 sm:max-h-64 text-xs sm:text-sm text-body-text leading-relaxed whitespace-pre-line outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-b-xl"
                >
                  {data?.contenido}
                </div>
              </div>

              {errorFirma ? <ErrorNote message={errorFirma} /> : null}

              {/* Casilla de aceptación */}
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                <label
                  htmlFor="chk-responsiva-modal"
                  className="min-h-12 flex items-start gap-3 cursor-pointer select-none text-xs sm:text-sm text-body-text font-medium"
                >
                  <input
                    id="chk-responsiva-modal"
                    type="checkbox"
                    checked={aceptado}
                    onChange={(e) => setAceptado(e.target.checked)}
                    className="mt-0.5 size-5 rounded border-panel-border focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <span>
                    He leído, comprendo y acepto los términos, responsabilidades y lineamientos establecidos en la presente carta responsiva para el uso de mis cuentas y plataformas institucionales.
                  </span>
                </label>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
