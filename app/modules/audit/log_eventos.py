"""Log legible de eventos, activable con `DEBUG_EVENTOS=true` (FNC-209).

- Cada evento auditado (`add_audit_log`) se escribe como UNA línea
  `clave=valor` en `logs/eventos.log` (carpeta de `resolver_carpeta_logs`, la
  misma de `DEBUG_LDAP`) y en la consola/journald. Con la variable apagada no
  se crea el archivo ni se hace ninguna consulta.
- Los nombres de usuario, plataforma y área se resuelven por id solo con el log
  encendido (lecturas por clave primaria).
- Nunca se escribe `before`/`after`; el detalle libre se limpia de secretos y
  enlaces y se recorta. El cuerpo de un correo nunca llega aquí.
- Escribir el log jamás rompe la operación auditada.
"""
import json
import logging
import os
import re
import sys
from datetime import datetime
from logging.handlers import RotatingFileHandler

from app.modules.directory.depuracion import resolver_carpeta_logs

VAR_DEBUG = 'DEBUG_EVENTOS'
ARCHIVO_LOG = 'eventos.log'
NOMBRE_LOGGER = 'portal.eventos'
TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024
COPIAS_ROTACION = 5
LARGO_MAXIMO_DETALLE = 300
FORMATO_FECHA = '%Y-%m-%d %H:%M:%S'
MARCA_OMITIDO = '[omitido]'
MARCA_ENLACE = '[enlace]'
PATRON_ENLACE = re.compile(r'https?://\S+', re.IGNORECASE)
PATRON_SECRETO = re.compile(
    r'(contraseña|contrasena|password|passwd|token|secret|secreto|clave|'
    r'código|codigo|code|otp)\s*[:=]\s*\S+', re.IGNORECASE)
PATRON_SIMPLE = re.compile(r'[^\s="\\]+')

_manejadores = {}


def activo(entorno=None):
    entorno = os.environ if entorno is None else entorno
    return (entorno.get(VAR_DEBUG) or '').strip().lower() == 'true'


def reiniciar():
    """Quita los manejadores (para pruebas o si cambia la carpeta)."""
    registro = logging.getLogger(NOMBRE_LOGGER)
    for manejador in list(registro.handlers):
        registro.removeHandler(manejador)
        manejador.close()
    _manejadores.clear()


def _registro():
    """Logger configurado (una vez por carpeta); archivo y consola."""
    carpeta = resolver_carpeta_logs()
    ruta = os.path.join(carpeta, ARCHIVO_LOG) if carpeta else None
    registro = logging.getLogger(NOMBRE_LOGGER)
    if _manejadores.get('ruta', False) != ruta or not registro.handlers:
        reiniciar()
        registro.setLevel(logging.INFO)
        registro.propagate = False
        formato = logging.Formatter('%(message)s')
        consola = logging.StreamHandler(sys.stderr)
        consola.setFormatter(formato)
        registro.addHandler(consola)
        if ruta:
            try:
                archivo = RotatingFileHandler(
                    ruta, maxBytes=TAMANO_MAXIMO_BYTES,
                    backupCount=COPIAS_ROTACION, encoding='utf-8')
                archivo.setFormatter(formato)
                registro.addHandler(archivo)
            except OSError:
                registro.warning('No se pudo abrir %s; solo consola.', ruta)
        _manejadores['ruta'] = ruta
    return registro


def limpiar_detalle(texto):
    """Una línea, sin secretos ni enlaces y recortada."""
    if not texto:
        return ''
    texto = PATRON_ENLACE.sub(MARCA_ENLACE, str(texto))
    texto = PATRON_SECRETO.sub(lambda m: f'{m.group(1)}={MARCA_OMITIDO}', texto)
    texto = ' '.join(texto.split())
    return texto[:LARGO_MAXIMO_DETALLE]


def _valor(valor):
    texto = str(valor)
    if PATRON_SIMPLE.fullmatch(texto):
        return texto
    return json.dumps(texto, ensure_ascii=False)


def armar_linea(action, campos, momento=None):
    """`AAAA-MM-DD HH:MM:SS accion clave=valor ...` (omite los vacíos)."""
    momento = momento or datetime.now()
    partes = [momento.strftime(FORMATO_FECHA), str(action)]
    partes += [f'{clave}={_valor(valor)}' for clave, valor in campos
               if valor not in (None, '')]
    return ' '.join(partes)


def _nombres(usuario_id, area_id, platform_id):
    """Nombres legibles por id; el id si no se encuentra."""
    from app import db
    from app.modules.auth.models import User
    from app.modules.core.models import Area, Platform
    usuario = plataforma = area = None
    with db.session.no_autoflush:
        if usuario_id:
            fila = db.session.get(User, usuario_id)
            usuario = fila.email if fila else f'id:{usuario_id}'
        if platform_id:
            fila = db.session.get(Platform, platform_id)
            plataforma = fila.name if fila else f'id:{platform_id}'
            if fila and not area_id:
                area_id = fila.area_id
        if area_id:
            fila = db.session.get(Area, area_id)
            area = fila.name if fila else f'id:{area_id}'
    return usuario, plataforma, area


def registrar_evento(action, status, actor, detail=None, module=None,
                     target=None, target_user_id=None, area_id=None,
                     platform_id=None):
    """Escribe la línea del evento si `DEBUG_EVENTOS=true`. Nunca lanza."""
    if not activo():
        return
    try:
        try:
            usuario, plataforma, area = _nombres(target_user_id, area_id,
                                                 platform_id)
        except Exception:
            usuario = target_user_id
            plataforma, area = platform_id, area_id
        linea = armar_linea(action, (
            ('actor', actor), ('usuario', usuario),
            ('plataforma', plataforma), ('area', area),
            ('modulo', module), ('objetivo', target),
            ('resultado', status),
            ('detalle', limpiar_detalle(detail))))
        _registro().info(linea)
    except Exception:  # el log nunca rompe la operación
        pass
