"""Pruebas del flujo de Carta Responsiva de TI (GET /responsiva y POST /me/firmar-responsiva).

Reglas de negocio:
1. El usuario firma la responsiva UNA SOLA VEZ en su ciclo de vida.
2. Si entra por primera vez sin plataformas asignadas, entra libremente al portal
   para explorar y solicitar plataformas (no se le muestra modal ni se le bloquea).
3. Al aprobarse su solicitud (o al recibir asignaciones en onboarding), el portal
   detecta que tiene accesos pendientes de firma y le muestra la responsiva.
4. Al firmar, se activa el aprovisionamiento y queda marcado permanentemente como firmado.
5. Cualquier plataforma aprobada u otorgada posteriormente se aprovisiona de inmediato
   sin volver a exigir la responsiva nunca más.
"""

import pytest
from app import db
from app.modules.auth.models import User
from tests import fabricas


def test_usuario_sin_plataformas_entra_libre_solicita_y_firma_al_aprobar(app, cliente_como):
    """Un usuario sin plataformas asignadas entra libre al portal, solicita acceso,
    y al ser aprobado por el admin el portal le exige firmar la responsiva una sola vez."""
    from app.modules.access.models import PlatformAccessGrant
    from app.modules.access_requests import services as req_services
    from app.modules.access_requests.approvals import aprobar

    with app.app_context():
        admin = fabricas.crear_usuario(rol='administrador')
        area = fabricas.crear_area(nombre='Operaciones')
        plataforma = fabricas.crear_plataforma(
            area=area,
            nombre='Jira Software',
            direct_link='https://jira.empresa.local',
            ldap_group_user_dn='cn=jira-usuarios,ou=groups,dc=ejemplo,dc=local',
        )
        usuario = fabricas.crear_usuario(
            email='nuevo.portal@empresa.local',
            rol='usuario',
            responsiva_firmada=False,
        )
        usuario.areas.append(area)
        db.session.commit()
        admin_id = admin.id
        user_id = usuario.id
        plat_id = plataforma.id

    cliente = cliente_como(usuario)

    # 1. Al no tener plataformas otorgadas, /me no exige responsiva (firmada=True)
    resp_me = cliente.get('/api/v1/me')
    assert resp_me.status_code == 200
    assert resp_me.get_json()['responsiva_firmada'] is True

    # 2. El usuario puede ver áreas y plataformas del catálogo sin bloqueo
    resp_areas = cliente.get('/api/v1/areas')
    assert resp_areas.status_code == 200
    resp_plats = cliente.get('/api/v1/platforms')
    assert resp_plats.status_code == 200

    # 3. El usuario solicita acceso a Jira
    with app.app_context():
        u = db.session.get(User, user_id)
        solicitud = req_services.crear(u, plat_id, 'usuario', 'Requiero acceso a Jira')
        db.session.commit()
        solicitud_id = solicitud.id

    # 4. El administrador aprueba la solicitud
    with app.app_context():
        from app.modules.access_requests.models import PlatformAccessRequest
        adm = db.session.get(User, admin_id)
        sol = db.session.get(PlatformAccessRequest, solicitud_id)
        acceso = aprobar(sol, adm)
        db.session.commit()
        grant_id = acceso.id

        # El aprovisionamiento se retiene porque el usuario no ha firmado su responsiva
        assert acceso.responsiva_firmada is False
        assert acceso.last_job_id is None

    # 5. El usuario entra al portal: detecta acceso aprobado pendiente de firma
    resp_me_post = cliente.get('/api/v1/me')
    assert resp_me_post.status_code == 200
    assert resp_me_post.get_json()['responsiva_firmada'] is False

    # 6. Endpoints protegidos se bloquean hasta que firme
    resp_areas_block = cliente.get('/api/v1/areas')
    assert resp_areas_block.status_code == 403
    assert resp_areas_block.get_json()['code'] == 'responsiva_requerida'

    # 7. La responsiva indica que es por aprobación de acceso
    resp_doc = cliente.get('/api/v1/responsiva')
    assert resp_doc.status_code == 200
    datos_doc = resp_doc.get_json()
    assert datos_doc['es_aprobacion'] is True
    assert 'Aprobación de Nuevos Accesos' in datos_doc['titulo']
    assert len(datos_doc['plataformas']) == 1
    assert datos_doc['plataformas'][0]['name'] == 'Jira Software'

    # 8. El usuario firma la responsiva en el portal
    resp_firmar = cliente.post('/api/v1/me/firmar-responsiva')
    assert resp_firmar.status_code == 200
    assert resp_firmar.get_json()['provisioned_grants'] == 1

    # 9. El acceso se aprovisiona y el usuario queda marcado como firmado
    with app.app_context():
        grant_ok = db.session.get(PlatformAccessGrant, grant_id)
        assert grant_ok.responsiva_firmada is True
        assert grant_ok.last_job_id is not None
        u_ok = db.session.get(User, user_id)
        assert u_ok.responsiva_firmada is True

    # 10. /me confirma que ya está firmado y las rutas están desbloqueadas
    resp_me_final = cliente.get('/api/v1/me')
    assert resp_me_final.get_json()['responsiva_firmada'] is True
    assert cliente.get('/api/v1/areas').status_code == 200


