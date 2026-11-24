/**
 * Datos de muestra para la vista previa de los diseños de tarjeta (DIS-119).
 * Reproducen el formato de los datos reales (colores hex del catálogo), por eso viven
 * fuera de los componentes: el color de una plataforma o área es dato, no estilo.
 */
import type { Area, Platform } from '@/lib/types';

/** El catálogo guarda los colores como hex (`#rrggbb`); aquí se arman desde sus canales. */
const hex = (canales: readonly [number, number, number]): string =>
  `#${canales.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

export const PLATAFORMA_MINE_DEMO: Platform = {
  id: 999,
  name: 'AWS Cloud Console',
  description: 'Gestión centralizada de infraestructura de nube, servidores EC2, almacenamiento S3 y bases de datos.',
  area_id: 1,
  area_name: 'Tecnología & TI',
  icon: 'plataformas',
  direct_link: 'https://aws.amazon.com',
  status: 'Activo',
  bg_color: hex([30, 27, 75]),
  text_color: hex([255, 255, 255]),
  my_access_status: 'activo',
  my_level: 'admin',
  is_favorite: true,
  integration_type: 'conector',
} as unknown as Platform;

export const AREA_PREVIEW_DEMO: Area = {
  id: 1,
  name: 'Tecnología & TI',
  description: 'Dirección General de Sistemas, Redes e Infraestructura de Servidores Corporativos.',
  icon: 'plataformas',
  color: hex([37, 99, 235]),
  status: 'Activo',
  platforms_count: 6,
  users_count: 28,
} as unknown as Area;

export const PLATAFORMAS_AREA_DEMO: Platform[] = [
  { id: 1, name: 'AWS Cloud', area_id: 1, bg_color: hex([30, 27, 75]) } as unknown as Platform,
  { id: 2, name: 'Slack Enterprise', area_id: 1, bg_color: hex([4, 120, 87]) } as unknown as Platform,
  { id: 3, name: 'GitHub Enterprise', area_id: 1, bg_color: hex([49, 46, 129]) } as unknown as Platform,
  { id: 4, name: 'Datadog', area_id: 1, bg_color: hex([112, 26, 117]) } as unknown as Platform,
];
