/**
 * Mapeo curado de imágenes de fondo cinematográficas y fotográficas de alta resolución (DIS-118).
 * Diseñado específicamente para tarjetas de plataforma y tarjetas de área en variante «Portada».
 * Cada imagen está optimizada para fondos con superposición oscura (dark overlay) garantizando legibilidad AA/AAA.
 */

export const IMAGEN_FONDO_DEFAULT =
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80';

const FONDOS_PLATAFORMAS: Array<{ patron: RegExp; url: string }> = [
  {
    patron: /(aws|cloud|nube|ec2|s3|azure|gcp)/i,
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80', // Datacenter azul con servidores
  },
  {
    patron: /(github|gitlab|código|git|bitbucket|developer|dev)/i,
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80', // Pantalla de código cibernético
  },
  {
    patron: /(slack|chat|comunicación|teams|discord)/i,
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', // Ondas lumínicas dinámicas
  },
  {
    patron: /(jira|asana|trello|gestión|confluence|productividad)/i,
    url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80', // Estudio tecnológico y espacio colaborativo
  },
  {
    patron: /(vaultwarden|seguridad|password|contraseña|kms|autentic|auth)/i,
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80', // Candado criptográfico y malla de seguridad
  },
  {
    patron: /(sap|erp|finanzas|contabil|factur)/i,
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', // Rascacielos financiero nocturno
  },
  {
    patron: /(datadog|grafana|monitoreo|metricas|telemetria|analytics)/i,
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80', // Paneles de telemetría y gráficos de datos
  },
  {
    patron: /(google|workspace|drive|mail)/i,
    url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80', // Infraestructura de red y servidores
  },
];

const FONDOS_AREAS: Array<{ patron: RegExp; url: string }> = [
  {
    patron: /(tecnología|ti|sistemas|infraestructura|desarrollo)/i,
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80', // Datacenter e infraestructura
  },
  {
    patron: /(finanzas|contabilidad|tesorería|auditoría)/i,
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', // Corporativo financiero
  },
  {
    patron: /(recursos humanos|rh|talento|people)/i,
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80', // Colaboración y personas en sala de reuniones
  },
  {
    patron: /(operaciones|logística|cadena|almacén)/i,
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80', // Hub de operaciones y logística moderna
  },
  {
    patron: /(legal|cumplimiento|jurídico)/i,
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80', // Espacio institucional y biblioteca corporativa
  },
  {
    patron: /(marketing|diseño|comunicación|marca)/i,
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80', // Estudio creativo y diseño
  },
];

export function obtenerImagenFondoPlataforma(nombrePlataforma: string, nombreArea?: string): string {
  const texto = `${nombrePlataforma} ${nombreArea || ''}`.trim();
  for (const item of FONDOS_PLATAFORMAS) {
    if (item.patron.test(texto)) {
      return item.url;
    }
  }
  return IMAGEN_FONDO_DEFAULT;
}

export function obtenerImagenFondoArea(nombreArea: string): string {
  for (const item of FONDOS_AREAS) {
    if (item.patron.test(nombreArea)) {
      return item.url;
    }
  }
  return 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80';
}

