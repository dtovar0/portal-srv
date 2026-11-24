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
    # FNC-174: los módulos hijos del autoservicio también llegan al archivo.
    from app.modules.auth import autoservicio_correo, autoservicio_mfa
    for modulo in (autoservicio_correo, autoservicio_mfa):
        modulo.logger.info("Prueba hijo %s persistido", modulo.__name__)

    # Forzar flush de manejadores
    for reg in (log_app, log_dir, log_ldap):
        for h in reg.handlers:
            if hasattr(h, 'flush'):
                h.flush()

    contenido = ruta_archivo.read_text(encoding='utf-8')
    assert "Prueba mensaje autoservicio persistido" in contenido
    assert "Prueba mensaje directorio persistido" in contenido
    assert "Prueba mensaje ldap3 protocolo persistido" in contenido
    for nombre in ('autoservicio_correo', 'autoservicio_mfa'):
        assert f"Prueba hijo app.modules.auth.{nombre} persistido" in contenido


def test_resolver_carpeta_logs_salta_directorio_solo_lectura(tmp_path, monkeypatch):
    from app.modules.directory.depuracion import _es_directorio_escribible

    dir_bloqueado = tmp_path / 'readonly'
    dir_bloqueado.mkdir()
    # Desactivar permisos de escritura
    os.chmod(dir_bloqueado, 0o444)

    try:
        # La sonda de escritura debe detectar que no se puede escribir
        assert _es_directorio_escribible(str(dir_bloqueado)) is False

        # Con LOG_DIR apuntando a un directorio de solo lectura, resolver_carpeta_logs
        # debe saltarlo y seleccionar un candidato con permisos reales
        carpeta_elegida = resolver_carpeta_logs({'LOG_DIR': str(dir_bloqueado)})
        assert carpeta_elegida != str(dir_bloqueado)
        assert _es_directorio_escribible(carpeta_elegida) is True
    finally:
        os.chmod(dir_bloqueado, 0o755)


def test_activar_si_se_pide_sin_carpeta_escribible_no_revienta(monkeypatch):
    """Verifica que si ningún directorio es escribible, no lance [Errno 30] y use consola."""
    monkeypatch.setattr('app.modules.directory.depuracion.resolver_carpeta_logs', lambda entorno=None: None)

    res = activar_si_se_pide({VAR_DEBUG: 'true'})
    assert res is True


