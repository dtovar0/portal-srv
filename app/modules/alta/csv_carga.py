"""Lectura de los CSV de `flask alta` (FNC-182).

Las columnas son las que acepta `bulk_import` (`nombre`, `correo`, `rol`,
`areas`, ...); aquí solo se pasan a una lista de diccionarios.
"""
import csv

import click

from app.modules.bulk_import.services import MAX_REGISTROS_POR_LOTE

CODIFICACION = 'utf-8-sig'
MENSAJE_VACIO = 'El archivo no tiene filas.'
MENSAJE_SIN_ENCABEZADO = 'El archivo no tiene fila de encabezados.'
MENSAJE_LOTE = (f'El archivo supera {MAX_REGISTROS_POR_LOTE} filas por '
                'corrida; divídelo.')
MENSAJE_ILEGIBLE = 'No se pudo leer el archivo como CSV UTF-8.'


def leer_csv(ruta):
    try:
        with open(ruta, newline='', encoding=CODIFICACION) as archivo:
            lector = csv.DictReader(archivo)
            if not lector.fieldnames:
                raise click.ClickException(MENSAJE_SIN_ENCABEZADO)
            lector.fieldnames = [(n or '').strip().lower()
                                 for n in lector.fieldnames]
            filas = [{k: (v or '').strip() for k, v in fila.items() if k}
                     for fila in lector]
    except (OSError, UnicodeDecodeError, csv.Error):
        raise click.ClickException(MENSAJE_ILEGIBLE) from None
    if not filas:
        raise click.ClickException(MENSAJE_VACIO)
    if len(filas) > MAX_REGISTROS_POR_LOTE:
        raise click.ClickException(MENSAJE_LOTE)
    return filas
