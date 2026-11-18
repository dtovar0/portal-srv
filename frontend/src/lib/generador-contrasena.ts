/**
 * Generador de contraseñas seguras (alfanumérico con símbolos y mínimo 16 caracteres).
 */

const MAYUSCULAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijklmnopqrstuvwxyz';
const NUMEROS = '0123456789';
const SIMBOLOS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const TODOS = MAYUSCULAS + MINUSCULAS + NUMEROS + SIMBOLOS;

export const LONGITUD_MINIMA_GENERADOR = 16;

/** Rango de `Uint32` (2^32) para el muestreo por rechazo. */
const RANGO_UINT32 = 0x100000000;

/**
 * Índice uniforme en [0, max) con `crypto.getRandomValues`. Descarta los
 * valores del tramo final que harían más probables los primeros índices
 * (sesgo de módulo). Sin Web Crypto lanza un error: nunca recurre a
 * `Math.random`, que no es seguro para contraseñas.
 */
function obtenerIndiceAleatorio(max: number): number {
  const cripto = globalThis.crypto;
  if (!cripto || typeof cripto.getRandomValues !== 'function') {
    throw new Error('El navegador no permite generar contraseñas seguras.');
  }
  const limite = RANGO_UINT32 - (RANGO_UINT32 % max);
  const buffer = new Uint32Array(1);
  do {
    cripto.getRandomValues(buffer);
  } while (buffer[0] >= limite);
  return buffer[0] % max;
}

/**
 * Genera una contraseña criptográficamente segura alfanumérica con símbolos
 * garantizando una longitud mínima de 16 caracteres y al menos un carácter
 * de cada conjunto: mayúscula, minúscula, número y símbolo.
 */
export function generarContrasenaSegura(longitud = LONGITUD_MINIMA_GENERADOR): string {
  const len = Math.max(LONGITUD_MINIMA_GENERADOR, Math.floor(longitud));

  // 1. Garantizar al menos un carácter de cada tipo obligatorio
  const obligatorios = [
    MAYUSCULAS[obtenerIndiceAleatorio(MAYUSCULAS.length)],
    MINUSCULAS[obtenerIndiceAleatorio(MINUSCULAS.length)],
    NUMEROS[obtenerIndiceAleatorio(NUMEROS.length)],
    SIMBOLOS[obtenerIndiceAleatorio(SIMBOLOS.length)],
  ];

  // 2. Rellenar los caracteres restantes desde el conjunto completo
  const restantes: string[] = [];
  for (let i = obligatorios.length; i < len; i++) {
    restantes.push(TODOS[obtenerIndiceAleatorio(TODOS.length)]);
  }

  // 3. Mezclar con algoritmo Fisher-Yates
  const resultado = [...obligatorios, ...restantes];
  for (let i = resultado.length - 1; i > 0; i--) {
    const j = obtenerIndiceAleatorio(i + 1);
    const temp = resultado[i];
    resultado[i] = resultado[j];
    resultado[j] = temp;
  }

  return resultado.join('');
}
