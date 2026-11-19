"""Configuración del módulo de accesos y responsivas."""
import os

VAR_RESPONSIVA_MODO = 'RESPONSIVA_MODO'
VAR_RESPONSIVA_POR_PLATAFORMA = 'RESPONSIVA_POR_PLATAFORMA'

MODO_GLOBAL = 'global'
MODO_POR_PLATAFORMA = 'por_plataforma'


def responsiva_por_plataforma() -> bool:
    """Indica si la responsiva de TI se firma por cada plataforma o una sola vez globalmente.

    Configuración en .env:
    - `RESPONSIVA_MODO=global` (por defecto): El usuario firma la responsiva una sola vez en su vida.
      Plataformas posteriores se activan de inmediato al ser aprobadas/otorgadas.
    - `RESPONSIVA_MODO=por_plataforma`: Cada vez que se aprueba u otorga una nueva plataforma,
      el usuario debe firmar la responsiva específicamente para esa plataforma.

    Alternativa booleana:
    - `RESPONSIVA_POR_PLATAFORMA=true` / `false`
    """
    modo = (os.getenv(VAR_RESPONSIVA_MODO) or '').strip().lower()
    if modo in ('por_plataforma', 'plataforma', 'each', 'per_platform'):
        return True
    if modo in ('global', 'unica', 'once'):
        return False

    flag = (os.getenv(VAR_RESPONSIVA_POR_PLATAFORMA) or '').strip().lower()
    return flag in ('true', '1', 'si', 'yes')
