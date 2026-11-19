# shellcheck shell=bash
#
# Actualización transparente (FNC-159). La carga install.sh con `.` en el modo
# --actualizar; no se ejecuta sola.
#
# Orden fijo, con un mensaje por paso:
#   1. validar      comprobaciones previas; si fallan no se detiene nada
#   2. detener      backend, worker y frontend: nada arranca con código nuevo
#                   sobre un esquema sin migrar (la app crea tablas al arrancar)
#   3. respaldo     no hay mecanismo en el proyecto: solo se avisa
#   4. dependencias pip, npm ci y next build
#   5. migrar       alembic upgrade head
#   6. arrancar     start, espera a que queden activos y chequeo de salud
#
# El llamador define tres funciones (los pasos propios de install.sh):
#   actualizar_validar       comprobaciones previas; no modifica nada
#   actualizar_dependencias  pip, npm ci y build del frontend
#   actualizar_migrar        alembic upgrade head
# y llama a `actualizar_despliegue` como orden simple, con `set -e` activo y
# `trap actualizar_aviso_salida EXIT`: un fallo en cualquier paso termina el
# script y el aviso de salida explica en qué estado quedó y cómo reintentar.
# Si algo falla después de detener, los servicios se quedan detenidos a
# propósito. Nada de aquí borra datos.

# Espera a que una unidad quede activa: intentos x pausa (s).
ACTUALIZAR_INTENTOS_ARRANQUE=15
ACTUALIZAR_PAUSA_SEG=2
# Tras quedar activas, se espera y se vuelve a mirar: una unidad con
# Restart=on-failure puede estar activa un instante y caer.
ACTUALIZAR_ESTABILIZACION_SEG=3
# Líneas del journal que se muestran de una unidad que no arrancó.
ACTUALIZAR_LINEAS_JOURNAL=30
# Chequeo de salud del backend: la ruta pública que consulta la pantalla de
# acceso; responde sin sesión. Solo loopback, por nombre de host.
ACTUALIZAR_HOST_SALUD="localhost"
ACTUALIZAR_RUTA_SALUD="/api/v1/auth/context"
ACTUALIZAR_INTENTOS_SALUD=15
ACTUALIZAR_TIEMPO_MAX_SALUD_SEG=5
ACTUALIZAR_TOTAL_PASOS=6

# Estado para el aviso de salida: validacion | detenidos | migrando |
# arrancando | terminado. Vacío: la actualización no empezó.
ACTUALIZAR_FASE=""
# Comando para reintentar; lo fija el llamador (sin opciones: pueden llevar
# credenciales, p. ej. --proxy).
ACTUALIZAR_REINTENTO="sudo ./deploy/install.sh --actualizar"

_act_paso()  { printf '\n==> [%s/%s] %s\n' "$1" "$ACTUALIZAR_TOTAL_PASOS" "$2"; }
_act_nota()  { printf '    %s\n' "$1"; }
_act_error() { printf '\nERROR: %s\n' "$1" >&2; }

# Aviso de salida (trap EXIT): con código distinto de 0, dice en qué estado
# quedaron los servicios y cómo seguir. Conserva el código de salida.
actualizar_aviso_salida() {
    local codigo=$?
    (( codigo == 0 )) && return 0
    case "$ACTUALIZAR_FASE" in
        validacion)
            printf '\nNo se detuvo ningún servicio: siguen en marcha con la versión anterior.\nCorregir lo indicado y repetir:\n  %s\n' \
                "$ACTUALIZAR_REINTENTO" >&2 ;;
        detenidos|migrando)
            printf '\nLos servicios quedan DETENIDOS a propósito: el código nuevo no arranca sobre\nun esquema sin migrar. No se borró ningún dato; la migración fallida se\nrevierte entera.\nCorregir la causa (ver el error de arriba) y repetir:\n  %s\n' \
                "$ACTUALIZAR_REINTENTO" >&2 ;;
        arrancando)
            printf '\nLas migraciones se aplicaron, pero algún servicio no quedó en marcha (ver el\njournal de arriba). Tras corregir, repetir (es seguro: no repite migraciones):\n  %s\n' \
                "$ACTUALIZAR_REINTENTO" >&2 ;;
    esac
    return 0
}

