"""Actualización transparente (FNC-159): `deploy/actualizar.sh` e `install.sh --actualizar`.

Caso real: con `--actualizar`, los servicios arrancaron con el código nuevo
antes de migrar; la app creó una tabla nueva al arrancar y `alembic upgrade
head` falló con DuplicateTable. Ahora el orden es validar → detener →
dependencias → migrar → arrancar, y si algo falla después de detener los
servicios se quedan detenidos.

`systemctl`, `journalctl`, `curl` y `sleep` son falsos (en un bin/ de tmp_path
antepuesto al PATH) y registran sus llamadas en el mismo archivo que los pasos
falsos de install.sh (`actualizar_validar`, `_dependencias`, `_migrar`).
"""
import os
import subprocess
from pathlib import Path

import pytest

DEPLOY = Path(__file__).resolve().parents[2] / 'deploy'
SCRIPT = DEPLOY / 'actualizar.sh'
INSTALL = DEPLOY / 'install.sh'
PREFLIGHT = DEPLOY / 'preflight.sh'
BACKEND, WORKER, FRONTEND = 'portal-backend', 'portal-worker', 'portal-frontend'
UNIDADES = (BACKEND, WORKER, FRONTEND)
PUERTO_API = '5001'

SYSTEMCTL = r'''#!/usr/bin/env bash
echo "systemctl $*" >> "$REG"
orden="$1"; shift
case "$orden" in
    stop)  for u in "$@"; do rm -f "$EST/$u"; done ;;
    start) for u in "$@"; do
               [[ " ${FALLA_ARRANQUE:-} " == *" $u "* ]] || touch "$EST/$u"
           done ;;
    is-active) [[ "$1" == --quiet ]] && shift; [[ -e "$EST/$1" ]]; exit ;;
esac
exit 0
'''
JOURNALCTL = '#!/usr/bin/env bash\necho "journalctl $*" >> "$REG"\necho "linea del journal"\n'
CURL = '#!/usr/bin/env bash\necho "curl $*" >> "$REG"\nprintf "%s" "${CODIGO_SALUD:-200}"\n'
SLEEP = '#!/usr/bin/env bash\nexit 0\n'

# Pasos propios de install.sh, falsos: registran y fallan si se pide.
PASOS = '''
actualizar_validar() {
    echo validar >> "$REG"
    if [[ -n "${FALLA_VALIDAR:-}" ]]; then return 1; fi
}
actualizar_dependencias() {
    echo dependencias >> "$REG"
    if [[ -n "${FALLA_DEPENDENCIAS:-}" ]]; then return 1; fi
}
actualizar_migrar() {
    echo migrar >> "$REG"
    if [[ -n "${FALLA_MIGRAR:-}" ]]; then echo "DuplicateTable: credential_deliveries" >&2; return 1; fi
}
'''


@pytest.fixture
def entorno(tmp_path):
    binfalso = tmp_path / 'bin'
    binfalso.mkdir()
    for nombre, texto in (('systemctl', SYSTEMCTL), ('journalctl', JOURNALCTL),
                          ('curl', CURL), ('sleep', SLEEP)):
        (binfalso / nombre).write_text(texto)
        (binfalso / nombre).chmod(0o755)
    estado = tmp_path / 'activas'
    estado.mkdir()
    for u in UNIDADES:                 # instalación previa en marcha
        (estado / u).touch()
    return {'bin': binfalso, 'est': estado, 'reg': tmp_path / 'registro.log'}


def _actualizar(e, set_e=True, **fallas):
    env = {**os.environ, 'PATH': f'{e["bin"]}:{os.environ["PATH"]}',
           'REG': str(e['reg']), 'EST': str(e['est']), **fallas}
    opciones = 'set -Eeuo pipefail' if set_e else 'set -uo pipefail'
    codigo = (f'{opciones}; . "{SCRIPT}"; {PASOS}\n'
              'trap actualizar_aviso_salida EXIT\n'
              'actualizar_despliegue "$@"\n')
    return subprocess.run(['bash', '-c', codigo, '_', BACKEND, WORKER, FRONTEND, PUERTO_API],
                          capture_output=True, text=True, timeout=20, env=env)


def _registro(e):
    return e['reg'].read_text().splitlines() if e['reg'].exists() else []


def _indice(lineas, prefijo):
    return next(i for i, l in enumerate(lineas) if l.startswith(prefijo))


def _activas(e):
    return {p.name for p in e['est'].iterdir()}


