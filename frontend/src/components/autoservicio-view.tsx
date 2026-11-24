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

  const longitudRequerida = config?.politica?.min_length || 16;
  const longitudGenerada = config?.password_length || longitudRequerida;

  // Validación de requisitos de política en tiempo real
  const validaciones = useMemo(() => {
    return {
      longitud: nuevaContrasena.length >= longitudRequerida,
      mayuscula: /[A-Z]/.test(nuevaContrasena),
      minuscula: /[a-z]/.test(nuevaContrasena),
      numero: /[0-9]/.test(nuevaContrasena),
      simbolo: /[!#$%&()*+,\-./:;<=>?@[\]^_{}~]/.test(nuevaContrasena),
      coinciden: nuevaContrasena.length > 0 && nuevaContrasena === confirmarContrasena,
    };
  }, [nuevaContrasena, confirmarContrasena, longitudRequerida]);

  const contrasenaValida =
    validaciones.longitud &&
    validaciones.mayuscula &&
    validaciones.minuscula &&
    validaciones.numero &&
    validaciones.simbolo &&
    validaciones.coinciden;

  const tipoMfa = config?.mfa_tipo || 'email';
  const esPorCorreo = tipoMfa === 'email' || tipoMfa === 'ambos';

  // Generador de contraseñas de alta seguridad
  const handleGenerarContrasena = () => {
    try {
      const clave = generarContrasenaSegura(longitudGenerada);
      setNuevaContrasena(clave);
      setConfirmarContrasena(clave);
      setMostrarClaves(true);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(clave).catch(() => { });
      }
      avisar('success', `Contraseña de ${longitudGenerada} caracteres generada y copiada al portapapeles.`);
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

  const nombreMarca = config?.brand_name || 'Authelia';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-fondo text-body-text p-4 sm:p-6">
      <PageHeader
        title={`${nombreMarca} — Autoservicio de Contraseña`}
        description="Portal oficial de autoservicio de credenciales corporativas protegido por Authelia Single Sign-On."
        className="sr-only"
      />

      <main className="relative z-10 w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-3xl border border-panel-border bg-superficie shadow-2 md:h-185 md:grid-cols-2">
          <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-brand to-accent p-6 text-texto-sobre-accion sm:p-8 md:p-10" aria-label="Authelia, identidad corporativa">
            <div className="absolute -right-20 -top-20 size-64 rounded-full border border-arte-luz/15 bg-arte-luz/10" aria-hidden="true" />
            <div className="absolute -bottom-28 -left-20 size-72 rounded-full border border-arte-luz/10 bg-arte-luz/5" aria-hidden="true" />

            <div className="relative flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl border border-arte-luz/25 bg-arte-luz/15 shadow-xs backdrop-blur-sm">
                <Icono nombre="escudo" tamano="lg" ariaHidden={true} />
              </span>
              <div>
                <p className="font-display text-xl font-extrabold tracking-tight">{nombreMarca}</p>
                <p className="text-xs font-semibold text-arte-luz/75">Identity Platform · SSO & MFA</p>
              </div>
            </div>

            <div className="relative my-8 md:my-auto">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-arte-luz/70">Autoservicio seguro</p>
              <h2 className="max-w-sm font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Recupera el acceso a tu cuenta
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-arte-luz/80">
                Verifica tu identidad y crea una contraseña nueva en un flujo protegido por segundo factor.
              </p>

              <ul className="mt-6 hidden space-y-3 text-sm font-semibold text-arte-luz/90 md:block">
                <li className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-arte-luz/15"><Icono nombre="aprobar" tamano="xs" ariaHidden={true} /></span>
                  Verificación de identidad
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-arte-luz/15"><Icono nombre="aprobar" tamano="xs" ariaHidden={true} /></span>
                  Protección MFA
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-arte-luz/15"><Icono nombre="aprobar" tamano="xs" ariaHidden={true} /></span>
                  Sincronización corporativa
                </li>
              </ul>
            </div>

            <p className="relative hidden text-xs text-arte-luz/65 md:block">Acceso protegido por Authelia</p>
          </aside>

          <section className="flex min-w-0 flex-col p-5 sm:p-8 md:overflow-y-auto md:p-10">
          {/* Encabezado Institucional Authelia */}
          <div className="flex items-center justify-between pb-5 border-b border-panel-border/70">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accion-tenue text-texto-enlace p-1.5">
                <Icono nombre="escudo" tamano="md" ariaHidden={true} />
              </span>
              <div>
                <span className="font-display text-lg font-bold tracking-tight text-body-text block leading-tight">
                  {nombreMarca}
                </span>
                <span className="text-xs text-texto-secundario">
                  Autoservicio de identidad
                </span>
              </div>
            </div>
            <Icono nombre="candado" tamano="sm" className="text-texto-secundario" ariaHidden={true} />
          </div>

          {/* Stepper / Indicador de Progreso Visual (Paso 1, 2, 3) */}
          {paso < 4 && (
            <nav aria-label={`Paso ${paso} de 3`} className="my-5">
              <ol className="flex items-center w-full">
                {/* Paso 1 */}
                <li className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center size-7 rounded-full font-bold text-xs shrink-0 transition-all ${paso >= 1
                        ? 'bg-accion text-texto-sobre-accion'
                        : 'bg-panel-border text-texto-secundario'
                      }`}
                  >
                    {paso > 1 ? '✓' : '1'}
                  </div>
                  <div
                    className={`flex-1 mx-2 h-px transition-colors ${paso >= 2 ? 'bg-accion' : 'bg-panel-border'
                      }`}
                  />
                </li>

                {/* Paso 2 */}
                <li className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center size-7 rounded-full font-bold text-xs shrink-0 transition-all ${paso >= 2
                        ? 'bg-accion text-texto-sobre-accion'
                        : 'bg-panel-border text-texto-secundario'
                      }`}
                  >
                    {paso > 2 ? '✓' : '2'}
                  </div>
                  <div
                    className={`flex-1 mx-2 h-px transition-colors ${paso >= 3 ? 'bg-accion' : 'bg-panel-border'
                      }`}
                  />
                </li>

                {/* Paso 3 */}
                <li className="flex items-center">
                  <div
                    className={`flex items-center justify-center size-7 rounded-full font-bold text-xs shrink-0 transition-all ${paso >= 3
                        ? 'bg-accion text-texto-sobre-accion'
                        : 'bg-panel-border text-texto-secundario'
                      }`}
                  >
                    {paso > 3 ? '✓' : '3'}
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
                <PageHeader titleClassName="font-display text-xl font-bold tracking-tight text-body-text" title="Introduce tu usuario o correo" />
                <p className="mt-1.5 text-sm text-texto-secundario leading-relaxed">Verificaremos tu identidad antes de crear una nueva contraseña.</p>
              </div>

              <Field label="Usuario o correo Authelia">
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
                className="min-h-12 w-full bg-accion hover:bg-accion-hover active:scale-[0.98] text-texto-sobre-accion font-bold text-sm py-3 rounded-xl border-0 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <Icono nombre="recargar" tamano="xs" className="animate-spin" ariaHidden={true} />
                    <span>Preparando verificación…</span>
                  </>
                ) : (
                  <span>Continuar →</span>
                )}
              </Button>
            </form>
          )}

          {/* ========================================================= */}
          {/* PASO 2: ENVIAR/VALIDAR CÓDIGO MFA                         */}
          {/* ========================================================= */}
          {paso === 2 && (
            <form onSubmit={handlePaso2Submit} className="space-y-4">
              <div>
                <PageHeader titleClassName="font-display text-xl font-bold tracking-tight text-body-text" title="Código de verificación" />
                <p className="mt-1 text-xs text-texto-secundario leading-relaxed">
                  {esPorCorreo
                    ? 'Ingresa el código numérico de 6 dígitos enviado a tu correo corporativo.'
                    : 'Ingresa el código temporal de 6 dígitos de tu aplicación Authenticator.'}
                </p>
              </div>

              {/* Tarjeta única y consolidada de información */}
              <div className="rounded-xl border border-panel-border/80 bg-fondo/60 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <Icono nombre="correo" tamano="xs" className="text-texto-enlace shrink-0" ariaHidden={true} />
                    <span className="text-texto-secundario truncate">
                      Código enviado a <strong className="text-body-text">{maskedEmail || identificador}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaso(1)}
                    className="min-w-12 min-h-12 inline-flex items-center text-texto-enlace hover:underline text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>

                {esPorCorreo && (
                  <div className="flex items-center justify-between pt-1 border-t border-panel-border/40 text-xs text-texto-secundario">
                    <span>Válido por {config?.mfa_ttl_minutos || 10} min</span>
                    <button
                      type="button"
                      onClick={handleReenviarCodigo}
                      disabled={enviandoMfa || cooldownMfa > 0}
                      className="min-w-12 min-h-12 inline-flex items-center text-texto-enlace hover:underline font-semibold disabled:opacity-deshabilitada disabled:cursor-not-allowed cursor-pointer"
                    >
                      {enviandoMfa
                        ? 'Enviando…'
                        : cooldownMfa > 0
                          ? `Reenviar en ${cooldownMfa}s`
                          : 'Reenviar código'}
                    </button>
                  </div>
                )}
              </div>

              <Field label="Código de seguridad (6 dígitos)">
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
                  className="font-mono text-center tracking-[0.35em] text-xl font-bold h-13"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="min-h-12 w-full px-4 py-3 bg-transparent border border-panel-border/70 hover:bg-panel-border/20 text-texto-secundario hover:text-body-text text-sm rounded-xl font-semibold transition-all cursor-pointer"
                >
                  ← Volver
                </Button>
                <Button
                  type="submit"
                  disabled={cargando || mfaCode.trim().length !== 6}
                  className="min-h-12 w-full bg-accion hover:bg-accion-hover active:scale-[0.98] text-texto-sobre-accion font-bold text-sm py-3 rounded-xl border-0 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {cargando ? (
                    <>
                      <Icono nombre="recargar" tamano="xs" className="animate-spin" ariaHidden={true} />
                      <span>Verificando código…</span>
                    </>
                  ) : (
                    <span>Continuar →</span>
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
                <PageHeader titleClassName="font-display text-xl font-bold tracking-tight text-body-text" title="Nueva contraseña" />
                <p className="mt-1 text-xs text-texto-secundario leading-relaxed">
                  Usa una clave nueva y segura. También puedes generar una automáticamente.
                </p>
              </div>

              <Field label="Nueva contraseña">
                <TextInput
                  type={mostrarClaves ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder={`Mínimo ${longitudRequerida} caracteres`}
                  value={nuevaContrasena}
                  onChange={(e) => setNuevaContrasena(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>

              <Field label="Confirmar nueva contraseña">
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
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
                <button
                  type="button"
                  onClick={() => setMostrarClaves(!mostrarClaves)}
                  className="min-w-12 min-h-12 text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Icono nombre={mostrarClaves ? 'candado' : 'ver'} tamano="xs" ariaHidden={true} />
                  <span>{mostrarClaves ? 'Ocultar' : 'Mostrar'} contraseñas</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerarContrasena}
                  className="min-w-12 min-h-12 text-texto-enlace hover:underline transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
                  title={`Genera una contraseña criptográficamente segura de ${longitudGenerada} caracteres`}
                >
                  <Icono nombre="recargar" tamano="xs" ariaHidden={true} />
                  <span>Generar clave</span>
                </button>
              </div>

              {/* Checklist de requisitos de seguridad */}
              <div className="rounded-xl border border-panel-border/80 bg-fondo/60 p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-texto-secundario text-xs">
                  La contraseña debe incluir:
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <span className={validaciones.longitud ? 'text-exito-texto font-semibold' : 'text-texto-secundario'}>
                    {validaciones.longitud ? '✓' : '•'} {longitudRequerida}+ caracteres
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

              <div className={`grid gap-3 pt-1 ${tokenRecuperacion ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {!tokenRecuperacion && (
                  <Button
                    type="button"
                    onClick={() => setPaso(2)}
                    className="min-h-12 w-full px-4 py-3 bg-transparent border border-panel-border/70 hover:bg-panel-border/20 text-texto-secundario hover:text-body-text text-sm rounded-xl font-semibold transition-all cursor-pointer"
                  >
                    ← Volver
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={cargando || !contrasenaValida}
                  className="min-h-12 w-full bg-accion hover:bg-accion-hover active:scale-[0.98] text-texto-sobre-accion font-bold text-sm py-3 rounded-xl border-0 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {cargando ? (
                    <>
                      <Icono nombre="recargar" tamano="xs" className="animate-spin" ariaHidden={true} />
                      <span>Actualizando…</span>
                    </>
                  ) : (
                    <span>Guardar contraseña</span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* PASO 4: CONFIRMACIÓN Y NOTIFICACIÓN EXITOSA               */}
          {/* ========================================================= */}
          {paso === 4 && (
            <div className="flex flex-1 flex-col justify-center text-center py-3 space-y-5">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-exito-tenue text-exito-texto">
                <Icono nombre="aprobar" tamano="lg" ariaHidden={true} />
              </div>

              <div>
                <PageHeader titleClassName="font-display text-2xl font-extrabold tracking-tight text-body-text" title="Contraseña actualizada" />
                <p className="mt-2 text-xs text-texto-secundario leading-relaxed max-w-md mx-auto">
                  Ya puedes iniciar sesión con tu nueva contraseña. También te enviamos una confirmación por correo.
                </p>
              </div>


              <div className="pt-2">
                <a
                  href={config?.authelia_url || '/login'}
                  className="min-h-12 w-full inline-flex items-center justify-center gap-2 bg-accion hover:bg-accion-hover text-texto-sobre-accion font-bold text-sm py-3 px-4 rounded-xl border-0 transition-all text-center"
                >
                  <span>Iniciar sesión</span>
                </a>
              </div>
            </div>
          )}

          {/* Pie de página con enlace de retorno */}
          <div className="mt-auto pt-4 border-t border-panel-border/60 text-xs">
            <a
              href={config?.authelia_url || '/login'}
              className="min-w-12 min-h-12 text-texto-secundario hover:text-body-text transition-colors flex items-center gap-1.5"
            >
              <span>← Volver al login de Authelia</span>
            </a>
          </div>
          </section>
        </div>
      </main>
    </div>
  );
}
