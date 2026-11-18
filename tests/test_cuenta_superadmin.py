"""Primer superadmin sin contraseña fija (FNC-003, SEG-02/03)."""
from app import db
from app.authz import ROLE_ADMIN
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User

VALIDA = 'Portal-Seguro-2026!x'


def _correr(app, *args, entrada=VALIDA + '\n'):
    return app.test_cli_runner().invoke(
        args=['cuentas', 'superadmin', '--password-desde-stdin', *args], input=entrada)


def test_la_bd_vacia_no_crea_una_cuenta_con_contrasena_conocida(app):
    assert User.query.filter_by(email='admin').first() is None


def test_crea_el_primer_superadmin_local(app):
    resultado = _correr(app, '--correo', 'Emergencia')
    assert resultado.exit_code == 0, resultado.output
    cuenta = User.query.filter_by(email='emergencia').one()
    assert cuenta.role == ROLE_ADMIN and cuenta.auth_source == 'local'
    assert cuenta.check_password(VALIDA) and not cuenta.check_password('admin123')
    assert AuditLog.query.filter_by(action='CREAR SUPERADMIN').count() == 1


def test_contrasena_que_no_cumple_la_politica_no_crea_nada(app):
    for debil in ('admin123', 'solominusculas-largas', 'SinSimbolos12345678'):
        resultado = _correr(app, entrada=debil + '\n')
        assert resultado.exit_code != 0
        assert '16 caracteres' in resultado.output
    assert User.query.filter_by(role=ROLE_ADMIN).count() == 0


def test_no_crea_un_segundo_superadmin(app):
    _correr(app)
    resultado = _correr(app, '--correo', 'otro')
    assert resultado.exit_code != 0
    assert 'Ya existe un superadmin' in resultado.output
    assert User.query.filter_by(role=ROLE_ADMIN).count() == 1


def test_restablecer_cambia_la_contrasena_de_la_cuenta_local(app):
    cuenta = User(email='admin', nombre='admin', role=ROLE_ADMIN, auth_source='local')
    cuenta.set_password('admin123')
    db.session.add(cuenta)
    db.session.commit()

    resultado = _correr(app, '--restablecer')

    assert resultado.exit_code == 0, resultado.output
    db.session.refresh(cuenta)
    assert cuenta.check_password(VALIDA) and not cuenta.check_password('admin123')


def test_no_restablece_un_superadmin_del_directorio(app):
    db.session.add(User(email='jefa@pruebas.local', nombre='Jefa', role=ROLE_ADMIN,
                        auth_source='ldap'))
    db.session.commit()
    resultado = _correr(app, '--restablecer')
    assert resultado.exit_code != 0
    assert 'no es una cuenta local' in resultado.output
