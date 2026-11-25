'use client';

/**
 * Tarjeta de plataforma de alta fidelidad para el portal de usuario (DIS-115).
 * Adopta la estructura visual y distribución de admin/platform (TarjetaArea):
 * - Altura consistente y responsiva (min-h-56 h-full) para abarcar todo el espacio de la cuadrícula.
 * - Cabecera: Chip con iniciales (size-12) + Título y descripción + Estrella de favoritos.
 * - Cuerpo central: Dos recuadros de métricas/información (Área + Nivel de acceso).
 * - Pie: Badge de estado (Activo, En revisión, Disponible) + Botón de acción con bordes redondeados.
 */

import { api } from '@/lib/api';
import type { CatalogItem } from '@/lib/access/types';
import { enlaceSeguro } from '@/lib/enlace-seguro';
import type { Platform } from '@/lib/types';
import { obtenerImagenFondoPlataforma } from '@/lib/card-backgrounds';
import { FavoriteButton } from '../favorite-button';
import { Icono } from '../icono';
import { Card } from '../ui';

const COLORES_CHIP_TOKENS = [
  'bg-primary text-texto-sobre-accion',
  'bg-brand text-texto-sobre-accion',
  'bg-accent text-texto-sobre-accion',
  'bg-accent-sky text-texto-sobre-accion',
  'bg-accent-violet text-texto-sobre-accion',
  'bg-accion text-texto-sobre-accion',
  'bg-barra-lateral text-barra-lateral-texto',
];

function obtenerColorIniciales(id: number): string {
  return COLORES_CHIP_TOKENS[id % COLORES_CHIP_TOKENS.length];
}

function obtenerIniciales(nombre: string): string {
  const norm = nombre.toLowerCase().trim();
  if (norm.startsWith('slack')) return 'SL';
  if (norm.startsWith('github')) return 'GH';
  if (norm.startsWith('google')) return 'GW';
  if (norm.startsWith('jira')) return 'JR';
  if (norm.startsWith('aws')) return 'AW';
  if (norm.startsWith('vaultwarden')) return 'VW';
  if (norm.startsWith('sap')) return 'SP';
  if (norm.startsWith('datadog')) return 'DD';
  const palabras = nombre.trim().split(/\s+/);
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
}

