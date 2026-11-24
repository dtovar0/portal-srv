"""Doble de Vaultwarden y del correo para la entrega de credenciales (FNC-138).

Sin red: reemplaza `crear_send_texto`, `borrar_send` y el envío del correo en
`entrega_credenciales`. Todos los valores son ficticios de prueba.
"""
import itertools

import pytest

from app.modules.notifications import services
from app.modules.secretos.sends import SendCreado
from app.modules.users import entrega_credenciales

BASE_URL_PRUEBA = 'https://portal.pruebas.invalid'
ENLACE = 'https://vault.pruebas.invalid/#/send/acceso{n}/llave{n}'


class EntregaFalsa:
    """Registra los Sends creados y borrados y los correos enviados."""

    def __init__(self):
        self.sends = []      # {'id', 'nombre', 'texto', 'enlace', 'codigo'}
        self.borrados = []
        self.correos = []    # {'slug', 'destino', 'contexto'}
        self.error_send = None      # excepción al crear el Send
        self.correo_responde = {'status': 'success'}
        self._n = itertools.count(1)

    def crear(self, nombre, texto, entorno=None, codigo=None):
        if self.error_send:
            raise self.error_send
        n = next(self._n)
        send = SendCreado(id=f'00000000-0000-4000-8000-{n:012d}',
                          enlace=ENLACE.format(n=n))
        self.sends.append({'id': send.id, 'nombre': nombre, 'texto': texto,
                           'enlace': send.enlace, 'codigo': codigo})
        return send

    def borrar(self, send_id, entorno=None):
        self.borrados.append(send_id)

    def correo(self, slug, destino, contexto=None):
        self.correos.append({'slug': slug, 'destino': destino,
                             'contexto': dict(contexto or {})})
        return self.correo_responde

    @property
    def contrasenas(self):
        """Contraseña de cada Send, en orden de creación."""
        return [s['texto'].split('\n')[1].split(': ', 1)[1]
                for s in self.sends]


@pytest.fixture
def entrega(monkeypatch):
    """Notificaciones activas, `BASE_URL` y Vaultwarden y correo simulados."""
    falsa = EntregaFalsa()
    monkeypatch.setenv('ENABLE_NOTIFICATIONS', 'true')
    monkeypatch.setenv('BASE_URL', BASE_URL_PRUEBA)
    monkeypatch.setattr(entrega_credenciales, 'crear_send_texto', falsa.crear)
    monkeypatch.setattr(entrega_credenciales, 'borrar_send', falsa.borrar)
    monkeypatch.setattr(services, 'send_notification_by_slug', falsa.correo)
    return falsa
