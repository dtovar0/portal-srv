import type { NextConfig } from 'next';
import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { rewritesDeDesarrollo } from './rewrites-dev';

// Carga el .env de la raíz del proyecto para que las variables estén disponibles en desarrollo y build
const dirRaiz = process.cwd().endsWith('frontend') ? resolve(process.cwd(), '..') : process.cwd();
loadEnvConfig(dirRaiz);

/**
 * El backend Flask es la única fuente de datos y de sesión.
 *
 * Solo en desarrollo (`NODE_ENV=development`) `rewrites` reenvía /api/* a
 * Flask para que el navegador vea un mismo origen y la cookie viaje sin CORS.
 * `next build` y `next start` no generan ningún rewrite: en producción es
 * nginx quien enruta (FNC-005, FNC-118).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_PORTADA_ACTIVA:
      process.env.PORTADA_ACTIVA ?? process.env.NEXT_PUBLIC_PORTADA_ACTIVA ?? 'true',
    NEXT_PUBLIC_APP_TITLE:
      process.env.APP_TITLE ?? process.env.NEXT_PUBLIC_APP_TITLE ?? 'Aduana',
    NEXT_PUBLIC_APP_NAME:
      process.env.APP_NAME ?? process.env.NEXT_PUBLIC_APP_NAME ?? 'aduana',
    NEXT_PUBLIC_DOMAIN:
      process.env.DOMAIN ?? process.env.NEXT_PUBLIC_DOMAIN ?? '',
    NEXT_PUBLIC_SUPPORT_EMAIL:
      process.env.SUPPORT_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'aduana-app@vivaro.com',
  },
  async rewrites() {
    return rewritesDeDesarrollo(process.env);
  },
};

export default nextConfig;
