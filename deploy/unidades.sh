# shellcheck shell=bash
#
# ¿Existe la unidad systemd? (FNC-159). La cargan preflight.sh e install.sh.
#
#   unidad_systemd_existe NOMBRE        (sin .service)
#
# Se guarda la salida completa ANTES de buscar: con `set -o pipefail`,
# `systemctl ... | grep -q` daba falso negativo cuando grep salía en la primera
# coincidencia y systemctl moría por SIGPIPE al escribir el pie («N unit files
# listed»): la unidad existía y el preflight decía que no.

unidad_systemd_existe() {
    local nombre="$1" salida
    salida="$(systemctl list-unit-files --no-legend --no-pager "${nombre}.service" 2>/dev/null)" || true
    [[ $'\n'"$salida" == *$'\n'"${nombre}.service"[[:space:]]* ]]
}
