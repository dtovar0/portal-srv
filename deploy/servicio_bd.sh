# shellcheck shell=bash
#
# Servicio systemd de la base de datos local (FNC-125, FNC-146). Lo cargan
# install.sh y preflight.sh con `.`; no se ejecuta solo.
#
# El nombre cambia según la distribución y el motor (DB_ENGINE del .env):
#   mysqld.service      MySQL de Rocky/RHEL 8 o 9
#   mariadb.service     MariaDB
#   mysql.service       MySQL de paquetes de terceros (Oracle, otras distros)
#   postgresql.service  PostgreSQL de Rocky/RHEL (el de PGDG, p. ej.
#                       postgresql-16.service, se indica con --db-service)
# Las plantillas de las unidades llevan @DB_SERVICE@ en After= y Wants=.

# Orden de preferencia de la detección, por motor.
SERVICIOS_MYSQL=(mysqld.service mariadb.service mysql.service)
SERVICIOS_POSTGRESQL=(postgresql.service)

# Imprime el primer servicio instalado del motor ($1: mysql por defecto,
# o postgresql). Salida 1, sin imprimir nada, si no hay ninguno (BD remota)
# o no hay systemd. Los alias (MariaDB declara mysqld.service y
# mysql.service) no cuentan: se devuelve el nombre real de la unidad.
detectar_servicio_bd() {
    command -v systemctl >/dev/null 2>&1 || return 1
    local candidato candidatos=("${SERVICIOS_MYSQL[@]}")
    [[ "${1:-mysql}" == postgresql ]] && candidatos=("${SERVICIOS_POSTGRESQL[@]}")
    for candidato in "${candidatos[@]}"; do
        if systemctl list-unit-files --no-legend --no-pager "$candidato" 2>/dev/null \
            | awk -v u="$candidato" '$1 == u && $2 != "alias" { f = 1 } END { exit !f }'; then
            printf '%s' "$candidato"
            return 0
        fi
    done
    return 1
}

# Valida un nombre de servicio dado a mano (--db-service) e imprime su forma
# completa, con .service. Caracteres de nombre de unidad de systemd salvo '\';
# no empieza por '-' (no se confunde con una opción). Acaba en sed y en la
# unidad: nada de '|', '/', '&', espacios ni saltos de línea.
servicio_bd_valido() {
    local nombre="$1"
    [[ "$nombre" == *.service ]] || nombre="${nombre}.service"
    [[ "$nombre" =~ ^[A-Za-z0-9][A-Za-z0-9:_.@-]{0,120}\.service$ ]] || return 1
    printf '%s' "$nombre"
}

# Filtro (stdin → stdout) que sustituye @DB_SERVICE@ en una plantilla. Con el
# servicio vacío (BD remota) quita la dependencia: el marcador sale de la lista
# y la directiva que se quedaría vacía se borra entera (un `Wants=` vacío en
# systemd vacía la lista, no es lo mismo que no ponerlo).
aplicar_servicio_bd() {
    if [[ -n "$1" ]]; then
        sed "s|@DB_SERVICE@|$1|g"
    else
        sed -e '/^[A-Za-z]*=@DB_SERVICE@[[:space:]]*$/d' \
            -e 's/=@DB_SERVICE@ /=/g' \
            -e 's/ @DB_SERVICE@//g'
    fi
}

# Comando del cliente según el motor ($1: mysql o postgresql).
comando_cliente_bd() {
    [[ "${1:-}" == postgresql ]] && printf 'psql' || printf 'mysql'
}

# Paquete del cliente acorde al servidor ($1: servicio, $2: motor): en el9 el
# paquete `mysql` choca con el cliente de MariaDB. Sin BD local se usa el
# motor del .env (mysql por defecto, ADR-001).
paquete_cliente_bd() {
    if [[ "${2:-}" == postgresql ]]; then printf 'postgresql'
    elif [[ "${1:-}" == mariadb.service ]]; then printf 'mariadb'
    else printf 'mysql'
    fi
}

# Instala el cliente del motor (opcional: sirve para respaldar antes de
# migrar) solo si no hay uno. Si dnf falla es un aviso, nunca detiene la
# instalación. $1: servicio de BD (puede ir vacío), $2: motor.
instalar_cliente_bd() {
    local paquete comando
    comando="$(comando_cliente_bd "${2:-}")"
    if command -v "$comando" >/dev/null 2>&1; then
        printf '    cliente %s ya presente; no se instala otro\n' "$comando"
        return 0
    fi
    paquete="$(paquete_cliente_bd "${1:-}" "${2:-}")"
    if dnf -y install "$paquete"; then
        printf '    cliente %s instalado (paquete %s)\n' "$comando" "$paquete"
    else
        printf '    AVISO: no se pudo instalar el cliente %s (opcional, para respaldos); instalar a mano con: dnf install %s\n' "$comando" "$paquete"
    fi
    return 0
}
