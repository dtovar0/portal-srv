"""Política de la contraseña inicial (FNC-138, ADR-008 2a)."""
import pytest

from app.modules.users import politica_contrasena as politica
from app.modules.users.politica_contrasena import (ErrorConfiguracionPolitica,
                                                   cargar_politica, generar,
                                                   mensaje_de_incumplimiento)

VALIDA = 'Clave-De-Prueba-2026!x'  # ficticia


def test_valores_por_defecto():
    p = cargar_politica({})
    assert (p.largo_minimo, p.largo_maximo) == (16, 128)
    assert p.clases == politica.CLASES
    assert p.publica() == {'min_length': 16, 'max_length': 128,
                           'required_classes': list(politica.CLASES),
                           'symbols': politica.SIMBOLOS_POR_DEFECTO}


def test_contrasena_valida_cumple():
    assert mensaje_de_incumplimiento(VALIDA, cargar_politica({})) is None


@pytest.mark.parametrize('valor, mensaje', [
    (None, politica.MENSAJE_OBLIGATORIA),
    ('', politica.MENSAJE_OBLIGATORIA),
    (123, politica.MENSAJE_TEXTO),
    ('Abcdefghij-12345', None),                       # 16: cumple
    ('Abcdefghi-12345', 'Entre 16 y 128 caracteres.'),  # 15
    ('A' + 'a' * 127 + '1-', 'Entre 16 y 128 caracteres.'),  # 130
    ('abcdefghij-123456', politica.FALTA_CLASE['mayusculas']),
    ('ABCDEFGHIJ-123456', politica.FALTA_CLASE['minusculas']),
    ('Abcdefghijk-lmnop', politica.FALTA_CLASE['digitos']),
    ('Abcdefghijk123456', politica.FALTA_CLASE['simbolos']),
    ('Abcdefghij 123456-', politica.MENSAJE_CARACTERES),   # espacio
    ('Abcdefghij"123456-', politica.MENSAJE_CARACTERES),   # comilla
    ('Abcdefghij\\123456-', politica.MENSAJE_CARACTERES),  # barra invertida
    ('Abcdefghijé123456-', politica.MENSAJE_CARACTERES),   # no ASCII
])
def test_mensajes_por_regla(valor, mensaje):
    assert mensaje_de_incumplimiento(valor, cargar_politica({})) == mensaje


def test_el_mensaje_nunca_incluye_la_contrasena():
    centinela = 'CENTINELA-corto'
    assert centinela not in mensaje_de_incumplimiento(
        centinela, cargar_politica({}))


def test_clases_configurables():
    p = cargar_politica({'PASSWORD_POLICY_REQUIRED_CLASSES': 'minusculas,digitos',
                         'PASSWORD_POLICY_MIN_LENGTH': '20'})
    assert p.clases == ('minusculas', 'digitos')
    assert mensaje_de_incumplimiento('abcdefghij0123456789', p) is None
    assert mensaje_de_incumplimiento('abcdefghij012345678', p) \
        == 'Entre 20 y 128 caracteres.'


@pytest.mark.parametrize('entorno', [
    {'PASSWORD_POLICY_MIN_LENGTH': '15'},
    {'PASSWORD_POLICY_MIN_LENGTH': 'abc'},
    {'PASSWORD_POLICY_MIN_LENGTH': '129'},
    {'PASSWORD_POLICY_MAX_LENGTH': '15'},
    {'PASSWORD_POLICY_MIN_LENGTH': '30', 'PASSWORD_POLICY_MAX_LENGTH': '20'},
    {'PASSWORD_POLICY_REQUIRED_CLASSES': 'minusculas,emojis'},
    {'PASSWORD_POLICY_SYMBOLS': '!"'},
    {'PASSWORD_POLICY_SYMBOLS': '!!'},
    {'PASSWORD_POLICY_SYMBOLS': '!a'},
    {'PASSWORD_POLICY_SYMBOLS': '! ?'},
    {'PASSWORD_POLICY_SYMBOLS': '\\'},
])
def test_variables_invalidas_detienen_el_arranque(entorno):
    with pytest.raises(ErrorConfiguracionPolitica):
        politica.validar_al_arrancar(entorno)


def test_la_app_no_arranca_con_una_politica_invalida(monkeypatch, tmp_path):
    from app import create_app
    monkeypatch.setenv('PASSWORD_POLICY_MIN_LENGTH', '8')
    with pytest.raises(ErrorConfiguracionPolitica):
        create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI':
                    f"sqlite:///{tmp_path / 'x.db'}"})


def test_el_generador_cumple_la_politica_en_mil_muestras():
    p = cargar_politica({})
    muestras = {generar(p) for _ in range(1000)}
    assert len(muestras) == 1000
    assert all(mensaje_de_incumplimiento(m, p) is None for m in muestras)


def test_el_generador_respeta_clases_y_rango_configurados():
    p = cargar_politica({'PASSWORD_POLICY_MIN_LENGTH': '40',
                         'PASSWORD_POLICY_MAX_LENGTH': '40',
                         'PASSWORD_POLICY_REQUIRED_CLASSES': 'mayusculas,digitos'})
    for _ in range(200):
        m = generar(p)
        assert len(m) == 40
        assert mensaje_de_incumplimiento(m, p) is None


def test_el_generador_usa_secrets_y_no_random(monkeypatch):
    import random
    monkeypatch.setattr(random, 'choice', lambda *_: pytest.fail('random'))
    monkeypatch.setattr(random, 'shuffle', lambda *_: pytest.fail('random'))
    generar(cargar_politica({}))
