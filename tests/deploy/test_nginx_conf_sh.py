"""`deploy/nginx_conf.sh` (FNC-153): un .conf editado a mano no se pierde."""
import subprocess
from pathlib import Path

import pytest

DEPLOY = Path(__file__).resolve().parents[2] / 'deploy'
SCRIPT = DEPLOY / 'nginx_conf.sh'
INSTALL = DEPLOY / 'install.sh'


def _bash(codigo, *args, entrada=None):
    return subprocess.run(['bash', '-c', f'set -Eeuo pipefail; . "{SCRIPT}"; {codigo}', '_', *args],
                          capture_output=True, text=True, timeout=10, input=entrada)


@pytest.fixture
def confs(tmp_path):
    conf, nuevo = tmp_path / 'portal.conf', tmp_path / 'plantilla'
    nuevo.write_text('server { listen 443; }\n')
    return conf, nuevo


def test_sin_conf_previo_se_escribe(confs):
    conf, nuevo = confs
    assert _bash('decidir_conf_nginx "$1" "$2"', str(conf), str(nuevo)).stdout == 'escribir'


def test_igual_a_la_plantilla_se_escribe(confs):
    conf, nuevo = confs
    conf.write_text(nuevo.read_text())
    assert _bash('decidir_conf_nginx "$1" "$2"', str(conf), str(nuevo)).stdout == 'escribir'


def test_editado_sin_terminal_se_conserva(confs):
    conf, nuevo = confs
    conf.write_text('mi configuración con certificados\n')
    r = _bash('decidir_conf_nginx "$1" "$2"', str(conf), str(nuevo), entrada='')
    assert r.stdout == 'conservar'


@pytest.mark.parametrize('modo', ['conservar', 'reemplazar'])
def test_el_modo_fija_la_respuesta(confs, modo):
    conf, nuevo = confs
    conf.write_text('editado\n')
    assert _bash('decidir_conf_nginx "$1" "$2" "$3"', str(conf), str(nuevo), modo).stdout == modo


def test_reemplazar_guarda_copia_que_nginx_no_carga(confs):
    conf, nuevo = confs
    conf.write_text('editado a mano\n')
    r = _bash('aplicar_conf_nginx "$1" "$2" reemplazar', str(conf), str(nuevo))
    assert r.returncode == 0, r.stderr
    assert conf.read_text() == nuevo.read_text()
    copias = list(conf.parent.glob('portal.conf.bak-*'))
    assert len(copias) == 1 and copias[0].read_text() == 'editado a mano\n'
    assert not copias[0].name.endswith('.conf')


def test_conservar_no_toca_el_conf_y_deja_la_plantilla_aparte(confs):
    conf, nuevo = confs
    conf.write_text('editado a mano\n')
    r = _bash('aplicar_conf_nginx "$1" "$2" conservar', str(conf), str(nuevo))
    assert r.returncode == 0, r.stderr
    assert conf.read_text() == 'editado a mano\n'
    assert (conf.parent / 'portal.conf.nuevo').read_text() == nuevo.read_text()


def test_install_usa_la_decision_y_no_sobrescribe_directo():
    texto = INSTALL.read_text()
    assert 'decidir_conf_nginx' in texto and 'aplicar_conf_nginx' in texto
    assert 'render "$PREFIX/deploy/nginx.conf.tmpl" > "$conf"' not in texto


def test_install_reinicia_los_servicios_y_tiene_modo_actualizar():
    texto = INSTALL.read_text()
    assert 'systemctl restart "$BACKEND_UNIT" "$FRONTEND_UNIT" "$WORKER_UNIT"' in texto
    assert '--actualizar) ACTUALIZAR=1; SKIP_PKGS=1' in texto
    assert 'alembic" upgrade head' in texto


@pytest.mark.parametrize('args, mensaje', [
    (['--actualizar', '--force'], '--actualizar y --force no se combinan'),
    (['--nginx-conf', 'otro'], '--nginx-conf debe ser conservar o reemplazar'),
])
def test_opciones_invalidas_salen_con_2(args, mensaje):
    r = subprocess.run(['bash', str(INSTALL), *args], capture_output=True, text=True, timeout=10)
    assert r.returncode == 2
    assert mensaje in r.stderr
