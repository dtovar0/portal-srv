# shellcheck shell=bash
#
# Motor de BD del .env del servidor (FNC-134, FNC-146). Lo cargan preflight.sh
# e install.sh con `source`.
#
#   motor_bd_de_env RUTA_ENV      imprime DB_ENGINE tal cual (sin comillas)
#   revisar_motor_bd RUTA_ENV
#
# Fuera de desarrollo (APP_ENV distinto de "development", incluido vacío o
# ausente) la BD debe ser MySQL o PostgreSQL: imprime "FALTA ..." y sale con 1
# si DB_ENGINE no es exactamente "mysql" o "postgresql". Misma regla que
# app/utils/uri_bd.py.
#
# Solo lee APP_ENV y DB_ENGINE con grep; no hace `source` del .env (corre como
# root y el archivo no es de confianza) y no imprime otros valores.

MOTORES_BD=(mysql postgresql)

motor_bd_de_env() {
    # Sin .env o sin la clave imprime vacío y sale con 0 (no corta `set -e`).
    { grep -E '^DB_ENGINE=' "$1" 2>/dev/null || true; } | tail -1 \
        | cut -d= -f2- | tr -d '"'"'"' '
}

revisar_motor_bd() {
    local env="$1" app_env motor
    app_env="$(grep -E '^APP_ENV=' "$env" | tail -1 | cut -d= -f2- \
        | tr -d '"'"'"' ' | tr '[:upper:]' '[:lower:]')"
    if [[ "$app_env" == "development" ]]; then
        echo "OK APP_ENV=development: se admite SQLite, MySQL o PostgreSQL"
        return 0
    fi
    motor="$(motor_bd_de_env "$env")"
    if [[ "$motor" != "mysql" && "$motor" != "postgresql" ]]; then
        echo 'FALTA DB_ENGINE debe ser "mysql" o "postgresql" fuera de desarrollo (SQLite solo en APP_ENV=development); la app no arrancaría'
        return 1
    fi
    echo "OK DB_ENGINE=$motor"
}
