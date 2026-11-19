"""Política de la contraseña inicial de onboarding (FNC-138, ADR-008).

Una sola fuente para lo que el administrador escribe o genera y para lo que
genera el servidor en cada reintento: longitud y clases desde variables
(`PASSWORD_POLICY_*`), validadas al arrancar. El backend siempre valida; el
generador web lee la política de `GET /users/password-policy`.

- Solo letras ASCII, dígitos y los símbolos publicados (sin espacios, comillas
  ni `\\`): así viaja sin ambigüedad por Password Modify, el Send y el correo.
- `generar()` usa `secrets` y cumple siempre la política.
- La contraseña nunca se registra: ningún mensaje de error la incluye.
"""
import os
import re
import secrets
import string
from dataclasses import dataclass

VAR_LARGO_MINIMO = 'PASSWORD_POLICY_MIN_LENGTH'
VAR_LARGO_MAXIMO = 'PASSWORD_POLICY_MAX_LENGTH'
VAR_CLASES = 'PASSWORD_POLICY_REQUIRED_CLASSES'
VAR_SIMBOLOS = 'PASSWORD_POLICY_SYMBOLS'

CLASE_MAYUSCULAS = 'mayusculas'
CLASE_MINUSCULAS = 'minusculas'
CLASE_DIGITOS = 'digitos'
CLASE_SIMBOLOS = 'simbolos'
CLASES = (CLASE_MAYUSCULAS, CLASE_MINUSCULAS, CLASE_DIGITOS, CLASE_SIMBOLOS)

# (por defecto, mínimo, máximo).
LARGO_MINIMO = (16, 16, 128)
LARGO_MAXIMO = (128, 16, 128)
SIMBOLOS_POR_DEFECTO = '!#$%&()*+,-./:;<=>?@[]^_{}~'
# Los símbolos admitidos son ASCII imprimibles que no son letra ni dígito, y
# nunca comillas, acento grave ni barra invertida.
SIMBOLOS_PROHIBIDOS = frozenset('"\'`\\ ')
# Largo de lo que genera el servidor (se ajusta al rango de la política).
LARGO_GENERADO = 24

MENSAJE_OBLIGATORIA = 'Es obligatoria.'
MENSAJE_TEXTO = 'Debe ser texto.'
MENSAJE_CARACTERES = 'Usa solo letras, números y los símbolos permitidos.'
FALTA_CLASE = {
    CLASE_MAYUSCULAS: 'Falta al menos una mayúscula.',
    CLASE_MINUSCULAS: 'Falta al menos una minúscula.',
    CLASE_DIGITOS: 'Falta al menos un número.',
    CLASE_SIMBOLOS: 'Falta al menos un símbolo.',
}
# Rechazo de la `ppolicy` del directorio: sin el texto del servidor.
MENSAJE_RECHAZO_DIRECTORIO = ('El directorio rechazó la contraseña por su '
                              'política de seguridad.')


class ErrorConfiguracionPolitica(RuntimeError):
    """Variable `PASSWORD_POLICY_*` inválida (el texto nunca lleva valores)."""


@dataclass(frozen=True)
class PoliticaContrasena:
    largo_minimo: int = LARGO_MINIMO[0]
    largo_maximo: int = LARGO_MAXIMO[0]
    clases: tuple = CLASES
    simbolos: str = SIMBOLOS_POR_DEFECTO

    @property
    def mensaje_largo(self):
        return f'Entre {self.largo_minimo} y {self.largo_maximo} caracteres.'

    def permitidos(self):
        return (string.ascii_letters + string.digits + self.simbolos)

    def publica(self):
        """Forma `policy` del contrato (`GET /users/password-policy`)."""
        return {'min_length': self.largo_minimo,
                'max_length': self.largo_maximo,
                'required_classes': list(self.clases),
                'symbols': self.simbolos}


def _leer(entorno, nombre):
    return (entorno.get(nombre) or '').strip()


def _entero(entorno, nombre, limites):
    por_defecto, minimo, maximo = limites
    texto = _leer(entorno, nombre)
    if not texto:
        return por_defecto
    try:
        valor = int(texto)
    except ValueError:
        valor = minimo - 1
    if not minimo <= valor <= maximo:
        raise ErrorConfiguracionPolitica(
            f'{nombre} debe ser un entero entre {minimo} y {maximo}.')
    return valor


