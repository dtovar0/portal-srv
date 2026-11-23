'use client';

import React from 'react';
import { Icono } from './icono';

export interface PantallaCargaProps {
  /** Mensaje principal accesible */
  label?: string;
  /** Subtítulo o detalle contextual */
  subtexto?: string;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Vista de carga de alta gama a pantalla completa (Full Page Loading Screen).
 * Incorpora identidad de marca (Escudo degradado), iluminación ambiental suave,
 * tarjeta de cristal flotante (Glassmorphism), barra de haz luminoso (Beam)
 * y estado accesible (role="status").
 */
export function PantallaCarga({
  label = 'Cargando sesión…',
  subtexto = 'Preparando tu espacio de trabajo…',
  className = '',
}: PantallaCargaProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-fondo p-4 select-none ${className}`}
    >
      {/* 1. Iluminación ambiental difusa en degradado sutil */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40 dark:opacity-20 motion-reduce:hidden"
        aria-hidden="true"
      >
        <div className="size-96 rounded-full bg-gradient-to-tr from-primary/30 via-brand/20 to-accent/30 blur-3xl" />
      </div>

      {/* 2. Tarjeta flotante glassmórfica */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center rounded-3xl border border-panel-border/70 bg-panel-fill/80 p-8 shadow-2xl backdrop-blur-xl">
        {/* Emblema corporativo con aura y pulso */}
        <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl border border-superficie/20 bg-gradient-to-br from-primary via-brand to-accent text-texto-sobre-accion shadow-lg ring-4 ring-primary/10">
          <span
            className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary to-accent opacity-30 blur-sm animate-pulse"
            aria-hidden="true"
          />
          <Icono nombre="escudo-ok" tamano="md" ariaHidden={true} className="relative z-10" />
        </div>

        {/* Título de Marca */}
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-bold tracking-tight text-body-text">Portal de accesos</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-label mt-0.5">
            Vivaro • Seguridad e Identidad
          </span>
        </div>

        {/* Barra de progreso de haz luminoso (beam) */}
        <div
          className="relative mt-6 mb-4 h-1.5 w-52 overflow-hidden rounded-full bg-superficie-hundida border border-panel-border/50"
          aria-hidden="true"
        >
          <div className="nx-loading-beam h-full w-24 rounded-full bg-gradient-to-r from-primary via-brand to-accent" />
        </div>

        {/* Estado y subtexto informativo */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-body-text">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span>{label}</span>
          </div>
          {subtexto ? (
            <p className="text-xs text-label font-normal">{subtexto}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

