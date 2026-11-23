import { redirect } from 'next/navigation';
import { PaginaPortada } from '@/components/portada/pagina-portada';
import { esPortadaActiva } from '@/lib/portada';

/** Ruta explícita de la presentación institucional. */
export default function Page() {
  if (!esPortadaActiva()) {
    redirect('/login');
  }

  return <PaginaPortada />;
}
