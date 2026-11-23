import { redirect } from 'next/navigation';
import { PaginaPortada } from '@/components/portada/pagina-portada';
import { esPortadaActiva } from '@/lib/portada';

/**
 * Entrada pública:
 * - con portada activa, siempre muestra la presentación;
 * - con portada inactiva, entra directamente al flujo de autenticación.
 */
export default function Page() {
  if (!esPortadaActiva()) {
    redirect('/login');
  }

  return <PaginaPortada />;
}
