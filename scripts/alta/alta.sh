#!/usr/bin/env bash
# Altas por CLI (FNC-182): corre `flask --app run:app alta "$@"` desde la
# carpeta del código y como la cuenta de servicio (la dueña de `instance/`, que
# `deploy/install.sh` entrega a esa cuenta). Sin ella, corre como quien lo invoca.
#
# Uso: ./scripts/alta/alta.sh areas|plataformas|usuarios|migrar-ldap [opciones]
#      ./scripts/alta/alta.sh --help
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FLASK="$RAIZ/venv/bin/flask"
DATOS="instance"

[ -x "$FLASK" ] || { echo "No existe $FLASK: instala el entorno virtual." >&2; exit 1; }
cd "$RAIZ"

cuenta=""
if [ -d "$RAIZ/$DATOS" ]; then
    cuenta="$(stat -c %U "$RAIZ/$DATOS")"
fi

if [ -n "$cuenta" ] && [ "$cuenta" != "root" ] && [ "$cuenta" != "$(id -un)" ]; then
    exec sudo -u "$cuenta" -- "$FLASK" --app run:app alta "$@"
fi
exec "$FLASK" --app run:app alta "$@"