def test_orden_validar_detener_dependencias_migrar_arrancar(entorno):
    r = _actualizar(entorno)
    assert r.returncode == 0, r.stderr
    reg = _registro(entorno)
    orden = [_indice(reg, p) for p in ('validar', 'systemctl stop', 'dependencias',
                                       'migrar', 'systemctl start')]
    assert orden == sorted(orden), reg
    assert _activas(entorno) == set(UNIDADES)
    detenidas = reg[_indice(reg, 'systemctl stop')].split()[2:]
    assert set(detenidas) == set(UNIDADES)
    # Chequeo de salud del backend por nombre de host, no por IP.
    assert any(l.startswith('curl') and f'localhost:{PUERTO_API}/' in l for l in reg)
    for n in range(1, 7):
        assert f'[{n}/6]' in r.stdout


def test_no_arranca_si_falla_la_migracion(entorno):
    r = _actualizar(entorno, FALLA_MIGRAR='1')
    assert r.returncode != 0
    reg = _registro(entorno)
    assert any(l.startswith('systemctl stop') for l in reg)
    assert not any(l.startswith('systemctl start') for l in reg), reg
    assert _activas(entorno) == set()
    assert 'DuplicateTable' in r.stderr
    assert 'DETENIDOS' in r.stderr
    assert 'install.sh --actualizar' in r.stderr


def test_no_detiene_si_falla_la_validacion(entorno):
    r = _actualizar(entorno, FALLA_VALIDAR='1')
    assert r.returncode != 0
    reg = _registro(entorno)
    assert reg == ['validar'], reg
    assert _activas(entorno) == set(UNIDADES)
    assert 'No se detuvo ningún servicio' in r.stderr


def test_no_migra_ni_arranca_si_fallan_las_dependencias(entorno):
    r = _actualizar(entorno, FALLA_DEPENDENCIAS='1')
    assert r.returncode != 0
    reg = _registro(entorno)
    assert 'migrar' not in reg
    assert not any(l.startswith('systemctl start') for l in reg)
    assert 'DETENIDOS' in r.stderr


def test_servicio_que_no_arranca_muestra_su_journal(entorno):
    r = _actualizar(entorno, FALLA_ARRANQUE=WORKER)
    assert r.returncode != 0
    reg = _registro(entorno)
    assert any(l.startswith('journalctl') and WORKER in l for l in reg), reg
    assert not any(l.startswith('journalctl') and BACKEND in l for l in reg)
    assert f'no quedaron activas: {WORKER}' in r.stderr
    assert 'linea del journal' in r.stderr


def test_backend_activo_sin_salud_falla_con_journal(entorno):
    r = _actualizar(entorno, CODIGO_SALUD='500')
    assert r.returncode != 0
    reg = _registro(entorno)
    assert any(l.startswith('journalctl') and BACKEND in l for l in reg)
    assert 'no responde bien' in r.stderr


def test_sin_set_e_no_hace_nada(entorno):
    r = _actualizar(entorno, set_e=False)
    assert r.returncode != 0
    assert _registro(entorno) == []
    assert "set -e" in r.stderr


# --- install.sh usa el módulo --------------------------------------------------

def test_install_actualizar_usa_el_orden_nuevo():
    texto = INSTALL.read_text()
    assert '. "$PREFIX/deploy/actualizar.sh"' in texto
    assert 'trap actualizar_aviso_salida EXIT' in texto
    for paso in ('actualizar_validar()', 'actualizar_dependencias()', 'actualizar_migrar()'):
        assert paso in texto, paso
    # Orden simple: sin if ni ||, para que set -e siga activo en los pasos.
    assert '\n    actualizar_despliegue "$BACKEND_UNIT" "$WORKER_UNIT" "$FRONTEND_UNIT" "$API_PORT"\n' in texto
    assert 'preflight.sh" --actualizar' in texto
    # La actualización termina antes de las dependencias de la instalación completa.
    assert texto.index('actualizar_despliegue "$BACKEND_UNIT"') < texto.index('\ninstalar_dependencias\n')
    # Ya no reinicia sin detener antes (el caso de DuplicateTable).
    assert 'Migraciones y reinicio (--actualizar)' not in texto


def test_preflight_rechaza_opcion_desconocida():
    r = subprocess.run(['bash', str(PREFLIGHT), '--otra'], capture_output=True,
                       text=True, timeout=10)
    assert r.returncode == 2
    assert '--actualizar' in r.stderr


def test_preflight_modo_actualizar_acepta_puertos_de_sus_servicios():
    texto = PREFLIGHT.read_text()
    assert 'MODO_ACTUALIZAR' in texto
    assert 'no hay instalación previa' in texto