# actualizar_detener UNIDAD...: las detiene y comprueba que ninguna siga activa.
actualizar_detener() {
    local u activas=()
    systemctl stop "$@"
    for u in "$@"; do
        if systemctl is-active --quiet "$u"; then activas+=("$u"); fi
    done
    if (( ${#activas[@]} )); then
        _act_error "siguen activas tras detenerlas: ${activas[*]}"
        return 1
    fi
    _act_nota "detenidas: $*"
}

# actualizar_esperar_activa UNIDAD: 0 en cuanto está activa; 1 si no llega.
actualizar_esperar_activa() {
    local intento
    for (( intento = 1; intento <= ACTUALIZAR_INTENTOS_ARRANQUE; intento++ )); do
        systemctl is-active --quiet "$1" && return 0
        sleep "$ACTUALIZAR_PAUSA_SEG"
    done
    return 1
}

# actualizar_arrancar UNIDAD...: las arranca y comprueba que queden activas;
# de las que no, muestra las últimas líneas de su journal.
actualizar_arrancar() {
    local u caidas=()
    systemctl reset-failed "$@" >/dev/null 2>&1 || true
    # El fallo de start se ve abajo, unidad por unidad, con su journal.
    systemctl start "$@" || true
    for u in "$@"; do
        actualizar_esperar_activa "$u" || caidas+=("$u")
    done
    if (( ${#caidas[@]} == 0 )); then
        sleep "$ACTUALIZAR_ESTABILIZACION_SEG"
        for u in "$@"; do
            systemctl is-active --quiet "$u" || caidas+=("$u")
        done
    fi
    for u in "${caidas[@]}"; do
        printf '\n--- %s: últimas %s líneas del journal ---\n' "$u" "$ACTUALIZAR_LINEAS_JOURNAL" >&2
        journalctl -u "$u" -n "$ACTUALIZAR_LINEAS_JOURNAL" --no-pager >&2 || true
    done
    if (( ${#caidas[@]} )); then
        _act_error "no quedaron activas: ${caidas[*]}"
        return 1
    fi
    for u in "$@"; do _act_nota "$u activo"; done
}

# actualizar_salud UNIDAD_BACKEND PUERTO: el backend responde 2xx/3xx en la
# ruta de salud. Sin curl se omite con un aviso.
actualizar_salud() {
    local unidad="$1" puerto="$2" url codigo="" intento
    url="http://${ACTUALIZAR_HOST_SALUD}:${puerto}${ACTUALIZAR_RUTA_SALUD}"
    if ! command -v curl >/dev/null 2>&1; then
        _act_nota "AVISO: sin curl no se comprueba la salud del backend ($url)"
        return 0
    fi
    for (( intento = 1; intento <= ACTUALIZAR_INTENTOS_SALUD; intento++ )); do
        codigo="$(curl -s -o /dev/null -w '%{http_code}' \
                  --max-time "$ACTUALIZAR_TIEMPO_MAX_SALUD_SEG" "$url" 2>/dev/null || true)"
        if [[ "$codigo" =~ ^[23][0-9][0-9]$ ]]; then
            _act_nota "backend responde en $url (HTTP $codigo)"
            return 0
        fi
        sleep "$ACTUALIZAR_PAUSA_SEG"
    done
    printf '\n--- %s: últimas %s líneas del journal ---\n' "$unidad" "$ACTUALIZAR_LINEAS_JOURNAL" >&2
    journalctl -u "$unidad" -n "$ACTUALIZAR_LINEAS_JOURNAL" --no-pager >&2 || true
    _act_error "el backend está activo pero no responde bien en $url (último HTTP: ${codigo:-sin respuesta})"
    return 1
}

# actualizar_despliegue BACKEND WORKER FRONTEND PUERTO_API
# Llamar como orden simple (ni en if ni con || o &&): así `set -e` sigue
# activo dentro de los pasos y un fallo no se pasa por alto.
actualizar_despliegue() {
    local backend="$1" worker="$2" frontend="$3" puerto="$4"
    if [[ $- != *e* ]]; then
        _act_error "actualizar_despliegue necesita 'set -e' (un fallo no debe pasar inadvertido)"
        return 1
    fi

    ACTUALIZAR_FASE=validacion
    _act_paso 1 "Validaciones previas (los servicios siguen en marcha)"
    actualizar_validar
    _act_nota "validaciones superadas"

    ACTUALIZAR_FASE=detenidos
    _act_paso 2 "Detener servicios (nada arranca con código nuevo sin migrar)"
    actualizar_detener "$frontend" "$worker" "$backend"

    _act_paso 3 "Respaldo de la base de datos"
    _act_nota "el proyecto no tiene respaldo automático de la BD (docs/operacion/RESPALDOS.md):"
    _act_nota "este paso no respalda; la migración es transaccional y no borra datos"

    _act_paso 4 "Dependencias (pip, npm ci y build del frontend)"
    actualizar_dependencias

    ACTUALIZAR_FASE=migrando
    _act_paso 5 "Migraciones (alembic upgrade head)"
    actualizar_migrar
    _act_nota "migraciones al día"

    ACTUALIZAR_FASE=arrancando
    _act_paso 6 "Arrancar servicios y comprobar"
    actualizar_arrancar "$backend" "$worker" "$frontend"
    actualizar_salud "$backend" "$puerto"

    ACTUALIZAR_FASE=terminado
}
