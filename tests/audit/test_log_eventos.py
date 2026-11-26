"""Log de eventos `DEBUG_EVENTOS` (FNC-209).

- Apagado: no se crea `eventos.log`. Encendido: una línea `clave=valor` por
  evento, con actor, y los nombres resueltos de usuario, plataforma y área.
- `correo_enviado` (solo log, correos enmascarados), `miembro_agregado` y
  `miembro_quitado` (aprovisionamiento a la BD; rol en solo log).
- Ningún secreto, enlace ni cuerpo de correo llega al log.
"""
import os

import pytest

from app import db
from app.modules.audit import log_eventos
from app.modules.audit.events import Evento
from app.modules.audit.models import AuditLog
from app.modules.audit.services import add_audit_log
from app.modules.directory.errors import Resultado, ResultadoEscritura
from app.modules.notifications import services
from app.modules.notifications.models import NotificationTemplate, SMTPConfig
from app.modules.provisioning.ldap_provider import ProveedorLdap
from app.modules.provisioning.providers import Operacion
from app.modules.users.grupos_de_rol import sincronizar_grupo_de_rol
from app.authz import ROLE_USER
from tests import fabricas
from tests.matriz_proteccion import HOST_SMTP_FICTICIO
from tests.smtp_falso import instalar_smtp

GRUPO = 'cn=wiki-usuario,ou=grupos,dc=pruebas,dc=local'


@pytest.fixture
def carpeta(tmp_path, monkeypatch):
    monkeypatch.setenv('LOG_DIR', str(tmp_path))
    log_eventos.reiniciar()
    yield tmp_path
    log_eventos.reiniciar()


@pytest.fixture
def encendido(monkeypatch, carpeta):
    monkeypatch.setenv(log_eventos.VAR_DEBUG, 'true')
    return carpeta / log_eventos.ARCHIVO_LOG


def lineas(ruta):
    log_eventos.reiniciar()  # vacía y cierra los manejadores
    return ruta.read_text(encoding='utf-8').splitlines() if ruta.exists() else []


def test_apagado_no_crea_el_archivo(app, carpeta, monkeypatch):
    monkeypatch.delenv(log_eventos.VAR_DEBUG, raising=False)

    add_audit_log(Evento.AREA_CREADA, 'success', 'x')

    assert not (carpeta / log_eventos.ARCHIVO_LOG).exists()
    assert AuditLog.query.count() == 1


def test_apagado_con_false_tampoco(app, carpeta, monkeypatch):
    monkeypatch.setenv(log_eventos.VAR_DEBUG, 'false')
    add_audit_log(Evento.AREA_CREADA, 'success', 'x')
    assert not (carpeta / log_eventos.ARCHIVO_LOG).exists()


def test_una_linea_por_evento_con_actor_y_nombres(app, encendido):
    area = fabricas.crear_area('Packet')
    plataforma = fabricas.crear_plataforma(area, 'tacacs')
    usuario = fabricas.crear_usuario(email='gsantos@pruebas.local')

    add_audit_log(Evento.SOLICITUD_APROBADA, 'success', 'Aprobada nivel usuario',
                  user_override='jperez@pruebas.local', module='Solicitudes',
                  target_user_id=usuario.id, platform_id=plataforma.id)
    add_audit_log(Evento.AREA_EDITADA, 'info', area_id=area.id,
                  user_override='jperez@pruebas.local')

    filas = lineas(encendido)
    assert len(filas) == 2
    primera = filas[0]
    assert primera[:4].isdigit() and ' solicitud_aprobada ' in primera
    for esperado in ('actor=jperez@pruebas.local',
                     'usuario=gsantos@pruebas.local', 'plataforma=tacacs',
                     'area=Packet', 'resultado=success',
                     'detalle="Aprobada nivel usuario"'):
        assert esperado in primera
    assert ' area_editada ' in filas[1] and 'area=Packet' in filas[1]


def test_el_log_no_lleva_secretos_ni_enlaces_ni_before_after(app, encendido):
    add_audit_log(
        Evento.CREDENCIALES_ENVIADAS, 'success',
        'Envío listo password=Sup3rSecreta! ver https://send.local/s/abc#clave',
        before={'smtp_password': 'AntesSecreto'},
        after={'api_key': 'DespuesSecreto', 'valor': 'visible-solo-en-bd'})

    texto = '\n'.join(lineas(encendido))
    for prohibido in ('Sup3rSecreta', 'send.local', 'AntesSecreto',
                      'DespuesSecreto', 'visible-solo-en-bd'):
        assert prohibido not in texto
    assert 'password=[omitido]' in texto and '[enlace]' in texto


def test_fallo_al_escribir_el_log_no_rompe_la_auditoria(app, encendido,
                                                        monkeypatch):
    def _roto():
        raise OSError('disco lleno')
    monkeypatch.setattr(log_eventos, '_registro', _roto)

    add_audit_log(Evento.AREA_CREADA, 'success')

    assert AuditLog.query.count() == 1


