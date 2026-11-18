# shellcheck shell=bash
#
# Configuración de nginx de una instalación existente (FNC-153). Lo carga
# install.sh con `.`; no se ejecuta solo.
#
#   decidir_conf_nginx CONF NUEVO [MODO]
#
# Imprime qué hacer con CONF frente a NUEVO (la plantilla ya rellenada):
#   escribir    CONF no existe o es igual a NUEVO
#   reemplazar  MODO=reemplazar, o la persona lo elige en una terminal
#   conservar   MODO=conservar, la persona lo elige o no hay terminal (por
#               defecto: nunca se pierde un .conf editado a mano)
# La pregunta va a stderr y la respuesta se lee de la terminal.
#
#   aplicar_conf_nginx CONF NUEVO ACCION
#
# reemplazar: guarda antes CONF.bak-AAAAMMDD-HHMMSS. conservar: deja la
# versión de la plantilla en CONF.nuevo para compararla. Ninguno de los dos
# termina en .conf, así que nginx no los carga.

modo_conf_nginx_valido() {
    [[ "$1" == conservar || "$1" == reemplazar ]]
}

decidir_conf_nginx() {
    local conf="$1" nuevo="$2" modo="${3:-}" respuesta
    if [[ ! -f "$conf" ]] || cmp -s "$conf" "$nuevo"; then
        printf 'escribir'
        return 0
    fi
    if modo_conf_nginx_valido "$modo"; then
        printf '%s' "$modo"
        return 0
    fi
    if [[ -t 0 ]]; then
        printf '%s es distinto del de la plantilla (¿editado a mano?).\n' "$conf" >&2
        printf '¿[C]onservar el actual o [r]eemplazar con copia de respaldo? [C/r]: ' >&2
        read -r respuesta || respuesta=''
        case "${respuesta,,}" in
            r|reemplazar) printf 'reemplazar' ;;
            *) printf 'conservar' ;;
        esac
        return 0
    fi
    printf 'conservar'
}

aplicar_conf_nginx() {
    local conf="$1" nuevo="$2" accion="$3" respaldo
    case "$accion" in
        escribir)
            install -m 0644 "$nuevo" "$conf"
            printf '    configuración escrita en %s\n' "$conf"
            ;;
        reemplazar)
            respaldo="${conf}.bak-$(date +%Y%m%d-%H%M%S)"
            cp -p "$conf" "$respaldo"
            install -m 0644 "$nuevo" "$conf"
            printf '    %s reemplazado; copia del anterior en %s\n' "$conf" "$respaldo"
            ;;
        conservar)
            install -m 0644 "$nuevo" "${conf}.nuevo"
            printf '    se conserva %s; la versión de la plantilla queda en %s.nuevo para comparar\n' \
                "$conf" "$conf"
            ;;
        *)
            printf 'ERROR: acción de nginx desconocida: %s\n' "$accion" >&2
            return 1
            ;;
    esac
}
