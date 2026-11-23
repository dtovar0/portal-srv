"""`deploy/unidades.sh`: detectar una unidad systemd instalada (FNC-159).

Regresión del servidor del dueño (2026-11-19): `systemctl list-unit-files X |
grep -q X` bajo `set -o pipefail` daba «no existe» con la unidad activa, porque
grep salía antes de que systemctl escribiera el pie y este moría por SIGPIPE.
"""
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SCRIPT = RAIZ / 'deploy' / 'unidades.sh'

# Encabezado, la unidad y, tras una pausa, el pie (como systemctl real).
SYSTEMCTL = """#!/usr/bin/env bash
nombre="${@: -1}"
if [[ "$nombre" == portal-backend.service ]]; then
  echo "UNIT FILE STATE PRESET"
  echo "portal-backend.service enabled disabled"
  sleep 0.2
  echo ""
  echo "1 unit files listed."
else
  echo "0 unit files listed."
fi
"""


def _correr(tmp_path, codigo):
    binario = tmp_path / 'bin'
    binario.mkdir()
    falso = binario / 'systemctl'
    falso.write_text(SYSTEMCTL)
    falso.chmod(0o755)
    return subprocess.run(
        ['bash', '-c', f'set -uo pipefail; PATH="{binario}:$PATH"; . "{SCRIPT}"; {codigo}'],
        capture_output=True, text=True, timeout=10).returncode


def test_unidad_instalada_se_detecta_aunque_systemctl_escriba_despues(tmp_path):
    assert _correr(tmp_path, 'unidad_systemd_existe portal-backend') == 0


def test_unidad_inexistente(tmp_path):
    assert _correr(tmp_path, 'unidad_systemd_existe portal-worker') == 1


def test_no_confunde_prefijos(tmp_path):
    assert _correr(tmp_path, 'unidad_systemd_existe portal-back') == 1


def test_el_patron_anterior_fallaba(tmp_path):
    """Documenta la causa: el patrón viejo da falso negativo con este systemctl."""
    viejo = ('if systemctl list-unit-files portal-backend.service 2>/dev/null '
             '| grep -q portal-backend; then exit 0; else exit 1; fi')
    assert _correr(tmp_path, viejo) == 1


def test_preflight_usa_la_funcion():
    texto = (RAIZ / 'deploy' / 'preflight.sh').read_text()
    assert 'unidades.sh' in texto
    assert 'unidad_systemd_existe "$u"' in texto
    assert 'list-unit-files "$u.service" 2>/dev/null | grep -q' not in texto


def test_install_usa_la_funcion_para_detectar_instalacion_previa():
    texto = (RAIZ / 'deploy' / 'install.sh').read_text()
    assert 'unidades.sh' in texto
    assert 'unidad_systemd_existe "$BACKEND_UNIT"' in texto

