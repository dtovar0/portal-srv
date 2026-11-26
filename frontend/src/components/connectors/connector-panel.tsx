'use client';

/**
 * Conector (DIS-022, F-CON-01; DIS-140: independiente, contrato
 * `conectores-y-ejecuciones.md` 1.6; solo superadmin). Con `connector` es el
 * detalle y la edición (`PUT /connectors/<id>`, `POST .../test`, `DELETE`);
 * con `null` es el alta sin plataforma (`POST /connectors`).
 *
 * - Sección bajo la lista, no `Modal`: así la confirmación de eliminar no
 *   queda dentro de otro diálogo (patrón de `UserAccessPanel`, DIS-018).
 * - Los datos vienen de la lista (`GET /connectors`); al guardar, probar o
 *   eliminar se avisa con toast (DIS-091) y se recarga la lista.
 * - "Probar conexión" usa la configuración guardada y solo con plataforma
 *   asociada; sin ella queda deshabilitado con su motivo visible.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { connectorsApi } from '@/lib/access/connectors';
import type { ConnectorItem } from '@/lib/access/types';
import { formatearFecha } from '../access/fecha';
import { Dato } from '../audit/audit-detail-modal';
import { Button } from '../form';
import { Icono } from '../icono';
import { useToast } from '../toast';
import { Badge, Card } from '../ui';
import { ESTADOS_CREDENCIAL, TIPOS_CONECTOR, esTipoConocido } from './connector-catalog';
import { ConnectorDeleteDialog } from './connector-delete-dialog';
import { PRUEBA_ERROR, PRUEBA_OK, describeConnectorTestError } from './connector-errors';
import { ConnectorForm } from './connector-form';

export const AVISO_GUARDADO = 'Conector guardado.';
export const AVISO_CREADO = 'Conector creado. Asócialo a una plataforma para usarlo.';
export const AVISO_SIN_VERIFICAR = 'Conector guardado. La credencial queda sin verificar: prueba la conexión.';
export const AVISO_ELIMINADO = 'Conector eliminado.';
export const MOTIVO_SIN_PLATAFORMA = 'Asocia el conector a una plataforma para probarlo.';

/** Id del título del panel; `null` = alta. */
export function tituloPanelId(connectorId: number | null): string {
  return `conector-${connectorId ?? 'nuevo'}-titulo`;
}

export function ConnectorPanel({
  connector,
  onClose,
  onSaved,
  onChanged,
  onDeleted,
}: {
  connector: ConnectorItem | null;
  onClose: () => void;
  /** Guardado (`creado` = alta): la lista se recarga y se selecciona. */
  onSaved: (connector: ConnectorItem, creado: boolean) => void;
  /** Algo cambió en el servidor (prueba o dato desfasado): recargar la lista. */
  onChanged: () => void;
  onDeleted: (connector: ConnectorItem) => void;
}) {
  const id = connector?.id ?? null;
  const titleId = tituloPanelId(id);
  const titulo = useRef<HTMLHeadingElement>(null);
  const { avisar } = useToast();
  const eliminarId = `conector-${id ?? 'nuevo'}-eliminar`;
  const pruebaPistaId = `${titleId}-prueba-pista`;
  const [probando, setProbando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    titulo.current?.focus();
  }, [id]);

  function anunciar(texto: string, exito: boolean) {
    avisar(exito ? 'success' : 'error', texto, 'Conector');
  }

  function guardado(nuevo: ConnectorItem) {
    const creado = connector === null;
    anunciar(
      creado ? AVISO_CREADO
        : nuevo.credential_status === 'sin_verificar' ? AVISO_SIN_VERIFICAR : AVISO_GUARDADO,
      true,
    );
    onSaved(nuevo, creado);
  }

  async function probar() {
    if (!connector || probando) return;
    setProbando(true);
    try {
      const resultado = await connectorsApi.testById(connector.id);
      const ok = resultado.result === 'ok';
      anunciar(ok ? PRUEBA_OK : PRUEBA_ERROR, ok);
      // La prueba actualiza `credential_status`.
      onChanged();
    } catch (err) {
      const view = describeConnectorTestError(err);
      anunciar(view.message, false);
      if (view.stale) onChanged();
    } finally {
      setProbando(false);
    }
  }

  // Estable: `Modal` reinstala su efecto (y el foco) si cambia `onClose`.
  const cerrarEliminar = useCallback(() => {
    setEliminando(false);
    const boton = document.getElementById(eliminarId);
    if (boton) boton.focus();
    else titulo.current?.focus();
  }, [eliminarId]);

  function eliminado() {
    setEliminando(false);
    anunciar(AVISO_ELIMINADO, true);
    if (connector) onDeleted(connector);
  }

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={titleId}
            ref={titulo}
            tabIndex={-1}
            className="rounded text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {connector ? `Conector ${connector.name}` : 'Nuevo conector'}
          </h2>
          <p className="text-sm text-label">
            {connector
              ? (connector.platform ? connector.platform.name : 'Sin asociar')
              : 'Se crea sin plataforma; después se asocia a una.'}
          </p>
        </div>
        <Button variant="secondary" onClick={onClose} className="focus-visible:ring-2 focus-visible:ring-primary">
          <Icono nombre="cerrar" tamano="sm" ariaHidden={true} className="mr-1.5" />
          Cerrar
        </Button>
      </div>

      <Card className="space-y-5">
        {connector ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Dato
                etiqueta="Tipo"
                valor={esTipoConocido(connector.type) ? TIPOS_CONECTOR[connector.type] : connector.type}
              />
              <Dato etiqueta="Destino" valor={`${connector.host}:${connector.port}`} />
              <Dato
                etiqueta="Credencial"
                valor={
                  <Badge tone={ESTADOS_CREDENCIAL[connector.credential_status]?.tono ?? 'slate'}>
                    {ESTADOS_CREDENCIAL[connector.credential_status]?.texto ?? connector.credential_status}
                  </Badge>
                }
              />
              <Dato etiqueta="Actualizado" valor={formatearFecha(connector.updated_at)} />
            </dl>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                disabled={!connector.platform}
                motivoDeshabilitado={MOTIVO_SIN_PLATAFORMA}
                onClick={probar}
                aria-disabled={probando || undefined}
                aria-describedby={pruebaPistaId}
                className="aria-disabled:opacity-deshabilitada focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icono nombre="actividad" tamano="sm" ariaHidden={true} className="mr-1.5" />
                {probando ? 'Probando…' : 'Probar conexión'}
              </Button>
              <Button
                id={eliminarId}
                variant="secondary"
                onClick={() => setEliminando(true)}
                aria-label={`Eliminar el conector ${connector.name}`}
                className="focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icono nombre="eliminar" tamano="sm" ariaHidden={true} className="mr-1.5" />
                Eliminar
              </Button>
              <span id={pruebaPistaId} className="text-sm text-label">
                {connector.platform
                  ? 'Se prueba la configuración guardada, sin cambios en la plataforma.'
                  : MOTIVO_SIN_PLATAFORMA}
              </span>
            </div>
          </>
        ) : null}

        <ConnectorForm
          // Se reinicia con cada configuración guardada distinta.
          key={connector ? `${connector.id}-${connector.updated_at}` : 'nuevo'}
          conectorId={id}
          guardado={connector}
          onSaved={guardado}
          onStale={onChanged}
        />
      </Card>

      {eliminando && connector ? (
        <ConnectorDeleteDialog
          connector={connector}
          onClose={cerrarEliminar}
          onDeleted={eliminado}
          onStale={onChanged}
        />
      ) : null}
    </section>
  );
}