# ------------------------------- correo_enviado ---------------------------- #

@pytest.fixture
def smtp(app, monkeypatch):
    monkeypatch.setenv('ENABLE_NOTIFICATIONS', 'true')
    db.session.add(SMTPConfig(server=HOST_SMTP_FICTICIO, port=587,
                              encryption='starttls', auth_enabled=False,
                              sender_name='Portal de prueba'))
    db.session.add(NotificationTemplate(
        slug='prueba_log', name='Prueba', subject='Asunto',
        body='Cuerpo secreto {{ url }}', is_html=False))
    db.session.commit()
    return instalar_smtp(monkeypatch)


def test_correo_enviado_queda_en_el_log_enmascarado_y_no_en_la_bd(
        smtp, encendido):
    r = services.send_notification_by_slug(
        'prueba_log', 'ana@pruebas.local, luis@pruebas.local',
        {'url': 'https://portal.invalid/x'})

    assert r['status'] == 'success'
    filas = lineas(encendido)
    assert len(filas) == 1 and ' correo_enviado ' in filas[0]
    assert 'objetivo=prueba_log' in filas[0]
    assert 'a***@pruebas.local' in filas[0] and 'l***@pruebas.local' in filas[0]
    assert 'ana@' not in filas[0] and 'Cuerpo' not in filas[0]
    assert 'portal.invalid' not in filas[0]
    assert AuditLog.query.count() == 0


def test_correo_fallido_no_dice_enviado(smtp, encendido):
    import smtplib
    smtp.error = smtplib.SMTPException('caído')

    r = services.send_notification_by_slug('prueba_log', 'ana@pruebas.local')

    assert r['status'] == 'error'
    assert lineas(encendido) == []


# ------------------------------- miembros ---------------------------------- #

class ConfiguracionFalsa:
    grupos_base_dn = 'ou=grupos,dc=pruebas,dc=local'
    atributo_grupo = 'cn'


class EscritorFalso:
    configuracion = ConfiguracionFalsa()

    def __init__(self, resultado=Resultado.HECHO, motivo=None):
        self.resultado, self.motivo = resultado, motivo

    def _r(self, dn):
        return ResultadoEscritura(self.resultado, dn, self.motivo)

    def add_member(self, dn, persona):
        return self._r(dn)

    def remove_member(self, dn, persona):
        return self._r(dn)

    def create_group(self, dn):
        return ResultadoEscritura(Resultado.YA_ESTABA, dn)


class PersonaFalsa:
    identificador = 'ana'
    dn = 'uid=ana,ou=personas,dc=pruebas,dc=local'


@pytest.mark.parametrize('operacion,evento', [
    ('otorgar', 'miembro_agregado'), ('revocar', 'miembro_quitado')])
def test_aprovisionamiento_audita_alta_y_baja_de_miembro(
        app, encendido, monkeypatch, operacion, evento):
    area = fabricas.crear_area('Packet')
    plataforma = fabricas.crear_plataforma(
        area, 'wiki', integration_type='ldap', ldap_group_user_dn=GRUPO)
    usuario = fabricas.crear_usuario(email='ana@pruebas.local')
    proveedor = ProveedorLdap(cliente=object(), escritor=EscritorFalso())
    monkeypatch.setattr(proveedor, '_preparar',
                        lambda op: (None, proveedor._escritor, GRUPO,
                                    PersonaFalsa()))
    op = Operacion(id_operacion='1', clave_idempotencia='k',
                   operacion=operacion, nivel='usuario',
                   plataforma_id=plataforma.id, usuario_id=usuario.id)

    getattr(proveedor, operacion)(op)
    db.session.commit()

    fila = AuditLog.query.one()
    assert fila.action == evento and fila.target == 'ana'
    assert fila.target_user_id == usuario.id
    assert (fila.platform_id, fila.area_id) == (plataforma.id, area.id)
    assert fila.after_state['grupo'] == GRUPO
    assert fila.after_state['resultado'] == 'hecho'
    linea = lineas(encendido)[0]
    assert f' {evento} ' in linea and 'actor=sistema' in linea
    assert 'plataforma=wiki' in linea and 'area=Packet' in linea
    assert 'usuario=ana@pruebas.local' in linea and GRUPO in linea


def test_miembro_con_error_lleva_el_motivo(app, encendido, monkeypatch):
    plataforma = fabricas.crear_plataforma(fabricas.crear_area('A'), 'p')
    proveedor = ProveedorLdap(cliente=object(), escritor=EscritorFalso(
        Resultado.ERROR_PERMANENTE, 'fuera_de_base'))
    monkeypatch.setattr(proveedor, '_preparar',
                        lambda op: (None, proveedor._escritor, GRUPO,
                                    PersonaFalsa()))
    op = Operacion(id_operacion='1', clave_idempotencia='k',
                   operacion='otorgar', nivel='usuario',
                   plataforma_id=plataforma.id, usuario_id=None)

    proveedor.otorgar(op)
    db.session.commit()

    fila = AuditLog.query.one()
    assert fila.status == 'error' and fila.after_state['motivo'] == 'fuera_de_base'
    assert 'fuera_de_base' in lineas(encendido)[0]


