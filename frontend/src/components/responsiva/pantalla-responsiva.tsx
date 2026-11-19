'use client';

/**
 * Pantalla bloqueante de primer ingreso: Firma de Carta Responsiva de TI.
 * - Bloquea la navegación hasta que el usuario lee y acepta formalmente el documento.
 * - Muestra las plataformas y áreas pre-asignadas sobre las cuales asume responsabilidad.
 * - Cumple con el sistema de tokens, WCAG (touch >= 48px), y anuncios de accesibilidad.
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import type { ResponsivaData, Session } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { Button } from '../form';
import { Icono } from '../icono';
import { RegionDeAnuncios } from '../region-de-anuncios';
import { useToast } from '../toast';
import { Badge, ErrorNote, Spinner } from '../ui';

export function PantallaResponsiva({
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
      avisar('success', 'Carta responsiva firmada correctamente. Bienvenido al portal.', 'Firma registrada');
      setAnuncio('Carta responsiva firmada exitosamente. Accediendo al portal.');
      onFirmado();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar la firma.';
      setErrorFirma(msg);
      avisar('error', msg, 'Error');
    } finally {
      setFirmando(false);
    }
  }

  return (
    <div className="min-h-screen bg-fondo text-body-text flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <RegionDeAnuncios mensaje={anuncio} />

      {/* Cabecera institucional */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-panel-border/80">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 text-primary-text flex items-center justify-center shrink-0">
            <Icono nombre="escudo" tamano="md" ariaHidden={true} />
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold leading-tight">
              Portal de Accesos Institucionales
            </p>
            <p className="text-xs text-label">Seguridad de la Información y Cumplimiento Normativo</p>
          </div>
        </div>

        <a
          href="/logout"
          title="Cerrar sesión actual"
          className="min-h-12 min-w-12 px-3 inline-flex items-center justify-center rounded-xl border border-panel-border/80 bg-surface-container/60 hover:bg-superficie text-label hover:text-body-text text-xs font-semibold transition-colors"
        >
          <Icono nombre="cerrar" tamano="xs" ariaHidden={true} className="mr-1.5" />
          <span>Cerrar sesión</span>
        </a>
      </header>

      {/* Contenido principal de la responsiva */}
      <main className="max-w-4xl w-full mx-auto my-6 flex-1 flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <Spinner label="Cargando términos de la responsiva…" />
          </div>
        ) : errorCarga ? (
          <div className="p-6">
            <ErrorNote message={errorCarga} />
          </div>
        ) : (
          <>
            {/* Tarjeta de bienvenida e identidad del usuario */}
            <div className="p-4 sm:p-5 rounded-2xl border border-panel-border/80 bg-surface-container/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary-text block mb-0.5">
                  Primer Inicio de Sesión
                </span>
                <p className="text-sm font-bold text-body-text">
                  Hola, {session.name || session.email}
                </p>
                <p className="text-xs text-label mt-0.5">
                  Para habilitar tu acceso al portal y a tus plataformas de trabajo, es necesario que leas y aceptes la presente carta responsiva.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge tone="primary">Versión {data?.version || '1.0'}</Badge>
                <Badge tone="slate">{session.role}</Badge>
              </div>
            </div>

            {/* Plataformas y áreas pre-asignadas */}
            {data && (data.plataformas.length > 0 || data.areas.length > 0) ? (
              <div className="p-4 rounded-xl border border-panel-border/80 bg-surface-container/40 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-label block">
                  Activos y herramientas asignadas a tu cuenta
                </span>
                <div className="flex flex-wrap gap-2">
                  {data.areas.map((a) => (
                    <span
                      key={`area-${a.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary-text text-xs font-semibold"
                    >
                      <Icono nombre="areas" tamano="xs" ariaHidden={true} />
                      <span>Área: {a.name}</span>
                    </span>
                  ))}
                  {data.plataformas.map((p) => (
                    <span
                      key={`plat-${p.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-panel-border bg-superficie text-body-text text-xs font-semibold"
                    >
                      <Icono nombre="plataformas" tamano="xs" ariaHidden={true} className="text-label" />
                      <span>{p.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Documento de la Carta Responsiva */}
            <div className="flex-1 flex flex-col rounded-2xl border border-panel-border/80 bg-superficie shadow-xs overflow-hidden">
              <div className="p-3.5 bg-surface-container/60 border-b border-panel-border/80 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-body-text flex items-center gap-2">
                  <Icono nombre="documento" tamano="xs" ariaHidden={true} className="text-primary-text" />
                  <span>{data?.titulo || 'Carta Responsiva de Uso de Activos de Información'}</span>
                </span>
                <span className="text-2xs font-semibold text-label">Lectura obligatoria</span>
              </div>

              <div
                tabIndex={0}
                aria-label="Texto de la carta responsiva"
                className="p-5 overflow-y-auto max-h-72 sm:max-h-80 text-xs sm:text-sm text-body-text leading-relaxed space-y-3 outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-pre-line"
              >
                {data?.contenido}
              </div>
            </div>

            {errorFirma ? <ErrorNote message={errorFirma} /> : null}

            {/* Casilla de aceptación y botón de firma */}
            <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4">
              <label
                htmlFor="chk-responsiva"
                className="min-h-12 flex items-start gap-3 cursor-pointer select-none text-xs sm:text-sm text-body-text font-medium"
              >
                <input
                  id="chk-responsiva"
                  type="checkbox"
                  checked={aceptado}
                  onChange={(e) => setAceptado(e.target.checked)}
                  className="mt-0.5 size-5 rounded border-panel-border focus:ring-primary focus:ring-offset-0 cursor-pointer"
                />
                <span>
                  He leído, comprendo y acepto los términos, responsabilidades y lineamientos establecidos en la presente carta responsiva para el uso de mis cuentas y plataformas asignadas.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
                <Button
                  onClick={handleFirmar}
                  disabled={!aceptado || firmando}
                  className="w-full sm:w-auto"
                >
                  <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
                  <span>{firmando ? 'Registrando firma…' : 'Firmar y acceder al portal'}</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Pie de página */}
      <footer className="max-w-4xl w-full mx-auto pt-4 border-t border-panel-border/80 text-center text-2xs text-label">
        <p>Al firmar, se registra la marca de tiempo y la dirección IP con fines de auditoría y cumplimiento normativo.</p>
      </footer>
    </div>
  );
}
