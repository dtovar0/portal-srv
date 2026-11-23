"""Tipos de trabajo registrados en el worker (FNC-137, ADR-008 3B).

La lista blanca de mensajes RQ es el registro `tipos_de_trabajo`: solo una
función registrada con un único `int` se ejecuta, y el barrido recorre todos
los tipos. El trabajo de accesos se comporta igual que antes.
"""
import pytest

from app.modules.provisioning import queue, tipos_de_trabajo, worker
from app.modules.provisioning.configuracion import cargar_configuracion
from app.modules.provisioning.queue import (FUNCION_TRABAJO,
                                            DatosDeTrabajoInvalidos, enviar)
from app.modules.provisioning.tipos_de_trabajo import (
    funciones_permitidas, quitar_tipo_de_trabajo, registrar_tipo_de_trabajo,
    tipos_registrados)
from app.modules.provisioning.worker import (ControlApagado,
                                             WorkerAprovisionamiento,
                                             barrer, mensaje_valido)
from tests.provisioning.test_mensajes_rq import MensajeFalso

FUNCION_ENTREGA = 'app.modulo_de_prueba.entregar'


@pytest.fixture
def tipo_de_prueba():
    """Registra un tipo de prueba y lo quita al terminar."""
    vencidos = []
    registrar_tipo_de_trabajo(FUNCION_ENTREGA, lambda cfg, momento: vencidos)
    yield vencidos
    quitar_tipo_de_trabajo(FUNCION_ENTREGA)


class ColaDeMensajes:
    def __init__(self):
        self.mensajes = []
        self.connection = object()

    def enqueue(self, funcion, *args, **kwargs):
        self.mensajes.append((funcion, args))


@pytest.fixture
def instancia():
    w = WorkerAprovisionamiento.__new__(WorkerAprovisionamiento)
    w.control = ControlApagado()
    w.set_state = lambda estado: None
    return w


@pytest.fixture
def ejecutados(monkeypatch):
    llamadas = []
    monkeypatch.setattr(worker.SimpleWorker, 'execute_job',
                        lambda self, job, queue: llamadas.append(job))
    return llamadas


def test_el_trabajo_de_accesos_esta_registrado_de_origen():
    assert FUNCION_TRABAJO in funciones_permitidas()
    assert FUNCION_TRABAJO in [t.funcion for t in tipos_registrados()]


def test_una_funcion_no_registrada_se_rechaza_sin_ejecutar(instancia,
                                                            ejecutados):
    mensaje = MensajeFalso(FUNCION_ENTREGA, (7,))
    assert FUNCION_ENTREGA not in funciones_permitidas()
    instancia.execute_job(mensaje, None)
    assert ejecutados == [] and mensaje.borrado


def test_un_tipo_registrado_se_ejecuta(instancia, ejecutados, tipo_de_prueba):
    mensaje = MensajeFalso(FUNCION_ENTREGA, (7,))
    instancia.execute_job(mensaje, None)
    assert ejecutados == [mensaje]


@pytest.mark.parametrize('mensaje', [
    MensajeFalso(FUNCION_ENTREGA, ('7',)),
    MensajeFalso(FUNCION_ENTREGA, (True,)),
    MensajeFalso(FUNCION_ENTREGA, (7, 8)),
    MensajeFalso(FUNCION_ENTREGA, ()),
    MensajeFalso(FUNCION_ENTREGA, (7,), {'x': 1}),
    MensajeFalso(FUNCION_ENTREGA, roto=True),
    MensajeFalso('os.system', (7,)),
], ids=['texto', 'bool', 'dos-args', 'sin-args', 'kwargs', 'ilegible',
        'ajena'])
def test_las_reglas_del_mensaje_valen_para_los_tipos_registrados(
        instancia, ejecutados, tipo_de_prueba, mensaje):
    instancia.execute_job(mensaje, None)
    assert ejecutados == [] and mensaje.borrado


def test_los_callbacks_se_rechazan_tambien_en_un_tipo_registrado(
        tipo_de_prueba):
    mensaje = MensajeFalso(FUNCION_ENTREGA, (7,))
    mensaje._success_callback_name = 'os.system'
    assert mensaje_valido(mensaje) is False


def test_quitar_un_tipo_lo_deja_sin_admitir(tipo_de_prueba):
    quitar_tipo_de_trabajo(FUNCION_ENTREGA)
    assert mensaje_valido(MensajeFalso(FUNCION_ENTREGA, (7,))) is False


@pytest.mark.parametrize('nombre', ['', 'sin_punto', 'os.system()',
                                    'a.b; rm', '../x', None, 7])
def test_el_registro_rechaza_nombres_inventados(nombre):
    with pytest.raises(ValueError):
        registrar_tipo_de_trabajo(nombre, lambda cfg, momento: [])


def test_el_registro_exige_una_funcion_de_barrido():
    with pytest.raises(ValueError):
        registrar_tipo_de_trabajo(FUNCION_ENTREGA, 'no es funcion')


def test_el_barrido_envia_los_vencidos_de_cada_tipo_con_su_funcion(
        app, monkeypatch, tipo_de_prueba):
    tipo_de_prueba.append(11)
    original = worker.vencidos
    registrar_tipo_de_trabajo(FUNCION_TRABAJO, lambda cfg, momento: [5])
    enviados = []
    monkeypatch.setattr(worker, 'enviar',
                        lambda cola, id_, funcion: enviados.append((funcion, id_)))
    try:
        assert barrer(object(), cargar_configuracion()) == 2
    finally:
        registrar_tipo_de_trabajo(FUNCION_TRABAJO, original)
    assert sorted(enviados) == sorted([(FUNCION_TRABAJO, 5),
                                       (FUNCION_ENTREGA, 11)])


def test_el_barrido_de_accesos_sigue_igual(app):
    assert barrer(ColaDeMensajes(), cargar_configuracion()) == 0


def test_un_tipo_que_falla_no_impide_barrer_los_demas(app, monkeypatch,
                                                       tipo_de_prueba):
    def roto(cfg, momento):
        raise RuntimeError('BD caída')

    registrar_tipo_de_trabajo('app.modulo_roto.entregar', roto)
    tipo_de_prueba.append(11)
    enviados = []
    monkeypatch.setattr(worker, 'enviar',
                        lambda cola, id_, funcion: enviados.append(id_))
    try:
        assert barrer(object(), cargar_configuracion()) == 1
    finally:
        quitar_tipo_de_trabajo('app.modulo_roto.entregar')
    assert enviados == [11]


def test_enviar_admite_solo_funciones_registradas(app, tipo_de_prueba):
    cola = ColaDeMensajes()
    enviar(cola, 9, FUNCION_ENTREGA)
    enviar(cola, 10)
    assert cola.mensajes == [(FUNCION_ENTREGA, (9,)),
                             (FUNCION_TRABAJO, (10,))]
    with pytest.raises(DatosDeTrabajoInvalidos):
        enviar(cola, 9, 'os.system')


def test_el_registro_no_se_filtra_entre_pruebas():
    assert FUNCION_ENTREGA not in funciones_permitidas()
    assert tipos_de_trabajo._TIPOS.keys() >= {FUNCION_TRABAJO}
