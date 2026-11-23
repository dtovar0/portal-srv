'use client';

/**
 * Autoservicio de Contraseña — Identidad Authelia.
 *
 * Flujo guiado por pasos (Stepper):
 * Paso 1: Introducir usuario o correo corporativo.
 * Paso 2: Validación de identidad mediante código MFA (correo o Authenticator según .env).
 * Paso 3: Definir nueva contraseña o generar una clave segura con política institucional.
 * Paso 4: Confirmación de actualización exitosa y notificación remitida por correo.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, type AutoservicioConfig } from '@/lib/api';
import { generarContrasenaSegura } from '@/lib/generador-contrasena';
import { Button, Field, TextInput } from './form';
import { Icono } from './icono';
import { PageHeader } from './page-header';
import { useToast } from './toast';

export function AutoservicioView() {
  const { avisar } = useToast();

  // Configuración institucional cargada desde el backend (.env)
  const [config, setConfig] = useState<AutoservicioConfig | null>(null);

  // Control de pasos del flujo (1: Usuario, 2: MFA, 3: Contraseña, 4: Éxito)
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [cargando, setCargando] = useState(false);

  // Datos del formulario
  const [identificador, setIdentificador] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [cooldownMfa, setCooldownMfa] = useState(0);
  const [enviandoMfa, setEnviandoMfa] = useState(false);

  // Contraseñas
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarClaves, setMostrarClaves] = useState(false);

  // Soporte para enlace con token temporal si proviene de correo
  const [tokenRecuperacion, setTokenRecuperacion] = useState('');
  const [correoToken, setCorreoToken] = useState('');

  // Cargar configuración de Authelia (.env) al montar
  useEffect(() => {
    let activo = true;
    async function cargarConfiguracion() {
      try {
        const data = await api.autoservicioConfiguracion();
        if (activo) {
          setConfig(data);
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

  // Si se recibe token en la URL, avanzar directo al paso 3
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      const emailParam = params.get('email');
      if (tokenParam) {
        setTokenRecuperacion(tokenParam);
        if (emailParam) setCorreoToken(emailParam);
        setPaso(3);
      }
    }
  }, []);

  // Validación de requisitos de política en tiempo real
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

  const contrasenaValida =
    validaciones.longitud &&
    validaciones.mayuscula &&
    validaciones.minuscula &&
    validaciones.numero &&
    validaciones.simbolo &&
    validaciones.coinciden;

  const tipoMfa = config?.mfa_tipo || 'email';
  const esPorCorreo = tipoMfa === 'email' || tipoMfa === 'ambos';

  // Generador de contraseñas de alta seguridad (24 caracteres)
  const handleGenerarContrasena = () => {
    try {
      const clave = generarContrasenaSegura(24);
      setNuevaContrasena(clave);
      setConfirmarContrasena(clave);
      setMostrarClaves(true);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(clave).catch(() => {});
      }
      avisar('success', 'Contraseña de 24 caracteres generada y copiada al portapapeles.');
    } catch {
      avisar('error', 'No se pudo generar la contraseña.');
    }
  };

  // Reenviar código por correo en Paso 2
  const handleReenviarCodigo = async () => {
    const id = identificador.trim();
    if (!id) return;
    setEnviandoMfa(true);
    try {
      const resp = await api.autoservicioSolicitarMfa(id);
      if (resp.challenge_token) setChallengeToken(resp.challenge_token);
      if (resp.masked_email) setMaskedEmail(resp.masked_email);
      setCooldownMfa(60);
      avisar('success', resp.message || 'Código de seguridad reenviado por correo.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar el código.';
      avisar('error', msg);
    } finally {
      setEnviandoMfa(false);
    }
  };

  // Paso 1: Envío de usuario y avance a Paso 2
  const handlePaso1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = identificador.trim();
    if (!id) {
      avisar('error', 'Introduce tu usuario o correo corporativo.');
      return;
    }

    // Si el MFA configurado es por correo, solicitar el código inmediatamente
    if (esPorCorreo) {
      setCargando(true);
      try {
        const resp = await api.autoservicioSolicitarMfa(id);
        if (resp.challenge_token) setChallengeToken(resp.challenge_token);
        if (resp.masked_email) setMaskedEmail(resp.masked_email);
        setCooldownMfa(60);
        avisar('success', 'Código de verificación enviado a tu correo corporativo.');
        setPaso(2);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud.';
        avisar('error', msg);
      } finally {
        setCargando(false);
      }
    } else {
      // MFA por Authenticator (TOTP)
      setPaso(2);
    }
  };

  // Paso 2: Validación de código MFA y avance a Paso 3
  const handlePaso2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = mfaCode.trim();
    if (!codigo || codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
      avisar('error', 'Ingresa el código numérico de 6 dígitos.');
      return;
    }

    setCargando(true);
    try {
      await api.autoservicioVerificarMfa({
        identificador: identificador.trim(),
        mfa_code: codigo,
        challenge_token: challengeToken || undefined,
      });
      avisar('success', 'Identidad confirmada correctamente.');
      setPaso(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código de seguridad incorrecto o expirado.';
      avisar('error', msg);
    } finally {
      setCargando(false);
    }
  };

  // Paso 3: Aplicación de nueva contraseña y sincronización
  const handlePaso3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrasenaValida) {
      avisar('error', 'La contraseña no cumple con todos los requisitos de seguridad.');
      return;
    }

    setCargando(true);
    try {
      if (tokenRecuperacion) {
        // Modo restablecimiento mediante token de correo previo
        await api.autoservicioRestablecer({
          email: correoToken.trim(),
          token: tokenRecuperacion.trim(),
          new_password: nuevaContrasena,
          mfa_code: mfaCode.trim() || undefined,
          challenge_token: challengeToken || undefined,
        });
      } else {
        // Flujo principal guiado con MFA
        await api.autoservicioRestablecerMfa({
          identifier: identificador.trim(),
          new_password: nuevaContrasena,
          mfa_code: mfaCode.trim(),
          challenge_token: challengeToken || undefined,
        });
      }

      avisar('success', 'Contraseña actualizada y sincronizada correctamente.');
      setPaso(4);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña.';
      avisar('error', msg);
    } finally {
      setCargando(false);
    }
  };

  // Reiniciar flujo
  const handleReiniciar = () => {
    setIdentificador('');
    setMfaCode('');
    setChallengeToken('');
    setMaskedEmail('');
    setNuevaContrasena('');
    setConfirmarContrasena('');
    setTokenRecuperacion('');
    setCorreoToken('');
    setPaso(1);
  };

  const nombreMarca = config?.brand_name || 'Authelia';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo text-body-text select-none p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`${nombreMarca} — Autoservicio de Contraseña`}
        description="Portal oficial de autoservicio de credenciales corporativas protegido por Authelia Single Sign-On."
        className="sr-only"
      />

      <main className="relative z-10 w-full max-w-xl">
        <div className="rounded-3xl border border-panel-border bg-superficie shadow-2xl transition-all overflow-hidden p-6 sm:p-10">
          {/* Encabezado Institucional Authelia */}
          <div className="flex items-center justify-between pb-6 border-b border-panel-border/70">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-aduana-cyan/40 bg-aduana-cyan/10 text-aduana-cyan p-1.5 shadow-xs">
                <Icono nombre="escudo" tamano="md" ariaHidden={true} />
              </span>
              <div>
                <span className="font-display text-lg font-bold tracking-tight text-body-text block leading-tight">
                  {nombreMarca}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-aduana-cyan">
                  Identity Platform · SSO & MFA
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-panel-border bg-fondo px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-texto-secundario">
              <Icono nombre="candado" tamano="xs" ariaHidden={true} />
              Autoservicio
            </span>
          </div>

          {/* Stepper / Indicador de Progreso Visual (Paso 1, 2, 3) */}
          {paso < 4 && (
            <nav aria-label="Progreso del autoservicio" className="my-7">
              <ol className="flex items-center w-full">
                {/* Paso 1 */}
                <li className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center size-9 rounded-full font-bold text-xs shrink-0 transition-all ${
                      paso >= 1
                        ? 'bg-aduana-cyan text-texto-sobre-accion ring-4 ring-aduana-cyan/20'
                        : 'bg-panel-border text-texto-secundario'
                    }`}
                  >
                    {paso > 1 ? '✓' : '1'}
                  </div>
                  <div className="ml-2.5 hidden sm:block">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${paso >= 1 ? 'text-aduana-cyan' : 'text-texto-secundario'}`}>
                      Paso 1
                    </p>
                    <p className="text-xs font-semibold text-body-text leading-tight">Identificación</p>
                  </div>
                  <div
                    className={`flex-1 mx-3 sm:mx-4 h-0.5 transition-colors ${
                      paso >= 2 ? 'bg-aduana-cyan' : 'bg-panel-border'
                    }`}
                  />
                </li>

                {/* Paso 2 */}
                <li className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center size-9 rounded-full font-bold text-xs shrink-0 transition-all ${
                      paso >= 2
                        ? 'bg-aduana-cyan text-texto-sobre-accion ring-4 ring-aduana-cyan/20'
                        : 'bg-panel-border text-texto-secundario'
                    }`}
                  >
                    {paso > 2 ? '✓' : '2'}
                  </div>
                  <div className="ml-2.5 hidden sm:block">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${paso >= 2 ? 'text-aduana-cyan' : 'text-texto-secundario'}`}>
                      Paso 2
                    </p>
                    <p className="text-xs font-semibold text-body-text leading-tight">Código MFA</p>
                  </div>
                  <div
                    className={`flex-1 mx-3 sm:mx-4 h-0.5 transition-colors ${
                      paso >= 3 ? 'bg-aduana-cyan' : 'bg-panel-border'
                    }`}
                  />
                </li>

                {/* Paso 3 */}
                <li className="flex items-center">
                  <div
                    className={`flex items-center justify-center size-9 rounded-full font-bold text-xs shrink-0 transition-all ${
                      paso >= 3
                        ? 'bg-aduana-cyan text-texto-sobre-accion ring-4 ring-aduana-cyan/20'
                        : 'bg-panel-border text-texto-secundario'
                    }`}
                  >
                    {paso > 3 ? '✓' : '3'}
                  </div>
                  <div className="ml-2.5 hidden sm:block">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${paso >= 3 ? 'text-aduana-cyan' : 'text-texto-secundario'}`}>
                      Paso 3
                    </p>
                    <p className="text-xs font-semibold text-body-text leading-tight">Contraseña</p>
                  </div>
                </li>
              </ol>
            </nav>
          )}

          {/* ========================================================= */}
          {/* PASO 1: INTRODUCIR USUARIO O CORREO                       */}
          {/* ========================================================= */}
          {paso === 1 && (
            <form onSubmit={handlePaso1Submit} className="space-y-5">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-body-text">
                  Introduce tu usuario o correo
                </h1>
                <p className="mt-1.5 text-xs text-texto-secundario leading-relaxed">
                  Ingresa tu cuenta corporativa para iniciar el restablecimiento seguro de tu contraseña.
                </p>
              </div>

              <div className="rounded-xl border border-aduana-cyan/30 bg-aduana-cyan/5 p-3 flex items-start gap-2.5 text-xs text-body-text">
                <Icono nombre="escudo" tamano="sm" className="text-aduana-cyan shrink-0 mt-0.5" ariaHidden={true} />
                <div className="leading-relaxed">
                  <strong className="text-aduana-cyan">Sin necesidad de clave anterior: </strong>
                  <span>
                    Si tu contraseña expiró o la olvidaste, validaremos tu identidad mediante tu segundo factor de
                    autenticación (MFA) en el siguiente paso.
                  </span>
                </div>
              </div>

              <Field label="Usuario o Correo Authelia">
                <TextInput
                  type="text"
                  required
                  autoFocus
                  placeholder="ej. usuario@vivaro.com o jdoe"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  autoComplete="username"
                />
              </Field>

              <Button
                type="submit"
                disabled={cargando || !identificador.trim()}
                className="w-full bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-sm py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <Icono nombre="recargar" tamano="xs" className="animate-spin" ariaHidden={true} />
                    <span>Preparando verificación…</span>
                  </>
                ) : (
                  <span>Continuar al Paso 2 →</span>
                )}
              </Button>
            </form>
          )}

          {/* ========================================================= */}
          {/* PASO 2: ENVIAR/VALIDAR CÓDIGO MFA                         */}
          {/* ========================================================= */}
          {paso === 2 && (
            <form onSubmit={handlePaso2Submit} className="space-y-5">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-body-text">
                  Validación de Segundo Factor (MFA)
                </h1>
                <p className="mt-1.5 text-xs text-texto-secundario leading-relaxed">
                  {esPorCorreo
                    ? 'Hemos enviado un código numérico de 6 dígitos a tu buzón corporativo.'
                    : 'Ingresa el código temporal de 6 dígitos de tu aplicación Authenticator (Google / Microsoft).'}
                </p>
              </div>

              {/* Detalle del destino / cuenta */}
              <div className="rounded-xl border border-panel-border bg-fondo p-3 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Icono nombre="usuarios" tamano="xs" className="text-aduana-cyan shrink-0" ariaHidden={true} />
                  <span className="text-texto-secundario truncate">
                    Usuario: <strong className="text-body-text">{identificador}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="text-aduana-cyan hover:underline text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Cambiar
                </button>
              </div>

              {/* Alerta de correo enviado si aplica */}
              {esPorCorreo && (
                <div className="rounded-xl border border-aduana-cyan/30 bg-aduana-cyan/5 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-texto-secundario">
                      Destino: <strong className="text-body-text">{maskedEmail || identificador}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleReenviarCodigo}
                      disabled={enviandoMfa || cooldownMfa > 0}
                      className="text-aduana-cyan hover:underline font-semibold text-[11px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {enviandoMfa
                        ? 'Enviando…'
                        : cooldownMfa > 0
                          ? `Reenviar en ${cooldownMfa}s`
                          : 'Reenviar código'}
                    </button>
                  </div>
                  <p className="text-[11px] text-texto-secundario leading-relaxed">
                    Revisa tu bandeja de entrada o carpeta de spam. El código expira en 10 minutos.
                  </p>
                </div>
              )}

              <Field label="Código de Seguridad (6 dígitos)">
                <TextInput
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                  className="font-mono text-center tracking-widest text-lg h-14"
                />
              </Field>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="flex-1 bg-superficie border border-panel-border text-body-text hover:bg-fondo text-xs py-3 rounded-xl font-semibold cursor-pointer"
                >
                  ← Volver
                </Button>
                <Button
                  type="submit"
                  disabled={cargando || mfaCode.trim().length !== 6}
                  className="flex-2 bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-sm py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {cargando ? (
                    <>
                      <Icono nombre="recargar" tamano="xs" className="animate-spin" ariaHidden={true} />
                      <span>Verificando código…</span>
                    </>
                  ) : (
                    <span>Validar y Continuar al Paso 3 →</span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* PASO 3: NUEVA CONTRASEÑA O GENERADOR                      */}
          {/* ========================================================= */}
          {paso === 3 && (
            <form onSubmit={handlePaso3Submit} className="space-y-4">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-body-text">
                  Establecer Nueva Contraseña
                </h1>
                <p className="mt-1 text-xs text-texto-secundario leading-relaxed">
                  Ingresa tu nueva clave institucional o genera una automáticamente de 24 caracteres.
                </p>
              </div>

              <Field label="Nueva Contraseña">
                <TextInput
                  type={mostrarClaves ? 'text' : 'password'}
                  required
                  autoFocus
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

              {/* Barra de utilidades: Ver contraseñas y Generar contraseña */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setMostrarClaves(!mostrarClaves)}
                  className="text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Icono nombre={mostrarClaves ? 'candado' : 'ver'} tamano="xs" ariaHidden={true} />
                  <span>{mostrarClaves ? 'Ocultar' : 'Mostrar'} contraseñas</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerarContrasena}
                  className="text-aduana-cyan hover:underline transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
                  title="Genera una contraseña criptográficamente segura de 24 caracteres"
                >
                  <Icono nombre="recargar" tamano="xs" ariaHidden={true} />
                  <span>Generar contraseña segura</span>
                </button>
              </div>

              {/* Checklist de requisitos de seguridad */}
              <div className="rounded-xl border border-panel-border/80 bg-fondo p-3 space-y-2 text-[11px]">
                <p className="font-bold text-texto-secundario uppercase tracking-wider text-[10px]">
                  Política de Seguridad Corporativa:
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
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

              <div className="flex items-center gap-3 pt-2">
                {!tokenRecuperacion && (
                  <Button
                    type="button"
                    onClick={() => setPaso(2)}
                    className="flex-1 bg-superficie border border-panel-border text-body-text hover:bg-fondo text-xs py-3 rounded-xl font-semibold cursor-pointer"
                  >
                    ← Volver
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={cargando || !contrasenaValida}
                  className="flex-2 w-full bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-sm py-3 rounded-xl border-0 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {cargando ? (
                    <>
                      <Icono nombre="recargar" tamano="xs" className="animate-spin" ariaHidden={true} />
                      <span>Actualizando y sincronizando…</span>
                    </>
                  ) : (
                    <span>Cambiar Contraseña</span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* PASO 4: CONFIRMACIÓN Y NOTIFICACIÓN EXITOSA               */}
          {/* ========================================================= */}
          {paso === 4 && (
            <div className="text-center py-4 space-y-5">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-exito-tenue border border-exito-borde text-exito-texto shadow-sm">
                <Icono nombre="aprobar" tamano="lg" ariaHidden={true} />
              </div>

              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-body-text">
                  ¡Contraseña Actualizada con Éxito!
                </h1>
                <p className="mt-2 text-xs text-texto-secundario leading-relaxed max-w-md mx-auto">
                  Tu nueva contraseña corporativa ha sido aplicada y sincronizada atómicamente en{' '}
                  <strong className="text-body-text">Authelia SSO</strong>,{' '}
                  <strong className="text-body-text">OpenLDAP</strong> y{' '}
                  <strong className="text-body-text">JumpServer</strong>.
                </p>
              </div>

              {/* Notificación de correo de confirmación */}
              <div className="rounded-2xl border border-panel-border bg-fondo p-4 text-left flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-aduana-cyan/10 text-aduana-cyan mt-0.5">
                  <Icono nombre="campana" tamano="sm" ariaHidden={true} />
                </span>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-body-text">Notificación de confirmación enviada</p>
                  <p className="text-texto-secundario leading-relaxed">
                    Se ha enviado un correo a tu buzón institucional confirmando que la contraseña fue actualizada
                    correctamente.
                  </p>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/login"
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-aduana-cyan hover:bg-aduana-cyan-hover text-texto-sobre-accion font-bold text-sm py-3 px-4 rounded-xl border-0 shadow-md transition-all text-center"
                >
                  <span>Iniciar Sesión en Authelia →</span>
                </Link>
                <button
                  type="button"
                  onClick={handleReiniciar}
                  className="w-full sm:w-auto text-xs text-texto-secundario hover:text-body-text font-semibold py-2 px-4 transition-colors cursor-pointer"
                >
                  Restablecer otra cuenta
                </button>
              </div>
            </div>
          )}

          {/* Pie de página con enlace de retorno */}
          <div className="mt-8 pt-4 border-t border-panel-border/60 flex items-center justify-between text-xs">
            <Link
              href="/login"
              className="text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5"
            >
              <span>← Volver al login</span>
            </Link>
            <span className="text-[11px] text-texto-secundario">Authelia Identity SSO</span>
          </div>
        </div>
      </main>
    </div>
  );
}
