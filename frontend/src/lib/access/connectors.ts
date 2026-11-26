/** Conectores, solo superadmin (por plataforma y, desde 1.6, independientes) (`docs/contratos/conectores-y-ejecuciones.md`). */

import { accessRequest } from './client';
import { MOCK_CONNECTOR, MOCK_CONNECTOR_ITEM, MOCK_CONNECTOR_SIN_PLATAFORMA } from './mocks';
import { jsonBody } from './query';
import type {
  Connector, ConnectorInput, ConnectorItem, ConnectorItemInput, ConnectorTestResult, StatusOk,
} from './types';

type Guardado = { status: 'success'; connector: ConnectorItem };

export const connectorsApi = {
  get: (platformId: number) =>
    accessRequest<Connector>(
      `/platforms/${platformId}/connector`, undefined,
      () => ({ ...MOCK_CONNECTOR, platform_id: platformId })),

  /** Crea o reemplaza; `credential_ref` es la referencia, nunca el secreto. */
  save: (platformId: number, input: ConnectorInput) =>
    accessRequest<{ status: 'success'; connector: Connector }>(
      `/platforms/${platformId}/connector`, jsonBody('PUT', input),
      () => ({ status: 'success', connector: { ...MOCK_CONNECTOR, ...input, platform_id: platformId } })),

  /** Cuerpo `{}` (contrato 1.1: sin JSON → `415`). */
  remove: (platformId: number) =>
    accessRequest<StatusOk>(
      `/platforms/${platformId}/connector`, jsonBody('DELETE'),
      () => ({ status: 'success' })),

  /** Un fallo de conexión llega como `200` con `result: "error"`. */
  test: (platformId: number) =>
    accessRequest<ConnectorTestResult>(
      `/platforms/${platformId}/connector/test`, jsonBody('POST'),
      () => ({ status: 'success', result: 'ok', message: 'Conexión correcta.' })),

  // --- Conectores independientes (contrato 1.6, FNC-213 / DIS-140) ---

  /** Ordenados por nombre, sin paginación. */
  list: () =>
    accessRequest<{ items: ConnectorItem[] }>(
      '/connectors', undefined,
      () => ({ items: [MOCK_CONNECTOR_ITEM, MOCK_CONNECTOR_SIN_PLATAFORMA] })),

  /** Crea sin plataforma. */
  create: (input: ConnectorItemInput) =>
    accessRequest<Guardado>(
      '/connectors', jsonBody('POST', input),
      () => ({ status: 'success', connector: { ...MOCK_CONNECTOR_SIN_PLATAFORMA, ...input } })),

  update: (id: number, input: ConnectorItemInput) =>
    accessRequest<Guardado>(
      `/connectors/${id}`, jsonBody('PUT', input),
      () => ({ status: 'success', connector: { ...MOCK_CONNECTOR_ITEM, ...input, id } })),

  /** Cuerpo `{}`. */
  destroy: (id: number) =>
    accessRequest<StatusOk>(`/connectors/${id}`, jsonBody('DELETE'), () => ({ status: 'success' })),

  associate: (id: number, platformId: number) =>
    accessRequest<Guardado>(
      `/connectors/${id}/platform`, jsonBody('PUT', { platform_id: platformId }),
      () => ({ status: 'success', connector: { ...MOCK_CONNECTOR_SIN_PLATAFORMA, id, platform_id: platformId } })),

  /** Cuerpo `{}`. */
  dissociate: (id: number) =>
    accessRequest<Guardado>(
      `/connectors/${id}/platform`, jsonBody('DELETE'),
      () => ({ status: 'success', connector: { ...MOCK_CONNECTOR_SIN_PLATAFORMA, id } })),

  /** Sin plataforma → `409 conector_sin_plataforma`. */
  testById: (id: number) =>
    accessRequest<ConnectorTestResult>(
      `/connectors/${id}/test`, jsonBody('POST'),
      () => ({ status: 'success', result: 'ok', message: 'Conexión correcta.' })),
};
