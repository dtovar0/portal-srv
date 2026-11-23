"""Registro de los tipos de trabajo que el worker admite (FNC-137, ADR-008 3B).

El worker ejecuta mensajes RQ que llevan el nombre de una función y un id
entero. Redis no es de confianza (FNC-049), así que la lista blanca no es una
constante: es este registro, y cada tipo declara:

- `funcion`: nombre completo de la función (`modulo.funcion`) que recibe un
  único `int`;
- `vencidos(cfg, momento)`: ids de los trabajos de ese tipo que el barrido
  debe volver a enviar a la cola.

El módulo dueño de cada tipo lo registra al iniciar la app (como
`providers.registrar_proveedor`); el de otorgar y revocar accesos se registra
solo en `worker.py`. Un nombre que no está aquí se rechaza sin ejecutar.
"""
import re
from dataclasses import dataclass
from typing import Callable

# `paquete.modulo.funcion`: solo identificadores; nada de rutas ni llamadas.
PATRON_FUNCION = re.compile(r'[A-Za-z_]\w*(\.[A-Za-z_]\w*)+')


@dataclass(frozen=True)
class TipoDeTrabajo:
    funcion: str
    vencidos: Callable


_TIPOS = {}


def registrar_tipo_de_trabajo(funcion, vencidos):
    """Admite `funcion` en el worker y la agrega al barrido. Reemplaza un
    registro previo del mismo nombre (idempotente al reiniciar la app)."""
    if not isinstance(funcion, str) or not PATRON_FUNCION.fullmatch(funcion):
        raise ValueError('Nombre de función de trabajo inválido.')
    if not callable(vencidos):
        raise ValueError('`vencidos` debe ser una función.')
    _TIPOS[funcion] = TipoDeTrabajo(funcion=funcion, vencidos=vencidos)


def quitar_tipo_de_trabajo(funcion):
    _TIPOS.pop(funcion, None)


def funciones_permitidas():
    """Nombres de función que el worker acepta."""
    return frozenset(_TIPOS)


def tipos_registrados():
    """Tipos en orden de registro."""
    return tuple(_TIPOS.values())
