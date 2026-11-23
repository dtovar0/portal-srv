'use client';

/**
 * Formulario de solicitud de acceso (DIS-013, `POST /access-requests`,
 * contrato `solicitudes.md` 1.1):
 * - Explicación detallada de la herramienta y sus políticas de uso.
 * - Nivel entre los solicitables y justificación opcional de hasta 500 caracteres.
 * - Casilla de confirmación obligatoria para uso responsable.
 * - Verificación de seguridad anti-error (CAPTCHA por plataforma).
 *
 * Errores: los del contrato con mensaje propio (`request-errors.ts`); el error
 * del campo va ligado con `aria-describedby` y recibe el foco.
 */

import { useCallback, useState } from 'react';
import { requestsApi } from '@/lib/access/requests';
import type { AccessLevel, AccessRequest, CatalogItem } from '@/lib/access/types';
import { Button, Field, Modal, Radio, TextArea } from '../form';
import { Icono } from '../icono';
import { FieldErrorNote, FieldHint, describedBy } from '../platforms/field-notes';
import { Card } from '../ui';
import { useToast } from '../toast';
import { NIVELES } from './access-status-badge';
import {
  JUSTIFICACION_MAX, MENSAJE_JUSTIFICACION_LARGA, MENSAJES_SOLICITUD, describeRequestError,
} from './request-errors';

const FORM_ID = 'solicitud-acceso';
const JUSTIFICACION_ID = 'solicitud-justificacion';
const CONTADOR_ID = 'solicitud-justificacion-contador';
const JUSTIFICACION_ERROR_ID = 'solicitud-justificacion-error';
const NIVEL_ERROR_ID = 'solicitud-nivel-error';
const CHECKBOX_ID = 'chk-solicitud-terminos';
const CAPTCHA_INPUT_ID = 'input-captcha-solicitud';

const DESCRIPCION_NIVEL: Record<AccessLevel, string> = {
  usuario: 'Uso habitual de la plataforma.',
  admin: 'Administración de la plataforma.',
};

const COLORES_CHIP_TOKENS = [
  'bg-primary text-texto-sobre-accion',
  'bg-brand text-texto-sobre-accion',
  'bg-accent text-texto-sobre-accion',
  'bg-accent-sky text-texto-sobre-accion',
  'bg-accent-violet text-texto-sobre-accion',
  'bg-accion text-texto-sobre-accion',
  'bg-barra-lateral text-barra-lateral-texto',
];

function obtenerColorIniciales(id: number): string {
  return COLORES_CHIP_TOKENS[id % COLORES_CHIP_TOKENS.length];
}

function obtenerIniciales(nombre: string): string {
  const norm = nombre.toLowerCase().trim();
  if (norm.startsWith('slack')) return 'SL';
  if (norm.startsWith('github')) return 'GH';
  if (norm.startsWith('google')) return 'GW';
  if (norm.startsWith('jira')) return 'JR';
  if (norm.startsWith('aws')) return 'AW';
  if (norm.startsWith('vaultwarden')) return 'VW';
  if (norm.startsWith('sap')) return 'SP';
  if (norm.startsWith('datadog')) return 'DD';
  const palabras = nombre.trim().split(/\s+/);
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
}

const CARACTERES_CAPTCHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generarCodigoCaptcha(): string {
  let codigo = '';
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * CARACTERES_CAPTCHA.length);
    codigo += CARACTERES_CAPTCHA[idx];
  }
  return codigo;
}

