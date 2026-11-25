'use client';

/**
 * Pantalla Solicitudes (DIS-131): sin `?status=` muestra el resumen (tarjetas, gráficas y dona);
 * con `?status=pendiente|aprobada|rechazada` abre la tabla de ese estado (`ApprovalsInbox` con el
 * estado fijo) y un botón Volver al resumen. La URL permite Volver y F5.
 */

import { useSearchParams } from 'next/navigation';
import type { RequestStatus } from '@/lib/access/types';
import { PageHeader } from '../page-header';
import { ApprovalsInbox } from './approvals-inbox';
import { ApprovalsResumen, RUTA_SOLICITUDES } from './approvals-resumen';
import { valorPermitido } from './filtro-url';

const ESTADOS: RequestStatus[] = ['pendiente', 'aprobada', 'rechazada'];

const SECCIONES: Record<RequestStatus, { titulo: string; descripcion: string }> = {
  pendiente: { titulo: 'Solicitudes pendientes', descripcion: 'Aprueba o rechaza con un motivo las solicitudes por decidir.' },
  aprobada: { titulo: 'Solicitudes aprobadas', descripcion: 'Solicitudes de acceso ya aprobadas en tus áreas.' },
  rechazada: { titulo: 'Solicitudes rechazadas', descripcion: 'Solicitudes de acceso rechazadas, con su motivo.' },
};

export function ApprovalsView() {
  const params = useSearchParams();
  const estado = valorPermitido(params?.get('status'), ESTADOS);

  if (!estado) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Solicitudes"
          description="Resumen de las solicitudes de acceso de tus áreas (todas, si eres superadmin)."
        />
        <ApprovalsResumen />
      </div>
    );
  }

  const { titulo, descripcion } = SECCIONES[estado];
  return (
    <div className="space-y-6">
      <PageHeader
        title={titulo}
        description={descripcion}
        backHref={RUTA_SOLICITUDES}
        backLabel="Volver"
      />
      <ApprovalsInbox key={estado} estadoFijo={estado} />
    </div>
  );
}
