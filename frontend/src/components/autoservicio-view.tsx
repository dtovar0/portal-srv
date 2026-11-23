'use client';

/**
 * Pantalla de Autoservicio de Contraseña (Aduana).
 *
 * Permite a los usuarios corporativos:
 * 1. Cambiar su contraseña conociendo su contraseña actual (o si expiró).
 * 2. Solicitar un enlace de recuperación por correo.
 * 3. Restablecer su contraseña mediante un token de correo.
 * Sincroniza atómicamente con OpenLDAP y el ecosistema JumpServer.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { APP_TITLE } from '@/lib/branding';
import { Button, Field, TextInput } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { useToast } from './toast';

export function AutoservicioView() {
  const { avisar } = useToast();

  // Estados de pestaña y modo
  const [modo, setModo] = useState<'cambiar' | 'recuperar' | 'token'>('cambiar');
  const [cargando, setCargando] = useState(false);
  const [exitoMensaje, setExitoMensaje] = useState<string | null>(null);

  // Campos de formulario
  const [identificador, setIdentificador] = useState('');
  const [correo, setCorreo] = useState('');
  const [token, setToken] = useState('');
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarClaves, setMostrarClaves] = useState(false);

  // Detección de token en la URL al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      const emailParam = params.get('email');
      if (tokenParam) {
        setToken(tokenParam);
        if (emailParam) setCorreo(emailParam);
        setModo('token');
      }
    }
  }, []);

  // Requisitos de política en tiempo real
  const validaciones = useMemo(() => {
    return {
      longitud: nuevaContrasena.length >= 16,
      mayuscula: /[A-Z]/.test(nuevaContrasena),
      minuscula: /[a-z]/.test(nuevaContrasena),
      numero: /[0-9]/.test(nuevaContrasena),
      simbolo: /[!#$%&()*+,\-./:;<=>?@[\]^_{}~]/.test(nuevaContrasena),
      coinciden: nuevaContrasena.length > 0 && nuevaContrasena === confirmarContrasena,
    };
  }, [nuevaContrasena, confirmarContrasena]);

  const esValida =
    validaciones.longitud &&
    validaciones.mayuscula &&
    validaciones.minuscula &&
    validaciones.numero &&
    validaciones.simbolo &&
    validaciones.coinciden;

  // Manejo de envío
  const handleCambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esValida) {
      avisar('error', 'La nueva contraseña no cumple todos los requisitos de seguridad.');
      return;
    }
    setCargando(true);
    setExitoMensaje(null);
    try {
      const resp = await api.autoservicioCambiar({
        identificador,
        current_password: contrasenaActual,
        new_password: nuevaContrasena,
      });
      setExitoMensaje(resp.message || 'Tu contraseña ha sido actualizada exitosamente.');
      avisar('success', 'Contraseña actualizada correctamente.');
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la contraseña.';
      avisar('error', msg);
    } finally {
      setCargando(false);
    }
  };

  const handleSolicitarRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !correo.includes('@')) {
      avisar('error', 'Ingresa una dirección de correo válida.');
      return;
    }
    setCargando(true);
    setExitoMensaje(null);
    try {
      const resp = await api.autoservicioSolicitarRecuperacion({ email: correo });
      setExitoMensaje(
        resp.message ||
          'Si la cuenta existe en el directorio, recibirás un correo con el enlace de recuperación válido por 15 minutos.'
      );
      avisar('success', 'Solicitud procesada.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar recuperación.';
      avisar('error', msg);
    } finally {
      setCargando(false);
    }
  };

  const handleRestablecerConToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esValida) {
      avisar('error', 'La nueva contraseña no cumple todos los requisitos de seguridad.');
      return;
    }
    setCargando(true);
    setExitoMensaje(null);
    try {
      const resp = await api.autoservicioRestablecer({
        email: correo,
        token,
        new_password: nuevaContrasena,
      });
      setExitoMensaje(resp.message || 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.');
      avisar('success', 'Contraseña restablecida.');
      setNuevaContrasena('');
      setConfirmarContrasena('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña.';
      avisar('error', msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo text-body-text select-none p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`${APP_TITLE}: Autoservicio de Contraseña`}
        description="Actualiza o recupera tu contraseña corporativa con sincronización a plataformas y JumpServer."
        className="sr-only"
      />

      {/* TARJETA SPLIT-CARD FLOTANTE */}
      <main className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col md:flex-row rounded-3xl border border-panel-border bg-superficie shadow-2xl transition-all overflow-hidden">
          {/* PANEL IZQUIERDO: Formulario de Autoservicio */}
          <div className="flex w-full md:w-1/2 flex-col justify-between p-6 sm:p-10">
            {/* Header de Marca */}
            <div>
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-panel-border bg-superficie p-1 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/isotype-aduana.png"
                      alt={APP_TITLE}
                      className="size-6 object-contain"
                      width={24}
                      height={24}
                    />
                  </span>
                  <span className="font-display text-lg font-bold tracking-tight text-body-text">
                    {APP_TITLE}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-panel-border bg-fondo px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-texto-secundario">
                  <Icono nombre="candado" tamano="xs" ariaHidden={true} />
                  Autoservicio
                </span>
              </div>

              <div className="mt-6">
                <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-body-text">
                  {modo === 'token'
                    ? 'Restablecer Contraseña'
                    : modo === 'cambiar'
                      ? 'Actualizar Contraseña'
                      : 'Recuperar Contraseña'}
                </h1>
                <p className="mt-1 text-xs text-texto-secundario leading-relaxed">
                  {modo === 'token'
                    ? 'Ingresa tu nueva contraseña para completar el restablecimiento autorizado.'
                    : modo === 'cambiar'
                      ? 'Actualiza tu contraseña corporativa. Los accesos a plataformas y JumpServer se sincronizarán de forma inmediata.'
                      : 'Te enviaremos un enlace seguro a tu correo corporativo para restablecer tu acceso.'}
                </p>
              </div>

              {/* Selector de Pestañas (si no está en modo token) */}
              {modo !== 'token' && (
                <div className="mt-5 flex rounded-xl border border-panel-border bg-fondo p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModo('cambiar');
                      setExitoMensaje(null);
                    }}
                    className={`flex-1 rounded-lg py-1.5 px-3 text-xs font-bold transition-all ${
                      modo === 'cambiar'
                        ? 'bg-superficie text-body-text shadow-xs border border-panel-border'
                        : 'text-texto-secundario hover:text-body-text'
                    }`}
                  >
                    Conozco mi clave
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModo('recuperar');
                      setExitoMensaje(null);
                    }}
                    className={`flex-1 rounded-lg py-1.5 px-3 text-xs font-bold transition-all ${
                      modo === 'recuperar'
                        ? 'bg-superficie text-body-text shadow-xs border border-panel-border'
                        : 'text-texto-secundario hover:text-body-text'
                    }`}
                  >
                    Olvidé mi clave
                  </button>
                </div>
              )}
            </div>

            {/* Mensaje de Éxito */}
            {exitoMensaje ? (
              <div className="my-6 rounded-2xl border border-exito-borde bg-exito-tenue p-4 text-exito-texto space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Icono nombre="aprobar" tamano="xs" ariaHidden={true} />
                  <span>Operación exitosa</span>
                </div>
                <p className="text-xs leading-relaxed">{exitoMensaje}</p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-aduana-cyan hover:underline"
                  >
                    Ir al inicio de sesión →
                  </Link>
                </div>
              </div>
            ) : null}

            {/* FORMULARIO: PESTAÑA CAMBIAR */}
            {modo === 'cambiar' && !exitoMensaje && (
              <form onSubmit={handleCambiar} className="my-6 space-y-3.5">
                <Field label="Usuario o Correo">
                  <TextInput
                    type="text"
                    required
                    placeholder="ej. usuario@vivaro.com o jdoe"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    autoComplete="username"
                  />
                </Field>

                <Field label="Contraseña Actual">
                  <TextInput
                    type={mostrarClaves ? 'text' : 'password'}
                    required
                    placeholder="Tu contraseña actual"
                    value={contrasenaActual}
                    onChange={(e) => setContrasenaActual(e.target.value)}
                    autoComplete="current-password"
                  />
                </Field>

                <Field label="Nueva Contraseña">
                  <TextInput
                    type={mostrarClaves ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 16 caracteres"
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>

                <Field label="Confirmar Nueva Contraseña">
                  <TextInput
                    type={mostrarClaves ? 'text' : 'password'}
                    required
                    placeholder="Repite la nueva contraseña"
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>

                {/* Alternar visibilidad de contraseñas */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setMostrarClaves(!mostrarClaves)}
                    className="text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5"
                  >
                    <Icono nombre={mostrarClaves ? 'candado' : 'ver'} tamano="xs" ariaHidden={true} />
                    <span>{mostrarClaves ? 'Ocultar' : 'Mostrar'} contraseñas</span>
                  </button>
                </div>

                {/* Checklist de requisitos de seguridad */}
                <div className="rounded-xl border border-panel-border/70 bg-fondo p-3 space-y-1.5 text-[11px]">
                  <p className="font-bold text-texto-secundario uppercase tracking-wider text-[10px]">
                    Requisitos de Seguridad (LDAP / JumpServer):
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <span className={validaciones.longitud ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.longitud ? '✓' : '•'} 16+ caracteres
                    </span>
                    <span className={validaciones.mayuscula ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.mayuscula ? '✓' : '•'} Mayúscula
                    </span>
                    <span className={validaciones.minuscula ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.minuscula ? '✓' : '•'} Minúscula
                    </span>
                    <span className={validaciones.numero ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.numero ? '✓' : '•'} Número
                    </span>
                    <span className={validaciones.simbolo ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.simbolo ? '✓' : '•'} Símbolo (!#$%)
                    </span>
                    <span className={validaciones.coinciden ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.coinciden ? '✓' : '•'} Coinciden
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={cargando || !esValida}
                  className="w-full bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-xs py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer"
                >
                  {cargando ? 'Sincronizando con Directorio…' : 'Actualizar y Sincronizar'}
                </Button>
              </form>
            )}

            {/* FORMULARIO: PESTAÑA RECUPERAR */}
            {modo === 'recuperar' && !exitoMensaje && (
              <form onSubmit={handleSolicitarRecuperacion} className="my-6 space-y-4">
                <Field label="Correo Corporativo">
                  <TextInput
                    type="email"
                    required
                    placeholder="tu-correo@vivaro.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    autoComplete="email"
                  />
                </Field>

                <p className="text-xs text-texto-secundario leading-relaxed">
                  Te enviaremos un correo con un enlace criptográfico firmado. Tendrás 15 minutos para
                  ingresar tu nueva contraseña y sincronizar tus accesos.
                </p>

                <Button
                  type="submit"
                  disabled={cargando || !correo}
                  className="w-full bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-xs py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer"
                >
                  {cargando ? 'Enviando enlace…' : 'Enviar Enlace de Recuperación'}
                </Button>
              </form>
            )}

            {/* FORMULARIO: MODO TOKEN (RESTABLECIMIENTO) */}
            {modo === 'token' && !exitoMensaje && (
              <form onSubmit={handleRestablecerConToken} className="my-6 space-y-3.5">
                <Field label="Correo Confirmado">
                  <TextInput
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    autoComplete="email"
                  />
                </Field>

                <Field label="Nueva Contraseña">
                  <TextInput
                    type={mostrarClaves ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 16 caracteres"
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>

                <Field label="Confirmar Nueva Contraseña">
                  <TextInput
                    type={mostrarClaves ? 'text' : 'password'}
                    required
                    placeholder="Repite la nueva contraseña"
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setMostrarClaves(!mostrarClaves)}
                    className="text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5"
                  >
                    <Icono nombre={mostrarClaves ? 'candado' : 'ver'} tamano="xs" ariaHidden={true} />
                    <span>{mostrarClaves ? 'Ocultar' : 'Mostrar'} contraseñas</span>
                  </button>
                </div>

                {/* Checklist */}
                <div className="rounded-xl border border-panel-border/70 bg-fondo p-3 space-y-1.5 text-[11px]">
                  <p className="font-bold text-texto-secundario uppercase tracking-wider text-[10px]">
                    Requisitos de Seguridad:
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <span className={validaciones.longitud ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.longitud ? '✓' : '•'} 16+ caracteres
                    </span>
                    <span className={validaciones.mayuscula ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.mayuscula ? '✓' : '•'} Mayúscula
                    </span>
                    <span className={validaciones.minuscula ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.minuscula ? '✓' : '•'} Minúscula
                    </span>
                    <span className={validaciones.numero ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.numero ? '✓' : '•'} Número
                    </span>
                    <span className={validaciones.simbolo ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.simbolo ? '✓' : '•'} Símbolo (!#$%)
                    </span>
                    <span className={validaciones.coinciden ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                      {validaciones.coinciden ? '✓' : '•'} Coinciden
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={cargando || !esValida}
                  className="w-full bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-xs py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer"
                >
                  {cargando ? 'Guardando en Directorio…' : 'Restablecer y Guardar'}
                </Button>
              </form>
            )}

            {/* Footer con Enlace a Login */}
            <div className="pt-4 border-t border-panel-border/60 flex items-center justify-between text-xs">
              <Link
                href="/login"
                className="text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5"
              >
                <span>← Volver a Iniciar Sesión</span>
              </Link>
              <span className="text-[11px] text-texto-secundario">Control de Acceso TI</span>
            </div>
          </div>

          {/* PANEL DERECHO: Fotografía Institucional y Respaldo Visual */}
          <div className="relative hidden md:flex md:w-1/2 flex-col justify-end p-8 bg-panel-border/30 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/cover.jpg"
              alt="Instalaciones Corporativas"
              className="absolute inset-0 size-full object-cover brightness-[0.85] contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="relative z-10 space-y-2 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md">
                Gobernanza Centralizada
              </span>
              <h2 className="font-display text-xl font-bold tracking-tight text-white">
                Sincronización Transparente de Identidad
              </h2>
              <p className="text-xs text-white/80 leading-relaxed max-w-sm">
                Cualquier cambio de contraseña se aplica de inmediato en OpenLDAP y se propaga a los
                mecanismos de autologeo de JumpServer y plataformas conectadas.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