export function RequestFormModal({
  item,
  onClose,
  onCreated,
}: {
  item: CatalogItem;
  onClose: () => void;
  /** Recibe la solicitud que devolvió el servidor. */
  onCreated: (request: AccessRequest) => void;
}) {
  const niveles = item.requestable_levels;
  const [level, setLevel] = useState<AccessLevel | null>(niveles[0] ?? null);
  const [justification, setJustification] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [captchaCode, setCaptchaCode] = useState<string>(() => generarCodigoCaptcha());
  const [captchaInput, setCaptchaInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const toast = useToast();

  const regenerarCaptcha = useCallback(() => {
    setCaptchaCode(generarCodigoCaptcha());
    setCaptchaInput('');
  }, []);

  const captchaValido = captchaInput.trim().toUpperCase() === captchaCode;
  const colorClase = obtenerColorIniciales(item.platform.id);
  const iniciales = obtenerIniciales(item.platform.name);

  // El servidor recorta la justificación: se cuenta y valida igual.
  const texto = justification.trim();
  const excede = texto.length > JUSTIFICACION_MAX;
  const errorJustificacion = fields.justification ?? (excede ? MENSAJE_JUSTIFICACION_LARGA : undefined);

  const puedeEnviar = !sending && niveles.length > 0 && accepted && captchaValido;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    if (!level || excede || !accepted || !captchaValido) {
      setError(MENSAJES_SOLICITUD.validacion);
      toast.avisar(
        'warning',
        !accepted
          ? 'Debes confirmar la casilla de responsabilidad institucional.'
          : !captchaValido
            ? 'El código de confirmación no coincide.'
            : MENSAJES_SOLICITUD.validacion,
        'Solicitud incompleta',
      );
      setFields({
        ...(level ? {} : { level: 'Elige un nivel.' }),
        ...(!accepted ? { accepted: 'Debes confirmar la casilla de responsabilidad.' } : {}),
        ...(!captchaValido ? { captcha: 'Ingresa el código de confirmación mostrado.' } : {}),
      });
      if (excede) document.getElementById(JUSTIFICACION_ID)?.focus();
      else if (!accepted) document.getElementById(CHECKBOX_ID)?.focus();
      else if (!captchaValido) document.getElementById(CAPTCHA_INPUT_ID)?.focus();
      return;
    }
    setSending(true);
    setError(null);
    setFields({});
    try {
      const result = await requestsApi.create({
        platform_id: item.platform.id,
        level,
        ...(texto ? { justification: texto } : {}),
      });
      onCreated(result.request);
    } catch (err) {
      const view = describeRequestError(err);
      setError(view.message);
      toast.avisar('error', view.message, 'Error al solicitar');
      setFields(view.fields);
      if (view.fields.justification) document.getElementById(JUSTIFICACION_ID)?.focus();
      setSending(false);
    }
  }

  return (
    <Modal
      title={`Solicitar acceso a ${item.platform.name}`}
      icon="solicitudes"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            aria-label={sending ? 'Enviando…' : 'Enviar solicitud'}
            disabled={!puedeEnviar}
          >
            <Icono nombre="aprobar" tamano="sm" ariaHidden={true} className="mr-1.5" />
            {sending ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate aria-busy={sending} className="space-y-5">
        {/* Ficha explicativa de la herramienta */}
        <div className="rounded-2xl border border-panel-border/80 bg-surface-container/40 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-12 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${colorClase}`}
              aria-hidden="true"
            >
              {iniciales}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="truncate text-base font-bold text-body-text">
                  {item.platform.name}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary-text border border-primary/20">
                  {item.area.name}
                </span>
              </div>
              {item.my_level ? (
                <p className="mt-0.5 text-xs text-label">
                  {`Nivel actual: ${NIVELES[item.my_level]}. Si se aprueba, reemplaza tus permisos vigentes.`}
                </p>
              ) : null}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-body-text leading-relaxed">
            {item.platform.description || 'Herramienta corporativa autorizada para la gestión y operación de procesos institucionales.'}
          </p>

          <div className="rounded-xl border border-panel-border/70 bg-superficie p-3 flex items-start gap-2.5 text-xs text-label">
            <Icono nombre="info" tamano="sm" className="text-primary-text shrink-0 mt-0.5" />
            <span>
              Esta solicitud será evaluada por el responsable del área <strong>{item.area.name}</strong>. Una vez aprobada, recibirás tus credenciales y acceso directo en el portal.
            </span>
          </div>
        </div>

        {/* Nivel de acceso solicitado */}
        <fieldset {...describedBy([NIVEL_ERROR_ID, fields.level])}>
          <legend className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-label">
            Nivel solicitado
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {niveles.map((nivel) => (
              <Card
                as="label"
                variant="selectable"
                key={nivel}
                className="flex items-start gap-3 p-3 cursor-pointer"
              >
                <Radio
                  name="nivel"
                  value={nivel}
                  checked={level === nivel}
                  onChange={() => setLevel(nivel)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-body-text">{NIVELES[nivel]}</span>
                  <span className="block text-xs text-label">{DESCRIPCION_NIVEL[nivel]}</span>
                </span>
              </Card>
            ))}
          </div>
          <FieldErrorNote id={NIVEL_ERROR_ID} message={fields.level} />
        </fieldset>

        {/* Justificación opcional */}
        <div>
          <Field label="Justificación (opcional)">
            <TextArea
              id={JUSTIFICACION_ID}
              rows={3}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Explica para qué necesitas acceso a esta herramienta…"
              {...describedBy([JUSTIFICACION_ERROR_ID, errorJustificacion], [CONTADOR_ID, true])}
            />
          </Field>
          <FieldHint id={CONTADOR_ID}>
            {`${texto.length}/${JUSTIFICACION_MAX} caracteres`}
          </FieldHint>
          <FieldErrorNote id={JUSTIFICACION_ERROR_ID} message={errorJustificacion} />
        </div>

        {/* Checkbox de confirmación y uso responsable */}
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
          <label
            htmlFor={CHECKBOX_ID}
            className="min-h-12 flex items-start gap-3 cursor-pointer select-none text-xs sm:text-sm text-body-text font-medium"
          >
            <input
              id={CHECKBOX_ID}
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="nexus-checkbox mt-0.5 cursor-pointer size-4 rounded border-panel-border text-primary focus:ring-primary shrink-0"
            />
            <span>
              Confirmo que requiero acceso a <strong>{item.platform.name}</strong> para mis funciones laborales y me comprometo al uso responsable según las políticas institucionales de seguridad y confidencialidad.
            </span>
          </label>
          <FieldErrorNote id="solicitud-checkbox-error" message={fields.accepted} />
        </div>

        {/* Confirmación de seguridad (Captcha por plataforma) */}
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
              <label htmlFor={CAPTCHA_INPUT_ID} className="sr-only">
                Ingresa el código de seguridad
              </label>
              <input
                id={CAPTCHA_INPUT_ID}
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
          <FieldErrorNote id="solicitud-captcha-error" message={fields.captcha} />
        </div>

        {error ? <div className="sr-only">{error}</div> : null}
      </form>
    </Modal>
  );
}
