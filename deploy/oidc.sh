# shellcheck shell=bash
#
# Revisión de las variables OIDC_* del .env del servidor (FNC-143, ADR-009).
# La cargan preflight.sh e install.sh con `source`.
#
#   revisar_oidc RUTA_ENV
#
# Imprime una línea por hallazgo: "OK <texto>", "AVISO <texto>" o
# "FALTA <texto>". Sale con 1 si hay algún FALTA. Mismas reglas que
# app/modules/auth/oidc_configuracion.py: fuera de desarrollo, OIDC_ISSUER_URL,
# OIDC_CLIENT_SECRET y OIDC_REDIRECT_URI son obligatorias, con https y nombre
# de host (nunca IP).
#
# OIDC_CLIENT_SECRET solo se comprueba que tenga valor: NUNCA se imprime. El
# .env no se ejecuta (no se hace `source`: corre como root y no es de confianza).

# Valor no vacío: unas comillas vacías ("" o '') no cuentan.
_oidc_tiene_valor() {
    grep -qE "^$2=([^\"'[:space:]].*|\"[^\"]+\".*|'[^']+'.*)$" "$1"
}

# Valor de una variable NO secreta, sin comillas ni espacios en los extremos.
_oidc_valor() {
    { grep -E "^$2=" "$1" || true; } | tail -1 | cut -d= -f2- \
        | tr -d "\"'" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

# Revisa que $2 (nombre) con valor $3 sea https con nombre de host.
# Imprime FALTA y devuelve 1 si no; no imprime el valor.
_oidc_revisar_url() {
    local nombre="$1" url="$2" resto host
    if [[ "$url" != https://* ]]; then
        echo "FALTA $nombre debe usar https://"
        return 1
    fi
    resto="${url#https://}"
    host="${resto%%[/?#]*}"
    if [[ "$host" == *@* ]]; then
        echo "FALTA $nombre no admite usuario ni contraseña en la URL"
        return 1
    fi
    host="${host%:*}"
    if [[ -z "$host" || "$host" =~ ^[0-9.]+$ || "$host" == \[* \
          || ! "$host" =~ ^[A-Za-z0-9.-]+$ ]]; then
        echo "FALTA $nombre debe usar un nombre de host, no una IP"
        return 1
    fi
    echo "OK $nombre con https y nombre de host"
}

revisar_oidc() {
    local env="$1" fallos=0 app_env alguna=0 var valor
    app_env="$(_oidc_valor "$env" APP_ENV | tr '[:upper:]' '[:lower:]')"

    for var in OIDC_ISSUER_URL OIDC_CLIENT_ID OIDC_CLIENT_SECRET \
               OIDC_REDIRECT_URI OIDC_SCOPES OIDC_LOGOUT_URL; do
        _oidc_tiene_valor "$env" "$var" && alguna=1
    done

    if [[ "$app_env" == "development" && "$alguna" == 0 ]]; then
        echo "OK APP_ENV=development sin OIDC_*: se entra por /acceso-emergencia"
        return 0
    fi

    # Fuera de desarrollo, o en desarrollo con alguna definida, se exigen las tres.
    for var in OIDC_ISSUER_URL OIDC_CLIENT_SECRET OIDC_REDIRECT_URI; do
        if _oidc_tiene_valor "$env" "$var"; then
            [[ "$var" == OIDC_CLIENT_SECRET ]] && echo "OK OIDC_CLIENT_SECRET definida"
        else
            echo "FALTA $var sin definir (obligatoria: el inicio de sesión es solo por Authelia)"
            fallos=1
        fi
    done

    # Fuera de desarrollo, sin OIDC_LOGOUT_URL cerrar sesión no cierra Authelia.
    if [[ "$app_env" != "development" ]] && ! _oidc_tiene_valor "$env" OIDC_LOGOUT_URL; then
        echo "FALTA OIDC_LOGOUT_URL sin definir (sin ella, cerrar sesión no cierra la sesión de Authelia)"
        fallos=1
    fi

    for var in OIDC_ISSUER_URL OIDC_REDIRECT_URI OIDC_LOGOUT_URL; do
        valor="$(_oidc_valor "$env" "$var")"
        [[ -n "$valor" ]] || continue
        _oidc_revisar_url "$var" "$valor" || fallos=1
    done

    if _oidc_tiene_valor "$env" OIDC_CLIENT_ID; then
        echo "OK OIDC_CLIENT_ID definida"
    else
        echo "OK OIDC_CLIENT_ID sin definir: se usa «portal»"
    fi

    valor="$(_oidc_valor "$env" OIDC_SCOPES)"
    if [[ -n "$valor" && " $valor " != *" openid "* ]]; then
        echo "FALTA OIDC_SCOPES debe incluir openid"
        fallos=1
    fi
    return "$fallos"
}
