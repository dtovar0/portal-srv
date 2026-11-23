"""Pruebas unitarias para deploy/portada_conf.sh."""
import subprocess
from pathlib import Path


def ejecutar_bash(snippet: str) -> subprocess.CompletedProcess:
    comando = f"source deploy/portada_conf.sh; {snippet}"
    return subprocess.run(
        ["bash", "-c", comando],
        capture_output=True,
        text=True,
        cwd=Path(__file__).resolve().parents[2],
    )


def test_normalizar_booleano_portada():
    for entrada in ["true", "TRUE", "si", "SI", "1", "activa", "s"]:
        res = ejecutar_bash(f'normalizar_booleano_portada "{entrada}"')
        assert res.stdout.strip() == "true"
        assert res.returncode == 0

    for entrada in ["false", "FALSE", "no", "NO", "0", "inactiva", "n"]:
        res = ejecutar_bash(f'normalizar_booleano_portada "{entrada}"')
        assert res.stdout.strip() == "false"
        assert res.returncode == 0


def test_leer_portada_env_default(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("OTRA_VAR=123\n")
    res = ejecutar_bash(f'leer_portada_env "{env_file}"')
    assert res.stdout.strip() == "true"


def test_fijar_portada_env(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("PORTADA_ACTIVA=true\n")
    ejecutar_bash(f'fijar_portada_env "{env_file}" "false"')
    assert "PORTADA_ACTIVA=false" in env_file.read_text()


def test_decidir_portada_instalador_flag():
    res = ejecutar_bash('decidir_portada_instalador "no" "/tmp/inexistente.env"')
    assert res.stdout.strip() == "false"

    res = ejecutar_bash('decidir_portada_instalador "si" "/tmp/inexistente.env"')
    assert res.stdout.strip() == "true"