def test_grupo_de_rol_deja_la_alta_en_el_log_y_no_toca_la_bd(
        app, encendido, monkeypatch):
    monkeypatch.setenv('OIDC_GROUP_USER', 'portal-usuarios')

    resultado = sincronizar_grupo_de_rol(EscritorFalso(), PersonaFalsa.dn,
                                         ROLE_USER)

    assert resultado
    filas = lineas(encendido)
    assert len(filas) == 1 and ' miembro_agregado ' in filas[0]
    assert 'objetivo=ana' in filas[0] and 'resultado=success' in filas[0]
    assert AuditLog.query.count() == 0


# ------------------------- correcciones de seguridad ------------------------ #

PELIGROSOS = ['\x1b]0;titulo\x07', 'a\x1b[31mrojo', 'b\x07', 'c\x08d',
              'e\x9bf', 'g\x85h', 'i j', 'k l', 'm\x00n']


@pytest.mark.parametrize('texto', PELIGROSOS)
def test_valor_escapa_caracteres_de_control(texto):
    salida = log_eventos._valor(texto)

    assert salida.isprintable()
    assert salida.startswith('"') and salida.endswith('"')


@pytest.mark.parametrize('texto', PELIGROSOS)
def test_linea_y_detalle_no_llevan_caracteres_de_control(texto):
    linea = log_eventos.armar_linea('x', (('objetivo', texto),
                                          ('detalle',
                                           log_eventos.limpiar_detalle(texto))))

    assert linea.isprintable()
    assert not any(c in linea for c in '\x1b\x07\x08\x9b\x85  \x00')


def test_evento_con_escape_en_el_objetivo_no_llega_crudo_al_archivo(
        app, encendido):
    add_audit_log(Evento.ACCESO_FALLIDO, 'error', 'intento',
                  target='a\x1b]0;t\x07@x.com')

    crudo = encendido.read_bytes() if encendido.exists() else b''
    log_eventos.reiniciar()
    crudo = encendido.read_bytes()
    assert b'\x1b' not in crudo and b'\x07' not in crudo


def test_el_archivo_se_crea_0600_tambien_tras_rotar(app, encendido,
                                                    monkeypatch):
    monkeypatch.setattr(log_eventos, 'TAMANO_MAXIMO_BYTES', 200)
    for _ in range(8):
        add_audit_log(Evento.AREA_CREADA, 'success', 'x' * 100)

    log_eventos.reiniciar()
    archivos = [p for p in encendido.parent.iterdir()
                if p.name.startswith(log_eventos.ARCHIVO_LOG)]
    assert len(archivos) > 1  # hubo rotación
    for archivo in archivos:
        assert oct(archivo.stat().st_mode & 0o777) == '0o600', archivo.name


def test_solo_log_no_hace_commit_ni_rollback(app, encendido, monkeypatch):
    area = fabricas.crear_area('Pendiente')
    area.name = 'Cambio sin guardar'  # cambio del llamador
    llamadas = []
    monkeypatch.setattr(db.session, 'commit', lambda: llamadas.append('c'))
    monkeypatch.setattr(db.session, 'rollback', lambda: llamadas.append('r'))
    # Fuerza un fallo al armar el registro.
    monkeypatch.setattr('app.modules.audit.services._recortar',
                        lambda *a: (_ for _ in ()).throw(ValueError('x')))

    add_audit_log(Evento.CORREO_ENVIADO, 'success', solo_log=True)

    assert llamadas == []


def test_correo_enviado_no_descarta_cambios_del_llamador(smtp, encendido,
                                                         monkeypatch):
    area = fabricas.crear_area('Pendiente2')
    area.name = 'Cambio sin guardar'
    monkeypatch.setattr('app.modules.audit.services._recortar',
                        lambda *a: (_ for _ in ()).throw(ValueError('x')))

    r = services.send_notification_by_slug('prueba_log', 'ana@pruebas.local')

    assert r['status'] == 'success'
    assert area.name == 'Cambio sin guardar'  # sin rollback: no se expiró


def test_fallo_de_lectura_de_plataforma_no_cambia_el_resultado(
        app, monkeypatch):
    proveedor = ProveedorLdap(cliente=object(), escritor=EscritorFalso())
    monkeypatch.setattr(proveedor, '_preparar',
                        lambda op: (None, proveedor._escritor, GRUPO,
                                    PersonaFalsa()))

    def _roto(*a, **k):
        raise RuntimeError('BD caída')
    monkeypatch.setattr('app.modules.provisioning.ldap_provider.db.session.get',
                        _roto)
    op = Operacion(id_operacion='1', clave_idempotencia='k',
                   operacion='otorgar', nivel='usuario', plataforma_id=1,
                   usuario_id=None)

    resultado = proveedor.otorgar(op)

    assert resultado.resultado == 'exitoso'
