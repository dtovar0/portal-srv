"""Resumen por persona o fila de una corrida de `flask alta` (FNC-182).

Solo guarda estado y un motivo corto: nunca contraseñas, enlaces ni textos de
excepciones del servidor.
"""
import re
from dataclasses import dataclass, field

import click

CREADO = 'creado'
ACTUALIZADO = 'actualizado'
OMITIDO = 'omitido'
CONFLICTO = 'conflicto'
ERROR = 'error'
ROTADO = 'rotado'
ESTADOS = (CREADO, ACTUALIZADO, ROTADO, OMITIDO, CONFLICTO, ERROR)
# Estados que hacen que el comando termine con código distinto de cero.
ESTADOS_DE_FALLO = frozenset({CONFLICTO, ERROR})

ACTOR_CLI = 'sistema/CLI'
TITULO_SIMULACION = 'SIMULACIÓN (--dry-run): no se escribió nada.'
MARCA_SIMULADO = ' [simulado]'
# Caracteres de control (incluido ESC): valores de LDAP o del CSV no pueden
# alterar lo que ve el operador.
CONTROL = re.compile(r'[\x00-\x1f\x7f-\x9f]')


@dataclass(frozen=True)
class Linea:
    sujeto: str
    estado: str
    detalle: str = ''


@dataclass
class Resumen:
    lineas: list = field(default_factory=list)

    def agregar(self, sujeto, estado, detalle=''):
        self.lineas.append(Linea(sujeto, estado, detalle))

    def extender(self, otro):
        self.lineas.extend(otro.lineas)

    def cuenta(self, estado):
        return sum(1 for linea in self.lineas if linea.estado == estado)

    @property
    def hay_fallos(self):
        return any(linea.estado in ESTADOS_DE_FALLO for linea in self.lineas)

    def totales(self):
        return ', '.join(f'{self.cuenta(e)} {e}' for e in ESTADOS)

    def imprimir(self, dry_run):
        if dry_run:
            click.echo(TITULO_SIMULACION)
        marca = MARCA_SIMULADO if dry_run else ''
        for linea in self.lineas:
            texto = f'{linea.estado.upper():<11} {linea.sujeto}'
            if linea.detalle:
                texto += f' — {linea.detalle}'
            texto = CONTROL.sub('', texto)
            click.echo(texto + (marca if linea.estado in (CREADO, ACTUALIZADO,
                                                          ROTADO) else ''))
        click.echo(f'Resumen: {self.totales()}.')
