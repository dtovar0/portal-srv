import type { Metadata } from 'next';
import { ToastProvider } from '@/components/toast';
import { RAIZ_APP_ID } from '@/lib/raiz-app';
import { SCRIPT_RESTAURAR_TEMA } from '@/lib/tema';
import { APP_TITLE } from '@/lib/branding';
// El orden importa: primero los tokens del portal, que definen las variables;
// después sus clases; y al final las utilidades de Tailwind, que las consumen.
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/components.css';
import './globals.css';

export const metadata: Metadata = {
  title: `${APP_TITLE} - Control de Acceso`,
  description: `Punto único de entrada y control para el ecosistema interno de plataformas (SSO y gestión centralizada de permisos)`,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/icon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/brand/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* FNC-032: restaura el tema guardado antes del primer pintado (sin destello). */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_RESTAURAR_TEMA }} />
        {/* Tipografía Corporativa Oficial de Aduana (Montserrat, Inter, JetBrains Mono - §04) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Montserrat:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* DIS-044: `html` y `body` no se desplazan (global.css); lo hace esta raíz
            (páginas sin `AppShell`) o el `<main>` de `AppShell`. Los diálogos se
            pintan fuera, en un portal, y la raíz se marca `inert` mientras están abiertos. */}
        <div id={RAIZ_APP_ID} data-desplazable="" className="h-dvh overflow-y-auto">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
