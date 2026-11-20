'use client';

/**
 * Badge de estado (Activa/Inactiva) que conmuta el estado de un área o una plataforma (DIS-114).
 * Activa → pide confirmar y desactiva; Inactiva → activa directo. Quien no puede editar lo ve
 * como un badge normal. El resultado se avisa por toast y, si el servidor rechaza el cambio
 * (p. ej. 409 `grupos_en_inactivos`), el estado en pantalla no cambia.
 */

import { useState } from 'react';
import { mensajeDeError } from './areas/area-errors';
import { ConfirmDialog } from './form';
import { useToast } from './toast';
import { Badge } from './ui';

type Estado = 'Activo' | 'Inactivo';

const TEXTOS = {
  area: {
    sustantivo: 'área',
    articulo: 'el',
    titulos: { Activo: 'Área activada', Inactivo: 'Área desactivada' },
    consecuencia:
      'Sus plataformas quedarán inactivas y, si están configurados, sus grupos LDAP se moverán a inactivos.',
  },
  plataforma: {
    sustantivo: 'plataforma',
    articulo: 'la',
    titulos: { Activo: 'Plataforma activada', Inactivo: 'Plataforma desactivada' },
    consecuencia: 'Dejará de estar disponible para los usuarios en el catálogo.',
  },
} as const;

export function EstadoBadgeBoton({
  tipo,
  nombre,
  activo,
  editable,
  actualizar,
  onCambiado,
  className = '',
}: {
  tipo: 'area' | 'plataforma';
  nombre: string;
  activo: boolean;
  /** Mismo permiso que el botón Editar; sin él se muestra solo el badge. */
  editable: boolean;
  /** `PUT` del recurso con el estado nuevo; debe rechazar si el servidor rechaza. */
  actualizar: (status: Estado) => Promise<unknown>;
  /** Se llama tras un cambio guardado, para refrescar la lista. */
  onCambiado?: () => void;
  className?: string;
}) {
  const t = TEXTOS[tipo];
  const { avisar } = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const badge = (
    <Badge tone={activo ? 'success' : 'warning'} dot className={className}>
      {activo ? 'Activa' : 'Inactiva'}
    </Badge>
  );
  if (!editable) return badge;

  async function cambiar(status: Estado) {
    setOcupado(true);
    try {
      await actualizar(status);
      avisar(
        'success',
        `«${nombre}» quedó ${status === 'Activo' ? 'activa' : 'inactiva'}.`,
        t.titulos[status],
      );
      setConfirmando(false);
      onCambiado?.();
    } catch (err) {
      setConfirmando(false);
      avisar('error', mensajeDeError(err, `No se pudo cambiar el estado de «${nombre}».`), 'Error');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="nx-estado-boton foco-visible"
        aria-label={`${activo ? 'Desactivar' : 'Activar'} ${t.sustantivo} ${nombre}`}
        title={activo ? 'Pulsa para desactivar' : 'Pulsa para activar'}
        disabled={ocupado}
        onClick={(e) => {
          // El badge vive dentro de tarjetas y filas clicables: su clic no debe abrirlas.
          e.stopPropagation();
          if (activo) setConfirmando(true);
          else void cambiar('Activo');
        }}
      >
        {badge}
      </button>
      {confirmando ? (
        // El diálogo va en un portal, pero sus eventos suben por el árbol de React hasta la tarjeta.
        <span onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title={`Desactivar ${t.sustantivo}`}
            message={`¿Desactivar ${t.articulo} ${t.sustantivo} «${nombre}»? ${t.consecuencia}`}
            confirmLabel="Desactivar"
            busy={ocupado}
            onConfirm={() => void cambiar('Inactivo')}
            onCancel={() => setConfirmando(false)}
          />
        </span>
      ) : null}
    </>
  );
}
