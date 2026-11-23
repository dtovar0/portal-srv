import { AutoservicioView } from '@/components/autoservicio-view';

export const metadata = {
  title: 'Authelia — Cambiar Contraseña',
  description: 'Actualiza tu contraseña corporativa a través del portal de Autoservicio de Authelia con sincronización a JumpServer.',
};

export default function CambiarContrasenaPage() {
  return <AutoservicioView />;
}