def test_responsiva_se_firma_una_sola_vez_accesos_posteriores_no_la_exigen(app, cliente_como):
    """Una vez que el usuario firma su responsiva, cualquier plataforma posterior
    aprobada o asignada se activa directamente sin volver a exigir la responsiva."""
    from app.modules.access.models import PlatformAccessGrant
    from app.modules.access_requests import services as req_services
    from app.modules.access_requests.approvals import aprobar

    with app.app_context():
        admin = fabricas.crear_usuario(rol='administrador')
        area = fabricas.crear_area(nombre='Tecnología')
        plataforma_sap = fabricas.crear_plataforma(
            area=area,
            nombre='SAP ERP',
            direct_link='https://sap.empresa.local',
            ldap_group_user_dn='cn=sap-usuarios,ou=groups,dc=ejemplo,dc=local',
        )
        # Usuario que YA firmó su responsiva en el pasado
        usuario = fabricas.crear_usuario(
            email='veterano@empresa.local',
            rol='usuario',
            responsiva_firmada=True,
        )
        usuario.areas.append(area)
        db.session.commit()
        admin_id = admin.id
        user_id = usuario.id
        plat_id = plataforma_sap.id

    cliente = cliente_como(usuario)

    # El usuario solicita otra plataforma
    with app.app_context():
        u = db.session.get(User, user_id)
        solicitud = req_services.crear(u, plat_id, 'usuario', 'Uso de finanzas')
        db.session.commit()
        solicitud_id = solicitud.id

    # El administrador aprueba la solicitud
    with app.app_context():
        from app.modules.access_requests.models import PlatformAccessRequest
        adm = db.session.get(User, admin_id)
        sol = db.session.get(PlatformAccessRequest, solicitud_id)
        acceso = aprobar(sol, adm)
        db.session.commit()
        grant_id = acceso.id

        # Como el usuario ya firmó su responsiva, el acceso NACE firmado y se encola de inmediato
        assert acceso.responsiva_firmada is True
        assert acceso.last_job_id is not None

    # Al entrar al portal, /me confirma que sigue firmada y NUNCA se le vuelve a pedir
    resp_me = cliente.get('/api/v1/me')
    assert resp_me.status_code == 200
    assert resp_me.get_json()['responsiva_firmada'] is True


def test_onboarding_con_plataformas_asignadas_exige_firma_primer_ingreso(app, cliente_como):
    """Si al usuario se le asignan plataformas directamente en onboarding,
    al ingresar por primera vez al portal debe firmar la responsiva."""
    from app.modules.access import services
    from app.modules.access.models import PlatformAccessGrant

    with app.app_context():
        admin = fabricas.crear_usuario(rol='administrador')
        area = fabricas.crear_area(nombre='Recursos Humanos')
        plataforma = fabricas.crear_plataforma(
            area=area,
            nombre='Portal Nómina',
            direct_link='https://nomina.empresa.local',
            ldap_group_user_dn='cn=nomina-usuarios,ou=groups,dc=ejemplo,dc=local',
        )
        usuario = fabricas.crear_usuario(
            email='ingreso.onboarding@empresa.local',
            rol='usuario',
            responsiva_firmada=False,
        )
        usuario.areas.append(area)
        db.session.commit()

        # Admin asigna plataforma en onboarding antes de que el usuario entre al portal
        acceso = services.otorgar(usuario, plataforma, 'usuario', 'solicitud', actor=admin, request_id=1)
        db.session.commit()
        grant_id = acceso.id
        user_id = usuario.id

        # El aprovisionamiento se retiene
        assert acceso.responsiva_firmada is False
        assert acceso.last_job_id is None

    cliente = cliente_como(usuario)

    # Al entrar por primera vez al portal, detecta que debe firmar la responsiva
    resp_me = cliente.get('/api/v1/me')
    assert resp_me.status_code == 200
    assert resp_me.get_json()['responsiva_firmada'] is False

    # El modal consulta los términos (muestra plataformas asignadas)
    resp_doc = cliente.get('/api/v1/responsiva')
    assert resp_doc.status_code == 200
    datos_doc = resp_doc.get_json()
    assert len(datos_doc['plataformas']) == 1
    assert datos_doc['plataformas'][0]['name'] == 'Portal Nómina'

    # Firma la responsiva
    resp_firmar = cliente.post('/api/v1/me/firmar-responsiva')
    assert resp_firmar.status_code == 200
    assert resp_firmar.get_json()['provisioned_grants'] == 1

    # Queda aprovisionado y liberado
    with app.app_context():
        grant_ok = db.session.get(PlatformAccessGrant, grant_id)
        assert grant_ok.responsiva_firmada is True
        assert grant_ok.last_job_id is not None
        u_ok = db.session.get(User, user_id)
        assert u_ok.responsiva_firmada is True

    resp_me2 = cliente.get('/api/v1/me')
    assert resp_me2.get_json()['responsiva_firmada'] is True


