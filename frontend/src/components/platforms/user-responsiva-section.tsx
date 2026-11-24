'use client';

import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import type { ResponsivaData, Session } from '@/lib/types';
import { Icono } from '../icono';
import { Spinner } from '../ui';

export function UserResponsivaSection({
  session,
}: {
  session: Session | null;
  onVolver?: () => void;
}) {
  const responsivaAsync = useAsync<ResponsivaData>(() => api.responsiva(), []);
  const data = responsivaAsync.data;
  const loading = responsivaAsync.loading;

  if (!session) return null;

  const responsivaFirmada = session.responsiva_firmada !== false;

  const fechaFirma = session?.responsiva_firmada_at || data?.firmada_at;
  const fechaFormateada = (() => {
    if (!fechaFirma) return null;
    try {
      const d = new Date(fechaFirma);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full gap-4 max-w-5xl mx-auto pb-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-panel-border/80 bg-gradient-to-r from-superficie via-superficie to-superficie-hundida shadow-1">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary-text shadow-xs">
            <Icono nombre="documento" tamano="md" />
          </span>
          <div>
            <h2 className="text-base font-bold text-body-text leading-tight">
              Carta Responsiva de Activos y Herramientas
            </h2>
            <p className="text-xs text-texto-secundario mt-0.5">
              Documento normativo de asignación y compromiso de uso responsable de TI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {responsivaFirmada ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success/10 border border-success/30 text-success-text shadow-xs">
              <Icono nombre="exito" tamano="xs" />
              <span>Firmada digitalmente</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning/10 border border-warning/30 text-warning-text shadow-xs">
              <Icono nombre="aviso" tamano="xs" />
              <span>Pendiente de firma</span>
            </span>
          )}
        </div>
      </div>

      {/* Tarjeta de metadatos y estado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-panel-border bg-superficie shadow-xs">
          <span className="text-xs font-semibold text-label block uppercase tracking-wider">Usuario Titular</span>
          <p className="text-sm font-bold text-body-text mt-1 truncate">{session.name}</p>
          <p className="text-xs text-texto-secundario truncate">{session.email}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-panel-border bg-superficie shadow-xs">
          <span className="text-xs font-semibold text-label block uppercase tracking-wider">Rol de Sistema</span>
          <p className="text-sm font-bold text-body-text mt-1 capitalize">{session.role}</p>
          <p className="text-xs text-texto-secundario">Autenticación {session.auth_source || 'Corporativa'}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-panel-border bg-superficie shadow-xs">
          <span className="text-xs font-semibold text-label block uppercase tracking-wider">Versión de Documento</span>
          <p className="text-sm font-bold text-body-text mt-1">v{data?.version || session.responsiva_version || '1.0'}</p>
          <p className="text-xs text-texto-secundario">Marco de Seguridad TI</p>
        </div>
        <div className="p-3.5 rounded-xl border border-panel-border bg-superficie shadow-xs">
          <span className="text-xs font-semibold text-label block uppercase tracking-wider">Fecha de Firma</span>
          <p className="text-sm font-bold text-body-text mt-1">
            {fechaFormateada ? fechaFormateada : responsivaFirmada ? 'Firmada digitalmente' : 'No registrada'}
          </p>
          <p className="text-xs text-texto-secundario">
            {responsivaFirmada ? (fechaFormateada ? 'Aceptada digitalmente' : 'Firma válida registrada') : 'Requiere confirmación'}
          </p>
        </div>
      </div>

      {/* Plataformas y áreas asignadas */}
      {data?.plataformas && data.plataformas.length > 0 ? (
        <div className="p-4 rounded-xl border border-panel-border bg-superficie shadow-xs space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-label block">
            Plataformas y herramientas amparadas bajo esta responsiva
          </span>
          <div className="flex flex-wrap gap-2">
            {data.plataformas.map((p) => (
              <span
                key={`plat-${p.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-panel-border bg-fondo text-body-text text-xs font-semibold shadow-xs"
              >
                <Icono nombre="plataformas" tamano="xs" ariaHidden={true} className="text-primary-text" />
                <span>{p.name}</span>
                {p.area_name ? <span className="text-label font-normal">({p.area_name})</span> : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Contenido normativo */}
      <div className="rounded-xl border border-panel-border bg-superficie shadow-xs overflow-hidden flex flex-col flex-1 min-h-75">
        <div className="px-4 py-3 bg-superficie-hundida/70 border-b border-panel-border flex items-center justify-between">
          <span className="text-xs font-bold text-body-text uppercase tracking-wider">
            Términos y Lineamientos de Uso
          </span>
          <span className="text-xs text-texto-secundario">Documento Institucional</span>
        </div>
        <div className="p-5 text-xs text-body-text space-y-4 overflow-y-auto leading-relaxed max-h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner label="Cargando términos de la responsiva…" />
            </div>
          ) : data?.contenido ? (
            <div className="whitespace-pre-line font-mono text-xs bg-fondo/50 p-4 rounded-lg border border-panel-border">
              {data.contenido}
            </div>
          ) : (
            <>
              <p>
                El presente documento establece las condiciones y compromisos de uso responsable de los activos de tecnologías de información, cuentas y plataformas institucionales asignadas a la persona colaboradora para el óptimo desempeño de sus actividades.
              </p>
              <div className="space-y-2 border-l-2 border-primary/40 pl-3">
                <p className="font-semibold text-body-text">1. Confidencialidad y Resguardo:</p>
                <p className="text-texto-secundario">
                  Las credenciales, cuentas y accesos otorgados son estrictamente personales e intransferibles. Queda prohibido divulgarlas, compartirlas o utilizarlas para fines no vinculados con la operación institucional.
                </p>
              </div>
              <div className="space-y-2 border-l-2 border-primary/40 pl-3">
                <p className="font-semibold text-body-text">2. Seguridad de la Información:</p>
                <p className="text-texto-secundario">
                  El usuario se compromete a no eludir las políticas de autenticación multifactor, no almacenar contraseñas en navegadores o equipos no corporativos y reportar de manera inmediata cualquier incidente o anomalía detectada.
                </p>
              </div>
              <div className="space-y-2 border-l-2 border-primary/40 pl-3">
                <p className="font-semibold text-body-text">3. Revocación y Auditoría:</p>
                <p className="text-texto-secundario">
                  Los accesos asignados están sujetos a auditoría periódica y podrán ser revocados inmediatamente ante separación del puesto, cambio de funciones o por incumplimiento de los lineamientos de ciberseguridad.
                </p>
              </div>
            </>
          )}
        </div>
        <div className="p-3.5 bg-superficie-hundida/50 border-t border-panel-border flex items-center justify-between text-xs text-texto-secundario">
          <span>Vivaro Launchpad Security & Governance</span>
          <span className="font-semibold text-primary-text">Cumplimiento ISO 27001 / SOC 2</span>
        </div>
      </div>
    </div>
  );
}

