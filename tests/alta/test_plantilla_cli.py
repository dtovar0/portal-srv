"""`--plantilla` de `migrar-ldap` y `usuarios --rotar-contrasena` (FNC-190)."""
import pytest

from app import db
from app.modules.users.models import EntregaCredenciales
from tests.alta.conftest import (GRUPO_ADMINS, GRUPO_USUARIOS)  # noqa: F401
from tests.alta.test_alta_csv import (USUARIOS, _con_areas,  # noqa: F401
                                      csv)
from tests.alta.test_migrar_ldap import base  # noqa: F401 (fixture)
from tests.alta.conftest import con_entrega, correr, ldap  # noqa: F401


def _plantillas(con_entrega):
    return {c['slug'] for c in con_entrega.correos}


def test_migrar_ldap_rota_con_onboarding_por_omision(base, correr, con_entrega):
    r = correr('migrar-ldap', '--rotar-contrasena', '--sin-grupo-del-portal')
    assert r.exit_code == 0, r.output
    assert _plantillas(con_entrega) == {'onboarding_aduana'}
    assert len(con_entrega.sends) == 2
    assert all(len(s['codigo']) == 6 and s['codigo'].isdigit()
               for s in con_entrega.sends)
    assert len({s['codigo'] for s in con_entrega.sends}) == 2
    db.session.expire_all()
    assert {e.plantilla for e in EntregaCredenciales.query.all()} == \
        {'onboarding_aduana'}


def test_migrar_ldap_con_plantilla_credenciales_iniciales(base, correr,
                                                          con_entrega):
    r = correr('migrar-ldap', '--rotar-contrasena', '--sin-grupo-del-portal',
               '--plantilla', 'credenciales_iniciales')
    assert r.exit_code == 0, r.output
    assert _plantillas(con_entrega) == {'credenciales_iniciales'}
    db.session.expire_all()
    assert {e.plantilla for e in EntregaCredenciales.query.all()} == \
        {'credenciales_iniciales'}


def test_plantilla_desconocida_es_error_de_uso(base, correr):
    r = correr('migrar-ldap', '--rotar-contrasena', '--plantilla', 'otra')
    assert r.exit_code == 2


@pytest.mark.parametrize('opcion,esperada', [
    ([], 'onboarding_aduana'),
    (['--plantilla', 'credenciales_iniciales'], 'credenciales_iniciales')])
def test_usuarios_rotar_contrasena_usa_la_plantilla(
        app, correr, csv, ldap, con_entrega, opcion, esperada):  # noqa: F811
    _con_areas()
    ldap.persona('ana')
    r = correr('usuarios', csv(USUARIOS), '--crear-en-ldap',
               '--omitir-si-existe-en-ldap', '--rotar-contrasena', *opcion)
    assert r.exit_code == 0, r.output
    # ana se rota con la plantilla elegida; carlos (alta) usa la del alta.
    slugs = [c['slug'] for c in con_entrega.correos]
    assert esperada in slugs
    assert slugs.count('credenciales_iniciales') >= 1
