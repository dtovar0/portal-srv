"""Pruebas de activación y persistencia de logs en depuración LDAP."""
import logging
import os
import shutil
import tempfile
import pytest

from app.modules.directory.depuracion import (
    VAR_DEBUG,
    CARPETA_LOG,
    ARCHIVO_LOG,
    resolver_carpeta_logs,
    activar_si_se_pide,
)


def test_resolver_carpeta_logs_crea_directorio(tmp_path):
    entorno = {'LOG_DIR': str(tmp_path / 'mis_logs')}
    carpeta = resolver_carpeta_logs(entorno)
    assert os.path.isdir(carpeta)
    assert carpeta == str(tmp_path / 'mis_logs')


def test_activar_si_se_pide_desactivado(monkeypatch):
    monkeypatch.delenv(VAR_DEBUG, raising=False)
    assert activar_si_se_pide({VAR_DEBUG: 'false'}) is False
    assert activar_si_se_pide({}) is False


def test_activar_si_se_pide_activado_escribe_en_archivo(tmp_path, monkeypatch):
    carpeta_test = tmp_path / 'logs_test'
    entorno = {
        VAR_DEBUG: 'true',
        'LOG_DIR': str(carpeta_test),
    }

    resultado = activar_si_se_pide(entorno)
    assert resultado is True

    ruta_archivo = carpeta_test / ARCHIVO_LOG
    assert os.path.exists(ruta_archivo)

    # Emitir logs en los loggers configurados
    log_app = logging.getLogger('app.modules.auth.autoservicio')
    log_dir = logging.getLogger('app.modules.directory')
    log_ldap = logging.getLogger('ldap3')

    log_app.info("Prueba mensaje autoservicio persistido")
    log_dir.info("Prueba mensaje directorio persistido")
    log_ldap.debug("Prueba mensaje ldap3 protocolo persistido")

    # Forzar flush de manejadores
    for reg in (log_app, log_dir, log_ldap):
        for h in reg.handlers:
            if hasattr(h, 'flush'):
                h.flush()

    contenido = ruta_archivo.read_text(encoding='utf-8')
    assert "Prueba mensaje autoservicio persistido" in contenido
    assert "Prueba mensaje directorio persistido" in contenido
    assert "Prueba mensaje ldap3 protocolo persistido" in contenido
