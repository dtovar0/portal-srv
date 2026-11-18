"""`deploy/motor_bd.sh` con `.env` SINTÉTICOS (FNC-134): nunca lee el real."""
import subprocess
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / 'deploy' / 'motor_bd.sh'
PREFLIGHT = Path(__file__).resolve().parents[2] / 'deploy' / 'preflight.sh'
INSTALL = Path(__file__).resolve().parents[2] / 'deploy' / 'install.sh'
MARCA = 'Valor-Ficticio-Que-No-Se-Imprime'


def _revisar(tmp_path, lineas):
    env = tmp_path / '.env'
    env.write_text('\n'.join(lineas) + '\n')
    resultado = subprocess.run(
        ['bash', '-c', f'. "{SCRIPT}"; revisar_motor_bd "$1"', '_', str(env)],
        capture_output=True, text=True, timeout=10)
    assert MARCA not in resultado.stdout + resultado.stderr
    return resultado.returncode, resultado.stdout


@pytest.mark.parametrize('entorno', ['production', 'staging', ''])
def test_fuera_de_dev_con_mysql_pasa(tmp_path, entorno):
    codigo, salida = _revisar(tmp_path, [f'APP_ENV={entorno}',
                                         'DB_ENGINE=mysql', f'DB_PASS={MARCA}'])
    assert codigo == 0, salida
    assert 'FALTA' not in salida


@pytest.mark.parametrize('lineas', [
    ['APP_ENV=production'],
    ['APP_ENV=production', 'DB_ENGINE=sqlite'],
    ['APP_ENV=production', 'DB_ENGINE='],
    ['DB_ENGINE=sqlite'],
    ['APP_ENV=staging', 'DB_ENGINE=MySQL'],
])
def test_fuera_de_dev_sin_mysql_es_falta(tmp_path, lineas):
    codigo, salida = _revisar(tmp_path, [*lineas, f'DB_PASS={MARCA}'])
    assert codigo == 1
    assert 'FALTA DB_ENGINE' in salida


@pytest.mark.parametrize('motor', ['sqlite', 'mysql'])
def test_en_desarrollo_no_se_exige(tmp_path, motor):
    codigo, salida = _revisar(tmp_path, ['APP_ENV=development',
                                         f'DB_ENGINE={motor}'])
    assert codigo == 0
    assert 'FALTA' not in salida


@pytest.mark.parametrize('script', [PREFLIGHT, INSTALL])
def test_preflight_e_install_cargan_y_llaman_la_revision(script):
    texto = script.read_text()
    assert 'motor_bd.sh' in texto
    assert 'revisar_motor_bd' in texto


# --- PostgreSQL (FNC-146) ----------------------------------------------------

@pytest.mark.parametrize('entorno', ['production', 'staging', ''])
def test_fuera_de_dev_con_postgresql_pasa(tmp_path, entorno):
    codigo, salida = _revisar(tmp_path, [f'APP_ENV={entorno}',
                                         'DB_ENGINE=postgresql',
                                         f'DB_PASS={MARCA}'])
    assert codigo == 0, salida
    assert 'OK DB_ENGINE=postgresql' in salida


@pytest.mark.parametrize('motor', ['postgres', 'PostgreSQL', 'pgsql'])
def test_fuera_de_dev_con_nombre_de_motor_no_admitido_es_falta(tmp_path, motor):
    codigo, salida = _revisar(tmp_path, ['APP_ENV=production',
                                         f'DB_ENGINE={motor}'])
    assert codigo == 1
    assert '"mysql" o "postgresql"' in salida


@pytest.mark.parametrize('lineas, esperado', [
    (['DB_ENGINE=postgresql'], 'postgresql'),
    (['DB_ENGINE="mysql"'], 'mysql'),
    (['APP_ENV=production'], ''),
])
def test_motor_bd_de_env(tmp_path, lineas, esperado):
    env = tmp_path / '.env'
    env.write_text('\n'.join([*lineas, f'DB_PASS={MARCA}']) + '\n')
    r = subprocess.run(
        ['bash', '-c', f'set -Eeuo pipefail; . "{SCRIPT}"; motor_bd_de_env "$1"',
         '_', str(env)], capture_output=True, text=True, timeout=10)
    assert r.returncode == 0
    assert r.stdout.strip() == esperado
    assert MARCA not in r.stdout + r.stderr


def test_motor_bd_de_env_sin_archivo_no_corta_el_script(tmp_path):
    r = subprocess.run(
        ['bash', '-c', f'set -Eeuo pipefail; . "{SCRIPT}"; '
         f'motor_bd_de_env "$1"; echo sigue', '_', str(tmp_path / 'no-existe')],
        capture_output=True, text=True, timeout=10)
    assert r.returncode == 0
    assert r.stdout.strip() == 'sigue'
