# shellcheck shell=bash
#
# Motor de BD del .env del servidor (FNC-134). Lo cargan preflight.sh e
# install.sh con `source`.
#
#   revisar_motor_bd RUTA_ENV
#
# Fuera de desarrollo (APP_ENV distinto de "development", incluido vacío o
# ausente) la BD debe ser MySQL: imprime "FALTA ..." y sale con 1 si
# DB_ENGINE no es exactamente "mysql". Misma regla que app/utils/uri_bd.py.
#
# Solo lee APP_ENV y DB_ENGINE con grep; no hace `source` del .env (corre como
# root y el archivo no es de confianza) y no imprime otros valores.

revisar_motor_bd() {
    local env="$1" app_env motor
    app_env="$(grep -E '^APP_ENV=' "$env" | tail -1 | cut -d= -f2- \
        | tr -d '"'"'"' ' | tr '[:upper:]' '[:lower:]')"
    if [[ "$app_env" == "development" ]]; then
        echo "OK APP_ENV=development: se admite SQLite o MySQL"
        return 0
    fi
    motor="$(grep -E '^DB_ENGINE=' "$env" | tail -1 | cut -d= -f2- \
        | tr -d '"'"'"' ')"
    if [[ "$motor" != "mysql" ]]; then
        echo 'FALTA DB_ENGINE debe ser "mysql" fuera de desarrollo (SQLite solo en APP_ENV=development); la app no arrancaría'
        return 1
    fi
    echo "OK DB_ENGINE=mysql"
}