def _clases(entorno):
    texto = _leer(entorno, VAR_CLASES)
    if not texto:
        return CLASES
    pedidas = [c.strip().lower() for c in texto.split(',') if c.strip()]
    if not pedidas or any(c not in CLASES for c in pedidas):
        raise ErrorConfiguracionPolitica(
            f'{VAR_CLASES} admite solo: {", ".join(CLASES)}.')
    return tuple(c for c in CLASES if c in pedidas)


def _simbolos(entorno):
    texto = entorno.get(VAR_SIMBOLOS)
    if texto is None or not texto.strip():
        return SIMBOLOS_POR_DEFECTO
    texto = texto.strip()
    invalidos = (len(set(texto)) != len(texto)
                 or any(c in SIMBOLOS_PROHIBIDOS or c.isalnum()
                        or not c.isascii() or not c.isprintable()
                        for c in texto))
    if invalidos:
        raise ErrorConfiguracionPolitica(
            f'{VAR_SIMBOLOS} admite símbolos ASCII sin repetir, sin letras, '
            'dígitos, espacios, comillas ni barra invertida.')
    return texto


def cargar_politica(entorno=None):
    """Lee y valida `PASSWORD_POLICY_*`; lanza `ErrorConfiguracionPolitica`."""
    entorno = os.environ if entorno is None else entorno
    minimo = _entero(entorno, VAR_LARGO_MINIMO, LARGO_MINIMO)
    maximo = _entero(entorno, VAR_LARGO_MAXIMO, LARGO_MAXIMO)
    if maximo < minimo:
        raise ErrorConfiguracionPolitica(
            f'{VAR_LARGO_MAXIMO} no puede ser menor que {VAR_LARGO_MINIMO}.')
    return PoliticaContrasena(largo_minimo=minimo, largo_maximo=maximo,
                              clases=_clases(entorno),
                              simbolos=_simbolos(entorno))


def validar_al_arrancar(entorno=None):
    return cargar_politica(entorno)


def mensaje_de_incumplimiento(contrasena, politica=None):
    """Primer mensaje de la regla que no cumple, o `None` si cumple.

    El texto nunca incluye la contraseña.
    """
    politica = politica or cargar_politica()
    if contrasena is None or (isinstance(contrasena, str)
                              and not contrasena):
        return MENSAJE_OBLIGATORIA
    if not isinstance(contrasena, str):
        return MENSAJE_TEXTO
    if not set(contrasena) <= set(politica.permitidos()):
        return MENSAJE_CARACTERES
    if not politica.largo_minimo <= len(contrasena) <= politica.largo_maximo:
        return politica.mensaje_largo
    if CLASE_MAYUSCULAS in politica.clases \
            and not re.search(r'[A-Z]', contrasena):
        return FALTA_CLASE[CLASE_MAYUSCULAS]
    if CLASE_MINUSCULAS in politica.clases \
            and not re.search(r'[a-z]', contrasena):
        return FALTA_CLASE[CLASE_MINUSCULAS]
    if CLASE_DIGITOS in politica.clases and not re.search(r'\d', contrasena):
        return FALTA_CLASE[CLASE_DIGITOS]
    if CLASE_SIMBOLOS in politica.clases \
            and not any(c in politica.simbolos for c in contrasena):
        return FALTA_CLASE[CLASE_SIMBOLOS]
    return None


def generar(politica=None):
    """Contraseña aleatoria (`secrets`) que cumple siempre la política."""
    politica = politica or cargar_politica()
    largo = min(max(LARGO_GENERADO, politica.largo_minimo),
                politica.largo_maximo)
    grupos = {CLASE_MAYUSCULAS: string.ascii_uppercase,
              CLASE_MINUSCULAS: string.ascii_lowercase,
              CLASE_DIGITOS: string.digits,
              CLASE_SIMBOLOS: politica.simbolos}
    # Uno de cada clase requerida y el resto del conjunto completo.
    caracteres = [secrets.choice(grupos[clase]) for clase in politica.clases]
    universo = politica.permitidos()
    caracteres += [secrets.choice(universo)
                   for _ in range(largo - len(caracteres))]
    secrets.SystemRandom().shuffle(caracteres)
    return ''.join(caracteres)
