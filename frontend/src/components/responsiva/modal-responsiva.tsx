'use client';

/**
 * Modal integrado de primer ingreso: Firma de Carta Responsiva de TI.
 * - Funciona directamente sobre el portal (dentro de Marco) sin crear una página nueva ni desarmar el layout.
 * - Presenta el documento de responsiva y la lista de herramientas asignadas.
 * - Desbloquea el portal y activa el aprovisionamiento al momento de firmar.
 * - Cumple con la regla DIS-068 de diálogo único utilizando Modal de form.tsx.
 */

import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { ResponsivaData, Session } from '@/lib/types';
import { useAsync } from '@/lib/use-async';
import { Button, Modal } from '../form';
import { Icono } from '../icono';
import { RegionDeAnuncios } from '../region-de-anuncios';
import { useToast } from '../toast';
import { ErrorNote, Spinner } from '../ui';

const ID_TEXTO_CARTA = 'texto-carta-responsiva';

const AVISO_OBLIGATORIA = 'Para ingresar al portal debes aceptar la responsiva o cerrar sesión.';
const ESPACIO_DURO = '\u00A0';

const CARACTERES_CAPTCHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generarCodigoCaptcha(): string {
  let codigo = '';
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * CARACTERES_CAPTCHA.length);
    codigo += CARACTERES_CAPTCHA[idx];
  }
  return codigo;
}

export function ModalResponsiva({
  session,
  onFirmado,
  onCerrarSimulacion,
}: {
  session: Session;
  onFirmado: () => void;
  onCerrarSimulacion?: () => void;
}) {
  const { avisar } = useToast();
  const responsivaAsync = useAsync<ResponsivaData>(() => api.responsiva(), []);
  const [aceptado, setAceptado] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState('');
  const [captchaCode, setCaptchaCode] = useState<string>(() => generarCodigoCaptcha());
  const [captchaInput, setCaptchaInput] = useState('');

  const regenerarCaptcha = useCallback(() => {
    setCaptchaCode(generarCodigoCaptcha());
    setCaptchaInput('');
  }, []);

  const data = responsivaAsync.data;
  const loading = responsivaAsync.loading;
  const errorCarga = responsivaAsync.error;

  const captchaValido = captchaInput.trim().toUpperCase() === captchaCode;
  const puedeFirmar = aceptado && captchaValido && !firmando && !loading;

  async function handleFirmar() {
    if (!puedeFirmar) return;
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
    if (onCerrarSimulacion) {
      onCerrarSimulacion();
      return;
    }
    avisar('warning', 'Debes leer y aceptar la responsiva para usar el portal, o puedes cerrar sesión.', 'Firma requerida');
    // DIS-100: con el mismo texto React no toca el DOM y el lector no lo repite;
    // un espacio duro alterno (invisible) cambia el nodo en cada intento.
    setAnuncio((previo) =>
      `${AVISO_OBLIGATORIA}${previo.endsWith(ESPACIO_DURO) ? '' : ESPACIO_DURO}`);
  }

  return (
    <>
      <Modal
        title={data?.titulo || 'Carta Responsiva de Uso de Activos de Información'}
        icon="escudo"
        size="3xl"
        onClose={handleIntentoCerrar}
        cerrable={Boolean(onCerrarSimulacion)}
        describedBy={data?.contenido ? ID_TEXTO_CARTA : undefined}
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row items-center justify-between gap-3">
            {onCerrarSimulacion ? (
              <Button
                type="button"
                variant="secondary"
                onClick={onCerrarSimulacion}
                className="w-full sm:w-auto"
              >
                Cerrar vista previa
              </Button>
            ) : (
              <a
                href="/logout"
                title="Cerrar sesión actual"
                className="min-h-12 min-w-12 px-4 inline-flex items-center justify-center rounded-xl border border-panel-border/80 bg-surface-container/60 hover:bg-superficie text-label hover:text-body-text text-xs font-semibold transition-colors"
              >
                <Icono nombre="cerrar" tamano="xs" ariaHidden={true} className="mr-1.5" />
                <span>Cerrar sesión</span>
              </a>
            )}

            <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
              <Button
                onClick={handleFirmar}
                disabled={!puedeFirmar}
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
          </div>
        }
      >
        <div className="space-y-5 text-body-text">
          {/* Dentro del diálogo: el fondo queda inert y una región fuera no se anunciaría. */}
          <RegionDeAnuncios mensaje={anuncio} />
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
                  <span className="text-xs font-semibold text-label">Lectura obligatoria</span>
                </div>

                <div
                  id={ID_TEXTO_CARTA}
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
                    className="nexus-checkbox mt-0.5 cursor-pointer"
                  />
                  <span>
                    He leído, comprendo y acepto los términos, responsabilidades y lineamientos establecidos en la presente carta responsiva para el uso de mis cuentas y plataformas institucionales.
                  </span>
                </label>
              </div>

              {/* Verificación de seguridad anti-error (Captcha) */}
              <div className="p-4 rounded-xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 min-h-5">
                  <span className="text-xs font-bold text-body-text flex items-center gap-1.5 uppercase tracking-wider">
                    <Icono nombre="escudo-ok" tamano="xs" className="text-primary-text" />
                    <span>Confirmación de Seguridad</span>
                  </span>
                  {captchaValido ? (
                    <span className="text-xs font-semibold text-success-text flex items-center gap-1.5">
                      <Icono nombre="exito" tamano="xs" />
                      <span>Código verificado correctamente</span>
                    </span>
                  ) : captchaInput.length > 0 ? (
                    <span className="text-xs font-semibold text-warning-text flex items-center gap-1.5">
                      <Icono nombre="aviso" tamano="xs" />
                      <span>Código no coincide</span>
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Visualización del captcha */}
                  <div className="flex items-center gap-2">
                    <div
                      data-testid="captcha-display"
                      className="relative flex items-center justify-center px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 select-none shadow-xs overflow-hidden"
                    >
                      <span aria-hidden="true" className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:6px_6px]" />
                      <span
                        data-testid="captcha-word"
                        className="relative font-mono font-black text-lg tracking-widest text-primary-text select-none"
                      >
                        {captchaCode}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={regenerarCaptcha}
                      title="Generar otro código"
                      aria-label="Generar otro código de verificación"
                      className="inline-flex min-h-11 items-center px-3 py-1.5 rounded-xl border border-panel-border/80 bg-superficie hover:bg-surface-container text-xs font-semibold text-texto-secundario hover:text-body-text transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
                    >
                      <span>Nuevo código</span>
                    </button>
                  </div>

                  {/* Input del captcha */}
                  <div className="flex-1 min-w-0">
                    <label htmlFor="input-captcha-responsiva" className="sr-only">
                      Ingresa el código de seguridad
                    </label>
                    <input
                      id="input-captcha-responsiva"
                      type="text"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                      placeholder={`Escribe ${captchaCode} para confirmar…`}
                      maxLength={8}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full h-11 px-3.5 rounded-xl border border-panel-border bg-fondo text-xs font-mono font-bold uppercase tracking-wider text-body-text placeholder:text-texto-secundario/60 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal focus:border-primary focus:bg-superficie focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
