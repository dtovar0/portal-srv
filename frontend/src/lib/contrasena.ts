/**
 * Política de la contraseña inicial en el cliente (FNC-139, contrato
 * `usuarios-directorio.md` v2): validación por regla y generador que usan la
 * política que publica `GET /users/password-policy` (ningún valor fijo aquí).
 * El servidor sigue siendo la autoridad y vuelve a validar.
 *
 * - El generador usa `crypto.getRandomValues` con muestreo sin sesgo
 *   (`obtenerIndiceAleatorio`) y nunca `Math.random`; garantiza un carácter de
 *   cada clase requerida y baraja con Fisher-Yates.
 * - Los mensajes son los del contrato y nunca incluyen la contraseña.
 */

import type { ClasePassword, PasswordPolicy } from './access/types';
import { obtenerIndiceAleatorio } from './generador-contrasena';

const MAYUSCULAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijklmnopqrstuvwxyz';
const DIGITOS = '0123456789';

/** Largo preferido de lo que genera el cliente (se ajusta al rango de la política). */
export const LARGO_GENERADO = 24;

export const MENSAJE_OBLIGATORIA = 'Es obligatoria.';
export const MENSAJE_CARACTERES = 'Usa solo letras, números y los símbolos permitidos.';
const FALTA: Record<ClasePassword, string> = {
  mayusculas: 'Falta al menos una mayúscula.',
  minusculas: 'Falta al menos una minúscula.',
  digitos: 'Falta al menos un número.',
  simbolos: 'Falta al menos un símbolo.',
};
export const MENSAJE_RECHAZO_DIRECTORIO =
  'El directorio rechazó la contraseña por su política de seguridad.';

const NOMBRE_CLASE: Record<ClasePassword, string> = {
  mayusculas: 'mayúsculas',
  minusculas: 'minúsculas',
  digitos: 'números',
  simbolos: 'símbolos',
};

/** Política completa en una frase, para mostrarla antes de que haya error (WCAG 3.3.2). */
export function descripcionPolitica(politica: PasswordPolicy): string {
  const clases = politica.required_classes.map((c) => NOMBRE_CLASE[c]);
  const lista = clases.length > 1 ? `${clases.slice(0, -1).join(', ')} y ${clases[clases.length - 1]}` : clases[0];
  return `${mensajeLargo(politica)}${lista ? ` Debe incluir ${lista}.` : ''}`;
}

export function mensajeLargo(politica: PasswordPolicy): string {
  return `Entre ${politica.min_length} y ${politica.max_length} caracteres.`;
}

function permitidos(politica: PasswordPolicy): string {
  return MAYUSCULAS + MINUSCULAS + DIGITOS + politica.symbols;
}

function conjunto(clase: ClasePassword, politica: PasswordPolicy): string {
  if (clase === 'mayusculas') return MAYUSCULAS;
  if (clase === 'minusculas') return MINUSCULAS;
  if (clase === 'digitos') return DIGITOS;
  return politica.symbols;
}

/** Primer mensaje de la regla que no cumple, o `null` si cumple (mismo orden que el servidor). */
export function mensajeDeIncumplimiento(valor: string, politica: PasswordPolicy): string | null {
  if (!valor) return MENSAJE_OBLIGATORIA;
  const validos = permitidos(politica);
  if ([...valor].some((c) => !validos.includes(c))) return MENSAJE_CARACTERES;
  if (valor.length < politica.min_length || valor.length > politica.max_length) {
    return mensajeLargo(politica);
  }
  for (const clase of ['mayusculas', 'minusculas', 'digitos', 'simbolos'] as const) {
    if (politica.required_classes.includes(clase)
      && ![...valor].some((c) => conjunto(clase, politica).includes(c))) {
      return FALTA[clase];
    }
  }
  return null;
}

/** Contraseña aleatoria que cumple siempre la política. Lanza sin Web Crypto. */
export function generarSegunPolitica(politica: PasswordPolicy): string {
  const largo = Math.min(Math.max(LARGO_GENERADO, politica.min_length), politica.max_length);
  const universo = permitidos(politica);
  const caracteres: string[] = politica.required_classes.map((clase) => {
    const grupo = conjunto(clase, politica);
    return grupo[obtenerIndiceAleatorio(grupo.length)];
  });
  while (caracteres.length < largo) {
    caracteres.push(universo[obtenerIndiceAleatorio(universo.length)]);
  }
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = obtenerIndiceAleatorio(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}