def test_modo_responsiva_por_plataforma(monkeypatch, app, cliente_como):
    """Cuando RESPONSIVA_MODO=por_plataforma en .env, cada otorgamiento nuevo
    exige firmar la responsiva específicamente para esa plataforma."""
    monkeypatch.setenv('RESPONSIVA_MODO', 'por_plataforma')

    from app.modules.access.models import PlatformAccessGrant
    from app.modules.access_requests import services as req_services
    from app.modules.access_requests.approvals import aprobar

    with app.app_context():
        admin = fabricas.crear_usuario(rol='administrador')
        area = fabricas.crear_area(nombre='Finanzas')
        plataforma = fabricas.crear_plataforma(
            area=area,
            nombre='SAP S/4HANA',
            direct_link='https://sap.empresa.local',
            ldap_group_user_dn='cn=sap-fin,ou=groups,dc=ejemplo,dc=local',
        )
        # Usuario que ya había firmado previamente una responsiva global
        usuario = fabricas.crear_usuario(
            email='auditoria.fin@empresa.local',
            rol='usuario',
            responsiva_firmada=True,
        )
        usuario.areas.append(area)
        db.session.commit()
        admin_id = admin.id
        user_id = usuario.id
        plat_id = plataforma.id

    cliente = cliente_como(usuario)

    # 1. Al no tener accesos nuevos pendientes, /me está libre
    resp_me_ini = cliente.get('/api/v1/me')
    assert resp_me_ini.get_json()['responsiva_firmada'] is True

    # 2. Solicita la nueva plataforma y admin aprueba
    with app.app_context():
        u = db.session.get(User, user_id)
        sol = req_services.crear(u, plat_id, 'usuario', 'Uso contable')
        db.session.commit()
        sol_id = sol.id

    with app.app_context():
        from app.modules.access_requests.models import PlatformAccessRequest
        adm = db.session.get(User, admin_id)
        solicitud = db.session.get(PlatformAccessRequest, sol_id)
        acceso = aprobar(solicitud, adm)
        db.session.commit()
        grant_id = acceso.id

        # En modo por_plataforma, nace retenido y no firmado a pesar de que el usuario ya firmó en el pasado
        assert acceso.responsiva_firmada is False
        assert acceso.last_job_id is None

    # 3. Al entrar al portal, /me detecta la plataforma pendiente de responsiva
    resp_me = cliente.get('/api/v1/me')
    assert resp_me.status_code == 200
    assert resp_me.get_json()['responsiva_firmada'] is False

    # 4. El modal muestra contexto de aprobación y la plataforma específica
    resp_doc = cliente.get('/api/v1/responsiva')
    assert resp_doc.status_code == 200
    datos = resp_doc.get_json()
    assert datos['es_aprobacion'] is True
    assert datos['plataformas'][0]['name'] == 'SAP S/4HANA'

    # 5. Firma y se libera
    resp_firmar = cliente.post('/api/v1/me/firmar-responsiva')
    assert resp_firmar.status_code == 200

    with app.app_context():
        grant_ok = db.session.get(PlatformAccessGrant, grant_id)
        assert grant_ok.responsiva_firmada is True
        assert grant_ok.last_job_id is not None

    resp_me_post = cliente.get('/api/v1/me')
    assert resp_me_post.get_json()['responsiva_firmada'] is True

