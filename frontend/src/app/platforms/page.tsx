import { PlatformsPageShell } from '@/components/platforms/platforms-shell';

/**
 * Plataformas: Portal de usuario (DIS-030, DIS-115).
 *
 * Presenta el catálogo de plataformas y herramientas corporativas según el diseño
 * configurado por el usuario:
 * - Opción A ('topbar'): Lanzador Launchpad con Hero Banner, pastillas de filtro y 4 columnas.
 * - Opción B ('sidebar'): Espacio de trabajo Workspace con barra lateral de 264px y 3 columnas.
 *
 * El conmutador de diseño [ ⚙️ Vista: Topbar / Sidebar ] y el acceso para administradores
 * [ ⚙️ Regresar al Panel Admin ] residen consistentemente en la barra superior de ambas vistas.
 */
export default function Page() {
  return <PlatformsPageShell />;
}
