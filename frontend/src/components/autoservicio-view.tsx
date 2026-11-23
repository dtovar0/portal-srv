'use client';

/**
 * Pantalla de Autoservicio de Contraseña — Identidad Authelia.
 *
 * Provee la interfaz institucional de Authelia para:
 * 1. Actualizar contraseña conociendo la actual (con validación MFA opcional/obligatoria).
 * 2. Solicitar enlace de recuperación por correo.
 * 3. Restablecer contraseña mediante token criptográfico y verificación MFA.
 * Sincroniza atómicamente con OpenLDAP y los almacenes de credenciales de JumpServer.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, type AutoservicioConfig } from '@/lib/api';
import { Button, Field, TextInput } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { useToast } from './toast';

export function AutoservicioView() {
  const { avisar } = useToast();

  // Configuración de Autoservicio (identidad Authelia y MFA)
  const [config, setConfig] = useState<AutoservicioConfig | null>(null);

  // Estados de pestaña y modo
  const [modo, setModo] = useState<'cambiar' | 'recuperar' | 'token'>('cambiar');
  const [cargando, setCargando] = useState(false);
  const [exitoMensaje, setExitoMensaje] = useState<string | null>(null);

  // Campos de formulario base
  const [identificador, setIdentificador] = useState('');
  const [correo, setCorreo] = useState('');
  const [token, setToken] = useState('');
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarClaves, setMostrarClaves] = useState(false);

  // Estados de MFA
  const [metodoMfaSeleccionado, setMetodoMfaSeleccionado] = useState<'email' | 'authenticator'>('email');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [enviandoMfa, setEnviandoMfa] = useState(false);
  const [mfaEnviado, setMfaEnviado] = useState(false);
  const [cooldownMfa, setCooldownMfa] = useState(0);

  // Cargar configuración de Authelia al montar
  useEffect(() => {
    let activo = true;
    async function cargarConfiguracion() {
      try {
        const data = await api.autoservicioConfiguracion();
        if (activo) {
          setConfig(data);
          if (data.mfa_tipo === 'authenticator') {
            setMetodoMfaSeleccionado('authenticator');
          } else {
            setMetodoMfaSeleccionado('email');
          }
        }
      } catch (err) {
        console.error('Error al cargar configuración de autoservicio Authelia:', err);
      }
    }
    cargarConfiguracion();
    return () => {
      activo = false;
    };
  }, []);

  // Temporizador para el cooldown de reenvío de código MFA
  useEffect(() => {
    if (cooldownMfa <= 0) return;
    const timer = setInterval(() => {
      setCooldownMfa((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownMfa]);

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

  const mfaRequerido = config?.mfa_enabled ?? false;
  const mfaValido = !mfaRequerido || (mfaCode.trim().length === 6 && /^\d{6}$/.test(mfaCode.trim()));

  // Solicitar código MFA por correo
  const handleSolicitarCodigoMfa = async () => {
    const idUsuario = modo === 'token' ? correo.trim() : identificador.trim();
    if (!idUsuario) {
      avisar('error', 'Ingresa primero tu usuario o correo para recibir el código MFA.');
      return;
    }

    setEnviandoMfa(true);
    try {
      const resp = await api.autoservicioSolicitarMfa(idUsuario);
      setChallengeToken(resp.challenge_token);
      if (resp.masked_email) {
        setMaskedEmail(resp.masked_email);
      }
      setMfaEnviado(true);
      setCooldownMfa(60);
      avisar('success', resp.message || 'Código de verificación enviado por correo.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar el código MFA.';
      avisar('error', msg);
    } finally {
      setEnviandoMfa(false);
    }
  };

  // Manejo de actualización con contraseña actual
  const handleCambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esValida) {
      avisar('error', 'La nueva contraseña no cumple todos los requisitos de seguridad corporativa.');
      return;
    }
    if (mfaRequerido && !mfaValido) {
      avisar('error', 'Ingresa el código numérico de 6 dígitos de autenticación multifactor.');
      return;
    }

    setCargando(true);
    setExitoMensaje(null);
    try {
      const resp = await api.autoservicioCambiar({
        identificador: identificador.trim(),
        current_password: contrasenaActual,
        new_password: nuevaContrasena,
        mfa_code: mfaRequerido ? mfaCode.trim() : undefined,
        challenge_token: mfaRequerido && metodoMfaSeleccionado === 'email' ? challengeToken : undefined,
      });
      setExitoMensaje(resp.message || 'Tu contraseña ha sido actualizada exitosamente en Authelia y sincronizada.');
      avisar('success', 'Contraseña actualizada y sincronizada correctamente.');
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      setMfaCode('');
      setChallengeToken('');
      setMfaEnviado(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la contraseña.';
      avisar('error', msg);
    } finally {
      setCargando(false);
    }
  };

  // Manejo de solicitud de enlace de recuperación
  const handleSolicitarRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !correo.includes('@')) {
      avisar('error', 'Ingresa una dirección de correo corporativo válida.');
      return;
    }
    setCargando(true);
    setExitoMensaje(null);
    try {
      const resp = await api.autoservicioSolicitarRecuperacion({ email: correo.trim() });
      setExitoMensaje(
        resp.message ||
          'Si la cuenta existe en el directorio corporativo, recibirás un enlace de Authelia válido por 15 minutos.'
      );
      avisar('success', 'Solicitud de recuperación procesada.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar recuperación de contraseña.';
      avisar('error', msg);
    } finally {
      setCargando(false);
    }
  };

  // Manejo de restablecimiento con token
  const handleRestablecerConToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esValida) {
      avisar('error', 'La nueva contraseña no cumple todos los requisitos de seguridad corporativa.');
      return;
    }
    if (mfaRequerido && !mfaValido) {
      avisar('error', 'Ingresa el código numérico de 6 dígitos de autenticación multifactor.');
      return;
    }

    setCargando(true);
    setExitoMensaje(null);
    try {
      const resp = await api.autoservicioRestablecer({
        email: correo.trim(),
        token: token.trim(),
        new_password: nuevaContrasena,
        mfa_code: mfaRequerido ? mfaCode.trim() : undefined,
        challenge_token: mfaRequerido && metodoMfaSeleccionado === 'email' ? challengeToken : undefined,
      });
      setExitoMensaje(resp.message || 'Contraseña restablecida exitosamente en Authelia. Ya puedes iniciar sesión.');
      avisar('success', 'Contraseña restablecida correctamente.');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      setMfaCode('');
      setChallengeToken('');
      setMfaEnviado(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña.';
      avisar('error', msg);
    } finally {
      setCargando(false);
    }
  };

  const nombreMarca = config?.brand_name || 'Authelia';
  const tipoMfaEfectivo = config?.mfa_tipo || 'email';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo text-body-text select-none p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`${nombreMarca} — Autoservicio de Contraseña`}
        description="Plataforma de autoservicio de credenciales corporativas e identidad protegida por Authelia Single Sign-On."
        className="sr-only"
      />

      {/* TARJETA SPLIT-CARD FLOTANTE DE IDENTIDAD AUTHELIA */}
      <main className="relative z-10 w-full max-w-4xl">
        <div className="flex flex-col md:flex-row rounded-3xl border border-panel-border bg-superficie shadow-2xl transition-all overflow-hidden">
          {/* PANEL IZQUIERDO: Formulario de Autoservicio */}
          <div className="flex w-full md:w-1/2 flex-col justify-between p-6 sm:p-10">
            {/* Header de Marca: Authelia Identity */}
            <div>
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-aduana-cyan/40 bg-aduana-cyan/10 text-aduana-cyan p-1 shadow-xs">
                    <Icono nombre="escudo" tamano="md" ariaHidden={true} />
                  </span>
                  <div>
                    <span className="font-display text-lg font-bold tracking-tight text-body-text block leading-none">
                      {nombreMarca}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-aduana-cyan">
                      Single Sign-On & MFA
                    </span>
                  </div>
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
                      : 'Recuperar Acceso'}
                </h1>
                <p className="mt-1 text-xs text-texto-secundario leading-relaxed">
                  {modo === 'token'
                    ? 'Establece tu nueva contraseña corporativa para completar la recuperación autorizada por Authelia.'
                    : modo === 'cambiar'
                      ? 'Actualiza tu contraseña corporativa de Authelia. El cambio se sincronizará de forma inmediata con JumpServer y plataformas conectadas.'
                      : 'Solicita un enlace seguro firmado criptográficamente para restablecer tu acceso a Authelia.'}
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
                    className={`flex-1 rounded-lg py-1.5 px-3 text-xs font-bold transition-all cursor-pointer ${
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
                    className={`flex-1 rounded-lg py-1.5 px-3 text-xs font-bold transition-all cursor-pointer ${
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
                  <span>Operación exitosa en Authelia</span>
                </div>
                <p className="text-xs leading-relaxed">{exitoMensaje}</p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-aduana-cyan hover:underline"
                  >
                    Ir al inicio de sesión de Authelia →
                  </Link>
                </div>
              </div>
            ) : null}

            {/* FORMULARIO: PESTAÑA CAMBIAR */}
            {modo === 'cambiar' && !exitoMensaje && (
              <form onSubmit={handleCambiar} className="my-6 space-y-3.5">
                <Field label="Usuario o Correo Authelia">
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
                    className="text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icono nombre={mostrarClaves ? 'candado' : 'ver'} tamano="xs" ariaHidden={true} />
                    <span>{mostrarClaves ? 'Ocultar' : 'Mostrar'} contraseñas</span>
                  </button>
                </div>

                {/* SECCIÓN MFA (si está activo en .env) */}
                {mfaRequerido && (
                  <div className="rounded-xl border border-aduana-cyan/30 bg-aduana-cyan/5 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icono nombre="escudo" tamano="xs" className="text-aduana-cyan" ariaHidden={true} />
                        <span className="font-bold text-aduana-cyan text-xs">
                          Segundo Factor de Autenticación (MFA)
                        </span>
                      </div>
                      {tipoMfaEfectivo === 'ambos' && (
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setMetodoMfaSeleccionado('email')}
                            className={`px-2 py-0.5 rounded ${
                              metodoMfaSeleccionado === 'email'
                                ? 'bg-aduana-cyan text-texto-sobre-accion font-bold'
                                : 'text-texto-secundario'
                            }`}
                          >
                            Correo
                          </button>
                          <button
                            type="button"
                            onClick={() => setMetodoMfaSeleccionado('authenticator')}
                            className={`px-2 py-0.5 rounded ${
                              metodoMfaSeleccionado === 'authenticator'
                                ? 'bg-aduana-cyan text-texto-sobre-accion font-bold'
                                : 'text-texto-secundario'
                            }`}
                          >
                            App
                          </button>
                        </div>
                      )}
                    </div>

                    {metodoMfaSeleccionado === 'email' ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-texto-secundario leading-relaxed">
                          Enviaremos un código de seguridad de 6 dígitos a tu correo corporativo verificado.
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={handleSolicitarCodigoMfa}
                            disabled={enviandoMfa || cooldownMfa > 0 || !identificador.trim()}
                            className="bg-superficie border border-panel-border text-body-text hover:bg-fondo text-xs py-1.5 px-3 rounded-lg font-semibold cursor-pointer shrink-0"
                          >
                            {enviandoMfa
                              ? 'Enviando…'
                              : cooldownMfa > 0
                                ? `Reenviar en ${cooldownMfa}s`
                                : mfaEnviado
                                  ? 'Reenviar código'
                                  : 'Enviar código por correo'}
                          </Button>
                          {maskedEmail && (
                            <span className="text-[11px] text-texto-secundario truncate">
                              Destino: <strong className="text-body-text">{maskedEmail}</strong>
                            </span>
                          )}
                        </div>

                        <Field label="Código de 6 dígitos">
                          <TextInput
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required={mfaRequerido}
                            placeholder="Ej. 123456"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            autoComplete="one-time-code"
                            className="font-mono text-center tracking-widest text-sm"
                          />
                        </Field>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-texto-secundario leading-relaxed">
                          Ingresa el código TOTP de 6 dígitos generado por tu aplicación Authenticator vinculada a Authelia.
                        </p>
                        <Field label="Código Authenticator (TOTP)">
                          <TextInput
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required={mfaRequerido}
                            placeholder="Ej. 654321"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            autoComplete="one-time-code"
                            className="font-mono text-center tracking-widest text-sm"
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                )}

                {/* Checklist de requisitos de seguridad */}
                <div className="rounded-xl border border-panel-border/70 bg-fondo p-3 space-y-1.5 text-[11px]">
                  <p className="font-bold text-texto-secundario uppercase tracking-wider text-[10px]">
                    Política de Seguridad Authelia:
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
                  disabled={cargando || !esValida || (mfaRequerido && !mfaValido)}
                  className="w-full bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-xs py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer"
                >
                  {cargando ? 'Sincronizando con Authelia y Directorio…' : 'Actualizar en Authelia'}
                </Button>
              </form>
            )}

            {/* FORMULARIO: PESTAÑA RECUPERAR */}
            {modo === 'recuperar' && !exitoMensaje && (
              <form onSubmit={handleSolicitarRecuperacion} className="my-6 space-y-4">
                <Field label="Correo Corporativo Authelia">
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
                  Te enviaremos un correo firmado institucional de Authelia con un enlace seguro. Tendrás
                  15 minutos para ingresar tu nueva contraseña corporativa.
                </p>

                <Button
                  type="submit"
                  disabled={cargando || !correo}
                  className="w-full bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-xs py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer"
                >
                  {cargando ? 'Generando enlace seguro…' : 'Enviar Enlace de Authelia'}
                </Button>
              </form>
            )}

            {/* FORMULARIO: MODO TOKEN (RESTABLECIMIENTO) */}
            {modo === 'token' && !exitoMensaje && (
              <form onSubmit={handleRestablecerConToken} className="my-6 space-y-3.5">
                <Field label="Correo Corporativo Confirmado">
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
                    className="text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icono nombre={mostrarClaves ? 'candado' : 'ver'} tamano="xs" ariaHidden={true} />
                    <span>{mostrarClaves ? 'Ocultar' : 'Mostrar'} contraseñas</span>
                  </button>
                </div>

                {/* SECCIÓN MFA EN RESTABLECIMIENTO CON TOKEN (si está activo) */}
                {mfaRequerido && (
                  <div className="rounded-xl border border-aduana-cyan/30 bg-aduana-cyan/5 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icono nombre="escudo" tamano="xs" className="text-aduana-cyan" ariaHidden={true} />
                        <span className="font-bold text-aduana-cyan text-xs">
                          Segundo Factor de Autenticación (MFA)
                        </span>
                      </div>
                      {tipoMfaEfectivo === 'ambos' && (
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setMetodoMfaSeleccionado('email')}
                            className={`px-2 py-0.5 rounded ${
                              metodoMfaSeleccionado === 'email'
                                ? 'bg-aduana-cyan text-texto-sobre-accion font-bold'
                                : 'text-texto-secundario'
                            }`}
                          >
                            Correo
                          </button>
                          <button
                            type="button"
                            onClick={() => setMetodoMfaSeleccionado('authenticator')}
                            className={`px-2 py-0.5 rounded ${
                              metodoMfaSeleccionado === 'authenticator'
                                ? 'bg-aduana-cyan text-texto-sobre-accion font-bold'
                                : 'text-texto-secundario'
                            }`}
                          >
                            App
                          </button>
                        </div>
                      )}
                    </div>

                    {metodoMfaSeleccionado === 'email' ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-texto-secundario leading-relaxed">
                          Enviaremos un código de seguridad de 6 dígitos a tu correo verificado.
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={handleSolicitarCodigoMfa}
                            disabled={enviandoMfa || cooldownMfa > 0 || !correo.trim()}
                            className="bg-superficie border border-panel-border text-body-text hover:bg-fondo text-xs py-1.5 px-3 rounded-lg font-semibold cursor-pointer shrink-0"
                          >
                            {enviandoMfa
                              ? 'Enviando…'
                              : cooldownMfa > 0
                                ? `Reenviar en ${cooldownMfa}s`
                                : mfaEnviado
                                  ? 'Reenviar código'
                                  : 'Enviar código por correo'}
                          </Button>
                          {maskedEmail && (
                            <span className="text-[11px] text-texto-secundario truncate">
                              Destino: <strong className="text-body-text">{maskedEmail}</strong>
                            </span>
                          )}
                        </div>

                        <Field label="Código de 6 dígitos">
                          <TextInput
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required={mfaRequerido}
                            placeholder="Ej. 123456"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            autoComplete="one-time-code"
                            className="font-mono text-center tracking-widest text-sm"
                          />
                        </Field>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-texto-secundario leading-relaxed">
                          Ingresa el código TOTP de 6 dígitos generado por tu aplicación Authenticator vinculada.
                        </p>
                        <Field label="Código Authenticator (TOTP)">
                          <TextInput
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required={mfaRequerido}
                            placeholder="Ej. 654321"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            autoComplete="one-time-code"
                            className="font-mono text-center tracking-widest text-sm"
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                )}

                {/* Checklist */}
                <div className="rounded-xl border border-panel-border/70 bg-fondo p-3 space-y-1.5 text-[11px]">
                  <p className="font-bold text-texto-secundario uppercase tracking-wider text-[10px]">
                    Política de Seguridad Authelia:
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
                  disabled={cargando || !esValida || (mfaRequerido && !mfaValido)}
                  className="w-full bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-xs py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer"
                >
                  {cargando ? 'Restableciendo en Authelia…' : 'Restablecer en Authelia'}
                </Button>
              </form>
            )}

            {/* Footer con Enlace a Login de Authelia */}
            <div className="pt-4 border-t border-panel-border/60 flex items-center justify-between text-xs">
              <Link
                href="/login"
                className="text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5"
              >
                <span>← Volver al inicio de sesión de Authelia</span>
              </Link>
              <span className="text-[11px] text-texto-secundario">Authelia Identity SSO</span>
            </div>
          </div>

          {/* PANEL DERECHO: Identidad Authelia y Seguridad */}
          <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-8 bg-panel-border/30 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/cover.jpg"
              alt="Authelia Identity Platform"
              className="absolute inset-0 size-full object-cover brightness-[0.7] contrast-[1.1]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

            {/* Encabezado Superior del Panel Derecho */}
            <div className="relative z-10 flex items-center justify-between text-white/90">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-aduana-cyan text-black font-bold">
                  <Icono nombre="escudo" tamano="sm" ariaHidden={true} />
                </span>
                <span className="font-display font-extrabold text-sm tracking-wide text-white">
                  AUTHELIA SSO
                </span>
              </div>
              <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                FIPS / Zero Trust
              </span>
            </div>

            {/* Pie Informativo de Seguridad del Panel Derecho */}
            <div className="relative z-10 space-y-3 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-aduana-cyan/20 border border-aduana-cyan/40 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-aduana-cyan backdrop-blur-md">
                Gobernanza de Identidad
              </span>
              <h2 className="font-display text-xl font-bold tracking-tight text-white leading-snug">
                Portal Oficial de Autoservicio de Authelia
              </h2>
              <p className="text-xs text-white/80 leading-relaxed max-w-sm">
                Authelia protege tus accesos a sistemas críticos. Cualquier actualización de contraseña
                se aplica atómicamente a OpenLDAP y actualiza las credenciales autorizadas en JumpServer
                sin requerir intervención manual.
              </p>
              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] text-white/70">
                <div className="flex items-center gap-1.5">
                  <Icono nombre="aprobar" tamano="xs" className="text-aduana-cyan" ariaHidden={true} />
                  <span>Doble factor (MFA)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icono nombre="aprobar" tamano="xs" className="text-aduana-cyan" ariaHidden={true} />
                  <span>Tokens con expiración</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icono nombre="aprobar" tamano="xs" className="text-aduana-cyan" ariaHidden={true} />
                  <span>Sincronización LDAP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icono nombre="aprobar" tamano="xs" className="text-aduana-cyan" ariaHidden={true} />
                  <span>Cifrado SHA-512 / Argon2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