export function PlatformMockupCard({
  item,
  mine,
  reason,
  onRequest,
  onFavoriteChange,
  variante = 'estandar',
  isDemo = false,
  alturaEstandar = false,
}: {
  item: CatalogItem;
  mine?: Platform;
  reason?: string;
  onRequest: (item: CatalogItem, trigger: HTMLButtonElement) => void;
  onFavoriteChange?: (id: number, isFavorite: boolean) => void;
  variante?:
    | 'estandar'
    | 'compacta'
    | 'horizontal'
    | 'enmarcada'
    | 'duotono'
    | 'evento'
    | 'split'
    | 'glass'
    | 'editorial'
    | 'portada'
    | 'banner'
    | 'flotante';
  isDemo?: boolean;
  alturaEstandar?: boolean;
}) {
  const { platform, area } = item;
  const tituloId = `plataforma-${platform.id}`;
  const pendiente = item.pending_request_id !== null;
  const esActivo = mine && (!item.my_access_status || item.my_access_status === 'activo');
  const enlace = mine && esActivo ? enlaceSeguro(mine.direct_link) : null;
  const puedePedir = item.can_request && item.requestable_levels.length > 0;

  const colorClase = obtenerColorIniciales(platform.id);
  const iniciales = obtenerIniciales(platform.name);

  // Altura estándar de 240px (min-h-60) unificada con la variante Editorial Suizo para previsualizaciones simétricas
  const claseAltura = alturaEstandar
    ? 'min-h-60 max-h-60 h-60'
    : (variante === 'compacta'
        ? 'min-h-44'
        : variante === 'flotante'
        ? 'min-h-72'
        : variante === 'editorial' || variante === 'glass'
        ? 'min-h-60'
        : variante === 'horizontal'
        ? ''
        : variante === 'split' || variante === 'estandar'
        ? 'min-h-56'
        : 'min-h-64');

  function registerVisit() {
    void api.registerVisit(platform.id).catch(() => undefined);
  }

  if (variante === 'horizontal') {
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex w-full flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-panel-border bg-panel-fill text-left shadow-1 transition-all hover:border-primary/50 hover:shadow-2 gap-3.5 ${
          alturaEstandar ? 'my-auto' : ''
        } ${pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
          }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-xs ${colorClase}`}
            aria-hidden="true"
          >
            {iniciales}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 id={tituloId} className="truncate text-sm font-bold text-body-text group-hover:text-primary-text transition-colors">
                {platform.name}
              </h3>
              <span className="text-xs font-semibold text-label px-2 py-0.5 rounded-md bg-surface-container border border-panel-border">
                {area.name}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-label" title={platform.description || ''}>
              {platform.description || 'Herramienta corporativa autorizada.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <div className="flex items-center gap-2 min-w-0">
            {esActivo && enlace ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/30 px-2.5 py-0.5 text-xs font-bold text-success-text">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                ACTIVA
              </span>
            ) : pendiente ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 border border-warning/30 px-2.5 py-0.5 text-xs font-bold text-warning-text">
                <span className="size-1.5 rounded-full bg-warning animate-pulse" />
                EN REVISIÓN
              </span>
            ) : puedePedir ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container border border-borde text-xs font-semibold text-texto-secundario">
                DISPONIBLE
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container border border-borde text-xs font-semibold text-texto-secundario">
                SIN ACCESO
              </span>
            )}
          </div>

          {mine ? (
            <span className="relative z-10 shrink-0">
              <FavoriteButton
                platformId={platform.id}
                name={platform.name}
                initial={mine.is_favorite}
                onChange={onFavoriteChange}
                variante="horizontal"
                isDemo={isDemo || platform.id >= 900}
              />
            </span>
          ) : null}

          <div className="shrink-0">
            {esActivo && enlace ? (
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                onClick={registerVisit}
                aria-label={`Abrir ${platform.name}`}
                className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-superficie-hundida hover:bg-superficie border border-panel-border/80 px-3 py-1 text-xs font-bold text-body-text transition-colors shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Abrir</span>
                <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
              </a>
            ) : pendiente ? (
              <span className="text-xs font-semibold text-warning-text italic">En espera</span>
            ) : puedePedir ? (
              <button
                type="button"
                onClick={(e) => onRequest(item, e.currentTarget)}
                aria-label={`Solicitar acceso a ${platform.name}`}
                className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary hover:bg-primary/90 text-texto-sobre-accion px-3 py-1 text-xs font-bold shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Solicitar</span>
                <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
              </button>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  if (variante === 'portada') {
    const imagenFondo = obtenerImagenFondoPlataforma(platform.name, area.name);
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between overflow-hidden rounded-3xl border border-arte-luz/10 bg-arte-pizarra-950 p-5 text-left shadow-2 transition-all hover:border-primary/60 hover:shadow-xl ${
          pendiente ? 'ring-2 ring-warning/50' : ''
        }`}
      >
        {/* Imagen de fondo inmersiva de alta resolución con efecto de escala suave en hover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenFondo}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
        />
        {/* Capa de contraste y gradiente para garantizar máxima legibilidad tipográfica */}
        <div className="absolute inset-0 bg-gradient-to-t from-arte-sombra/95 via-arte-sombra/75 to-arte-sombra/35 pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-inset ring-arte-luz/10 rounded-3xl pointer-events-none" />

        {/* Cabecera flotante */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-arte-luz/15 backdrop-blur-md border border-arte-luz/20 text-arte-luz font-black text-xs shadow-md">
              {iniciales}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-arte-sombra/50 text-arte-luz/90 backdrop-blur-md border border-arte-luz/15">
              {area.name}
            </span>
          </div>

          {mine ? (
            <span className="relative z-10 shrink-0">
              <FavoriteButton
                platformId={platform.id}
                name={platform.name}
                initial={mine.is_favorite}
                onChange={onFavoriteChange}
                variante="portada"
                isDemo={isDemo || platform.id >= 900}
              />
            </span>
          ) : null}
        </div>

        {/* Cuerpo central: Información de la plataforma */}
        <div className="relative z-10 my-4 space-y-1.5">
          <h3 id={tituloId} className="truncate text-lg font-bold tracking-tight text-arte-luz drop-shadow-sm group-hover:text-primary-text transition-colors" title={platform.name}>
            {platform.name}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-arte-pizarra-300 drop-shadow-xs" title={platform.description || ''}>
            {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
          </p>
        </div>

        {/* Pie: Botón de acción único prominente con estilo cinematográfico */}
        <div className="relative z-10 pt-3 border-t border-arte-luz/15 flex items-center">
          {esActivo && enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={registerVisit}
              aria-label={`Ir a ${platform.name}`}
              className="w-full min-h-12 px-4 rounded-xl bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Ir a la herramienta</span>
              <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
            </a>
          ) : pendiente ? (
            <div className="w-full min-h-12 rounded-xl bg-warning/20 border border-warning/40 backdrop-blur-md px-4 flex items-center justify-center text-xs font-bold text-warning-text">
              <span className="size-2 rounded-full bg-warning animate-pulse mr-2" />
              Solicitud en revisión
            </div>
          ) : puedePedir ? (
            <button
              type="button"
              onClick={(e) => onRequest(item, e.currentTarget)}
              aria-label={`Solicitar acceso a ${platform.name}`}
              className="w-full min-h-12 px-4 rounded-xl bg-arte-luz hover:bg-arte-pizarra-100 text-arte-pizarra-900 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Solicitar acceso</span>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
            </button>
          ) : (
            <div className="w-full min-h-12 rounded-xl bg-arte-sombra/40 border border-arte-luz/10 backdrop-blur-md px-4 flex items-center justify-center text-xs text-arte-pizarra-400 italic">
              Sin permisos disponibles
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (variante === 'banner') {
    const imagenFondo = obtenerImagenFondoPlataforma(platform.name, area.name);
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between overflow-hidden rounded-3xl border border-panel-border bg-panel-fill text-left shadow-1 transition-all hover:border-primary/50 hover:shadow-2 ${
          pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
        }`}
      >
        {/* Cabecera Panorámica / Hero Banner con imagen fotográfica */}
        <div className={`relative ${alturaEstandar ? 'h-24' : 'h-28 sm:h-32'} w-full overflow-hidden shrink-0 bg-arte-pizarra-900`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenFondo}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-arte-sombra/85 via-arte-sombra/40 to-arte-sombra/20 pointer-events-none" />

          {/* Badges superiores sobre el banner */}
          <div className="relative z-10 flex items-center justify-between p-3.5">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-arte-sombra/60 text-arte-luz/95 backdrop-blur-md border border-arte-luz/20">
              {area.name}
            </span>

            {mine ? (
              <span className="relative z-10 shrink-0">
                <FavoriteButton
                  platformId={platform.id}
                  name={platform.name}
                  initial={mine.is_favorite}
                  onChange={onFavoriteChange}
                  variante="banner"
                  isDemo={isDemo || platform.id >= 900}
                />
              </span>
            ) : null}
          </div>

          {/* Chip de iniciales superpuesto en el banner */}
          <div className="absolute bottom-2 left-4 z-10 flex items-center gap-2">
            <span
              className={`flex size-11 items-center justify-center rounded-2xl font-black text-xs text-arte-luz shadow-lg border-2 border-panel-fill ${colorClase}`}
              aria-hidden="true"
            >
              {iniciales}
            </span>
            {esActivo ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-success-fondo text-success-text backdrop-blur-md">
                Activa
              </span>
            ) : null}
          </div>
        </div>

        {/* Contenido inferior de la tarjeta */}
        <div className={`flex flex-1 flex-col justify-between ${alturaEstandar ? 'p-3.5 pt-2 space-y-2' : 'p-4 pt-3 space-y-3'}`}>
          <div className="space-y-1">
            <h3
              id={tituloId}
              className="truncate text-base font-bold tracking-tight text-body-text group-hover:text-primary-text transition-colors"
              title={platform.name}
            >
              {platform.name}
            </h3>
            <p
              className="line-clamp-2 text-xs leading-relaxed text-texto-secundario"
              title={platform.description || ''}
            >
              {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
            </p>
          </div>

          {/* Botón de acción único y accesible */}
          <div className="pt-2 border-t border-panel-border/60">
            {esActivo && enlace ? (
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                onClick={registerVisit}
                aria-label={`Abrir ${platform.name}`}
                className="w-full min-h-12 px-4 rounded-xl bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs shadow-1 transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary hover:scale-[1.01] active:scale-[0.98]"
              >
                <span>Ir a la herramienta</span>
                <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
              </a>
            ) : pendiente ? (
              <div className="w-full min-h-12 rounded-xl bg-warning/15 border border-warning/30 px-4 flex items-center justify-center text-xs font-bold text-warning-text">
                <span className="size-2 rounded-full bg-warning animate-pulse mr-2" />
                Solicitud en revisión
              </div>
            ) : puedePedir ? (
              <button
                type="button"
                onClick={(e) => onRequest(item, e.currentTarget)}
                aria-label={`Solicitar acceso a ${platform.name}`}
                className="w-full min-h-12 px-4 rounded-xl bg-surface-container hover:bg-superficie border border-panel-border/80 text-body-text font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
              >
                <span>Solicitar acceso</span>
                <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
              </button>
            ) : (
              <div className="w-full min-h-12 rounded-xl bg-surface-container/50 border border-panel-border/40 px-4 flex items-center justify-center text-xs text-label italic">
                Sin permisos disponibles
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (variante === 'flotante') {
    const imagenFondo = obtenerImagenFondoPlataforma(platform.name, area.name);
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between overflow-hidden rounded-3xl border border-arte-luz/15 bg-arte-pizarra-950 ${alturaEstandar ? 'p-3.5' : 'p-4'} text-left shadow-2 transition-all hover:border-primary/60 hover:shadow-xl ${
          pendiente ? 'ring-2 ring-warning/50' : ''
        }`}
      >
        {/* Imagen de fondo inmersiva completa */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenFondo}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-arte-sombra/70 via-arte-sombra/35 to-arte-sombra/85 pointer-events-none" />

        {/* Cabecera flotante */}
        <div className={`relative z-10 flex items-center justify-between gap-3 ${alturaEstandar ? 'mb-2' : 'mb-4'}`}>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-arte-sombra/60 text-arte-luz/95 backdrop-blur-md border border-arte-luz/20">
            {area.name}
          </span>

          {mine ? (
            <span className="relative z-10 shrink-0">
              <FavoriteButton
                platformId={platform.id}
                name={platform.name}
                initial={mine.is_favorite}
                onChange={onFavoriteChange}
                variante="flotante"
                isDemo={isDemo || platform.id >= 900}
              />
            </span>
          ) : null}
        </div>

        {/* Panel flotante de vidrio (Frosted Glass Card) en la parte inferior */}
        <div className={`relative z-10 mt-auto rounded-2xl bg-arte-sombra/75 backdrop-blur-xl border border-arte-luz/20 ${alturaEstandar ? 'p-3 gap-2.5' : 'p-4 gap-3'} shadow-2xl flex flex-col group-hover:border-arte-luz/30 transition-all`}>
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-arte-luz/20 backdrop-blur-md border border-arte-luz/30 text-arte-luz font-black text-xs shadow-md"
              aria-hidden="true"
            >
              {iniciales}
            </span>
            <div className="min-w-0 flex-1">
              <h3
                id={tituloId}
                className="truncate text-sm font-bold tracking-tight text-arte-luz drop-shadow-sm group-hover:text-primary-text transition-colors"
                title={platform.name}
              >
                {platform.name}
              </h3>
              <p
                className="line-clamp-1 text-xs text-arte-pizarra-300 drop-shadow-xs"
                title={platform.description || ''}
              >
                {platform.description || 'Herramienta corporativa autorizada.'}
              </p>
            </div>
          </div>

          {/* Botón de acción integrado */}
          <div className="pt-2 border-t border-arte-luz/15">
            {esActivo && enlace ? (
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                onClick={registerVisit}
                aria-label={`Ir a ${platform.name}`}
                className="w-full min-h-12 px-4 rounded-xl bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Ir a la herramienta</span>
                <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
              </a>
            ) : pendiente ? (
              <div className="w-full min-h-12 rounded-xl bg-warning/20 border border-warning/40 backdrop-blur-md px-4 flex items-center justify-center text-xs font-bold text-warning-text">
                <span className="size-2 rounded-full bg-warning animate-pulse mr-2" />
                Solicitud en revisión
              </div>
            ) : puedePedir ? (
              <button
                type="button"
                onClick={(e) => onRequest(item, e.currentTarget)}
                aria-label={`Solicitar acceso a ${platform.name}`}
                className="w-full min-h-12 px-4 rounded-xl bg-arte-luz hover:bg-arte-pizarra-100 text-arte-pizarra-900 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Solicitar acceso</span>
                <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
              </button>
            ) : (
              <div className="w-full min-h-12 rounded-xl bg-arte-sombra/40 border border-arte-luz/10 backdrop-blur-md px-4 flex items-center justify-center text-xs text-arte-pizarra-400 italic">
                Sin permisos disponibles
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (variante === 'enmarcada') {
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between rounded-3xl border border-panel-border bg-panel-fill p-4 text-center shadow-1 transition-all hover:border-primary/50 hover:shadow-2 ${pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
          }`}
      >
        <div>
          <div className={`relative ${alturaEstandar ? 'h-24' : 'h-36'} w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-arte-turquesa-800 to-arte-esmeralda-600 shadow-inner flex items-center justify-center text-arte-luz`}>
            <div className="text-center">
              <span className={`size-12 mx-auto rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${colorClase}`}>
                {iniciales}
              </span>
              <span className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-arte-sombra/40 text-arte-luz backdrop-blur-xs">
                {area.name}
              </span>
            </div>
            {mine ? (
              <span className="absolute top-2.5 right-2.5">
                <FavoriteButton
                  platformId={platform.id}
                  name={platform.name}
                  initial={mine.is_favorite}
                  onChange={onFavoriteChange}
                  variante="enmarcada"
                  isDemo={isDemo || platform.id >= 900}
                />
              </span>
            ) : null}
          </div>

          <div className={`${alturaEstandar ? 'mt-2 space-y-1' : 'mt-4 space-y-1.5'} px-2`}>
            <h3 id={tituloId} className="truncate text-base font-bold tracking-tight text-body-text group-hover:text-primary-text transition-colors" title={platform.name}>
              {platform.name}
            </h3>
            <p className="line-clamp-2 text-xs leading-relaxed text-label" title={platform.description || ''}>
              {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
            </p>
          </div>
        </div>

        <div className={`${alturaEstandar ? 'mt-2 pt-1' : 'mt-5 pt-2'}`}>
          {esActivo && enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={registerVisit}
              aria-label={`Abrir ${platform.name}`}
              className="w-full max-w-47.5 mx-auto min-h-12 px-5 rounded-full bg-superficie-hundida hover:bg-superficie border border-panel-border/80 text-body-text font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Abrir Plataforma</span>
              <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
            </a>
          ) : pendiente ? (
            <span className="inline-block py-2 text-xs font-semibold text-warning-text italic">En revisión</span>
          ) : puedePedir ? (
            <button
              type="button"
              onClick={(e) => onRequest(item, e.currentTarget)}
              aria-label={`Solicitar acceso a ${platform.name}`}
              className="w-full max-w-47.5 mx-auto min-h-12 px-5 rounded-full bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <span>Solicitar Acceso</span>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
            </button>
          ) : (
            <span className="inline-block py-2 text-xs text-label">Sin acceso</span>
          )}
        </div>
      </Card>
    );
  }

  if (variante === 'duotono') {
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between overflow-hidden rounded-3xl border border-panel-border bg-panel-fill text-left shadow-1 transition-all hover:border-primary/50 hover:shadow-2 ${pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
          }`}
      >
        <div>
          <div className={`relative ${alturaEstandar ? 'h-24' : 'h-40'} w-full bg-gradient-to-tr from-arte-purpura-950 via-arte-indigo-900 to-arte-purpura-800 ${alturaEstandar ? 'p-2.5' : 'p-3.5'} flex flex-col justify-between text-arte-luz`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider bg-arte-sombra/50 text-arte-purpura-300 px-2 py-0.5 rounded-md border border-arte-luz/10 backdrop-blur-xs">
                {area.name}
              </span>
              {mine ? (
                <FavoriteButton
                  platformId={platform.id}
                  name={platform.name}
                  initial={mine.is_favorite}
                  onChange={onFavoriteChange}
                  variante="duotono"
                  isDemo={isDemo || platform.id >= 900}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-2.5">
              <span className={`size-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-md border border-arte-luz/20 ${colorClase}`}>
                {iniciales}
              </span>
            </div>
          </div>

          <div className={`${alturaEstandar ? 'p-3 py-2 space-y-1' : 'p-4 space-y-1.5'}`}>
            <h3 id={tituloId} className="truncate text-base font-bold tracking-tight text-body-text group-hover:text-primary-text transition-colors" title={platform.name}>
              {platform.name}
            </h3>
            <p className="line-clamp-2 text-xs leading-relaxed text-label" title={platform.description || ''}>
              {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
            </p>
          </div>
        </div>

        <div className={`${alturaEstandar ? 'p-3 pt-0' : 'p-4 pt-0'}`}>
          {esActivo && enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={registerVisit}
              aria-label={`Lanzar ${platform.name}`}
              className="w-full min-h-12 px-4 rounded-full bg-superficie-hundida hover:bg-superficie border border-panel-border text-body-text font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Lanzar Aplicación</span>
              <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
            </a>
          ) : pendiente ? (
            <div className="w-full py-2 text-center text-xs font-semibold text-warning-text italic">
              En revisión por administración
            </div>
          ) : puedePedir ? (
            <button
              type="button"
              onClick={(e) => onRequest(item, e.currentTarget)}
              aria-label={`Solicitar ${platform.name}`}
              className="w-full min-h-12 px-4 rounded-full bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <span>Solicitar Acceso</span>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
            </button>
          ) : (
            <div className="w-full py-2 text-center text-xs text-label">Sin permisos</div>
          )}
        </div>
      </Card>
    );
  }

  if (variante === 'evento') {
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between rounded-3xl border border-panel-border bg-panel-fill p-4 text-left shadow-1 transition-all hover:border-primary/50 hover:shadow-2 ${pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
          }`}
      >
        <div>
          <div className={`relative ${alturaEstandar ? 'h-24' : 'h-36'} w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-arte-azul-900 to-arte-indigo-700 p-3 flex flex-col justify-between text-arte-luz shadow-inner`}>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-panel-fill text-body-text font-black text-xs shadow-xs">
                {iniciales}
              </span>
              {mine ? (
                <FavoriteButton
                  platformId={platform.id}
                  name={platform.name}
                  initial={mine.is_favorite}
                  onChange={onFavoriteChange}
                  variante="evento"
                  isDemo={isDemo || platform.id >= 900}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-arte-sombra/40 text-arte-luz backdrop-blur-xs">
                {area.name}
              </span>
            </div>
          </div>

          <div className={`${alturaEstandar ? 'mt-2' : 'mt-3'}`}>
            <h3 id={tituloId} className="truncate text-base font-bold tracking-tight text-body-text" title={platform.name}>
              {platform.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-label" title={platform.description || ''}>
              {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
            </p>
          </div>
        </div>

        <div className={`${alturaEstandar ? 'mt-2 pt-2' : 'mt-4 pt-2.5'} border-t border-panel-border/80`}>
          {esActivo && enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={registerVisit}
              aria-label={`Abrir ${platform.name}`}
              className="w-full min-h-12 px-4 rounded-xl bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Abrir</span>
              <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
            </a>
          ) : puedePedir ? (
            <button
              type="button"
              onClick={(e) => onRequest(item, e.currentTarget)}
              aria-label={`Solicitar acceso a ${platform.name}`}
              className="w-full min-h-12 px-4 rounded-xl bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <span>Solicitar acceso</span>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
            </button>
          ) : (
            <div className="w-full min-h-11 flex items-center justify-center py-2 text-center text-xs text-label italic">
              {pendiente ? 'En revisión' : 'Sin acceso'}
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (variante === 'split') {
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full ${alturaEstandar ? 'flex-row' : 'flex-col sm:flex-row'} overflow-hidden rounded-3xl border border-panel-border bg-panel-fill text-left shadow-1 transition-all hover:border-primary/50 hover:shadow-2 ${pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
          }`}
      >
        {/* Mitad izquierda visual 45% */}
        <div className={`${alturaEstandar ? 'w-9/20' : 'sm:w-9/20'} bg-gradient-to-tr from-arte-indigo-950 via-arte-pizarra-900 to-arte-indigo-900 ${alturaEstandar ? 'p-3.5' : 'p-5'} flex flex-col justify-between text-arte-luz ${alturaEstandar ? 'min-h-full' : 'min-h-40'} relative`}>
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-arte-luz/10 backdrop-blur-xs border border-arte-luz/20">
              {area.name}
            </span>
            {mine ? (
              <FavoriteButton
                platformId={platform.id}
                name={platform.name}
                initial={mine.is_favorite}
                onChange={onFavoriteChange}
                variante="split"
                isDemo={isDemo || platform.id >= 900}
              />
            ) : null}
          </div>

          <div className="py-2 text-center">
            <span className={`size-14 mx-auto rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-arte-luz/20 ${colorClase}`}>
              {iniciales}
            </span>
          </div>

          <div className="flex items-center justify-end text-xs text-arte-luz/80">
            <span className="size-2 rounded-full bg-arte-esmeralda-400" />
          </div>
        </div>

        {/* Mitad derecha editorial 55% */}
        <div className={`${alturaEstandar ? 'w-11/20' : 'sm:w-11/20'} ${alturaEstandar ? 'p-3.5' : 'p-5'} flex flex-col justify-between space-y-3`}>
          <div>
            <h3 id={tituloId} className="truncate text-base font-bold tracking-tight text-body-text group-hover:text-primary-text transition-colors" title={platform.name}>
              {platform.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-label" title={platform.description || ''}>
              {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
            </p>
          </div>

          <div className="pt-2 border-t border-panel-border/80 flex items-center justify-between gap-2">
            {esActivo && enlace ? (
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                onClick={registerVisit}
                aria-label={`Abrir ${platform.name}`}
                className="w-full min-h-12 px-4 rounded-full bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Abrir</span>
                <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
              </a>
            ) : puedePedir ? (
              <button
                type="button"
                onClick={(e) => onRequest(item, e.currentTarget)}
                aria-label={`Solicitar acceso a ${platform.name}`}
                className="w-full min-h-12 px-4 rounded-full bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                <span>Solicitar</span>
                <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
              </button>
            ) : (
              <span className="w-full py-2 text-center text-xs text-label italic">
                {pendiente ? 'En revisión' : 'Sin acceso'}
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (variante === 'glass') {
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between overflow-hidden rounded-3xl border border-primary/30 bg-superficie/80 backdrop-blur-md ${alturaEstandar ? 'p-4' : 'p-5'} text-left shadow-2 transition-all hover:border-primary/60 hover:shadow-lg ${pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
          }`}
      >
        <div className="absolute -top-10 -right-10 size-28 rounded-full bg-primary/15 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className={`size-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ring-2 ring-primary/30 ${colorClase}`}>
              {iniciales}
            </span>
            {mine ? (
              <FavoriteButton
                platformId={platform.id}
                name={platform.name}
                initial={mine.is_favorite}
                onChange={onFavoriteChange}
                variante="glass"
                isDemo={isDemo || platform.id >= 900}
              />
            ) : null}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary-text bg-primary/10 px-2 py-0.5 rounded-md">
                {area.name}
              </span>
              <span className="size-1.5 rounded-full bg-arte-esmeralda-400" />
            </div>
            <h3 id={tituloId} className="truncate text-base font-bold tracking-tight text-body-text mt-1.5" title={platform.name}>
              {platform.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-label leading-relaxed" title={platform.description || ''}>
              {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-4 pt-3 border-t border-panel-border/80">
          {esActivo && enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={registerVisit}
              aria-label={`Acceder a ${platform.name}`}
              className="w-full min-h-12 px-4 rounded-2xl bg-gradient-to-r from-primary via-brand to-accent text-texto-sobre-accion font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary hover:opacity-95"
            >
              <span>Acceso Seguro</span>
              <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
            </a>
          ) : puedePedir ? (
            <button
              type="button"
              onClick={(e) => onRequest(item, e.currentTarget)}
              aria-label={`Solicitar credenciales para ${platform.name}`}
              className="w-full min-h-12 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-texto-sobre-accion font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <span>Solicitar Credencial</span>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
            </button>
          ) : (
            <span className="block w-full py-2 text-center text-xs text-label italic">
              {pendiente ? 'Pendiente de aprobación' : 'Sin permisos asignados'}
            </span>
          )}
        </div>
      </Card>
    );
  }

  if (variante === 'editorial') {
    return (
      <Card
        as="article"
        aria-labelledby={tituloId}
        className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between overflow-hidden rounded-3xl border border-panel-border bg-panel-fill ${alturaEstandar ? 'p-5' : 'p-6'} text-left shadow-1 transition-all hover:border-primary/50 hover:shadow-2 ${pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
          }`}
      >
        <span className="absolute top-2 right-4 text-5xl font-black text-label/10 select-none pointer-events-none tabular-nums">
          #{platform.id.toString().padStart(2, '0')}
        </span>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-primary-text">
              {area.name}
            </span>
            {mine ? (
              <FavoriteButton
                platformId={platform.id}
                name={platform.name}
                initial={mine.is_favorite}
                onChange={onFavoriteChange}
                variante="editorial"
                isDemo={isDemo || platform.id >= 900}
              />
            ) : null}
          </div>

          <h3 id={tituloId} className="font-serif text-xl font-bold tracking-tight text-body-text mt-1" title={platform.name}>
            {platform.name}
          </h3>
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-label" title={platform.description || ''}>
            {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
          </p>
        </div>

        <div className="mt-5 pt-3 border-t border-panel-border/80 flex items-center justify-end">
          {esActivo && enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={registerVisit}
              aria-label={`Ir a ${platform.name}`}
              className="inline-flex min-h-12 px-4 items-center gap-1.5 text-xs font-bold text-primary-text hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Ir a herramienta</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          ) : puedePedir ? (
            <button
              type="button"
              onClick={(e) => onRequest(item, e.currentTarget)}
              aria-label={`Solicitar acceso a ${platform.name}`}
              className="inline-flex min-h-12 px-4 items-center gap-1.5 text-xs font-bold text-primary-text hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <span>Solicitar acceso</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          ) : (
            <span className="text-xs text-label italic">
              {pendiente ? 'En trámite' : 'Restringido'}
            </span>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      as="article"
      aria-labelledby={tituloId}
      className={`group relative flex h-full ${claseAltura} w-full flex-col justify-between overflow-hidden rounded-xl border border-panel-border bg-panel-fill text-left shadow-1 transition-all hover:border-primary/50 hover:shadow-2 ${pendiente ? 'ring-1 ring-warning/30 bg-warning/5' : ''
        }`}
    >
      {/* Cabecera de la tarjeta: Chip + Título + Descripción + Estrella de Favoritos */}
      <div className={`relative flex items-center justify-between gap-3 ${variante === 'compacta' ? 'p-4 pb-2' : 'p-5 pb-3'}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`flex ${variante === 'compacta' ? 'size-10' : 'size-12'} shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${colorClase}`}
            aria-hidden="true"
          >
            {iniciales}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={tituloId} className="truncate text-base font-bold tracking-tight text-body-text group-hover:text-primary-text transition-colors" title={platform.name}>
              {platform.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-label" title={platform.description || ''}>
              {platform.description || 'Herramienta corporativa autorizada para colaboradores.'}
            </p>
          </div>
        </div>

        {mine ? (
          <span className="relative z-10 shrink-0">
            <FavoriteButton
              platformId={platform.id}
              name={platform.name}
              initial={mine.is_favorite}
              onChange={onFavoriteChange}
              variante={variante === 'compacta' ? 'compacta' : 'estandar'}
              isDemo={isDemo || platform.id >= 900}
            />
          </span>
        ) : null}
      </div>

      {/* Cuerpo central: Dos recuadros de datos e información (Solo en variante estándar) */}
      {variante !== 'compacta' ? (
        <div className="grid flex-1 grid-cols-2 content-center gap-2.5 px-5 pb-3">
          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-panel-border/70 bg-fondo/50 p-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-superficie text-primary-text shadow-xs" aria-hidden="true">
              <Icono nombre="areas" tamano="sm" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-body-text leading-tight" title={area.name}>
                {area.name}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wider text-label">
                ÁREA
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-panel-border/70 bg-fondo/50 p-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-superficie text-primary-text shadow-xs" aria-hidden="true">
              <Icono nombre="plataformas" tamano="sm" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-body-text leading-tight" title={esActivo ? 'Habilitado' : 'Disponible'}>
                {esActivo ? 'Habilitado' : 'Disponible'}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wider text-label">
                DISPONIBILIDAD
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Pie de la tarjeta: Estado + Botón de acción */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-panel-border/80 px-5 py-3">
        {/* Estado a la izquierda */}
        <div className="flex items-center gap-2 min-w-0">
          {esActivo && enlace ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/30 px-3 py-1 text-xs font-bold text-success-text shrink-0">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              ACTIVA
            </span>
          ) : pendiente ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-xs font-bold text-warning-text shrink-0"
              title="Esperando la aprobación del administrador del área"
            >
              <span className="size-1.5 rounded-full bg-warning animate-pulse" aria-hidden="true" />
              SOLICITUD ENVIADA
            </span>
          ) : puedePedir ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container border border-borde px-3 py-1 text-xs font-semibold text-texto-secundario shrink-0">
              DISPONIBLE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container border border-borde px-3 py-1 text-xs font-semibold text-texto-secundario shrink-0">
              SIN ACCESO
            </span>
          )}
        </div>

        {/* Acción a la derecha */}
        <div className="shrink-0">
          {esActivo && enlace ? (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={registerVisit}
              aria-label={`Abrir ${platform.name}`}
              className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-superficie-hundida hover:bg-superficie border border-panel-border/80 px-3.5 py-1.5 text-xs font-bold text-body-text transition-colors shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Abrir</span>
              <Icono nombre="abrir-externo" tamano="xs" ariaHidden={true} />
            </a>
          ) : pendiente ? null : puedePedir ? (
            <button
              type="button"
              onClick={(e) => onRequest(item, e.currentTarget)}
              aria-label={`Solicitar acceso a ${platform.name}`}
              className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary hover:bg-primary/90 text-texto-sobre-accion px-3.5 py-1.5 text-xs font-bold shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Solicitar</span>
              <Icono nombre="chevron-der" tamano="xs" ariaHidden={true} />
            </button>
          ) : reason ? (
            <span className="text-xs text-label italic truncate max-w-36 block" title={reason}>
              {reason}
            </span>
          ) : (
            <span className="text-xs text-label">Sin permisos</span>
          )}
        </div>
      </div>
    </Card>
  );
}
