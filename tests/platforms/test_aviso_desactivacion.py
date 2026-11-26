"""Aviso al desactivar una plataforma o un área (FNC-210).

- Correo `plataforma_desactivada` a quienes tienen acceso vigente
  (`activo`/`en_proceso`), uno por persona, después del commit.
- Respeta `ENABLE_NOTIFICATIONS`, `NOTIFY_PLATFORM_DEACTIVATION` y la
  preferencia `pref_email_notifications`. Reactivar no avisa.
"""
import importlib

import pytest

from app import db
from app.authz import ROLE_ADMIN
from app.modules.audit.models import AuditLog
from app.modules.notifications.models import NotificationTemplate, SMTPConfig
from tests import fabricas
from tests.matriz_proteccion import HOST_SMTP_FICTICIO
from tests.smtp_falso import instalar_smtp

A = '/api/v1'
M0023 = importlib.import_module(
    'migrations.versions.0023_plantilla_plataforma_desactivada')


@pytest.fixture
def correo(app, monkeypatch):
    monkeypatch.setenv('ENABLE_NOTIFICATIONS', 'true')
    monkeypatch.setenv('BASE_URL', 'https://portal.pruebas.invalid')
    db.session.add(SMTPConfig(server=HOST_SMTP_FICTICIO, port=587,
                              encryption='starttls', auth_enabled=False,
                              sender_name='Portal de prueba'))
    for datos in M0023.PLANTILLAS:
        db.session.add(NotificationTemplate(is_html=True, **datos))
    db.session.commit()
    return instalar_smtp(monkeypatch)


@pytest.fixture
def superadmin(cliente_como):
    return cliente_como(fabricas.crear_usuario(ROLE_ADMIN,
                                               email='super@pruebas.local'))


@pytest.fixture
def escenario(correo):
    area = fabricas.crear_area('Packet')
    wiki = fabricas.crear_plataforma(area, 'wiki')
    git = fabricas.crear_plataforma(area, 'git')
    ana = fabricas.crear_usuario(email='ana@pruebas.local')
    luis = fabricas.crear_usuario(email='luis@pruebas.local')
    rosa = fabricas.crear_usuario(email='rosa@pruebas.local')
    fabricas.crear_acceso(ana, wiki)
    fabricas.crear_acceso(ana, git, estado='en_proceso')
    fabricas.crear_acceso(luis, wiki, estado='revocado')
    fabricas.crear_acceso(rosa, git, estado='fallido')
    return area, wiki, git, ana, luis, rosa


def _para(correo):
    return sorted(m['To'] for m in correo.enviados)


def test_plataforma_desactivada_avisa_a_quien_tiene_acceso_vigente(
        escenario, correo, superadmin):
    _, wiki, *_ = escenario

    r = superadmin.put(f'{A}/platforms/{wiki.id}', json={'status': 'Inactivo'})

    assert r.status_code == 200
    assert _para(correo) == ['ana@pruebas.local']  # luis revocado
    mensaje = correo.enviados[0]
    assert 'wiki' in mensaje['Subject']
    cuerpo = mensaje.get_payload()[0].get_payload(decode=True).decode()
    assert 'wiki' in cuerpo and 'Packet' in cuerpo and 'suspendido' in cuerpo
    assert 'https://portal.pruebas.invalid' in cuerpo


def test_area_desactivada_avisa_una_vez_por_persona_con_su_lista(
        escenario, correo, superadmin):
    area, *_ = escenario

    r = superadmin.put(f'{A}/areas/{area.id}', json={'status': 'Inactivo'})

    assert r.status_code == 200
    assert _para(correo) == ['ana@pruebas.local']  # rosa: acceso fallido
    cuerpo = correo.enviados[0].get_payload()[0].get_payload(
        decode=True).decode()
    assert 'git, wiki' in cuerpo or 'wiki, git' in cuerpo


def test_area_no_avisa_por_plataformas_que_ya_estaban_inactivas(
        escenario, correo, superadmin):
    area, wiki, git, *_ = escenario
    git.status = 'Inactivo'
    db.session.commit()

    superadmin.put(f'{A}/areas/{area.id}', json={'status': 'Inactivo'})

    cuerpo = correo.enviados[0].get_payload()[0].get_payload(
        decode=True).decode()
    assert 'wiki' in cuerpo and 'git' not in cuerpo


@pytest.mark.parametrize('ajuste', [
    ('NOTIFY_PLATFORM_DEACTIVATION', 'false'),
    ('ENABLE_NOTIFICATIONS', 'false')])
def test_interruptores_apagados_no_envian(escenario, correo, superadmin,
                                          monkeypatch, ajuste):
    monkeypatch.setenv(*ajuste)
    _, wiki, *_ = escenario

    r = superadmin.put(f'{A}/platforms/{wiki.id}', json={'status': 'Inactivo'})

    assert r.status_code == 200 and correo.enviados == []


def test_preferencia_apagada_no_envia(escenario, correo, superadmin):
    _, wiki, _, ana, *_ = escenario
    ana.pref_email_notifications = False
    db.session.commit()

    superadmin.put(f'{A}/platforms/{wiki.id}', json={'status': 'Inactivo'})

    assert correo.enviados == []


def test_reactivar_no_avisa(escenario, correo, superadmin):
    area, wiki, *_ = escenario
    wiki.status = 'Inactivo'
    db.session.commit()

    superadmin.put(f'{A}/platforms/{wiki.id}', json={'status': 'Activo'})
    assert correo.enviados == []

    area.status = 'Inactivo'
    db.session.commit()
    superadmin.put(f'{A}/areas/{area.id}', json={'status': 'Activo'})
    assert correo.enviados == []


def test_editar_otro_campo_de_plataforma_inactiva_no_avisa(
        escenario, correo, superadmin):
    _, wiki, *_ = escenario
    wiki.status = 'Inactivo'
    db.session.commit()

    superadmin.put(f'{A}/platforms/{wiki.id}',
                   json={'status': 'Inactivo', 'description': 'otra'})

    assert correo.enviados == []


def test_plataforma_de_area_inactiva_no_avisa_de_nuevo(
        escenario, correo, superadmin):
    area, wiki, *_ = escenario
    area.status = 'Inactivo'
    db.session.commit()

    superadmin.put(f'{A}/platforms/{wiki.id}', json={'status': 'Inactivo'})

    assert correo.enviados == []


def test_fallo_de_correo_no_rompe_la_peticion_y_queda_auditado(
        escenario, correo, superadmin):
    import smtplib
    correo.error = smtplib.SMTPException('caído')
    _, wiki, *_ = escenario

    r = superadmin.put(f'{A}/platforms/{wiki.id}', json={'status': 'Inactivo'})

    assert r.status_code == 200
    db.session.expire_all()
    assert db.session.get(type(wiki), wiki.id).status == 'Inactivo'
    fila = AuditLog.query.filter_by(action='notificacion_fallida').one()
    assert fila.target == 'plataforma_desactivada'
